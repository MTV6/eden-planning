import {requireValue, string} from './policy.js';

export function validateRun(input) {
  requireValue(input?.schemaVersion === 1, 'Import must use schemaVersion 1');
  requireValue(Array.isArray(input.players) && input.players.length > 0 && input.players.length <= 100, 'Provide 1–100 players');
  const playerIds = new Set();
  const players = input.players.map(p => {
    const id = string(p.id, 'Player ID', 100);
    requireValue(!playerIds.has(id), 'Duplicate player ID'); playerIds.add(id);
    requireValue(['unclassified', 'booster', 'raidleader', 'lb', 'buyer'].includes(p.role), 'Invalid participant role');
    return {id, name: string(p.name, 'Player name', 150), character: string(p.character, 'Character and realm', 150), role: p.role};
  });
  requireValue(Array.isArray(input.pulls) && input.pulls.length > 0 && input.pulls.length <= 500, 'Provide 1–500 pulls');
  const pullIds = new Set(), eventIds = new Set();
  const pulls = input.pulls.map(p => {
    const id = string(p.id, 'Pull ID', 100); requireValue(!pullIds.has(id), 'Duplicate pull ID'); pullIds.add(id);
    requireValue(['kill', 'wipe'].includes(p.outcome), 'Pull outcome must be kill or wipe');
    requireValue(Number.isFinite(p.durationSeconds) && p.durationSeconds > 0 && p.durationSeconds <= 7200, 'Invalid pull duration');
    requireValue(Array.isArray(p.events) && p.events.length <= 10000, 'Provide up to 10,000 evidence events per pull');
    const events = p.events.map(e => {
      const eventId = string(e.id, 'Event ID', 150); requireValue(!eventIds.has(eventId), 'Evidence event IDs must be unique across the imported run'); eventIds.add(eventId);
      requireValue(playerIds.has(e.playerId), 'Event references unknown player');
      requireValue(Number.isFinite(e.timeSeconds) && e.timeSeconds >= 0 && e.timeSeconds <= p.durationSeconds, 'Evidence time falls outside pull');
      requireValue(['death', 'damage', 'cast', 'note'].includes(e.type), 'Unknown evidence event type');
      return {id: eventId, playerId: e.playerId, timeSeconds: e.timeSeconds, type: e.type, detail: string(e.detail, 'Event detail', 2000)};
    }).sort((a, b) => a.timeSeconds - b.timeSeconds);
    return {id, boss: string(p.boss, 'Boss name', 150), outcome: p.outcome, durationSeconds: p.durationSeconds, coverage: p.coverage === 'complete' ? 'import-declared-complete' : 'partial', events};
  });
  requireValue(Array.isArray(input.suggestions ?? []) && (input.suggestions ?? []).length <= 1000, 'Too many imported proposals');
  const proposalIds = new Set();
  const suggestions = (input.suggestions ?? []).map(s => {
    const id = string(s.id, 'Proposal ID', 100); requireValue(!proposalIds.has(id), 'Duplicate proposal ID'); proposalIds.add(id);
    const pull = pulls.find(p => p.id === s.pullId);
    requireValue(playerIds.has(s.playerId) && pull, 'Proposal references unknown player or pull');
    requireValue(Array.isArray(s.evidenceEventIds) && s.evidenceEventIds.every(e => pull.events.some(v => v.id === e)), 'Proposal evidence must belong to its pull');
    return {id, playerId: s.playerId, pullId: s.pullId, ruleId: s.ruleId === null ? null : string(s.ruleId, 'Rule ID', 80), evidenceEventIds: [...new Set(s.evidenceEventIds)], explanation: string(s.explanation, 'Proposal explanation', 3000), status: 'pending', provenance: 'Imported proposal; not verified automatic attribution'};
  });
  return {schemaVersion: 1, title: string(input.title, 'Run title', 200), source: input.source === 'synthetic' ? 'synthetic' : 'user-import', players, pulls, suggestions, incidents: [], rounding: {}, status: 'draft', confirmedAt: null};
}

export function summarize(run, policy) {
  const players = run.players.map(player => {
    const incidents = run.incidents.filter(i => i.playerId === player.id);
    const units = incidents.reduce((sum, i) => sum + i.units, 0);
    const rounding = run.rounding[player.id];
    const validRounding = rounding && rounding.units === units;
    return {...player, incidents, exactShares: units / 2, units, requiresRounding: units % 2 === 1,
      wholeShares: units % 2 === 0 ? units / 2 : validRounding ? rounding.wholeShares : null,
      rounding: validRounding ? rounding : null};
  });
  const bossWipes = Object.create(null);
  for (const pull of run.pulls) if (pull.outcome === 'wipe') { const key = pull.encounterKey ?? pull.boss; bossWipes[key] = (bossWipes[key] ?? 0) + 1; }
  return {players, bossWipes, totalWipes: Object.values(bossWipes).reduce((a, b) => a + b, 0),
    pending: run.suggestions.filter(s => s.ruleId !== null && s.status === 'pending').length,
    needsRounding: players.filter(p => p.requiresRounding && p.wholeShares === null).length,
    staffReview: run.incidents.filter(i => run.players.find(p => p.id === i.playerId)?.role === 'raidleader').length,
    totalExactShares: players.reduce((a, p) => a + p.exactShares, 0), policyVersion: policy.version};
}
