import {randomUUID} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {WclClient, reportCode} from './client.js';
import {metadata, buildScope, selectScope, playersFor, digest} from './scope.js';
import {requireValue, string, DomainError} from '../ledger/policy.js';

export class Connection {
  constructor(path, env = process.env, clientFactory = credentials => new WclClient({credentials: () => credentials})) { this.path = path; this.env = env; this.clientFactory = clientFactory; }
  credentials() {
    if (this.path && existsSync(this.path)) {
      const saved = JSON.parse(readFileSync(this.path, 'utf8')); return {clientId: saved.clientId, clientSecret: saved.clientSecret};
    }
    return {clientId: this.env.WCL_CLIENT_ID, clientSecret: this.env.WCL_CLIENT_SECRET};
  }
  status() { const c = this.credentials(); return {configured: Boolean(c.clientId && c.clientSecret), access: 'public-api', privateReportsSupported: false}; }
  async save(input) {
    const credentials = {clientId: string(input.clientId, 'WCL client ID', 1000), clientSecret: string(input.clientSecret, 'WCL client secret', 4000)};
    requireValue(!/[\r\n]/.test(credentials.clientId + credentials.clientSecret), 'Credentials must not contain line breaks');
    const client = this.clientFactory(credentials);
    await client.accessToken(); // Never save an invalid pair or echo it in the response.
    mkdirSync(dirname(this.path), {recursive: true});
    writeFileSync(this.path, JSON.stringify({...credentials, verifiedAt: new Date().toISOString()}), {mode: 0o600});
    return this.status();
  }
}

function projector(report, fight, assignments) {
  const actors = new Map(report.raw.masterData.actors.map(a => [a.id, a]));
  const abilities = new Map((report.raw.masterData.abilities ?? []).map(a => [a.gameID, a.name]));
  const people = new Map(assignments.flatMap(p => p.references.filter(r => r.reportCode === report.meta.code).map(r => [r.actorId, p.id])));
  const evidence = [], seen = new Set(), lastDamage = new Map(); let castCount = 0, deaths = 0, visibleOmitted = 0;
  const ability = e => { const value = e.abilityGameID ?? e.ability?.gameID ?? e.ability?.guid ?? (typeof e.ability === 'number' ? e.ability : null); return abilities.get(value) ?? (value === null ? 'Unknown ability' : `Ability ${value}`); };
  const eventId = (batch, index) => `${report.meta.code}-${fight.id}-${batch.index}-${index}`;
  const add = event => { if (!seen.has(event.id)) { seen.add(event.id); evidence.push(event); } };
  return {
    page(batch) {
      for (const [index, raw] of batch.page.data.entries()) {
        const id = eventId(batch, index), seconds = (raw.timestamp - fight.startTime) / 1000;
        if (raw.type === 'damage' && people.has(raw.targetID) && raw.amount > 0) lastDamage.set(raw.targetID, {id, timeSeconds: seconds, playerId: people.get(raw.targetID), type: 'damage', detail: `${ability(raw)} dealt ${raw.amount} damage from ${actors.get(raw.sourceID)?.name ?? 'unknown source'}. This is event evidence, not fault attribution.`, rawTimestamp: raw.timestamp});
        if (raw.type === 'death' && people.has(raw.targetID)) {
          deaths++;
          const preceding = lastDamage.get(raw.targetID), nearby = preceding && raw.timestamp - preceding.rawTimestamp >= 0 && raw.timestamp - preceding.rawTimestamp <= 5000;
          if (nearby) add({...preceding});
          add({id, playerId: people.get(raw.targetID), timeSeconds: seconds, type: 'death', detail: nearby ? `Death recorded. See the preceding damage event for context; it is not independently established as the killing blow or cause of the wipe.` : 'Death recorded. No recent damage context available in this capture. Cause and avoidability need review.'});
        } else if (raw.type === 'cast' && people.has(raw.sourceID)) {
          if (castCount++ < 150) add({id, playerId: people.get(raw.sourceID), timeSeconds: seconds, type: 'cast', detail: `Cast ${ability(raw)}${actors.has(raw.targetID) ? ` on ${actors.get(raw.targetID).name}` : ''}. Assignment, cooldown readiness and intent are not established.`});
          else visibleOmitted++;
        }
      }
    },
    result() { return {events: evidence.sort((a, b) => a.timeSeconds - b.timeSeconds), deaths, visibleOmitted}; }
  };
}

export class WclService {
  constructor({ledger, client, connection = null}) {
    Object.assign(this, {ledger, client, connection}); this.controllers = new Map(); this.tasks = new Map();
    ledger.db.exec(`CREATE TABLE IF NOT EXISTS wcl_drafts(id TEXT PRIMARY KEY,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS wcl_jobs(id TEXT PRIMARY KEY,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS wcl_pages(job_id TEXT NOT NULL, fight_key TEXT NOT NULL, page_index INTEGER NOT NULL, body BLOB NOT NULL, hash TEXT NOT NULL, PRIMARY KEY(job_id,fight_key,page_index));`);
    for (const row of ledger.db.prepare('SELECT * FROM wcl_jobs').all()) {
      const job = JSON.parse(row.body);
      if (['queued', 'running'].includes(job.status)) {
        const created = ledger.db.prepare('SELECT run_id FROM wcl_run_links WHERE job_id=?').get(job.id);
        this.saveJob({...job, status: created ? 'complete' : 'interrupted', runId: created?.run_id ?? null, error: created ? null : 'Server restarted before capture completed. Retry from this saved selection.'});
      }
    }
  }
  draft(id) { const row = this.ledger.db.prepare('SELECT body FROM wcl_drafts WHERE id=?').get(id); requireValue(row, 'Import selection not found', 404); return JSON.parse(row.body); }
  job(id) { const row = this.ledger.db.prepare('SELECT body FROM wcl_jobs WHERE id=?').get(id); requireValue(row, 'Capture job not found', 404); return JSON.parse(row.body); }
  saveJob(job) { this.ledger.db.prepare('INSERT INTO wcl_jobs VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body').run(job.id, JSON.stringify(job)); }
  listJobs() { return this.ledger.db.prepare('SELECT body FROM wcl_jobs ORDER BY rowid DESC LIMIT 20').all().map(row => JSON.parse(row.body)); }
  async discover(input, actor) {
    const references = typeof input.reports === 'string' ? input.reports.split(/[\s,]+/).filter(Boolean) : input.reports;
    requireValue(Array.isArray(references) && references.length > 0 && references.length <= 4, 'Enter 1–4 WCL report links or codes');
    const codes = [...new Set(references.map(reportCode))];
    const reports = [];
    for (const code of codes) { const raw = await this.client.report(code); reports.push({raw, meta: metadata(raw)}); }
    const publicReports = reports.map(r => r.meta);
    requireValue(publicReports.reduce((n, r) => n + r.fights.length, 0) <= 2000, 'More than 2,000 boss pulls in these reports. Narrow the report selection.');
    const scope = buildScope(publicReports, input.context);
    const draft = {id: randomUUID(), reports, scope, createdAt: new Date().toISOString(), actor};
    this.ledger.db.prepare('INSERT INTO wcl_drafts VALUES(?,?)').run(draft.id, JSON.stringify(draft));
    this.ledger.audit(actor, 'wcl.metadata.loaded', {draftId: draft.id, reports: codes, fights: scope.fights.length});
    return this.preview(draft);
  }
  preview(draft) { return {id: draft.id, createdAt: draft.createdAt, reports: draft.reports.map(r => ({code: r.meta.code, title: r.meta.title, revision: r.meta.revision, fetchedAt: r.meta.fetchedAt})), ...draft.scope}; }
  start(input, actor) {
    requireValue(this.controllers.size === 0, 'Another capture is running; wait or cancel it first', 409);
    const draft = this.draft(input.draftId), selected = selectScope(draft, input.fightKeys);
    requireValue(input.scopeConfirmed === true, 'Confirm the exact pull selection and participant roles first');
    requireValue(Array.isArray(input.assignments), 'Review participant classifications first');
    const players = playersFor(draft.reports.map(r => r.meta), input.fightKeys);
    requireValue(players.length > 0 && players.length <= 100, 'The selected run needs 1–100 known player characters');
    const assignments = players.map(player => {
      const choices = input.assignments.filter(a => a.id === player.id);
      requireValue(choices.length === 1 && ['unclassified', 'booster', 'raidleader', 'lb', 'buyer'].includes(choices[0].role), 'Classify each selected character or leave them explicitly unclassified');
      return {...player, role: choices[0].role};
    });
    const job = {id: randomUUID(), draftId: draft.id, policyVersion: this.ledger.policy().version, title: string(input.title, 'Run review title', 200), fightKeys: selected.map(f => f.key), assignments, actor, status: 'queued', progress: {pulls: 0, total: selected.length, pages: 0, events: 0}, createdAt: new Date().toISOString(), runId: null};
    this.saveJob(job); this.ledger.audit(actor, 'wcl.scope.confirmed', {jobId: job.id, draftId: draft.id, fightKeys: job.fightKeys, assignments: assignments.map(p => ({id: p.id, character: p.character, role: p.role}))});
    const controller = new AbortController(); this.controllers.set(job.id, controller);
    const task = Promise.resolve().then(() => this.capture(job.id, controller.signal)).finally(() => { this.controllers.delete(job.id); this.tasks.delete(job.id); });
    this.tasks.set(job.id, task);
    return job;
  }
  cancel(id, actor) {
    const job = this.job(id); requireValue(['queued', 'running'].includes(job.status), 'This capture is not running', 409);
    const controller = this.controllers.get(id); requireValue(controller, 'Capture is not active', 409);
    this.saveJob({...job, status: 'cancelled', error: 'Cancelled by reviewer.'}); controller.abort();
    this.ledger.audit(actor, 'wcl.capture.cancelled', {jobId: id}); return this.job(id);
  }
  async capture(id, signal) {
    let job = this.job(id);
    try {
      const draft = this.draft(job.draftId), selected = selectScope(draft, job.fightKeys), usedCodes = [...new Set(selected.map(f => f.reportCode))];
      const assertUnchanged = async () => {
        for (const code of usedCodes) {
          const fresh = metadata(await this.client.report(code, signal)), expected = draft.reports.find(r => r.meta.code === code).meta;
          requireValue(fresh.fingerprint === expected.fingerprint, 'Report changed after metadata selection. Reload the reports and reselect pulls; no review was created.', 409);
        }
      };
      job.status = 'running'; this.saveJob(job); await assertUnchanged();
      const pulls = [], manifest = []; let bytes = 0;
      for (const fight of selected) {
        if (signal.aborted) throw new DomainError('Capture cancelled', 409);
        const report = draft.reports.find(r => r.meta.code === fight.reportCode), projection = projector(report, fight, job.assignments);
        let pages = 0, count = 0, terminal = false, expectedStart = fight.startTime, lastTimestamp = fight.startTime;
        for await (const batch of this.client.pages(fight.reportCode, fight, signal)) {
          if (signal.aborted) throw new DomainError('Capture cancelled', 409);
          requireValue(!terminal && batch.index === pages && batch.queryVersion === 1 && batch.variables.code === fight.reportCode && batch.variables.start === expectedStart && batch.variables.end === fight.endTime && batch.variables.fightIDs?.length === 1 && batch.variables.fightIDs[0] === fight.id, 'Unexpected or discontinuous raw event stream; capture incomplete', 502);
          requireValue(Array.isArray(batch.page?.data) && Object.hasOwn(batch.page, 'nextPageTimestamp'), 'Missing raw event data or cursor', 502);
          for (const event of batch.page.data) {
            requireValue(Number.isFinite(event.timestamp) && event.timestamp >= lastTimestamp && event.timestamp <= fight.endTime, 'Raw events are out of order or outside the pull; capture incomplete', 502);
            lastTimestamp = event.timestamp;
          }
          const next = batch.page.nextPageTimestamp;
          requireValue(next === null || (Number.isFinite(next) && next > expectedStart && next <= fight.endTime), 'Raw page cursor did not advance', 502);
          const raw = JSON.stringify(batch); bytes += Buffer.byteLength(raw);
          requireValue(bytes <= 2 * 1024 * 1024 * 1024 && job.progress.events + batch.page.data.length <= 5000000, 'Capture resource budget reached; no complete review created. Narrow selection.', 413);
          this.ledger.db.prepare('INSERT INTO wcl_pages VALUES(?,?,?,?,?)').run(id, fight.key, batch.index, gzipSync(raw), digest(batch));
          projection.page(batch); pages++; count += batch.page.data.length; terminal = next === null; expectedStart = next;
          job.progress = {...job.progress, current: `${fight.boss} · ${fight.outcome}`, pages: job.progress.pages + 1, events: job.progress.events + batch.page.data.length}; this.saveJob(job);
        }
        requireValue(terminal, 'Terminal event page missing; capture incomplete', 502);
        const visible = projection.result(); requireValue(visible.events.length <= 10000, 'Evidence projection too large; no complete review created', 413);
        const pull = {id: fight.key, boss: fight.boss, outcome: fight.outcome, durationSeconds: (fight.endTime - fight.startTime) / 1000, coverage: 'complete', events: visible.events};
        pulls.push(pull);
        manifest.push({fightKey: fight.key, reportCode: fight.reportCode, fightId: fight.id, encounterId: fight.encounterId, difficulty: fight.difficulty, startTime: fight.startTime, startEpoch: fight.startEpoch, endEpoch: fight.endEpoch, pages, rawEvents: count, deaths: visible.deaths, omittedCasts: visible.visibleOmitted, rosterIncomplete: fight.rosterIncomplete, wipeCalledTime: fight.wipeCalledTime, url: `https://www.warcraftlogs.com/reports/${fight.reportCode}#fight=${fight.id}`});
        job.progress.pulls++; this.saveJob(job);
      }
      await assertUnchanged(); if (signal.aborted) throw new DomainError('Capture cancelled', 409);
      const input = {schemaVersion: 1, title: job.title, source: 'user-import', players: job.assignments, pulls, suggestions: []};
      const provenance = {jobId: id, draftId: draft.id, policyVersion: job.policyVersion, scopeConfirmedAt: job.createdAt, confirmedBy: job.actor, reports: draft.reports.filter(r => usedCodes.includes(r.meta.code)).map(r => ({code: r.meta.code, region: r.meta.region, revision: r.meta.revision, fingerprint: r.meta.fingerprint, fetchedAt: r.meta.fetchedAt})), pulls: manifest, limitations: draft.scope.limitations};
      const run = this.ledger.importRun(input, job.actor, provenance);
      job = {...job, status: 'complete', runId: run.id, completedAt: new Date().toISOString(), manifest}; this.saveJob(job);
      this.ledger.audit(job.actor, 'wcl.capture.complete', {jobId: id, runId: run.id, pulls: manifest.length, rawEvents: job.progress.events}, run.id);
    } catch (error) {
      job = this.job(id); const cancelled = signal.aborted || job.status === 'cancelled';
      this.saveJob({...job, status: cancelled ? 'cancelled' : 'failed', error: cancelled ? 'Capture cancelled; incomplete evidence was not imported.' : error instanceof DomainError ? error.message : 'WCL capture failed; incomplete evidence was not imported.', finishedAt: new Date().toISOString()});
      if (!cancelled) this.ledger.audit(job.actor, 'wcl.capture.failed', {jobId: id, error: this.job(id).error});
    }
  }
  rawPages(jobId, fightKey) {
    return this.ledger.db.prepare('SELECT * FROM wcl_pages WHERE job_id=? AND fight_key=? ORDER BY page_index').all(jobId, fightKey).map(row => {
      const batch = JSON.parse(gunzipSync(row.body).toString('utf8')); requireValue(digest(batch) === row.hash, 'Stored raw-page integrity mismatch', 409); return batch;
    });
  }
  async shutdown() { for (const controller of this.controllers.values()) controller.abort(); await Promise.allSettled([...this.tasks.values()]); }
}
