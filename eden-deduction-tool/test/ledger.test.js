import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve, basename} from 'node:path';
import {Ledger} from '../src/ledger/store.js';
import {eligibility} from '../src/ledger/policy.js';
import {createServer} from '../review-server.js';

const sample = () => JSON.parse(readFileSync(new URL('../examples/sample-run.json', import.meta.url), 'utf8'));
function setup(t, fixture = sample()) { const ledger = new Ledger(); t.after(() => ledger.close()); return {ledger, run: ledger.importRun(fixture, 'Test RL')}; }
function decision(ledger, run, id, decision = 'accept') { return ledger.act(run.id, {revision: run.revision, action: 'decision', proposalId: id, decision, reason: 'Reviewed against the fixture evidence and assignment.'}, 'Test RL'); }

test('kill-pull mistakes work with zero wipes; totals combine before rounding', t => {
  let {ledger, run} = setup(t);
  run = decision(ledger, run, 'proposal-1'); run = decision(ledger, run, 'proposal-2');
  const player = run.summary.players.find(p => p.id === 'aster');
  assert.equal(run.summary.totalWipes, 0); assert.equal(player.exactShares, 1); assert.equal(player.requiresRounding, false); assert.equal(player.wholeShares, 1);
  assert.equal(player.incidents[0].applicability.eligible, true);
});
test('a fractional total cannot confirm until RL chooses up/down; no default', t => {
  let {ledger, run} = setup(t);
  run = decision(ledger, run, 'proposal-1', 'reject'); run = decision(ledger, run, 'proposal-2', 'reject'); run = decision(ledger, run, 'proposal-3');
  assert.equal(run.summary.players.find(p => p.id === 'briar').wholeShares, null);
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'confirm'}, 'Test RL'), /Choose rounding/);
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'round', playerId: 'briar'}, 'Test RL'), /no automatic default/);
  run = ledger.act(run.id, {revision: run.revision, action: 'round', playerId: 'briar', direction: 'down'}, 'Test RL');
  assert.equal(run.summary.players.find(p => p.id === 'briar').wholeShares, 0);
  run = ledger.act(run.id, {revision: run.revision, action: 'confirm'}, 'Test RL');
  const output = ledger.exportRun(run.id);
  assert.equal(output.deductions[0].exactSharesRemoved, 0.5); assert.equal(output.deductions[0].wholeSharesRemoved, 0);
  assert.equal(output.appliedToEden, false); assert.equal(output.deductions[0].rounding.actor, 'Test RL');
  assert.ok(!Object.hasOwn(output, 'gold'));
});
test('rounding up preserves exact 3.5 and exports 4, never rounds each incident', t => {
  let {ledger, run} = setup(t);
  for (let i = 0; i < 7; i++) run = ledger.act(run.id, {revision: run.revision, action: 'add', playerId: 'aster', pullId: 'pull-1', ruleId: 'avoidable-death', incidentKey: `distinct-${i}`, reason: `Independent synthetic incident ${i}`, evidenceNote: `Reviewed separate event ${i} from synthetic recording`}, 'Test RL');
  assert.equal(run.summary.players[0].exactShares, 3.5);
  run = ledger.act(run.id, {revision: run.revision, action: 'round', playerId: 'aster', direction: 'up', reason: 'Overall severity reviewed'}, 'Test RL');
  assert.equal(run.summary.players[0].wholeShares, 4); assert.equal(run.summary.players[0].exactShares, 3.5);
});
test('changing incidents invalidates a prior rounding choice; removal is retained in audit', t => {
  let {ledger, run} = setup(t); run = decision(ledger, run, 'proposal-1');
  run = ledger.act(run.id, {revision: run.revision, action: 'round', playerId: 'aster', direction: 'up'}, 'Test RL');
  const firstId = run.incidents[0].id;
  run = decision(ledger, run, 'proposal-2'); assert.equal(run.rounding.aster, undefined);
  run = ledger.act(run.id, {revision: run.revision, action: 'remove', incidentId: firstId, reason: 'Incorrect assignment; reopening'}, 'Test RL');
  assert.equal(run.summary.players[0].wholeShares, null); assert.equal(run.suggestions[0].status, 'pending');
  assert.ok(ledger.history(run.id).some(e => e.action === 'incident.removed'));
});
test('repeated incident key, proposal decisions and stale revisions cannot double deduct', t => {
  let {ledger, run} = setup(t); const old = run; run = decision(ledger, run, 'proposal-1');
  assert.throws(() => decision(ledger, old, 'proposal-1'), /Run changed/);
  assert.throws(() => decision(ledger, run, 'proposal-1'), /already reviewed/);
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'add', playerId: 'aster', pullId: 'pull-1', ruleId: 'avoidable-death', incidentKey: 'a-death', reason: 'Same incident again', evidenceEventIds: ['a-death']}, 'Test RL'), /already has a deduction/);
  assert.equal(ledger.run(run.id).incidents.length, 1);
});
test('policy versions are immutable per run; rejected publication rolls back', t => {
  const {ledger, run} = setup(t); const policy = ledger.policy();
  policy.rules[0].shares = 1; policy.thresholds.bossWipes = 4;
  const next = ledger.publishPolicy(policy, 'Test admin', 'New reviewed rules', policy.version);
  assert.equal(next.version, 2); assert.equal(ledger.run(run.id).policy.rules[0].shares, 0.5);
  assert.equal(ledger.importRun(sample(), 'Test RL').policy.rules[0].shares, 1);
  assert.throws(() => ledger.publishPolicy(policy, 'Test admin', 'Stale publish', 1), /Policy changed/);
  assert.equal(ledger.policy().version, 2);
});
test('padding observation has no tariff and cannot become a financial deduction', t => {
  const {ledger, run} = setup(t);
  assert.throws(() => decision(ledger, run, 'observation-padding'), /no approved tariff/);
  assert.equal(ledger.run(run.id).incidents.length, 0);
  assert.ok(!ledger.policy().rules.some(r => /padding/.test(r.id)));
});
test('wipe rule does not apply on a kill; before-trigger wipe exceptions need evidence', t => {
  const data = sample(); data.pulls[0].outcome = 'wipe'; const {ledger, run} = setup(t, data);
  const input = {revision: run.revision, action: 'add', playerId: 'aster', pullId: 'pull-1', ruleId: 'wipe-causing', incidentKey: 'cause', reason: 'Reviewed initial mistake', evidenceEventIds: ['a-death']};
  assert.throws(() => ledger.act(run.id, input, 'Test RL'), /Explain applicability/);
  assert.throws(() => ledger.act(run.id, {...input, applicabilityNote: 'Reviewer investigated this wipe'}, 'Test RL'), /damage\/healing exception/);
  const updated = ledger.act(run.id, {...input, applicabilityNote: 'Damage shortfall caused a 1% wipe; reviewed relevant players and context.', exception: 'damage-1pct'}, 'Test RL');
  assert.equal(updated.incidents[0].units, 2);
  assert.throws(() => ledger.act(run.id, {...input, revision: updated.revision, pullId: 'pull-2'}, 'Test RL'), /pull outcome/);
});
test('per-boss trigger only opens that boss; run trigger is separate and adjustable', t => {
  const {ledger, run} = setup(t), policy = ledger.policy(), rule = policy.rules[1];
  const a = {...run.pulls[0], outcome: 'wipe'}, b = {...run.pulls[1], outcome: 'wipe'};
  const testRun = {...run, pulls: [a, a, a, b]};
  assert.equal(eligibility(testRun, policy, rule, a).eligible, true);
  assert.equal(eligibility(testRun, policy, rule, b).eligible, false);
  testRun.pulls.push(b, b); assert.equal(eligibility(testRun, policy, rule, b).eligible, true);
  policy.thresholds.runWipes = 8; assert.equal(eligibility(testRun, policy, rule, b).eligible, true); // B now reaches its own threshold.
});
test('buyer and LB deductions are refused; RL export remains blocked pending staff workflow', t => {
  let {ledger, run} = setup(t);
  const input = {revision: run.revision, action: 'add', playerId: 'client', pullId: 'pull-1', ruleId: 'avoidable-death', incidentKey: 'x', reason: 'Manual incident', evidenceNote: 'Fixture supporting evidence'};
  assert.throws(() => ledger.act(run.id, input, 'Test RL'), /eligible booster/);
  for (const id of ['proposal-1', 'proposal-2', 'proposal-3']) run = decision(ledger, run, id, 'reject');
  run = ledger.act(run.id, {...input, revision: run.revision, playerId: 'cinder'}, 'Test RL');
  run = ledger.act(run.id, {revision: run.revision, action: 'round', playerId: 'cinder', direction: 'down'}, 'Test RL');
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'confirm'}, 'Test RL'), /staff review/);
});
test('confirmation freezes edits; reopening preserves the prior confirmation and supports correction', t => {
  let {ledger, run} = setup(t); for (const id of ['proposal-1', 'proposal-2', 'proposal-3']) run = decision(ledger, run, id, 'reject');
  run = ledger.act(run.id, {revision: run.revision, action: 'confirm'}, 'Test RL');
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'confirm'}, 'Test RL'), /Reopen/);
  run = ledger.act(run.id, {revision: run.revision, action: 'reopen', reason: 'New evidence received'}, 'Test RL');
  assert.equal(run.status, 'draft'); assert.throws(() => ledger.exportRun(run.id), /Confirm/);
  assert.ok(ledger.history(run.id).some(e => e.action === 'review.confirmed'));
});
test('SQLite persists reviews, policy and all suggestion records across restart; audit detects alteration', t => {
  const dir = mkdtempSync(join(tmpdir(), 'eden-ledger-test-'));
  let ledger = new Ledger(join(dir, 'test.sqlite')); let run = ledger.importRun(sample(), 'Test RL'); run = decision(ledger, run, 'proposal-1'); ledger.close();
  ledger = new Ledger(join(dir, 'test.sqlite')); t.after(() => {
    ledger.close();
    assert.equal(resolve(dirname(dir)), resolve(tmpdir()));
    assert.ok(basename(dir).startsWith('eden-ledger-test-'));
    rmSync(dir, {recursive: true, force: true});
  });
  assert.equal(ledger.run(run.id).incidents.length, 1); assert.equal(ledger.history(run.id).filter(e => e.action === 'suggestion.created').length, 4);
  assert.equal(ledger.verifyAudit(), true);
  ledger.db.exec("UPDATE audit SET actor='altered' WHERE sequence=1"); assert.equal(ledger.verifyAudit(), false);
});
test('invalid imports cannot create financial decisions or partial audit records', t => {
  const {ledger} = setup(t); const before = ledger.listRuns().length;
  const data = sample(); data.pulls[0].events[0].playerId = 'stranger';
  assert.throws(() => ledger.importRun(data, 'Test RL'), /unknown player/);
  assert.equal(ledger.listRuns().length, before);
  const clean = sample(); clean.suggestions[0].evidenceEventIds = ['a-death-2'];
  assert.throws(() => ledger.importRun(clean, 'Test RL'), /belong to its pull/);
});
test('manual entries cannot forge proposal ownership; imported opaque player IDs round safely', t => {
  const data = sample();
  data.players[0].id = '__proto__';
  for (const pull of data.pulls) for (const event of pull.events) if (event.playerId === 'aster') event.playerId = '__proto__';
  for (const proposal of data.suggestions) if (proposal.playerId === 'aster') proposal.playerId = '__proto__';
  let {ledger, run} = setup(t, data);
  run = ledger.act(run.id, {revision: run.revision, action: 'add', playerId: '__proto__', pullId: 'pull-1', ruleId: 'avoidable-death', incidentKey: 'manual-only', reason: 'Reviewed fixture evidence', evidenceNote: 'Synthetic incident with explicit player identity', proposalId: 'not-a-real-proposal'}, 'Test RL');
  assert.equal(run.incidents[0].proposalId, null);
  run = ledger.act(run.id, {revision: run.revision, action: 'round', playerId: '__proto__', direction: 'down'}, 'Test RL');
  assert.equal(run.summary.players[0].wholeShares, 0);
  run = ledger.act(run.id, {revision: run.revision, action: 'remove', incidentId: run.incidents[0].id, reason: 'Correction'}, 'Test RL');
  assert.equal(run.incidents.length, 0);
});
test('HTTP endpoints reject cross-origin writes and serve review-only APIs', async t => {
  const ledger = new Ledger(); const server = createServer({ledger});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); ledger.close(); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const denied = await fetch(url + '/api/runs', {method: 'POST', headers: {Origin: 'https://other.example', 'Content-Type': 'application/json'}, body: JSON.stringify({actor: 'Test RL', run: sample()})});
  assert.equal(denied.status, 403); assert.equal(ledger.listRuns().length, 0);
  const response = await fetch(url + '/api/runs', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({actor: 'Test RL', run: sample()})});
  assert.equal(response.status, 201); const run = await response.json();
  assert.equal((await fetch(url + `/api/runs/${run.id}/export`)).status, 400);
  assert.equal((await fetch(url + '/api/capture', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({actor: 'Test RL'})})).status, 404);
  const html = await fetch(url); assert.equal(html.status, 200); assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
