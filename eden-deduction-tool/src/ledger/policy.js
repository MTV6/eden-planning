export class DomainError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function requireValue(condition, message, status = 400) {
  if (!condition) throw new DomainError(message, status);
}
export function string(value, label, max = 1000) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${label} is required (maximum ${max} characters)`);
  return value.trim();
}
export function halfUnits(value) {
  requireValue(Number.isFinite(value) && value > 0 && value <= 100 && Number.isInteger(value * 2), 'Rule shares must be positive half shares, at most 100');
  return value * 2;
}
export const initialPolicy = {
  name: 'Eden standard policy',
  thresholds: {bossWipes: 3, runWipes: 6, damageParseMinimum: 50, staffEscalationWipes: 6},
  rules: [
    {id: 'avoidable-death', label: 'Small mistake: avoidable death', shares: 0.5, category: 'performance', outcomes: ['kill', 'wipe'], description: 'Avoidable death without major wipe impact; reviewer must establish responsibility.'},
    {id: 'wipe-causing', label: 'Big mistake: directly caused wipe', shares: 1, category: 'performance', outcomes: ['wipe'], description: 'One incident that directly caused the wipe, before recovery became impossible.'},
    {id: 'voice', label: 'Voice requirement violation', shares: 1, category: 'requirement', outcomes: ['kill', 'wipe'], description: 'Manual evidence required. Before-trigger and frequency definitions need clarification.'},
    {id: 'preparation', label: 'Preparation requirement violation', shares: 1, category: 'requirement', outcomes: ['kill', 'wipe'], description: 'Manual evidence and applicability explanation required.'},
    {id: 'attendance', label: 'Attendance requirement violation', shares: 1, category: 'requirement', outcomes: ['kill', 'wipe'], description: 'Do not infer a no-show from incomplete logs or confuse this with partial participation pay.'},
    {id: 'conduct', label: 'Conduct requirement violation', shares: 1, category: 'requirement', outcomes: ['kill', 'wipe'], description: 'Record the defined requirement, evidence and manual applicability decision.'},
    {id: 'dc-wipe', label: 'Disconnect caused preventable mechanic wipe', shares: 1, category: 'performance', outcomes: ['wipe'], description: 'Disconnect and preventable missed mechanic must be supported; inactivity alone is insufficient.'}
  ]
};
export function validatePolicy(input) {
  requireValue(input && typeof input === 'object', 'Policy is required');
  const thresholds = {};
  for (const key of Object.keys(initialPolicy.thresholds)) {
    const value = input.thresholds?.[key];
    requireValue(Number.isInteger(value) && value >= 1 && value <= (key === 'damageParseMinimum' ? 100 : 1000), `Invalid threshold: ${key}`);
    thresholds[key] = value;
  }
  requireValue(Array.isArray(input.rules) && input.rules.length > 0 && input.rules.length <= 100, 'Provide 1–100 rules');
  const ids = new Set();
  const rules = input.rules.map(rule => {
    const id = string(rule.id, 'Rule ID', 80);
    requireValue(/^[a-z0-9-]+$/.test(id) && !ids.has(id), 'Rule IDs must be unique lowercase letters, numbers and hyphens'); ids.add(id);
    requireValue(['performance', 'requirement'].includes(rule.category), 'Invalid rule category');
    requireValue(Array.isArray(rule.outcomes) && rule.outcomes.length > 0 && rule.outcomes.every(v => ['kill', 'wipe'].includes(v)), 'Invalid rule pull outcomes');
    halfUnits(rule.shares);
    return {id, label: string(rule.label, 'Rule label', 150), description: string(rule.description, 'Rule description', 2000), shares: rule.shares, category: rule.category, outcomes: [...new Set(rule.outcomes)]};
  });
  return {name: string(input.name, 'Policy name', 120), thresholds, rules};
}

export function eligibility(run, policy, rule, pull) {
  const bossWipes = run.pulls.filter(p => p.outcome === 'wipe' && (p.encounterKey ?? p.boss) === (pull.encounterKey ?? pull.boss)).length;
  const runWipes = run.pulls.filter(p => p.outcome === 'wipe').length;
  if (rule.category === 'requirement') return {eligible: false, manual: true, reason: 'Requirement applicability/frequency needs a manual explanation.'};
  if (pull.outcome === 'kill') return {eligible: true, reason: 'Kill-pull permission applies without a wipe threshold.'};
  if (runWipes >= policy.thresholds.runWipes) return {eligible: true, reason: 'Run-wide wipe trigger reached.'};
  if (bossWipes >= policy.thresholds.bossWipes) return {eligible: true, reason: 'Wipe trigger reached on this boss. Wider retrospective scope remains undecided.'};
  return {eligible: false, manual: true, reason: 'Before trigger: only the stated damage-shortfall or healing-death exception applies.'};
}
