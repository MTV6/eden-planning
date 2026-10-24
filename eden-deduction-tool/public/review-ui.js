export function initReviewUI({api,task,notice,esc,options,getRun,prepare}) {
  const $=s=>document.querySelector(s);let report=null,request=0,deathLimit=20;
  const eligible=p=>['booster','helper','raidleader'].includes(p.role)&&!p.ownerId;
  const time=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
  const line=e=>`${time(e.timeSeconds)} · ${e.source} → ${e.target} · ${e.ability}${e.amount?` · ${Math.round(e.amount).toLocaleString()}`:''}${e.stack?` · ${e.stack} stacks`:''}`;
  async function refresh() {
    const run=getRun(),token=++request;report=null;$('#death-cards').innerHTML='';$('#mechanic-cards').innerHTML='';
    $('#review-analyze').disabled=!run?.wcl;$('#review-health').textContent=run?.wcl?'Generate review from the existing capture. No new WCL requests.':'Capture WCL evidence to enable death review.';
    if(!run?.wcl)return;
    try {const data=await api(`/api/wcl/review/${run.id}`);if(token!==request)return;report=data;render();}catch(e){notice(e.message,true);}
  }
  function card(c) {
    const run=getRun(),p=run.players.find(p=>p.id===(c.physicalPlayerId??c.playerId)),pull=run.pulls.find(p=>p.id===c.pullId);
    return `<article class="finding review-card" data-review-card="${esc(c.id)}"><div class="finding-top"><span class="chip subtle">${esc(c.kind)} · human review</span><span class="amount">${c.suggestedShares===null?'—':esc(c.suggestedShares)} <small>shares if confirmed</small></span></div><h3>${esc(p?.character??`${c.add} · instance ${c.addInstance}`)}</h3><p class="metadata">${esc(pull.boss)} · ${esc(pull.outcome)} · ${time(c.timeSeconds)}</p><p>${esc(c.summary)}</p><p><a href="${esc(c.url)}" target="_blank" rel="noreferrer">Open this event window in WCL</a></p>
    ${c.kind==='death'?`<p>Lethal hit: ${esc(c.lethal?.ability??'not established')}${c.lethal?` · ${Math.round(c.lethal.amount).toLocaleString()} damage · ${c.lethal.overkill===null?'overkill unknown':Math.round(c.lethal.overkill).toLocaleString()+' overkill'}`:''}. A large hit alone does not establish an avoidable one-shot.</p><p>Healing in the prior ${report.settings.contextSeconds}s: <strong>${Math.round(c.healingAmount).toLocaleString()}</strong> across ${c.healingEvents} heal events. Absorbs and overhealing are separate.</p><p>Observed active defensives: ${esc(c.activeDefensives.map(e=>e.ability).join(', ')||'None observed in captured buff state')}. Recent defensive casts: ${esc(c.recentDefensives.map(e=>e.ability).join(', ')||'None observed')}. <strong>Cooldown readiness unknown.</strong></p><p>Observed debuffs at death: ${esc(c.debuffs.map(e=>`${e.ability} (${e.stack} stack${e.stack===1?'':'s'})`).join(', ')||'None observed')}.</p><p>Last recorded cast: ${c.activityGapSeconds===null?'unknown':`${c.activityGapSeconds.toFixed(1)}s before death`}. Cast records may include auto attacks; inactivity does not prove AFK or a disconnect.</p><details><summary>Damage, healing and debuff context</summary><p class="help">Last ${c.damage.length}/${c.damageEvents} damage events and ${c.healing.length}/${c.healingEvents} healing events shown. Debuff entries show their last observed application or stack update, which can precede this window.</p><ul>${[...c.damage,...c.healing,...c.debuffs].sort((a,b)=>a.timeSeconds-b.timeSeconds).map(e=>`<li>${esc(line(e))}</li>`).join('')}</ul></details>`:`<p>${c.nearbyDeaths.length} booster/helper/RL death events nearby; ${c.otherDeathsCount} other death events retained as context. Temporal proximity does not establish causation.</p>${c.kind==='missed-interrupt'?`<p>Cast began: ${c.began?time(c.began.timeSeconds):'not observed'}. Add instance: ${c.addInstance}. Previous successful interrupts refer to this same add instance.</p><details><summary>Recent control attempts and previous interrupts</summary><ul>${[...c.previousInterrupts,...c.recentResponses].map(e=>`<li>${esc(line(e))} · target instance ${e.targetInstance}</li>`).join('')}</ul></details>`:''}`}
    <p class="help">${esc(c.caution)} ${esc(c.applicability.reason)} ${c.afterWipeCall?'After recorded wipe call: not offered for a new performance deduction.':''}</p>
    ${run.status==='draft'&&!c.afterWipeCall?`<label>Responsible booster/helper<select data-card-player>${options([['','Choose after reviewing responsibility'],...run.players.filter(eligible).map(p=>[p.id,p.character])],c.deductionPlayerId??'')}</select></label><button class="secondary" data-prepare-review="${esc(c.id)}">Prepare deduction for review</button>`:''}</article>`;
  }
  function render() {
    if(!report?.ready)return;
    const pull=$('#review-pull').value,kind=$('#review-kind').value;
    const matches=c=>pull==='all'||c.pullId===pull;
    $('#review-health').textContent=`${report.summary.pulls} unique pulls · ${report.summary.deaths} eligible death events · ${report.summary.observations} mechanic observations. Excluded from death candidates: ${report.excluded.buyer} buyer, ${report.excluded.lb} lootbody, ${report.excluded.unclassified} unclassified deaths. ${report.summary.unclassifiedCharacters} characters need classification. Snapshot ${new Date(report.createdAt).toLocaleString()}.`;
    const matchingDeaths=report.deaths.filter(matches);
    $('#death-cards').innerHTML=kind==='mechanics'?'':`<p class="help">Showing ${Math.min(deathLimit,matchingDeaths.length)} of ${matchingDeaths.length} eligible death cards. Filter by pull to narrow review.</p>`+(matchingDeaths.slice(0,deathLimit).map(card).join('')||'<p class="help">No eligible death cards match. Check participant classifications and filters.</p>')+(matchingDeaths.length>deathLimit?'<button data-more-deaths class="secondary">Show 20 more deaths</button>':'');
    $('#mechanic-cards').innerHTML=kind==='deaths'?'':report.observations.filter(matches).map(card).join('')||'<p class="help">No supported Ula’tek pack observations match. Other mechanics still need manual evidence.</p>';
    $('#unknown-review').textContent=report.unknown.map(d=>`${getRun().players.find(p=>p.id===d.playerId)?.character} · ${getRun().pulls.find(p=>p.id===d.pullId)?.boss} ${time(d.timeSeconds)}`).join('\n')||'No unclassified death events.';
  }
  $('#review-analyze').addEventListener('click',()=>task(async()=>{
    const run=getRun(),settings=Object.fromEntries([...document.querySelectorAll('[data-review-setting]')].map(e=>[e.dataset.reviewSetting,Number(e.value)]));
    $('#review-health').textContent='Reviewing stored event pages…';report=await api(`/api/wcl/review/${run.id}`,{settings});render();notice('Review generated from stored evidence. Rule amounts come from the pinned policy; confirm responsibility before adding a deduction.');
  }));
  $('#review-pull').addEventListener('change',()=>{deathLimit=20;render();});$('#review-kind').addEventListener('change',render);
  $('#review-cards').addEventListener('click',e=>{
    if(e.target.closest('[data-more-deaths]')){deathLimit+=20;render();return;}
    const button=e.target.closest('[data-prepare-review]');if(!button)return;
    const c=[...report.deaths,...report.observations].find(c=>c.id===button.dataset.prepareReview),playerId=button.closest('[data-review-card]').querySelector('[data-card-player]').value;
    if(!playerId)return notice('Choose the responsible booster/helper after checking assignment and ability availability.',true);
    prepare({...c,playerId});
  });
  function runChanged() {
    const run=getRun();$('#review-pull').innerHTML=options([['all','All captured pulls'],...(run?.pulls??[]).map(p=>[p.id,`${p.boss} · ${p.outcome} · ${p.id.split(':').at(-1)}`])],'all');void refresh();
  }
  return {runChanged};
}
