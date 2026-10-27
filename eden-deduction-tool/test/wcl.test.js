import test from 'node:test';
import assert from 'node:assert/strict';
import {Ledger} from '../src/ledger/store.js';
import {WclClient, reportCode, EVENTS_QUERY} from '../src/wcl/client.js';
import {metadata, buildScope, playersFor, selectScope} from '../src/wcl/scope.js';
import {WclService, Connection} from '../src/wcl/service.js';
import {createServer} from '../review-server.js';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve, basename} from 'node:path';

const A = 'ABCDEFGHIJKLMNOP', B = 'QRSTUVWXYZabcdef';
function raw(code = A) {
  const fight = (id, encounterID, startTime, kill, difficulty = 4) => ({id, encounterID, name: `Boss ${encounterID}`, startTime, endTime: startTime + 10000, kill, difficulty, inProgress: false, friendlyPlayers: [1, 2], wipeCalledTime: null});
  return {code, region: {slug: 'eu'}, title: 'Synthetic WCL transport fixture', startTime: 1792840000000, endTime: 1792840100000, revision: 1, visibility: 'public', masterData: {actors: [
    {id: 1, name: 'Áster', server: 'Twisting Nether', type: 'Player', subType: 'Warlock', petOwner: null},
    {id: 2, name: 'Briar', server: 'Silvermoon', type: 'Player', subType: 'Priest', petOwner: null},
    {id: 10, name: 'Boss', server: null, type: 'NPC', subType: 'Boss', petOwner: null}], abilities: [{gameID: 101, name: 'Example hit'}]},
    fights: [fight(1, 501, 0, false), fight(2, 501, 20000, true), fight(3, 502, 40000, false), fight(4, 501, 60000, false), fight(5, 503, 80000, true, 5), {...fight(6, 504, 95000, null), inProgress: true}]};
}
function fakeClient(reports = {[A]: raw()}, extra = {}) {
  return {
    report: async code => structuredClone(reports[code]),
    async *pages(code, fight) {
      const variables = {code, fightIDs: [fight.id], start: fight.startTime, end: fight.endTime};
      yield {index: 0, queryVersion: 1, variables, page: {data: [
        {timestamp: fight.startTime + 1000, type: 'damage', sourceID: 10, targetID: 1, abilityGameID: 101, amount: 100},
        {timestamp: fight.startTime + 1000, type: 'damage', sourceID: 10, targetID: 1, abilityGameID: 101, amount: 100}
      ], nextPageTimestamp: fight.startTime + 2000}};
      yield {index: 1, queryVersion: 1, variables: {...variables, start: fight.startTime + 2000}, page: {data: [
        {timestamp: fight.startTime + 3000, type: 'death', targetID: 1},
        {timestamp: fight.startTime + 4000, type: 'cast', sourceID: 2, abilityGameID: 101}
      ], nextPageTimestamp: null}};
    }, ...extra
  };
}
function setup(t, client = fakeClient()) {
  const ledger = new Ledger(), service = new WclService({ledger, client});
  t.after(async () => { await service.shutdown(); ledger.close(); }); return {ledger, service};
}
async function start(service, selected, assignments) {
  const preview = await service.discover({reports: [A]}, 'Reviewer');
  const keys = selected ?? preview.candidates[0].fightKeys;
  return service.start({draftId: preview.id, title: 'Selected fixture boost', fightKeys: keys, scopeConfirmed: true, assignments: assignments ?? preview.players.map(p => ({id: p.id, role: 'unclassified'}))}, 'Reviewer');
}
async function done(service, job) { await service.tasks.get(job.id); return service.job(job.id); }

test('mixed metadata preserves all boss kills and wipes and groups repeated kills/difficulty changes', () => {
  const report = metadata(raw()), scope = buildScope([report], {roster: 'Áster-Twisting-Nether', expectedStart: '2026-10-24T17:30:00+02:00'});
  assert.equal(scope.fights.length, 6); assert.equal(scope.candidates.length, 3);
  assert.equal(scope.candidates[0].kills, 1); assert.equal(scope.candidates[0].wipes, 2);
  assert.equal(scope.candidates[0].rosterMatch, 1);
  assert.match(scope.candidates[1].reason, /Previously killed/); assert.match(scope.candidates[2].reason, /Difficulty/);
  assert.ok(!scope.candidates.some(c => c.fightKeys.includes(`${A}:6`)));
  assert.throws(() => buildScope([report], {expectedStart: '2026-10-24T17:30:00'}), /timezone offset/);
});
test('cross-report duplicates require choosing one; distinct raids at the same time are not merged', () => {
  const a = metadata(raw(A)), b = metadata(raw(B)), scope = buildScope([a, b]);
  assert.ok(scope.duplicatePairs.some(pair => pair.includes(`${A}:1`) && pair.includes(`${B}:1`)));
  assert.throws(() => selectScope({scope}, [`${A}:1`, `${B}:1`]), /duplicate/);
  const other = raw(B); other.masterData.actors[0].name = 'OtherOne'; other.masterData.actors[1].name = 'OtherTwo';
  assert.equal(buildScope([a, metadata(other)]).duplicatePairs.length, 0);
  assert.equal(playersFor([a, b]).length, 2);
  const unknown = raw(B); unknown.masterData.actors[0].server = null;
  assert.equal(playersFor([a, metadata(unknown)]).length, 3);
});
test('split reports combine through the boundary when roster, difficulty and encounter sequence continue', () => {
  const a = raw(A), b = raw(B); a.fights = a.fights.slice(0, 2); b.startTime += 40000; b.fights = [{...b.fights[2], startTime: 0, endTime: 10000}];
  const scope = buildScope([metadata(a), metadata(b)]);
  assert.equal(scope.candidates.length, 1); assert.equal(scope.candidates[0].fightKeys.length, 3);
  assert.equal(scope.fights[2].key, `${B}:3`);
});
test('identical character/realm names in different or unknown regions are not merged', () => {
  const a = metadata(raw(A)), otherRegion = raw(B); otherRegion.region.slug = 'us';
  assert.equal(playersFor([a, metadata(otherRegion)]).length, 4);
  assert.equal(buildScope([a, metadata(otherRegion)]).duplicatePairs.length, 0);
  otherRegion.region = null; assert.equal(playersFor([a, metadata(otherRegion)]).length, 4);
});
test('URLs are restricted to official report routes and the event query does not filter out wipes or actors', () => {
  assert.equal(reportCode(`https://www.warcraftlogs.com/reports/${A}#fight=last`), A);
  assert.throws(() => reportCode(`https://warcraftlogs.com.evil.example/reports/${A}`), /official/);
  assert.throws(() => reportCode(`http://127.0.0.1/reports/${A}`), /official/);
  assert.match(EVENTS_QUERY, /dataType:All/); assert.ok(!/killType|sourceID:|targetID:/.test(EVENTS_QUERY));
});
test('pagination follows an empty continuation page, retains identical events and terminates only at null', async () => {
  let queries = 0;
  const fetchImpl = async (url, options) => {
    if (url.endsWith('/oauth/token')) return new Response(JSON.stringify({access_token: 'test-only', expires_in: 3600}));
    const request = JSON.parse(options.body); assert.equal(request.variables.start, queries === 0 ? 0 : 2000); queries++;
    return new Response(JSON.stringify({data: {reportData: {report: {events: queries === 1 ? {data: [], nextPageTimestamp: 2000} : {data: [{timestamp: 3000}, {timestamp: 3000}], nextPageTimestamp: null}}}}}));
  };
  const client = new WclClient({credentials: () => ({clientId: 'example', clientSecret: 'never-real'}), fetchImpl});
  const pages = []; for await (const page of client.pages(A, {id: 1, startTime: 0, endTime: 10000})) pages.push(page);
  assert.equal(pages.length, 2); assert.equal(pages[1].page.data.length, 2);
});
test('stalled pagination and out-of-pull events fail rather than becoming complete evidence', async () => {
  for (const page of [{data: [], nextPageTimestamp: 0}, {data: [{timestamp: 11000}], nextPageTimestamp: null}]) {
    const client = new WclClient({credentials: () => ({clientId: 'example', clientSecret: 'secret-test'}), fetchImpl: async url => new Response(JSON.stringify(url.endsWith('/oauth/token') ? {access_token: 'test', expires_in: 3600} : {data: {reportData: {report: {events: page}}}}))});
    await assert.rejects(async () => { for await (const unused of client.pages(A, {id: 1, startTime: 0, endTime: 10000})) void unused; }, /pagination|timestamp/);
  }
});
test('capture imports every selected kill/wipe, preserves raw pages and starts with no blame or buyer assumptions', async t => {
  const {ledger, service} = setup(t); const job = await start(service); const result = await done(service, job);
  assert.equal(result.status, 'complete'); const run = ledger.run(result.runId);
  assert.equal(run.pulls.length, 3); assert.equal(run.summary.totalWipes, 2); assert.equal(run.pulls.filter(p => p.outcome === 'kill').length, 1);
  assert.equal(run.source, 'warcraftlogs'); assert.equal(run.suggestions.length, 0); assert.equal(run.incidents.length, 0);
  assert.ok(run.players.every(p => p.role === 'unclassified'));
  assert.ok(run.pulls.every(p => p.coverage === 'api-pages-complete' && p.events.some(e => e.type === 'death')));
  assert.match(run.pulls[0].events.find(e => e.type === 'death').detail, /not independently established/);
  const pages = service.rawPages(job.id, `${A}:1`); assert.equal(pages.length, 2); assert.equal(pages[0].page.data.length, 2);
  assert.deepEqual(pages[0].page.data[0], pages[0].page.data[1]);
  assert.equal(run.wcl.reports[0].revision, 1); assert.equal(ledger.verifyAudit(), true);
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'add', playerId: run.players[0].id, pullId: `${A}:2`, ruleId: 'avoidable-death', incidentKey: 'death', reason: 'Manual context', evidenceNote: 'Reviewed recording and assignment'}, 'Reviewer'), /classify unknown/);
});
test('scope confirmation, invalid selections and likely duplicates cannot launch event capture', async t => {
  const {service} = setup(t); const preview = await service.discover({reports: [A]}, 'Reviewer');
  const input = {draftId: preview.id, title: 'Test boost', fightKeys: [`${A}:1`], assignments: preview.players.map(p => ({id: p.id, role: 'unclassified'}))};
  assert.throws(() => service.start(input, 'Reviewer'), /Confirm/);
  assert.throws(() => service.start({...input, scopeConfirmed: true, fightKeys: [`${A}:6`]}, 'Reviewer'), /in-progress/);
  assert.throws(() => service.start({...input, scopeConfirmed: true, fightKeys: ['other']}, 'Reviewer'), /Unknown/);
  assert.equal(service.listJobs().length, 0);
});
test('failed/partial capture leaves raw evidence but creates no usable review', async t => {
  const {ledger, service} = setup(t, fakeClient(undefined, {async *pages(code, fight) { yield {index: 0, queryVersion: 1, variables: {code, fightIDs: [fight.id], start: 0, end: fight.endTime}, page: {data: [], nextPageTimestamp: 100}}; throw Error('Simulated transport failure'); }}));
  const job = await start(service); const result = await done(service, job);
  assert.equal(result.status, 'failed'); assert.equal(ledger.listRuns().length, 0);
  assert.equal(service.rawPages(job.id, `${A}:1`).length, 1);
});
test('report revision changes after capture prevent importing stale evidence', async t => {
  let calls = 0; const fixture = raw();
  const {ledger, service} = setup(t, fakeClient(undefined, {report: async () => { calls++; return {...structuredClone(fixture), revision: calls >= 3 ? 2 : 1}; }}));
  const job = await start(service), result = await done(service, job);
  assert.equal(result.status, 'failed'); assert.match(result.error, /Report changed/); assert.equal(ledger.listRuns().length, 0);
});
test('capture pins the policy at scope confirmation even if admin publishes during acquisition', async t => {
  const {ledger, service} = setup(t); const preview = await service.discover({reports: [A]}, 'Reviewer');
  const job = service.start({draftId: preview.id, title: 'Pinned capture', fightKeys: preview.candidates[0].fightKeys, scopeConfirmed: true, assignments: preview.players.map(p => ({id: p.id, role: 'unclassified'}))}, 'Reviewer');
  const policy = ledger.policy(); policy.rules[0].shares = 1;
  ledger.publishPolicy(policy, 'Administrator', 'Later policy generation', 1);
  const result = await done(service, job), run = ledger.run(result.runId);
  assert.equal(run.policyVersion, 1); assert.equal(run.policy.rules[0].shares, 0.5); assert.equal(ledger.policy().version, 2);
});
test('cancel is durable and cannot convert partial events into a successful review', async t => {
  let announce; const entered = new Promise(resolve => { announce = resolve; });
  const {ledger, service} = setup(t, fakeClient(undefined, {async *pages(code, fight, signal) { announce(); await new Promise(resolve => signal.addEventListener('abort', resolve, {once: true})); throw Error('Cancelled test'); }}));
  const job = await start(service); await entered; service.cancel(job.id, 'Reviewer'); const result = await done(service, job);
  assert.equal(result.status, 'cancelled'); assert.equal(ledger.listRuns().length, 0);
  assert.ok(ledger.history().some(e => e.action === 'wcl.capture.cancelled'));
});
test('restart recovery marks incomplete jobs interrupted and preserves completed jobs/drafts/raw evidence', async t => {
  const {ledger, service} = setup(t); const job = await start(service); await done(service, job);
  const draftId = service.job(job.id).draftId;
  service.saveJob({...service.job(job.id), id: 'interrupted-example', status: 'running', runId: null});
  const restarted = new WclService({ledger, client: fakeClient()});
  assert.equal(restarted.job(job.id).status, 'complete'); assert.equal(restarted.job('interrupted-example').status, 'interrupted');
  assert.equal(restarted.draft(draftId).id, draftId); assert.equal(restarted.rawPages(job.id, `${A}:1`).length, 2);
});
test('known WCL wipe calls prevent charging post-call evidence; confirmed participant roles are audited', async t => {
  const fixture = raw(); fixture.fights[0].wipeCalledTime = 2000;
  const {ledger, service} = setup(t, fakeClient({[A]: fixture})); const job = await start(service); const result = await done(service, job); let run = ledger.run(result.runId);
  run = ledger.act(run.id, {revision: run.revision, action: 'classify', players: run.players.map(p => ({id: p.id, role: 'booster'}))}, 'Reviewer');
  const event = run.pulls[0].events.find(e => e.type === 'death');
  assert.throws(() => ledger.act(run.id, {revision: run.revision, action: 'add', playerId: event.playerId, pullId: run.pulls[0].id, ruleId: 'avoidable-death', incidentKey: event.id, evidenceEventIds: [event.id], reason: 'Manual review'}, 'Reviewer'), /after the recorded wipe call/);
  assert.ok(ledger.history(run.id).some(e => e.action === 'participants.classified'));
});
test('HTTP WCL workflow does not expose secrets and imports a complete selected scope through an async job', async t => {
  const ledger = new Ledger(), connection = new Connection(null, {}), server = createServer({ledger, connection, wclClient: fakeClient()});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await server.wcl.shutdown(); await new Promise(resolve => server.close(resolve)); ledger.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = async (path, body) => { const r = await fetch(base + path, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({actor: 'Reviewer', ...body})}); return {status: r.status, data: await r.json()}; };
  const status = await (await fetch(base + '/api/wcl/status')).json(); assert.equal(status.configured, false); assert.ok(!JSON.stringify(status).includes('clientSecret'));
  const preview = await post('/api/wcl/discover', {reports: [A]}); assert.equal(preview.status, 201);
  const response = await post('/api/wcl/capture', {draftId: preview.data.id, title: 'Transport fixture review', fightKeys: preview.data.candidates[0].fightKeys, scopeConfirmed: true, assignments: preview.data.players.map(p => ({id: p.id, role: 'booster'}))});
  assert.equal(response.status, 202); await server.wcl.tasks.get(response.data.id);
  const result = await (await fetch(base + `/api/wcl/jobs/${response.data.id}`)).json(); assert.equal(result.status, 'complete');
  const run = await (await fetch(base + `/api/runs/${result.runId}`)).json(); assert.equal(run.pulls.length, 3); assert.equal(run.summary.totalWipes, 2);
});
test('rate limits retry within the wait budget and a 401 refreshes the token once', async () => {
  let tokenCalls = 0, dataCalls = 0; const delays = [];
  const client = new WclClient({credentials: () => ({clientId: 'test', clientSecret: 'test-only-secret'}), sleep: async ms => delays.push(ms), fetchImpl: async url => {
    if (url.endsWith('/oauth/token')) { tokenCalls++; return new Response(JSON.stringify({access_token: `token-${tokenCalls}`, expires_in: 3600})); }
    dataCalls++;
    if (dataCalls === 1) return new Response('{}', {status: 401});
    if (dataCalls === 2) return new Response('{}', {status: 429, headers: {'Retry-After': '2'}});
    return new Response(JSON.stringify({data: {reportData: {report: raw()}}}));
  }});
  const report = await client.report(A); assert.equal(report.code, A); assert.equal(tokenCalls, 2); assert.deepEqual(delays, [2000]);
});
test('verified credentials persist locally without being returned; failed verification does not overwrite them', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'eden-wcl-test-')), path = join(dir, 'connection.json');
  t.after(() => { assert.equal(resolve(dirname(dir)), resolve(tmpdir())); assert.ok(basename(dir).startsWith('eden-wcl-test-')); rmSync(dir, {recursive: true, force: true}); });
  const connection = new Connection(path, {}, c => ({accessToken: async () => { assert.equal(c.clientSecret, 'fixture-private-secret'); }}));
  const response = await connection.save({clientId: 'fixture-id', clientSecret: 'fixture-private-secret'});
  assert.equal(response.configured, true); assert.ok(!JSON.stringify(response).includes('fixture-private-secret'));
  assert.ok(readFileSync(path, 'utf8').includes('fixture-private-secret'));
  const restored = new Connection(path, {}); assert.equal(restored.status().configured, true);
  const failing = new Connection(path, {}, () => ({accessToken: async () => { throw Error('fixture rejection'); }}));
  await assert.rejects(() => failing.save({clientId: 'bad', clientSecret: 'bad'}));
  assert.equal(restored.credentials().clientId, 'fixture-id');
});
test('capture enforces full-stream provenance and chronology even for an adapter implementation', async t => {
  const {ledger, service} = setup(t, fakeClient(undefined, {async *pages(code, fight) {
    yield {index: 0, queryVersion: 1, variables: {code, fightIDs: [fight.id], start: fight.startTime, end: fight.endTime}, page: {data: [{timestamp: fight.startTime + 3000}, {timestamp: fight.startTime + 1000}], nextPageTimestamp: null}};
  }}));
  const job = await start(service); const result = await done(service, job);
  assert.equal(result.status, 'failed'); assert.match(result.error, /out of order/); assert.equal(ledger.listRuns().length, 0);
});
test('missing realm/roster metadata does not manufacture a roster-change boundary or classify a player', () => {
  const report = raw(); report.fights = report.fights.slice(0, 3); report.fights[1].friendlyPlayers = null;
  const scope = buildScope([metadata(report)]);
  assert.equal(scope.candidates.length, 1); assert.equal(scope.fights[1].rosterIncomplete, true);
  assert.ok(scope.players.every(p => p.role === 'unclassified'));
});
