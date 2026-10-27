import {requireValue, string} from './policy.js';
export const roles = ['unclassified', 'booster', 'helper', 'raidleader', 'lb', 'buyer'];
export const reviewRoles = ['booster', 'helper', 'raidleader'];
export const participantKey = text => String(text).normalize('NFC').toLocaleLowerCase('en-US').replace(/[\s'’@-]/g, '');
export function responsiblePlayer(run, playerId) {
  const player = run.players.find(p => p.id === playerId);
  return player?.ownerId ? run.players.find(p => p.id === player.ownerId) : player;
}
export function validateLinks(players) {
  for (const p of players) if (p.ownerId) {
    const owner = players.find(o => o.id === p.ownerId);
    requireValue(owner && owner.id !== p.id && !owner.ownerId && reviewRoles.includes(owner.role) && !['buyer','lb'].includes(p.role), 'Alt links must point directly to a booster, helper or RL; buyers/LBs cannot be linked');
    requireValue(p.classificationNote?.trim().length >= 8, 'Explain the confirmed alt ownership before linking');
  }
}
export function classify(run, input) {
  requireValue(Array.isArray(input.players) && input.players.length === run.players.length && new Set(input.players.map(p => p.id)).size === run.players.length, 'Provide one classification for every character');
  const players = run.players.map(p => {
    const next = input.players.find(n => n.id === p.id);
    requireValue(next && roles.includes(next.role), 'Invalid participant classification');
    const note = next.classificationNote === undefined ? p.classificationNote ?? '' : next.classificationNote;
    requireValue(typeof note === 'string' && note.length <= 1000, 'Classification note must be at most 1,000 characters');
    const ownerId = next.ownerId === undefined ? p.ownerId ?? null : next.ownerId || null;
    const value = {...p, role: next.role, ownerId, classificationNote: note.trim()};
    if (p.role !== value.role || (p.ownerId ?? null) !== value.ownerId) {
      const affected = new Set([p.id,p.ownerId,value.ownerId].filter(Boolean));
      requireValue(!run.incidents.some(i => affected.has(i.playerId)), 'Withdraw affected deductions before changing role or alt ownership');
    }
    return value;
  });
  validateLinks(players); return players;
}
export function rosterMatches(players, text) {
  requireValue(typeof text === 'string' && text.length <= 10000, 'Roster list is too long');
  return text.split(/[\n,]/).map(s=>s.trim()).filter(Boolean).map(character=>{
    const matches = players.filter(p=>participantKey(p.character)===participantKey(character));
    return {character, playerId: matches.length === 1 ? matches[0].id : null, status: matches.length === 1 ? 'matched' : matches.length ? 'ambiguous' : 'unmatched'};
  });
}
