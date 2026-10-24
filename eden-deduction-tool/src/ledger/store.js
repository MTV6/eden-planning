import {DatabaseSync} from 'node:sqlite';
import {createHash, randomUUID} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {initialPolicy, validatePolicy, requireValue, string, eligibility, halfUnits} from './policy.js';
import {validateRun, summarize} from './run.js';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export class Ledger {
  constructor(path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), {recursive: true});
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS policy(version INTEGER PRIMARY KEY, body TEXT NOT NULL, hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, revision INTEGER NOT NULL, policy_version INTEGER NOT NULL REFERENCES policy(version), body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS wcl_run_links(job_id TEXT PRIMARY KEY,run_id TEXT UNIQUE NOT NULL REFERENCES runs(id));
      CREATE TABLE IF NOT EXISTS audit(sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, run_id TEXT, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, details TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL);`);
    if (!this.db.prepare('SELECT version FROM policy LIMIT 1').get()) this.publishPolicy(initialPolicy, 'System seed', 'Initial standard policy');
  }
  close() { this.db.close(); }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  audit(actor, action, details, runId = null) {
    const previous = this.db.prepare('SELECT hash FROM audit ORDER BY sequence DESC LIMIT 1').get()?.hash ?? 'genesis';
    const record = {id: randomUUID(), runId, at: new Date().toISOString(), actor: string(actor, 'Local reviewer name', 100), action, details, previousHash: previous};
    this.db.prepare('INSERT INTO audit(id,run_id,at,actor,action,details,previous_hash,hash) VALUES(?,?,?,?,?,?,?,?)')
      .run(record.id, runId, record.at, record.actor, action, JSON.stringify(details), previous, hash(record));
  }
  policy(version) {
    const row = version ? this.db.prepare('SELECT * FROM policy WHERE version=?').get(version) : this.db.prepare('SELECT * FROM policy ORDER BY version DESC LIMIT 1').get();
    requireValue(row, 'Policy not found', 404); return {...JSON.parse(row.body), version: row.version, hash: row.hash};
  }
  publishPolicy(input, actor, reason, expectedVersion) {
    const policy = validatePolicy(input); string(reason, 'Publication reason', 2000);
    return this.transaction(() => {
      const last = this.db.prepare('SELECT MAX(version) AS version FROM policy').get().version ?? 0;
      if (expectedVersion !== undefined) requireValue(expectedVersion === last, 'Policy changed; reload before publishing', 409);
      const version = last + 1;
      this.db.prepare('INSERT INTO policy VALUES(?,?,?)').run(version, JSON.stringify(policy), hash(policy));
      this.audit(actor, 'policy.published', {version, reason, policy}); return this.policy(version);
    });
  }
  listRuns() { return this.db.prepare('SELECT * FROM runs ORDER BY rowid DESC').all().map(row => ({id: row.id, revision: row.revision, policyVersion: row.policy_version, title: JSON.parse(row.body).title, status: JSON.parse(row.body).status})); }
  run(id) {
    const row = this.db.prepare('SELECT * FROM runs WHERE id=?').get(id); requireValue(row, 'Run not found', 404);
    const run = {...JSON.parse(row.body), id: row.id, revision: row.revision, policyVersion: row.policy_version};
    return {...run, summary: summarize(run, this.policy(row.policy_version)), policy: this.policy(row.policy_version)};
  }
  importRun(input, actor, wclProvenance = null) {
    const run = validateRun(input), policy = this.policy(wclProvenance?.policyVersion), id = randomUUID();
    if (wclProvenance) {
      const existing = this.db.prepare('SELECT run_id FROM wcl_run_links WHERE job_id=?').get(wclProvenance.jobId);
      if (existing) return this.run(existing.run_id);
      run.source = 'warcraftlogs'; run.wcl = wclProvenance;
      for (const pull of run.pulls) {
        pull.coverage = 'api-pages-complete';
        const manifest = wclProvenance.pulls.find(p => p.fightKey === pull.id);
        pull.encounterKey = `${manifest.encounterId}:${manifest.difficulty}`;
      }
    }
    for (const suggestion of run.suggestions) if (suggestion.ruleId !== null) requireValue(policy.rules.some(r => r.id === suggestion.ruleId), 'Imported proposal uses unknown rule');
    return this.transaction(() => {
      this.db.prepare('INSERT INTO runs VALUES(?,?,?,?)').run(id, 1, policy.version, JSON.stringify(run));
      if (wclProvenance) this.db.prepare('INSERT INTO wcl_run_links VALUES(?,?)').run(wclProvenance.jobId, id);
      this.audit(actor, 'run.imported', {title: run.title, source: run.source, policyVersion: policy.version, players: run.players.length, pulls: run.pulls.length}, id);
      for (const s of run.suggestions) this.audit(actor, 'suggestion.created', s, id);
      return this.run(id);
    });
  }
  mutate(id, revision, actor, fn) {
    return this.transaction(() => {
      const current = this.run(id); requireValue(current.revision === revision, 'Run changed; reload before editing', 409);
      const {summary, policy, id: ignoredId, revision: ignoredRevision, policyVersion, ...run} = current;
      fn(run, policy);
      this.db.prepare('UPDATE runs SET body=?, revision=revision+1 WHERE id=?').run(JSON.stringify(run), id);
      return this.run(id);
    });
  }
  addIncident(run, policy, input, actor, runId) {
    const player = run.players.find(p => p.id === input.playerId), pull = run.pulls.find(p => p.id === input.pullId), rule = policy.rules.find(r => r.id === input.ruleId);
    requireValue(player && ['booster', 'raidleader'].includes(player.role), 'Select an eligible booster or RL; classify unknown participants first');
    requireValue(pull && rule, 'Select a pull and rule'); requireValue(rule.outcomes.includes(pull.outcome), 'Rule does not apply to this pull outcome');
    const reason = string(input.reason, 'Deduction reason', 3000);
    const evidenceNote = (input.evidenceNote ?? '').trim(); requireValue(evidenceNote.length <= 3000, 'Evidence note too long');
    const ids = [...new Set(input.evidenceEventIds ?? [])]; requireValue(ids.length <= 100 && ids.every(id => pull.events.some(e => e.id === id)), 'Evidence must belong to selected pull');
    const capture = run.wcl?.pulls.find(p => p.fightKey === pull.id);
    if (rule.category === 'performance' && capture?.wipeCalledTime !== null && Number.isFinite(capture?.wipeCalledTime) && ids.length) {
      const cutoff = (capture.wipeCalledTime - capture.startTime) / 1000;
      requireValue(!ids.every(id => pull.events.find(e => e.id === id).timeSeconds >= cutoff), 'Selected evidence is after the recorded wipe call; it cannot establish a new performance mistake.');
    }
    requireValue(ids.length > 0 || evidenceNote.length >= 8, 'Select evidence or describe the supporting evidence');
    const applicable = eligibility(run, policy, rule, pull);
    const applicabilityNote = (input.applicabilityNote ?? '').trim();
    requireValue(applicabilityNote.length <= 2000, 'Applicability explanation too long');
    if (!applicable.eligible) {
      requireValue(applicabilityNote.length >= 10, applicable.reason + ' Explain applicability before confirming.');
      if (rule.category === 'performance') requireValue(['damage-1pct', 'healing-deaths'].includes(input.exception), 'Before-trigger wipe deductions require a stated damage/healing exception');
    }
    const incidentKey = string(input.incidentKey, 'Incident key (group the same mistake together)', 200);
    requireValue(!run.incidents.some(i => i.playerId === player.id && i.pullId === pull.id && i.incidentKey === incidentKey), 'This player already has a deduction for this incident; remove the old entry before replacing it');
    const incident = {id: randomUUID(), playerId: player.id, pullId: pull.id, ruleId: rule.id, ruleLabel: rule.label, units: halfUnits(rule.shares), reason, evidenceNote, evidenceEventIds: ids, incidentKey, applicability: {...applicable, note: applicabilityNote, exception: input.exception ?? null}, proposalId: input.proposalId ?? null, actor, at: new Date().toISOString()};
    run.incidents.push(incident); delete run.rounding[player.id];
    this.audit(actor, 'incident.accepted', incident, runId); return incident;
  }
  act(id, input, actor) {
    return this.mutate(id, input.revision, actor, (run, policy) => {
      if (input.action === 'reopen') {
        requireValue(run.status === 'confirmed', 'Only confirmed reviews can be reopened');
        run.status = 'draft'; run.confirmedAt = null; run.confirmedBy = null;
        this.audit(actor, 'review.reopened', {reason: string(input.reason, 'Reopen reason', 2000)}, id); return;
      }
      requireValue(run.status === 'draft', 'Review is confirmed. Reopen it before changing decisions.', 409);
      if (input.action === 'classify') {
        requireValue(Array.isArray(input.players) && input.players.length === run.players.length && new Set(input.players.map(p => p.id)).size === run.players.length, 'Provide one role for each player');
        const changes = [];
        for (const player of run.players) {
          const next = input.players.find(p => p.id === player.id);
          requireValue(next && ['unclassified', 'booster', 'raidleader', 'buyer', 'lb'].includes(next.role), 'Invalid participant classification');
          if (player.role !== next.role) {
            requireValue(!run.incidents.some(i => i.playerId === player.id), 'Withdraw accepted deductions before changing that player’s role');
            changes.push({playerId: player.id, from: player.role, to: next.role}); player.role = next.role;
          }
        }
        this.audit(actor, 'participants.classified', {changes}, id);
      }
      else if (input.action === 'add') this.addIncident(run, policy, {...input, proposalId: null}, actor, id);
      else if (input.action === 'decision') {
        const proposal = run.suggestions.find(s => s.id === input.proposalId); requireValue(proposal, 'Proposal not found');
        requireValue(proposal.status === 'pending', 'Proposal already reviewed; remove its incident before reconsidering');
        requireValue(['accept', 'reject'].includes(input.decision), 'Invalid decision');
        if (input.decision === 'accept') {
          requireValue(proposal.ruleId !== null, 'Observation has no approved tariff and cannot be accepted as a deduction');
          this.addIncident(run, policy, {...input, playerId: proposal.playerId, pullId: proposal.pullId, ruleId: proposal.ruleId, evidenceEventIds: proposal.evidenceEventIds, incidentKey: input.incidentKey ?? proposal.evidenceEventIds[0] ?? proposal.id}, actor, id);
        } else string(input.reason, 'Rejection reason', 3000);
        proposal.status = input.decision === 'accept' ? 'accepted' : 'rejected';
        this.audit(actor, 'suggestion.reviewed', {proposalId: proposal.id, decision: input.decision, reason: input.reason}, id);
      } else if (input.action === 'remove') {
        const index = run.incidents.findIndex(i => i.id === input.incidentId); requireValue(index >= 0, 'Incident not found');
        const [incident] = run.incidents.splice(index, 1); delete run.rounding[incident.playerId];
        if (incident.proposalId) run.suggestions.find(s => s.id === incident.proposalId).status = 'pending';
        this.audit(actor, 'incident.removed', {incident, reason: string(input.reason, 'Removal reason', 2000)}, id);
      } else if (input.action === 'round') {
        const player = summarize(run, policy).players.find(p => p.id === input.playerId);
        requireValue(player?.requiresRounding, 'Only fractional player totals need rounding');
        requireValue(['down', 'up'].includes(input.direction), 'Choose round down or round up; there is no automatic default');
        const rounding = {units: player.units, direction: input.direction, wholeShares: input.direction === 'down' ? Math.floor(player.exactShares) : Math.ceil(player.exactShares), reason: (input.reason ?? '').trim(), actor, at: new Date().toISOString()};
        requireValue(rounding.reason.length <= 2000, 'Rounding reason too long'); run.rounding = {...run.rounding, [player.id]: rounding};
        this.audit(actor, 'rounding.chosen', {playerId: player.id, exactShares: player.exactShares, ...rounding}, id);
      } else if (input.action === 'confirm') {
        const summary = summarize(run, policy);
        requireValue(!summary.pending, 'Review or reject all priced proposals first');
        requireValue(!summary.needsRounding, 'Choose rounding for every fractional player total first');
        requireValue(!summary.staffReview, 'RL-targeted deductions need a staff review workflow; final export is unavailable in this milestone');
        run.status = 'confirmed'; run.confirmedAt = new Date().toISOString(); run.confirmedBy = actor;
        this.audit(actor, 'review.confirmed', {policyVersion: policy.version, exactShares: summary.totalExactShares, output: summary.players.filter(p => p.incidents.length).map(p => ({playerId: p.id, exactShares: p.exactShares, wholeShares: p.wholeShares}))}, id);
      } else requireValue(false, 'Unknown review action');
    });
  }
  exportRun(id) {
    const run = this.run(id); requireValue(run.status === 'confirmed', 'Confirm the review before exporting');
    return {schemaVersion: 1, kind: 'eden-deduction-proposal', source: run.source, runId: run.id, title: run.title, revision: run.revision, policyVersion: run.policyVersion, confirmedAt: run.confirmedAt, confirmedBy: run.confirmedBy,
      appliedToEden: false, wcl: run.wcl ?? null, note: 'Local review output only. No Eden run, gold or Discord message was changed.',
      deductions: run.summary.players.filter(p => p.incidents.length).map(p => ({playerId: p.id, character: p.character, name: p.name, exactSharesRemoved: p.exactShares, wholeSharesRemoved: p.wholeShares, rounding: p.rounding, reason: p.incidents.map(i => `${i.ruleLabel}: ${i.reason} (${i.units / 2} shares)`).join('; '), incidents: p.incidents.map(i => ({...i, pull: run.pulls.find(pull => pull.id === i.pullId), evidence: run.pulls.find(pull => pull.id === i.pullId).events.filter(e => i.evidenceEventIds.includes(e.id))}))}))};
  }
  history(runId) {
    const rows = runId ? this.db.prepare('SELECT * FROM audit WHERE run_id=? ORDER BY sequence DESC').all(runId) : this.db.prepare('SELECT * FROM audit ORDER BY sequence DESC LIMIT 1000').all();
    return rows.map(r => ({sequence: r.sequence, id: r.id, runId: r.run_id, at: r.at, actor: r.actor, action: r.action, details: JSON.parse(r.details), previousHash: r.previous_hash, hash: r.hash}));
  }
  verifyAudit() {
    const rows = this.db.prepare('SELECT * FROM audit ORDER BY sequence').all(); let previous = 'genesis';
    for (const r of rows) { const record = {id: r.id, runId: r.run_id, at: r.at, actor: r.actor, action: r.action, details: JSON.parse(r.details), previousHash: r.previous_hash}; if (r.previous_hash !== previous || hash(record) !== r.hash) return false; previous = r.hash; }
    return true;
  }
}
