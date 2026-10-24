export function initWclUI({api, task, notice, openRun, esc, options}) {
  const $ = selector => document.querySelector(selector);
  let draft = null, selected = new Set(), classifications = new Map(), poll = null;
  const roles = [['unclassified', 'Unclassified · cannot deduct'], ['booster', 'Booster'], ['raidleader', 'Raid leader'], ['lb', 'Lootbody'], ['buyer', 'Buyer / client']];
  function selectionPlayers() {
    if (!draft) return [];
    const fights = draft.fights.filter(f => selected.has(f.key));
    return draft.players.filter(p => p.references.some(r => fights.some(f => f.reportCode === r.reportCode && f.playerIds.includes(r.actorId))));
  }
  function renderSelection() {
    $('#wcl-selection-count').textContent = `${selected.size} selected · ${draft.fights.filter(f => selected.has(f.key) && f.outcome === 'kill').length} kills · ${draft.fights.filter(f => selected.has(f.key) && f.outcome === 'wipe').length} wipes`;
    $('#wcl-fights').innerHTML = `<table class="scope-table"><thead><tr><th>Select</th><th>Encounter</th><th>Result</th><th>Start (your local time)</th><th>Difficulty ID</th><th>Report / pull</th></tr></thead><tbody>${draft.fights.map(f => `<tr><td><input type="checkbox" aria-label="Select ${esc(f.key)}" data-fight="${esc(f.key)}" ${selected.has(f.key) ? 'checked' : ''} ${['kill', 'wipe'].includes(f.outcome) ? '' : 'disabled'}></td><td>${esc(f.boss)}${f.rosterIncomplete ? '<br><span class="help">Incomplete roster metadata</span>' : ''}</td><td><span class="chip ${f.outcome === 'kill' ? '' : 'subtle'}">${esc(f.outcome)}</span></td><td>${esc(new Date(f.startEpoch).toLocaleString())}</td><td>${esc(f.difficulty)}</td><td>${esc(f.key)}</td></tr>`).join('')}</tbody></table>`;
    const conflict = draft.duplicatePairs.some(([a, b]) => selected.has(a) && selected.has(b));
    $('#wcl-duplicates').textContent = draft.duplicatePairs.length ? `${draft.duplicatePairs.length} likely overlapping capture pair(s): ${draft.duplicatePairs.map(pair => pair.join(' ↔ ')).join('; ')}. ${conflict ? 'Both copies are selected: remove one before capture.' : 'Keep only one recording of each duplicate pull.'}` : 'No near-identical cross-report duplicate candidates detected. This does not rule out every overlap.';
    $('#wcl-capture-button').disabled = selected.size === 0 || conflict;
    $('#wcl-assignments').innerHTML = selectionPlayers().map(p => `<label>${esc(p.character)}<select data-assignment="${esc(p.id)}">${options(roles, classifications.get(p.id) ?? 'unclassified')}</select><small>${esc(p.identityNote)}</small></label>`).join('');
    $('#wcl-scope-confirmed').checked = false;
  }
  function renderDraft(value) {
    draft = value; $('#wcl-scope').hidden = false;
    $('#wcl-candidates').innerHTML = draft.candidates.map(c => `<article class="candidate-card">${draft.suggestedCandidateId === c.id ? '<p><span class="chip gold">Closest context match · confirm required</span></p>' : ''}<strong>${esc(c.bosses.join(' · '))}</strong><p>${c.kills} kills · ${c.wipes} wipes · ${esc(new Date(c.startEpoch).toLocaleString())}</p><p class="help">${esc(c.reason)}${c.rosterMatch === null ? '' : ` · ${Math.round(c.rosterMatch * 100)}% mean expected-roster presence`}${c.startDistanceMinutes === null ? '' : ` · ${Math.round(c.startDistanceMinutes)} min from expected start`}</p><button class="secondary" data-candidate="${esc(c.id)}">Add this group to selection</button></article>`).join('');
    $('#wcl-limitations').innerHTML = draft.limitations.map(text => `<li>${esc(text)}</li>`).join('');
    if (!$('#wcl-title').value) $('#wcl-title').value = `Eden review · ${draft.reports.map(r => r.title).join(' + ')}`.slice(0, 200);
    renderSelection();
  }
  async function refresh() {
    const status = await api('/api/wcl/status');
    $('#wcl-connection-status').textContent = status.configured ? 'API credentials configured' : 'API setup required';
    $('#wcl-setup').open = !status.configured;
    $('#wcl-jobs').innerHTML = status.jobs.map(job => `<article class="panel job-card"><div class="section-heading"><strong>${esc(job.title)}</strong><span class="chip">${esc(job.status)}</span></div><p>${job.progress.pulls}/${job.progress.total} pulls · ${job.progress.pages} raw pages · ${job.progress.events.toLocaleString()} events</p>${job.progress.current ? `<p class="help">${esc(job.progress.current)}</p>` : ''}${job.error ? `<p class="job-error">${esc(job.error)}</p>` : ''}<div class="actions">${job.status === 'complete' ? `<button data-open-review="${esc(job.runId)}">Open imported review</button>` : ''}${['running', 'queued'].includes(job.status) ? `<button class="danger" data-cancel-job="${esc(job.id)}">Cancel capture</button>` : `<button class="secondary" data-load-selection="${esc(job.id)}">Review saved selection</button>`}</div></article>`).join('') || '<p class="help">No captures yet. Load metadata, confirm the exact pulls, then fetch events.</p>';
    if (status.jobs.some(j => ['running', 'queued'].includes(j.status))) {
      clearTimeout(poll); poll = setTimeout(() => refresh().catch(error => notice(error.message, true)), 1500);
    }
    return status;
  }
  $('#wcl-credentials-form').addEventListener('submit', event => { event.preventDefault(); task(async () => {
    const form = event.target;
    try { await api('/api/wcl/credentials', {clientId: form.elements.clientId.value, clientSecret: form.elements.clientSecret.value}); form.reset(); await refresh(); notice('WCL API connection verified. Credentials stay in local ignored server storage.'); }
    finally { form.elements.clientSecret.value = ''; }
  }); });
  $('#wcl-discover-form').addEventListener('submit', event => { event.preventDefault(); task(async () => {
    const data = Object.fromEntries(new FormData(event.target)); notice('Loading WCL report metadata…');
    const value = await api('/api/wcl/discover', {reports: data.reports, context: {roster: data.roster, expectedStart: data.expectedStart, gapMinutes: Number(data.gapMinutes), overlapMinimum: Number(data.overlapMinimum)}});
    selected = new Set(); classifications = new Map(); $('#wcl-title').value = ''; renderDraft(value);
    notice('Metadata loaded. No pulls are selected automatically: confirm the boost scope below.');
  }); });
  $('#wcl-candidates').addEventListener('click', event => {
    const button = event.target.closest('[data-candidate]'); if (!button) return;
    for (const key of draft.candidates.find(c => c.id === button.dataset.candidate).fightKeys) selected.add(key);
    renderSelection();
  });
  $('#wcl-fights').addEventListener('change', event => { if (!event.target.dataset.fight) return; if (event.target.checked) selected.add(event.target.dataset.fight); else selected.delete(event.target.dataset.fight); renderSelection(); });
  $('#wcl-assignments').addEventListener('change', event => { if (event.target.dataset.assignment) { classifications.set(event.target.dataset.assignment, event.target.value); $('#wcl-scope-confirmed').checked = false; } });
  $('#wcl-select-all').addEventListener('click', () => { if (draft) { selected = new Set(draft.fights.filter(f => ['kill', 'wipe'].includes(f.outcome)).map(f => f.key)); renderSelection(); } });
  $('#wcl-select-none').addEventListener('click', () => { selected.clear(); if (draft) renderSelection(); });
  $('#wcl-capture-button').addEventListener('click', () => task(async () => {
    const result = await api('/api/wcl/capture', {draftId: draft.id, title: $('#wcl-title').value, fightKeys: [...selected], scopeConfirmed: $('#wcl-scope-confirmed').checked, assignments: selectionPlayers().map(p => ({id: p.id, role: classifications.get(p.id) ?? 'unclassified'}))});
    notice(`Capture started for ${result.progress.total} selected pulls. Raw event pages are retained locally; this does not suggest blame.`); await refresh();
  }));
  $('#wcl-refresh-jobs').addEventListener('click', () => task(refresh));
  $('#wcl-jobs').addEventListener('click', event => task(async () => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.openReview) await openRun(button.dataset.openReview);
    if (button.dataset.cancelJob) { await api('/api/wcl/cancel', {jobId: button.dataset.cancelJob}); await refresh(); notice('Capture cancelled; partial evidence was not imported as a complete review.'); }
    if (button.dataset.loadSelection) {
      const job = await api(`/api/wcl/jobs/${button.dataset.loadSelection}`);
      selected = new Set(job.fightKeys); classifications = new Map(job.assignments.map(p => [p.id, p.role])); $('#wcl-title').value = job.title;
      renderDraft(await api(`/api/wcl/drafts/${job.draftId}`)); notice('Saved selection restored. Reconfirm it before a new capture. If the report changed, reload metadata.');
    }
  }));
  return {refresh};
}
