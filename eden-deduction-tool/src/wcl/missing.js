import {randomUUID} from 'node:crypto';
import {DomainError, requireValue} from '../ledger/policy.js';
import {metadata, characterKey, selectScope, digest, samePullTiming} from './scope.js';
import {reportCode} from './client.js';

const norm = value => String(value).normalize('NFC').toLocaleLowerCase('en-US').replace(/[\s'’-]/g, '');
const minute = 60000;
export function searchRoster(text) {
  requireValue(typeof text === 'string' && text.length <= 10000, 'Enter the expected roster as Character-Realm');
  const rows = text.split(/[\n,]/).map(s => s.trim()).filter(Boolean).map(s => {
    const dash = s.indexOf('-'); requireValue(dash > 0 && dash < s.length - 1, 'Roster entries need Character-Realm');
    const name = s.slice(0, dash).trim(), realm = s.slice(dash + 1).trim();
    requireValue(name.length <= 150 && realm.length <= 150, 'Character or realm is too long');
    return {name, realm, key: characterKey(name, realm)};
  });
  const unique = [...new Map(rows.map(r => [r.key, r])).values()];
  requireValue(unique.length >= 2 && unique.length <= 40, 'Missing-log search needs 2–40 expected roster characters');
  return unique;
}
export function resolveRealm(realm, directory) {
  const matches = directory.filter(r => [r.name, r.normalizedName, r.slug].some(v => v && norm(v) === norm(realm)));
  const slugs = [...new Set(matches.map(r => r.slug))];
  return slugs.length === 1 ? slugs[0] : null;
}
export function matchReport(report, {baseline, roster, region, start, end}) {
  if (report.region !== region) return null;
  const expected = new Set(roster.map(r => r.key)), difficulties = new Set(baseline.map(f => f.difficulty));
  const knownKeys = f => f.playerIds.map(id => report.actors.find(a => a.id === id)).filter(Boolean).map(a => characterKey(a.name, a.realm));
  const matching = report.fights.filter(f => ['kill', 'wipe'].includes(f.outcome) && difficulties.has(f.difficulty) && report.startTime + f.startTime >= start && report.startTime + f.endTime <= end).map(f => {
    const present = [...new Set(knownKeys(f).filter(k => expected.has(k)))];
    const samePull = baseline.some(b => samePullTiming(b, {...f, startEpoch: report.startTime + f.startTime, endEpoch: report.startTime + f.endTime}));
    return {...f, matchedCharacters: present.length, rosterFraction: present.length / expected.size, samePull};
  }).filter(f => f.matchedCharacters >= 2 && (f.rosterFraction >= 0.25 || f.samePull));
  if (!matching.length) return null;
  const overlap = matching.filter(f => f.samePull).length, additions = matching.filter(f => !f.samePull);
  const maxFraction = Math.max(...matching.map(f => f.rosterFraction));
  return {code: report.code, title: report.title, url: `https://www.warcraftlogs.com/reports/${report.code}`, confidence: overlap || maxFraction >= 0.5 ? 'likely' : 'possible',
    matchedRoster: Math.max(...matching.map(f => f.matchedCharacters)), expectedRoster: expected.size,
    overlapPulls: overlap, additionalPulls: additions.length, additionalKills: additions.filter(f => f.outcome === 'kill').length, additionalWipes: additions.filter(f => f.outcome === 'wipe').length,
    bosses: [...new Set(matching.map(f => f.boss))], firstPullAt: Math.min(...matching.map(f => report.startTime + f.startTime)), lastPullAt: Math.max(...matching.map(f => report.startTime + f.endTime)),
    matchingFightKeys: matching.map(f => f.key), evidence: `${overlap} near-identical known pulls; up to ${Math.max(...matching.map(f => f.matchedCharacters))}/${expected.size} expected characters on a matching pull.`,
    caution: 'Time and roster matches are suggestions. Additional pulls may belong to another run; inspect before capture. Different recordings are not automatically deduplicated here.'};
}

export class MissingLogSearch {
  constructor(service, now = () => Date.now()) {
    this.service = service; this.now = now; this.busy = false;
    service.ledger.db.exec('CREATE TABLE IF NOT EXISTS wcl_search_cache(key TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS wcl_searches(id TEXT PRIMARY KEY,body TEXT NOT NULL);');
  }
  get(id) { const row = this.service.ledger.db.prepare('SELECT body FROM wcl_searches WHERE id=?').get(id); requireValue(row, 'Search not found', 404); return JSON.parse(row.body); }
  list() { return this.service.ledger.db.prepare('SELECT body FROM wcl_searches ORDER BY rowid DESC LIMIT 10').all().map(r => {const x = JSON.parse(r.body); return {id: x.id, createdAt: x.createdAt, draftId: x.draftId, candidates: x.candidates.length, characters: x.characters.length};}); }
  async search(input, actor) {
    requireValue(!this.busy, 'A missing-log search is already running', 409);
    const draft = this.service.draft(input.draftId), baseline = selectScope(draft, input.fightKeys);
    const regions = [...new Set(baseline.map(f => draft.reports.find(r => r.meta.code === f.reportCode).meta.region))];
    requireValue(regions.length === 1 && ['eu', 'us', 'kr', 'tw', 'cn'].includes(regions[0]), 'Select known pulls from one known region');
    const region = regions[0], roster = searchRoster(input.roster ?? draft.scope.context.roster);
    const parseTime = value => { requireValue(typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)), 'Search times require ISO timestamps with timezone offsets'); return Date.parse(value); };
    const start = parseTime(input.start), end = parseTime(input.end);
    requireValue(end > start && end - start <= 12 * 3600000, 'Choose a search window of at most 12 hours');
    requireValue(baseline.every(f => f.startEpoch >= start && f.endEpoch <= end), 'The search window must contain your selected known pulls');
    const playerLimit = Number(input.playerLimit ?? 6), pagesPerPlayer = Number(input.pagesPerPlayer ?? 2);
    requireValue(Number.isInteger(playerLimit) && playerLimit >= 1 && playerLimit <= 40 && Number.isInteger(pagesPerPlayer) && pagesPerPlayer >= 1 && pagesPerPlayer <= 3, 'Search up to 40 characters and 1–3 pages each');
    const present = new Set(baseline.flatMap(f => {const report = draft.reports.find(r => r.meta.code === f.reportCode).meta; return f.playerIds.map(id => report.actors.find(a => a.id === id)).filter(Boolean).map(a => characterKey(a.name, a.realm));}));
    const targets = [...roster].sort((a,b) => Number(present.has(a.key)) - Number(present.has(b.key))).slice(0, playerLimit);
    const result = {id: randomUUID(), draftId: draft.id, actor, createdAt: new Date(this.now()).toISOString(), region, start, end, roster, baselineFightKeys: baseline.map(f => f.key), characters: [], candidates: [], errors: [], limits: {playerLimit, pagesPerPlayer, queryBudget: 60, candidateReportLimit: 16}, queries: 0, cacheHits: 0, unsearchedCharacters: roster.length - targets.length, limited: false,
      limitations: ['Character history is not a complete index of all uploads. Private, unlisted, hidden, deleted or unindexed reports may be absent.', 'Page, character and report limits bound the search. No result means none found in this search, not that no other report exists.', 'Matches require human review. No pulls, roles, deductions or payouts are changed by searching.']};
    const deadline = this.now() + 120000;
    const signal = AbortSignal.timeout(120000);
    const cached = async (key, ttl, cost, fetcher) => {
      const cacheKey = digest(key), row = this.service.ledger.db.prepare('SELECT * FROM wcl_search_cache WHERE key=?').get(cacheKey);
      if (row && row.expires_at > this.now()) { result.cacheHits++; return JSON.parse(row.body); }
      requireValue(this.now() < deadline && result.queries + cost <= result.limits.queryBudget, 'Search budget reached; partial results retained', 429);
      result.queries += cost;
      const value = await fetcher(); this.service.ledger.db.prepare('INSERT INTO wcl_search_cache VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET expires_at=excluded.expires_at,body=excluded.body').run(cacheKey, this.now()+ttl, JSON.stringify(value)); return value;
    };
    this.busy = true;
    try {
      const directory = await cached(['realms-v1', region], 86400000, 2, () => this.service.client.realms(region, signal));
      const discovered = new Map(), existing = new Set(draft.reports.map(r => r.meta.code));
      for (const target of targets) {
        const row = {character: `${target.name}-${target.realm}`, missingFromKnownPulls: !present.has(target.key), pages: 0, status: 'searched', reportsInWindow: 0}; result.characters.push(row);
        const slug = resolveRealm(target.realm, directory);
        if (!slug) { row.status = 'realm-unresolved'; continue; }
        try {
          for (let page = 1; page <= pagesPerPlayer; page++) {
            requireValue(result.queries < 44, 'Character-query budget reached; remaining budget reserved for candidate metadata', 429);
            const character = await cached(['history-v1', region, slug, target.name.normalize('NFC').toLowerCase(), page], 10*minute, 1, () => this.service.client.characterReports({...target, slug, region}, page, signal));
            if (!character) { row.status = 'character-unavailable'; break; }
            if (character.hidden) { row.status = 'hidden'; break; }
            requireValue(character.name?.normalize('NFC').toLowerCase() === target.name.normalize('NFC').toLowerCase() && character.server?.slug === slug && character.server?.region?.slug.toLowerCase() === region, 'Character identity mismatch', 502);
            const history = character.recentReports;
            requireValue(Array.isArray(history?.data) && history.current_page === page && typeof history.has_more_pages === 'boolean', 'Incomplete character history response', 502);
            row.pages++;
            for (const report of history.data) {
              if (!Number.isFinite(report.startTime) || !Number.isFinite(report.endTime) || report.endTime < start || report.startTime > end) continue;
              const code = reportCode(report.code); if (existing.has(code)) continue;
              row.reportsInWindow++;
              if (!discovered.has(code)) discovered.set(code, {...report, foundVia: []});
              const found = discovered.get(code); if (!found.foundVia.includes(row.character)) found.foundVia.push(row.character);
            }
            if (!history.has_more_pages) break;
            if (page === pagesPerPlayer) { row.status = 'page-limit'; result.limited = true; }
          }
        } catch (error) { row.status = 'unavailable'; row.error = error instanceof DomainError ? error.message : 'Character lookup failed'; result.limited = true; }
      }
      const reports = [...discovered.values()].sort((a,b) => b.foundVia.length-a.foundVia.length);
      result.discoveredReports = reports.length; result.uncheckedReports = Math.max(0, reports.length-result.limits.candidateReportLimit);
      if (result.uncheckedReports || result.unsearchedCharacters) result.limited = true;
      for (const found of reports.slice(0, result.limits.candidateReportLimit)) {
        try {
          const raw = await cached(['metadata-v1', found.code], 10*minute, 1, () => this.service.client.report(found.code, signal));
          const candidate = matchReport(metadata(raw), {baseline, roster, region, start, end});
          if (candidate) result.candidates.push({...candidate, uploader: found.owner?.name ?? 'Unknown', foundVia: found.foundVia});
        } catch (error) { result.errors.push({code: found.code, error: error instanceof DomainError ? error.message : 'Report unavailable'}); result.limited = true; }
      }
      result.candidates.sort((a,b) => Number(b.confidence==='likely')-Number(a.confidence==='likely') || b.overlapPulls-a.overlapPulls || b.matchedRoster-a.matchedRoster || b.additionalPulls-a.additionalPulls);
    } catch (error) { result.errors.push({error: error instanceof DomainError ? error.message : 'Missing-log search failed'}); result.limited = true; }
    finally { this.busy = false; }
    result.finishedAt = new Date(this.now()).toISOString();
    this.service.ledger.db.prepare('INSERT INTO wcl_searches VALUES(?,?)').run(result.id, JSON.stringify(result));
    this.service.ledger.audit(actor, 'wcl.missing.search', {searchId: result.id, draftId: draft.id, candidates: result.candidates.length, queries: result.queries, cacheHits: result.cacheHits, limited: result.limited});
    return result;
  }
  async add(input, actor) {
    requireValue(input.confirmed === true, 'Confirm that you want to load this candidate for review');
    const search = this.get(input.searchId), candidate = search.candidates.find(c => c.code === input.code);
    requireValue(candidate, 'Candidate was not part of this search');
    const draft = this.service.draft(search.draftId), codes = [...new Set([...draft.reports.map(r => r.meta.code), candidate.code])];
    requireValue(codes.length <= 4, 'Four-report limit reached. Start a new selection with the most useful reports.');
    const next = await this.service.discover({reports: codes, context: {...draft.scope.context, roster: search.roster.map(r => `${r.name}-${r.realm}`).join('\n')}}, actor);
    this.service.ledger.audit(actor, 'wcl.missing.loaded', {searchId: search.id, reportCode: candidate.code, draftId: next.id});
    return next;
  }
}
