import {createHash} from 'node:crypto';
import {requireValue, string} from '../ledger/policy.js';
import {reportCode} from './client.js';
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalize = text => String(text ?? '').normalize('NFC').toLocaleLowerCase('en-US');
export function characterKey(name, realm) { return realm ? `${normalize(name)}@${normalize(realm).replace(/[\s'’-]/g, '')}` : null; }
const identityKey = (report, actor) => actor.realm && report.region ? `${report.region}:${characterKey(actor.name, actor.realm)}` : `${report.code}:${actor.id}`;
export function metadata(raw) {
  requireValue(raw && reportCode(raw.code) && Number.isFinite(raw.startTime) && Number.isFinite(raw.endTime) && Number.isInteger(raw.revision), 'Invalid WCL report metadata', 502);
  requireValue(Array.isArray(raw.fights) && Array.isArray(raw.masterData?.actors), 'WCL fight/actor metadata is missing', 502);
  const actors = raw.masterData.actors.filter(a => a.type === 'Player' && Number.isInteger(a.id)).map(a => ({id: a.id, name: string(a.name, 'WCL player name', 150), realm: typeof a.server === 'string' && a.server ? a.server : null}));
  requireValue(new Set(actors.map(a => a.id)).size === actors.length, 'Duplicate actor identity in report', 502);
  const known = new Set(actors.map(a => a.id));
  const fights = raw.fights.filter(f => f.encounterID > 0).map(f => {
    requireValue(Number.isInteger(f.id) && Number.isFinite(f.startTime) && Number.isFinite(f.endTime) && f.endTime > f.startTime, 'Invalid WCL fight interval', 502);
    const missing = !Array.isArray(f.friendlyPlayers) || f.friendlyPlayers.some(id => !known.has(id));
    const playerIds = [...new Set((f.friendlyPlayers ?? []).filter(id => known.has(id)))];
    return {id: f.id, key: `${raw.code}:${f.id}`, boss: string(f.name, 'Boss', 150), encounterId: f.encounterID, difficulty: f.difficulty, startTime: f.startTime, endTime: f.endTime,
      startEpoch: raw.startTime + f.startTime, endEpoch: raw.startTime + f.endTime,
      outcome: f.inProgress ? 'in-progress' : f.kill === true ? 'kill' : f.kill === false ? 'wipe' : 'unknown', playerIds,
      rosterIncomplete: missing || playerIds.length === 0, wipeCalledTime: Number.isFinite(f.wipeCalledTime) ? f.wipeCalledTime : null};
  });
  requireValue(new Set(fights.map(f => f.id)).size === fights.length, 'Duplicate fight identity', 502);
  return {code: raw.code, title: string(raw.title, 'Report title', 250), region: typeof raw.region?.slug === 'string' ? normalize(raw.region.slug) : null, startTime: raw.startTime, endTime: raw.endTime, revision: raw.revision, actors, fights, visibility: raw.visibility ?? 'unknown', fingerprint: digest(raw), fetchedAt: new Date().toISOString()};
}
export function rosterHints(value = '') {
  requireValue(typeof value === 'string' && value.length <= 10000, 'Roster hints too long');
  return value.split(/[\n,]/).map(v => v.trim()).filter(Boolean).map(line => {
    const dash = line.indexOf('-'); requireValue(dash > 0 && dash < line.length - 1, 'Roster hints must be Character-Realm, one per line');
    return characterKey(line.slice(0, dash).trim(), line.slice(dash + 1).trim());
  });
}
export function playersFor(reports, selectedKeys = null) {
  const players = new Map();
  for (const report of reports) {
    const fights = report.fights.filter(f => !selectedKeys || selectedKeys.includes(f.key));
    const ids = new Set(fights.flatMap(f => f.playerIds));
    for (const actor of report.actors.filter(a => ids.has(a.id))) {
      const key = identityKey(report, actor);
      const playerId = `wcl-${digest(key).slice(0, 24)}`;
      if (!players.has(playerId)) players.set(playerId, {id: playerId, name: actor.name, character: actor.realm ? `${actor.name}-${actor.realm}` : `${actor.name} (realm unknown)`, role: 'unclassified', references: [], identityKey: key, identityNote: actor.realm && report.region ? `${report.region.toUpperCase()}: exact character/realm only; Eden account ownership not verified.` : 'Realm or region unknown: kept separate by report/actor.'});
      players.get(playerId).references.push({reportCode: report.code, actorId: actor.id});
    }
  }
  return [...players.values()];
}
export function buildScope(reports, context = {}) {
  const expected = rosterHints(context.roster ?? ''), start = context.expectedStart ? Date.parse(context.expectedStart) : null;
  if (context.expectedStart) requireValue(/(?:Z|[+-]\d\d:\d\d)$/.test(context.expectedStart) && Number.isFinite(start), 'Start time needs an ISO timestamp with Z or an explicit timezone offset');
  const gapMinutes = Number(context.gapMinutes ?? 45), overlapMinimum = Number(context.overlapMinimum ?? 0.5);
  requireValue(gapMinutes >= 1 && gapMinutes <= 240 && overlapMinimum >= 0 && overlapMinimum <= 1, 'Invalid grouping settings');
  const fights = reports.flatMap(report => report.fights.map(f => ({...f, reportCode: report.code, region: report.region, participants: f.playerIds.map(id => identityKey(report, report.actors.find(a => a.id === id))), hintParticipants: f.playerIds.map(id => {const a = report.actors.find(a => a.id === id); return characterKey(a.name, a.realm);})}))).sort((a, b) => a.startEpoch - b.startEpoch || a.key.localeCompare(b.key));
  const duplicatePairs = [];
  for (let i = 0; i < fights.length; i++) for (let j = i + 1; j < fights.length; j++) {
    const a = fights[i], b = fights[j]; if (b.startEpoch - a.startEpoch > 5000) break;
    const overlap = a.participants.filter(v => b.participants.includes(v)).length / Math.max(1, Math.max(a.participants.length, b.participants.length));
    if (a.reportCode !== b.reportCode && a.encounterId === b.encounterId && a.difficulty === b.difficulty && Math.abs(a.endEpoch - b.endEpoch) <= 5000 && overlap >= 0.8) duplicatePairs.push([a.key, b.key]);
  }
  const suppressed = new Set(duplicatePairs.map(pair => pair[1]));
  const groups = [];
  for (const fight of fights.filter(f => !suppressed.has(f.key) && ['kill', 'wipe'].includes(f.outcome))) {
    const group = groups.at(-1), previous = group?.fights.at(-1);
    let boundary = null;
    if (previous) {
      const overlap = previous.participants.filter(v => fight.participants.includes(v)).length / Math.max(1, Math.min(previous.participants.length, fight.participants.length));
      if (fight.startEpoch - previous.endEpoch > gapMinutes * 60000) boundary = 'Long gap';
      else if (fight.difficulty !== previous.difficulty) boundary = 'Difficulty changed';
      else if (!previous.rosterIncomplete && !fight.rosterIncomplete && overlap < overlapMinimum) boundary = 'Roster changed';
      else if (group.fights.some(f => f.encounterId === fight.encounterId && f.outcome === 'kill')) boundary = 'Previously killed boss appears again';
    }
    if (!group || boundary) groups.push({fights: [fight], reason: boundary ?? 'First available encounter'}); else group.fights.push(fight);
  }
  const candidates = groups.map((g, index) => ({id: `candidate-${index + 1}`, fightKeys: g.fights.map(f => f.key), reason: g.reason,
    kills: g.fights.filter(f => f.outcome === 'kill').length, wipes: g.fights.filter(f => f.outcome === 'wipe').length,
    startEpoch: g.fights[0].startEpoch, endEpoch: Math.max(...g.fights.map(f => f.endEpoch)), bosses: [...new Set(g.fights.map(f => f.boss))],
    rosterMatch: expected.length ? g.fights.reduce((sum, f) => sum + expected.filter(v => f.hintParticipants.includes(v)).length / expected.length, 0) / g.fights.length : null,
    startDistanceMinutes: start === null ? null : Math.abs(g.fights[0].startEpoch - start) / 60000}));
  let suggestedCandidateId = null;
  if (expected.length) {
    const ranked = [...candidates].sort((a, b) => b.rosterMatch - a.rosterMatch);
    if (ranked[0]?.rosterMatch >= 0.7 && (ranked.length === 1 || ranked[0].rosterMatch - ranked[1].rosterMatch >= 0.2)) suggestedCandidateId = ranked[0].id;
  }
  if (!suggestedCandidateId && start !== null) {
    const ranked = [...candidates].sort((a, b) => a.startDistanceMinutes - b.startDistanceMinutes);
    if (ranked[0]?.startDistanceMinutes <= 90 && (ranked.length === 1 || ranked[1].startDistanceMinutes - ranked[0].startDistanceMinutes >= 30) && (ranked[0].rosterMatch === null || ranked[0].rosterMatch >= 0.7)) suggestedCandidateId = ranked[0].id;
  }
  return {fights, candidates, suggestedCandidateId, duplicatePairs, context: {roster: context.roster ?? '', expectedStart: context.expectedStart ?? '', gapMinutes, overlapMinimum}, players: playersFor(reports), limitations: [
    'Groups are hypotheses. Confirm exact pulls; same-roster back-to-back runs may be ambiguous.',
    'A boost can span raids, difficulties, breaks or replacements. Combine or split candidates as needed.',
    'Likely cross-report duplicates must be resolved by selecting one recording for that pull.',
    'Kill=false is a logged failed attempt; deliberate resets and aborted-pull counting still need review.',
    'Character matches do not verify Eden account ownership, booster status, clients or LBs.'
  ]};
}
export function selectScope(draft, keys) {
  requireValue(Array.isArray(keys) && keys.length > 0 && keys.length <= 200 && new Set(keys).size === keys.length, 'Select 1–200 distinct pulls');
  const fights = keys.map(key => draft.scope.fights.find(f => f.key === key));
  requireValue(fights.every(f => f && ['kill', 'wipe'].includes(f.outcome)), 'Unknown, in-progress or unknown-outcome pull selected');
  requireValue(!draft.scope.duplicatePairs.some(([a, b]) => keys.includes(a) && keys.includes(b)), 'Likely duplicate pull selected from two reports. Keep one recording before capture.');
  return fights.sort((a, b) => a.startEpoch - b.startEpoch || a.key.localeCompare(b.key));
}
