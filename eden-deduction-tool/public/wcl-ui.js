export function initWclUI({api, task, notice, openRun, esc, options}) {
  const $ = selector => document.querySelector(selector);
  let draft = null, selected = new Set(), classifications = new Map(), poll = null, missingResult = null;
  const roles = [['unclassified', 'Unclassified · cannot deduct'], ['booster', 'Booster'], ['helper', 'Helper / replacement'], ['raidleader', 'Raid leader'], ['lb', 'Lootbody'], ['buyer', 'Buyer / client']];
  function selectionPlayers() {
    if (!draft) return [];
    const fights = draft.fights.filter(f => selected.has(f.key));
    return draft.players.filter(p => p.references.some(r => fights.some(f => f.reportCode === r.reportCode && f.playerIds.includes(r.actorId))));
  }
  function renderSelection() {
    $('#wcl-missing-button').disabled = selected.size === 0;
    const known = draft.fights.filter(f => selected.has(f.key));
    if (known.length && !$('#wcl-missing-start').value) {
      const expected = Date.parse(draft.context.expectedStart), first = Math.min(...known.map(f => f.startEpoch));
      const start = Number.isFinite(expected) ? Math.min(expected, first) : first - 2 * 3600000;
      $('#wcl-missing-start').value = new Date(start).toISOString();
      $('#wcl-missing-end').value = new Date(Math.max(start + 4 * 3600000, ...known.map(f => f.endEpoch + 30 * 60000))).toISOString();
    }
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
    $('#wcl-missing-roster').value = draft.context.roster || '';
    $('#wcl-missing-start').value = ''; $('#wcl-missing-end').value = '';
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
  async function refreshSearches() {
    const searches = await api('/api/wcl/searches');
    $('#wcl-search-history').innerHTML = searches.map(s => `<button class="secondary" data-search-id="${esc(s.id)}">${esc(new Date(s.createdAt).toLocaleString())} · ${s.candidates} candidates · ${s.characters} characters</button>`).join(' ') || '<p class="help">No searches yet. Load a report and select its known boost pulls to start.</p>';
  }
  function renderSearch(result) {
    missingResult = result;
    $('#wcl-search-result').innerHTML = `<article class="panel"><h3>${result.candidates.length} candidate reports · ${result.limited ? 'limited search' : 'searched selected history'}</h3><p>${result.queries} API query budget units (retries excluded) · ${result.cacheHits} cache hits · ${result.unsearchedCharacters} roster characters not searched</p><p class="help">${esc(result.limitations.join(' '))}</p><button class="secondary" data-restore-search>Restore source selection</button><details><summary>Character coverage and errors</summary><ul>${result.characters.map(c => `<li>${esc(c.character)}: ${esc(c.status)} · ${c.pages} pages${c.missingFromKnownPulls ? ' · missing from known pulls' : ''}${c.error ? ` · ${esc(c.error)}` : ''}</li>`).join('')}${result.errors.map(e => `<li>${esc(e.code ?? '')} ${esc(e.error)}</li>`).join('')}</ul><p>${result.uncheckedReports ?? 0} candidate reports beyond the metadata limit</p></details></article>${result.candidates.map(c => `<article class="panel candidate-card"><h3><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.title)}</a> · ${esc(c.confidence)} match</h3><p>Uploader: ${esc(c.uploader)} · ${c.matchedRoster}/${c.expectedRoster} roster match on strongest pull</p><p>${c.overlapPulls} matching known pulls · ${c.additionalKills} additional kill candidates · ${c.additionalWipes} additional wipe candidates</p><p>${esc(c.bosses.join(' · '))}</p><p>${esc(new Date(c.firstPullAt).toLocaleString())} – ${esc(new Date(c.lastPullAt).toLocaleString())}</p><p class="help">${esc(c.evidence)} ${esc(c.caution)}</p><details><summary>Found through ${c.foundVia.length} characters</summary>${esc(c.foundVia.join(', '))}</details><button class="secondary" data-load-candidate="${esc(c.code)}">Load this report alongside source for review</button></article>`).join('')}${result.candidates.length ? '' : '<p>No matching reports found within this search. This does not establish that no other reports exist.</p>'}`;
  }
  $('#wcl-missing-form').addEventListener('submit', event => { event.preventDefault(); task(async () => {
    $('#wcl-missing-button').disabled = true;
    notice('Searching character histories and comparing report metadata. This can take up to a few minutes…');
    try {
      renderSearch(await api('/api/wcl/find-missing', {draftId: draft.id, fightKeys: [...selected], roster: $('#wcl-missing-roster').value, start: $('#wcl-missing-start').value, end: $('#wcl-missing-end').value, playerLimit: Number($('#wcl-missing-limit').value), pagesPerPlayer: Number($('#wcl-missing-pages').value)}));
      await refreshSearches(); notice('Search complete. Inspect the matching evidence before loading a report.');
    } finally { $('#wcl-missing-button').disabled = selected.size === 0; }
  }); });
  $('#wcl-search-refresh').addEventListener('click', () => task(refreshSearches));
  $('#wcl-search-history').addEventListener('click', event => { const b = event.target.closest('[data-search-id]'); if (b) task(async () => renderSearch(await api(`/api/wcl/searches/${b.dataset.searchId}`))); });
  $('#wcl-search-result').addEventListener('click', event => { const b = event.target.closest('button'); if (!b || !missingResult) return; task(async () => {
    if (b.hasAttribute('data-restore-search')) {
      selected = new Set(missingResult.baselineFightKeys); classifications = new Map(); renderDraft(await api(`/api/wcl/drafts/${missingResult.draftId}`));
      $('#wcl-missing-panel').open = true; $('#wcl-missing-roster').value = missingResult.roster.map(r => `${r.name}-${r.realm}`).join('\n');
      $('#wcl-missing-start').value = new Date(missingResult.start).toISOString(); $('#wcl-missing-end').value = new Date(missingResult.end).toISOString();
    }
    if (b.dataset.loadCandidate) {
      const value = await api('/api/wcl/load-candidate', {searchId: missingResult.id, code: b.dataset.loadCandidate, confirmed: true});
      selected = new Set(); classifications = new Map(); renderDraft(value);
      notice('Candidate metadata loaded. Select the correct groups and resolve overlapping pulls before capturing any events.');
    }
  }); });
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
  return {refresh: async () => { const status = await refresh(); await refreshSearches(); return status; }};
}
