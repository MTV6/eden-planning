import {initWclUI} from './wcl-ui.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const options = (items, selected) => items.map(([value, text]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(text)}</option>`).join('');
let state, run, currentPull, busy = false, manualEvidence = [];

async function api(path, input) {
  const response = await fetch(path, input === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...input, actor: $('#actor').value.trim()})});
  const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Request failed'); return data;
}
function notice(message, error = false) {
  $('#notice').textContent = message; $('#notice').className = error ? 'error' : ''; $('#notice').hidden = false;
}
async function task(fn) {
  if (busy) return;
  busy = true;
  try { await fn(); } catch (error) { notice(error.message, true); }
  finally { busy = false; }
}
async function refreshState() {
  state = await api('/api/state');
  $('#run-select').innerHTML = '<option value="">Choose a review</option>' + options(state.runs.map(r => [r.id, `${r.title} · ${r.status}`]), run?.id);
  $('#policy-chip').textContent = run ? `Pinned policy v${run.policyVersion}` : `Current policy v${state.policy.version}`;
}
async function selectRun(id) { run = id ? await api(`/api/runs/${id}`) : null; await refreshState(); renderRun(); }
async function mutate(input, message) {
  run = await api(`/api/runs/${run.id}`, {revision: run.revision, ...input});
  await refreshState(); renderRun(); notice(message);
}
async function loadSample() {
  const sample = await api('/api/demo'); run = await api('/api/runs', {run: sample});
  await refreshState(); renderRun(); notice('Synthetic run loaded. Nothing was scanned or applied to Eden.');
}
function showView(view) {
  for (const name of ['review', 'rules', 'audit', 'wcl']) $(`#${name}-view`).hidden = view !== name;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#breadcrumb').textContent = {review: 'Deduction review', rules: 'Rules & thresholds', audit: 'Audit history', wcl: 'Warcraft Logs'}[view];
}
function renderRun() {
  $('#empty-state').hidden = Boolean(run); $('#run-workspace').hidden = !run;
  if (!run) return;
  $('#run-title').textContent = run.title;
  $('#source-tag').textContent = run.source === 'synthetic' ? 'Synthetic example' : run.source === 'warcraftlogs' ? 'Warcraft Logs · confirmed pull scope' : 'Imported · unverified evidence';
  $('#run-status').textContent = `${run.status} · revision ${run.revision}`;
  const kills = run.pulls.filter(p => p.outcome === 'kill').length;
  $('#stats').innerHTML = [[run.pulls.length, `${kills} kills · ${run.summary.totalWipes} wipes`], [run.summary.pending, 'Priced proposals awaiting review'], [run.summary.totalExactShares, 'Exact deduction shares'], [run.summary.needsRounding, 'Player totals need rounding']].map(([n, text]) => `<div class="stat"><strong>${esc(n)}</strong><span>${esc(text)}</span></div>`).join('');
  if (!run.pulls.some(p => p.id === currentPull)) currentPull = run.pulls[0].id;
  $('#evidence-pull').innerHTML = options(run.pulls.map(p => [p.id, `${p.boss} · ${p.outcome}`]), currentPull);
  const form = $('#manual-form');
  form.elements.playerId.innerHTML = options(run.players.filter(p => ['booster', 'raidleader'].includes(p.role)).map(p => [p.id, `${p.name} · ${p.character}`]), form.elements.playerId.value);
  form.elements.pullId.innerHTML = options(run.pulls.map(p => [p.id, `${p.boss} · ${p.outcome}`]), form.elements.pullId.value);
  form.elements.ruleId.innerHTML = options(run.policy.rules.map(r => [r.id, `${r.label} · ${r.shares} shares`]), form.elements.ruleId.value);
  form.querySelectorAll('input,select,textarea,button').forEach(el => el.disabled = run.status !== 'draft');
  $('#participant-editor').innerHTML = run.players.map(p => `<label>${esc(p.character)}<select data-role-player="${esc(p.id)}" ${run.status === 'draft' ? '' : 'disabled'}>${options([['unclassified', 'Unclassified · cannot deduct'], ['booster', 'Booster'], ['raidleader', 'Raid leader'], ['lb', 'Lootbody'], ['buyer', 'Buyer / client']], p.role)}</select></label>`).join('');
  $('#participant-form button').disabled = run.status !== 'draft';
  renderFindings(); renderEvidence(); renderTotals();
}
function renderFindings() {
  const filter = $('#finding-filter').value, outcome = $('#pull-filter').value;
  const proposals = run.suggestions.filter(s => (filter !== 'priced' || s.ruleId !== null) && (filter !== 'pending' || s.status === 'pending') && (outcome === 'all' || run.pulls.find(p => p.id === s.pullId).outcome === outcome));
  $('#findings').innerHTML = proposals.map(s => {
    const player = run.players.find(p => p.id === s.playerId), pull = run.pulls.find(p => p.id === s.pullId), rule = run.policy.rules.find(r => r.id === s.ruleId);
    const editable = s.status === 'pending' && run.status === 'draft';
    return `<article class="finding ${esc(s.status)} ${!rule ? 'observation' : ''}" data-proposal="${esc(s.id)}">
      <div class="finding-top"><span class="chip ${!rule ? 'subtle' : s.status === 'accepted' ? '' : 'gold'}">${esc(rule ? s.status : 'Observation · no tariff')}</span><span class="amount">${rule ? esc(rule.shares) : '—'} <small>${rule ? 'shares' : 'no deduction'}</small></span></div>
      <h3>${esc(player.name)} <span class="muted">· ${esc(rule?.label ?? 'Evidence observation')}</span></h3><div class="metadata">${esc(pull.boss)} · ${esc(pull.outcome.toUpperCase())} · ${esc(player.character)}</div>
      <p>${esc(s.explanation)}</p><p class="metadata">${esc(s.provenance)}</p>
      ${editable ? `<label class="sr-only" for="reason-${esc(s.id)}">Decision reason for ${esc(s.id)}</label><textarea id="reason-${esc(s.id)}" name="decisionReason" maxlength="3000" placeholder="Decision reason (required to reject; optional elaboration when accepting)"></textarea>${rule ? '<details><summary>Applicability evidence for requirement or early-wipe rules</summary><label>Explanation<input name="applicabilityNote" maxlength="2000"></label><label>Early-wipe exception<select name="exception"><option value="">None</option><option value="damage-1pct">Damage shortfall: 1% wipe</option><option value="healing-deaths">Healing: multiple avoidable deaths</option></select></label></details>' : ''}` : ''}
      <div class="finding-actions"><button class="secondary" data-action="evidence" data-pull="${esc(pull.id)}">View evidence</button>${editable && rule ? `<button data-action="accept">Accept deduction for ${esc(player.name)}</button>` : ''}${editable ? '<button class="danger" data-action="reject">Reject finding</button>' : ''}</div></article>`;
  }).join('') || `<p class="help">${run.source === 'warcraftlogs' ? 'WCL evidence loaded. No validated mechanic detector is enabled yet. Review the death timeline and add supported manual deductions; zero suggestions does not mean clean play.' : 'No findings match these filters. Try All findings and All pulls.'}</p>`;
}
function renderEvidence() {
  const pull = run.pulls.find(p => p.id === currentPull); if (!pull) return;
  const capture = run.wcl?.pulls.find(p => p.fightKey === pull.id);
  $('#coverage-note').textContent = `${pull.outcome === 'kill' ? 'Kill pull: deductions do not require wipe activation.' : 'Wipe pull: check activation and applicable exceptions.'} ${capture ? `Captured ${capture.rawEvents.toLocaleString()} raw events in ${capture.pages} pages. Timeline shows deaths, recent damage context and a bounded cast sample (${capture.omittedCasts} other casts retained in raw capture). API pagination completeness does not prove recorder coverage or fault.${capture.rosterIncomplete ? ' Participant metadata is incomplete.' : ''}${capture.wipeCalledTime === null ? '' : ` Recorded Companion wipe call: ${((capture.wipeCalledTime - capture.startTime) / 1000).toFixed(1)} seconds into pull; later failures are excluded.`}` : `Coverage: ${pull.coverage}. Completeness is declared by the import, not independently verified.`}`;
  const kind = $('#evidence-kind').value;
  $('#timeline').innerHTML = pull.events.filter(e => kind === 'all' || e.type === kind).map(e => `<div class="timeline-item ${esc(e.type)}"><time>${Math.floor(e.timeSeconds / 60)}:${String(Math.floor(e.timeSeconds % 60)).padStart(2, '0')}</time><strong>${esc(run.players.find(p => p.id === e.playerId).name)} · ${esc(e.type)}</strong><p>${esc(e.detail)}</p><span class="metadata">${esc(e.id)}</span>${capture ? `<p><a href="${esc(capture.url)}" target="_blank" rel="noreferrer">Open WCL pull</a></p>` : ''}${run.status === 'draft' ? `<button class="secondary evidence-use" data-use-evidence="${esc(e.id)}">Use as manual evidence</button>` : ''}</div>`).join('') || '<p class="help">No events match this timeline view. This does not establish clean play or absence.</p>';
}
function renderTotals() {
  const players = run.summary.players.filter(p => ['booster', 'raidleader'].includes(p.role));
  $('#totals').innerHTML = players.map(p => `<article class="total-row" data-player="${esc(p.id)}"><div class="total-header"><div><h3>${esc(p.name)} ${p.role === 'raidleader' ? '<span class="chip red">RL · staff review for deductions</span>' : ''}</h3><p>${esc(p.character)} · ${p.incidents.length} accepted incidents</p></div><div class="total-number">${esc(p.exactShares)} <small>exact → ${p.wholeShares === null ? 'choose rounding' : `${p.wholeShares} whole shares removed`}</small></div></div>
    ${p.incidents.map(i => `<div class="incident-line"><span>${esc(i.ruleLabel)} · ${esc(i.units / 2)} shares<br>${esc(i.reason)}</span>${run.status === 'draft' ? `<button class="danger" data-remove="${esc(i.id)}">Remove</button>` : ''}</div>`).join('')}
    ${p.requiresRounding ? `<div class="rounding-controls"><span class="help">RL decision:</span>${['down', 'up'].map(direction => `<button data-round="${direction}" class="secondary ${p.rounding?.direction === direction ? 'chosen' : ''}" ${run.status === 'draft' ? '' : 'disabled'}>Round ${direction} to ${direction === 'down' ? Math.floor(p.exactShares) : Math.ceil(p.exactShares)}</button>`).join('')}<label><span class="sr-only">Rounding note for ${esc(p.name)}</span><input name="roundingNote" maxlength="2000" value="${esc(p.rounding?.reason)}" placeholder="Optional rounding explanation" ${run.status === 'draft' ? '' : 'disabled'}></label></div>` : ''}</article>`).join('');
  const summary = run.summary, confirmed = run.status === 'confirmed';
  $('#confirm-button').hidden = confirmed; $('#reopen-button').hidden = !confirmed; $('#export-button').hidden = !confirmed;
  $('#confirm-button').disabled = Boolean(summary.pending || summary.needsRounding || summary.staffReview);
  $('#confirmation-help').textContent = confirmed ? 'Confirmed locally. Export the deduction proposal for integration review. Nothing has been applied to Eden.' : summary.staffReview ? 'RL-targeted deductions need an independent staff workflow before final export; this local milestone cannot approve them.' : summary.pending ? `${summary.pending} priced proposals still need a decision. Unpriced observations do not create deductions.` : summary.needsRounding ? 'Choose down or up for each fractional player total. There is no default.' : 'Ready to confirm this deduction list. Eden remains responsible for base cuts, gold and actual application.';
}
const thresholdLabels = {bossWipes: 'Wipes on one boss to activate', runWipes: 'Wipes across run to activate', damageParseMinimum: 'Minimum average damage parse (reference)', staffEscalationWipes: 'Boss wipe count for staff escalation (reference)'};
function renderPolicy() {
  const policy = state.policy; $('#admin-version').textContent = `Latest version ${policy.version}`;
  $('#policy-form').elements.name.value = policy.name;
  $('#threshold-fields').innerHTML = Object.entries(policy.thresholds).map(([id, value]) => `<label>${esc(thresholdLabels[id])}<input name="${esc(id)}" type="number" min="1" max="${id === 'damageParseMinimum' ? 100 : 1000}" step="1" value="${value}" required></label>`).join('');
  $('#rule-editor').innerHTML = policy.rules.map(ruleEditor).join('');
}
function ruleEditor(rule) {
  return `<fieldset class="rule-row"><legend class="rule-id">${esc(rule.id)}</legend><div class="field-grid"><label>Rule label<input name="label" value="${esc(rule.label)}" maxlength="150" required></label><label>Shares removed<input name="shares" type="number" min="0.5" max="100" step="0.5" value="${esc(rule.shares)}" required></label><label>Category<select name="category">${options([['performance', 'Performance'], ['requirement', 'Requirement']], rule.category)}</select></label></div><label>Rule ID<input name="id" value="${esc(rule.id)}" pattern="[a-z0-9-]+" maxlength="80" required></label><label>Description<input name="description" value="${esc(rule.description)}" maxlength="2000" required></label><div class="outcomes">${['kill', 'wipe'].map(outcome => `<label><input type="checkbox" name="outcome" value="${outcome}" ${rule.outcomes.includes(outcome) ? 'checked' : ''}>${outcome} pulls</label>`).join('')}</div></fieldset>`;
}
async function renderAudit() {
  const [history, health] = await Promise.all([api('/api/audit'), api('/api/state')]);
  $('#audit-health').textContent = health.auditValid ? 'Hash chain consistent' : 'Audit integrity warning';
  $('#audit-list').innerHTML = history.map(item => `<details class="audit-item"><summary><span>#${item.sequence} · ${esc(item.action)} · ${esc(item.actor)}</span><time>${esc(new Date(item.at).toLocaleString())}</time></summary><pre>${esc(JSON.stringify({runId: item.runId, ...item.details, hash: item.hash}, null, 2))}</pre></details>`).join('');
}

document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => task(async () => {
  if (button.dataset.view === 'rules') { await refreshState(); renderPolicy(); }
  if (button.dataset.view === 'audit') await renderAudit();
  if (button.dataset.view === 'wcl') await wclUI.refresh();
  showView(button.dataset.view);
})));
$('#sample-button').addEventListener('click', () => task(loadSample));
$('#empty-sample').addEventListener('click', () => task(loadSample));
$('#run-select').addEventListener('change', event => task(() => selectRun(event.target.value)));
$('#import-file').addEventListener('change', () => task(async () => {
  const file = $('#import-file').files[0]; if (!file) return;
  if (file.size > 10 * 1024 * 1024) throw new Error('Run import exceeds 10 MiB');
  let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('Choose a valid run JSON file matching the sample contract. Raw Discord and WCL exports are not supported yet.'); }
  run = await api('/api/runs', {run: data}); await refreshState(); renderRun(); $('#import-file').value = ''; notice('Run imported as unverified evidence. Review before confirming.');
}));
$('#evidence-pull').addEventListener('change', event => { currentPull = event.target.value; renderEvidence(); });
$('#evidence-kind').addEventListener('change', renderEvidence);
$('#participant-form').addEventListener('submit', event => { event.preventDefault(); task(() => mutate({action: 'classify', players: [...event.target.querySelectorAll('[data-role-player]')].map(el => ({id: el.dataset.rolePlayer, role: el.value}))}, 'Participant roles saved. Unknown participants cannot be deducted.')); });
$('#timeline').addEventListener('click', event => {
  const button = event.target.closest('[data-use-evidence]'); if (!button) return;
  const evidence = run.pulls.find(p => p.id === currentPull).events.find(e => e.id === button.dataset.useEvidence);
  const player = run.players.find(p => p.id === evidence.playerId);
  if (!['booster', 'raidleader'].includes(player.role)) return notice('Classify this participant before entering a deduction. A log character is not automatically a booster.', true);
  const form = $('#manual-form'); form.closest('details').open = true; form.elements.playerId.value = evidence.playerId; form.elements.pullId.value = currentPull; form.elements.incidentKey.value = evidence.id;
  form.elements.evidenceNote.value = evidence.detail; manualEvidence = [evidence.id]; notice('Evidence attached to the manual form. Choose the appropriate rule and explain responsibility; a death alone does not establish an offense.');
  form.scrollIntoView({behavior: 'instant', block: 'start'});
});
$('#manual-form').elements.pullId.addEventListener('change', () => { manualEvidence = []; });
$('#finding-filter').addEventListener('change', () => run && renderFindings());
$('#pull-filter').addEventListener('change', () => run && renderFindings());
$('#findings').addEventListener('click', event => task(async () => {
  const button = event.target.closest('button[data-action]'); if (!button) return;
  if (button.dataset.action === 'evidence') { currentPull = button.dataset.pull; $('#evidence-pull').value = currentPull; renderEvidence(); return; }
  const card = button.closest('[data-proposal]'), proposal = run.suggestions.find(s => s.id === card.dataset.proposal);
  let reason = card.querySelector('[name="decisionReason"]')?.value.trim();
  if (!reason && button.dataset.action === 'reject') throw new Error('Enter a decision reason before rejecting this finding.');
  reason ||= proposal.explanation;
  await mutate({action: 'decision', proposalId: proposal.id, decision: button.dataset.action, reason, applicabilityNote: card.querySelector('[name="applicabilityNote"]')?.value ?? '', exception: card.querySelector('[name="exception"]')?.value ?? ''}, 'Decision saved with its evidence and policy version.');
}));
$('#manual-form').addEventListener('submit', event => { event.preventDefault(); task(async () => {
  const input = Object.fromEntries(new FormData(event.target)); await mutate({action: 'add', ...input, evidenceEventIds: manualEvidence}, 'Manual deduction recorded.'); manualEvidence = []; event.target.reset();
}); });
$('#totals').addEventListener('click', event => task(async () => {
  const button = event.target.closest('button'); if (!button) return;
  const row = button.closest('[data-player]');
  if (button.dataset.round) await mutate({action: 'round', playerId: row.dataset.player, direction: button.dataset.round, reason: row.querySelector('[name="roundingNote"]').value}, 'Explicit rounding choice saved. Exact incident totals are preserved.');
  if (button.dataset.remove) {
    // Removing reopens the originating proposal; the old decision stays in audit.
    await mutate({action: 'remove', incidentId: button.dataset.remove, reason: 'Reviewer withdrew the deduction for reconsideration.'}, 'Deduction withdrawn; original evidence and decision remain in audit.');
  }
}));
$('#confirm-button').addEventListener('click', () => task(() => mutate({action: 'confirm'}, 'Deduction list confirmed locally. No real run or payment was changed.')));
$('#reopen-button').addEventListener('click', () => task(() => mutate({action: 'reopen', reason: 'Reviewer reopened the local confirmation for corrections.'}, 'Review reopened. The previous confirmation is retained in audit.')));
$('#export-button').addEventListener('click', () => task(async () => {
  const data = await api(`/api/runs/${run.id}/export`), url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = `eden-deductions-${run.id}.json`; link.click(); URL.revokeObjectURL(url);
  notice('Downloaded a deduction-only proposal. It has not been applied to Eden.');
}));
$('#add-rule').addEventListener('click', () => { const id = `manual-rule-${document.querySelectorAll('.rule-row').length + 1}`; $('#rule-editor').insertAdjacentHTML('beforeend', ruleEditor({id, label: '', shares: 0.5, category: 'requirement', description: '', outcomes: ['kill', 'wipe']})); });
$('#policy-form').addEventListener('submit', event => { event.preventDefault(); task(async () => {
  const form = event.target, rules = [...form.querySelectorAll('.rule-row')].map(row => ({id: row.querySelector('[name="id"]').value, label: row.querySelector('[name="label"]').value, description: row.querySelector('[name="description"]').value, shares: Number(row.querySelector('[name="shares"]').value), category: row.querySelector('[name="category"]').value, outcomes: [...row.querySelectorAll('[name="outcome"]:checked')].map(el => el.value)}));
  const thresholds = Object.fromEntries(Object.keys(thresholdLabels).map(key => [key, Number(form.elements[key].value)]));
  await api('/api/policy', {expectedVersion: state.policy.version, policy: {name: form.elements.name.value, thresholds, rules}, reason: form.elements.publicationReason.value});
  await refreshState(); renderPolicy(); form.elements.publicationReason.value = ''; notice('New policy version published. Existing runs retain their pinned policy.');
}); });
const wclUI = initWclUI({api, task, notice, esc, options, openRun: async id => { await selectRun(id); showView('review'); }});
task(async () => { await refreshState(); if (state.runs.length) await selectRun(state.runs[0].id); else renderRun(); });
