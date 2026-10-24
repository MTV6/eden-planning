import {check,id,POLICY_VERSION,halfUnits} from './util.js';
import {validateReport} from './report.js';
import {selectFights} from './sessions.js';

export function validatePack(pack){
  check(pack&&typeof pack.id==='string'&&Number.isSafeInteger(pack.version)&&pack.version>0,'Invalid pack identity');
  check(Number.isSafeInteger(pack.encounterId)&&Number.isSafeInteger(pack.difficulty)&&typeof pack.snapshotId==='string','Pack scope required');
  check(typeof pack.syntheticOnly==='boolean'&&Array.isArray(pack.sources)&&pack.sources.length>0,'Pack source/synthetic scope required');
  check(['reviewed-demo-only','identity-observations-only','reviewed-deduction-candidates'].includes(pack.status),'Unknown pack status');
  check(Array.isArray(pack.rules)&&new Set(pack.rules.map(r=>r.id)).size===pack.rules.length,'Invalid/duplicate pack rules');
  for(const r of pack.rules){
    check(typeof r.id==='string'&&typeof r.label==='string'&&Array.isArray(r.abilityIds)&&r.abilityIds.length>0&&r.abilityIds.every(Number.isSafeInteger),'Invalid pack rule');
    check(typeof r.avoidableDeath==='boolean','Rule avoidability must be explicit');
    if(r.avoidableDeath)check(pack.status!=='identity-observations-only','Observation pack cannot grade avoidability');
  }
  return pack;
}
export function analyzeRun({report,fightIds,roster=[],packs=[]}){
  validateReport(report);packs.forEach(validatePack);
  const fights=selectFights(report,fightIds);
  check(Array.isArray(roster)&&new Set(roster.map(p=>p.actorId)).size===roster.length,'Duplicate/invalid booster mapping');
  check(roster.filter(p=>p.role==='raidleader').length<=1,'Only one raidleader is supported');
  for(const p of roster){
    check(report.actors.some(a=>a.id===p.actorId),'Roster identity is not in report');
    check(['booster','raidleader','helper','lb','buyer'].includes(p.role),'Invalid roster role');
    check(typeof p.boosterId==='string'&&p.boosterId.trim().length>0,'Eden booster/customer identity required');halfUnits(p.baseShares);
  }
  check(new Set(roster.map(p=>p.boosterId)).size===roster.length,'Character swaps must be resolved to one participant before review; duplicate Eden identity');
  const byBoss=new Map();for(const f of fights)if(!f.kill){const key=`${f.encounterId}:${f.difficulty}`;byBoss.set(key,(byBoss.get(key)??0)+1);}
  const wipeCount=fights.filter(f=>!f.kill).length;
  const active=wipeCount>=6||[...byBoss.values()].some(n=>n>=3);
  const findings=[],coverage=[];
  for(const f of fights){
    const compatible=packs.filter(p=>p.encounterId===f.encounterId&&p.difficulty===f.difficulty&&p.snapshotId===report.snapshotId&&(!p.syntheticOnly||report.synthetic===true));
    const complete=f.coverage?.status==='complete';
    coverage.push({fightId:f.id,name:f.name,status:complete?'complete':'unavailable',packIds:compatible.map(p=>p.id),
      mechanicCoverage:compatible.some(p=>p.status==='reviewed-deduction-candidates'||p.status==='reviewed-demo-only')?'limited-reviewed-rules':compatible.length?'observations-only':'unassessed',
      limitations:[...(!complete?['Capture is incomplete or not loaded; event deductions cannot be accepted.']:[]),
        ...(!compatible.length?['No exact encounter/difficulty/snapshot pack; no automatic mechanic grading.']:[])]});
    if(!complete)continue;
    for(const death of f.events.filter(e=>e.type==='death'&&f.playerIds.includes(e.targetId))){
      const recent=f.events.filter(e=>e.type==='damage'&&e.targetId===death.targetId&&e.time<=death.time&&death.time-e.time<=5000);
      const fatal=recent.filter(e=>e.overkill>0).at(-1);
      const killingAbilityId=death.killingAbilityId??fatal?.abilityId??null;
      const witnesses=compatible.flatMap(pack=>pack.rules.filter(r=>r.abilityIds.includes(killingAbilityId)).map(rule=>({pack,rule})));
      const graded=witnesses.find(w=>w.rule.avoidableDeath);
      const match=graded??witnesses[0];
      const ability=report.abilities?.find(a=>a.gameID===killingAbilityId);
      const actor=report.actors.find(a=>a.id===death.targetId);
      const fid=id([report.code,report.revision,f.id,'death',death.id]);
      findings.push({id:fid,incidentKey:`${f.id}:death:${death.id}`,fightId:f.id,encounterId:f.encounterId,boss:f.name,
        difficulty:f.difficulty,killPull:f.kill,actorId:death.targetId,player:actor?.name??String(death.targetId),
        timeMs:death.time,type:'death-observation',label:match?`Death involving ${match.rule.label}`:killingAbilityId?`Death involving ${ability?.name??`ability ${killingAbilityId}`}`:'Recorded death; cause unresolved',
        candidateShares:graded?0.5:null,eligibility:active?'performance-trigger-active':'requires-pretrigger-exception-or-trigger',
        status:'needs-review',witness:match?{packId:match.pack.id,packVersion:match.pack.version,ruleId:match.rule.id}:null,
        evidence:{deathEventId:death.id,killingAbilityId,fatalDamageEventId:fatal?.id??null,recentDamage:recent.map(e=>({eventId:e.id,timeMs:e.time,abilityId:e.abilityId,amount:e.amount})),
          url:/^[A-Za-z0-9]{16}$/.test(report.code)?`https://www.warcraftlogs.com/reports/${report.code}?fight=${f.id}&type=deaths`:null},
        limitations:['A death observation does not prove the dead player was responsible.','Wipe causation and the unrecoverable point require review.',
          ...(!graded?['No certified avoidable-death rule matched; no share amount assigned automatically.']:[])]});
    }
  }
  const fingerprint=id([POLICY_VERSION,report.code,report.revision,report.snapshotId,fights,roster,packs]);
  return {schemaVersion:1,id:fingerprint,policyVersion:POLICY_VERSION,report:{code:report.code,revision:report.revision??null,snapshotId:report.snapshotId??null,synthetic:report.synthetic===true},
    selectedFightIds:fights.map(f=>f.id),roster,trigger:{active,wipes:wipeCount,byBoss:[...byBoss].map(([key,wipes])=>({key,wipes})),thresholds:{boss:3,run:6}},
    fights:fights.map(f=>({id:f.id,name:f.name,kill:f.kill,durationMs:f.endTime-f.startTime})),coverage,findings,
    limitations:['Suggestions only: no payout or Discord post is performed.','Unknown mechanics and missing streams are not evidence of clean play.',
      'Voice, conduct, attendance, confirmed disconnects, assignments and replacement circumstances need external evidence.',
      'Below-50 average-parse replacement and pretrigger damage/healing blame are not inferred from raw death events.',
      'No reviewed raid-wide wipe-cause classifier is bundled in v0.1.']};
}

const manualCategories=new Set(['voice','preparation','attendance','conduct','dc-wipe','mechanic']);
export function reviewRun(analysis,{decisions=[],manualIncidents=[],replacements=[],cutoffs={},selectionConfirmed=false,reviewer='',eligiblePoolConfirmed=false}={}){
  check(selectionConfirmed===true,'Confirm the exact boost pull selection first');
  check(typeof reviewer==='string'&&reviewer.trim(),'Reviewer identity required');
  check(analysis?.policyVersion===POLICY_VERSION,'Unsupported policy version');
  check(new Set(decisions.map(d=>d.findingId)).size===decisions.length,'Duplicate finding decision');
  check(new Set(replacements.map(r=>r.actorId)).size===replacements.length,'Duplicate replacement decision');
  const fighters=new Map(analysis.fights.map(f=>[f.id,f]));
  for(const [key,time] of Object.entries(cutoffs))check(fighters.has(Number(key))&&Number.isFinite(time)&&time>=0&&time<=fighters.get(Number(key)).durationMs,'Invalid unrecoverable cutoff');
  const rows=analysis.roster.map(p=>({...p,removedHalfUnits:0,incidents:[],replacement:null}));
  const rowFor=actorId=>{const row=rows.find(r=>r.actorId===actorId);check(row&&['booster','raidleader','helper'].includes(row.role),'Resolve responsible actor to an eligible Eden booster/helper, not a buyer/LB');return row;};
  const acceptedKeys=new Set();
  const incidents=[];
  function addIncident(entry){
    check(!acceptedKeys.has(entry.incidentKey),'Same incident cannot be deducted twice');acceptedKeys.add(entry.incidentKey);
    const row=rowFor(entry.actorId);row.removedHalfUnits+=halfUnits(entry.shares);row.incidents.push(entry);incidents.push(entry);
  }
  for(const d of decisions){
    const finding=analysis.findings.find(f=>f.id===d.findingId);check(finding,'Unknown/stale finding ID');
    check(['accept','reject'].includes(d.action),'Unknown review action');
    check(typeof d.reason==='string'&&d.reason.trim(),'Decision reason required');
    if(d.action==='reject')continue;
    check(analysis.coverage.find(c=>c.fightId===finding.fightId)?.status==='complete','Cannot accept incomplete event evidence');
    check(d.beforeUnrecoverable===true,'Confirm the incident occurred before the pull became unrecoverable');
    const cutoff=cutoffs[finding.fightId];check(cutoff===undefined||finding.timeMs<cutoff,'Incident is at or after unrecoverable cutoff');
    check(['avoidable-death','wipe'].includes(d.impact),'Choose avoidable-death or wipe');
    check(d.impact!=='wipe'||!finding.killPull,'A kill pull cannot have a wipe-causing charge');
    if(!analysis.trigger.active)check(['damage-1pct','healing-avoidable-deaths'].includes(d.pretriggerException)&&d.exceptionEvidence?.trim(),'Performance trigger inactive: documented permitted exception required');
    addIncident({incidentKey:finding.incidentKey,actorId:d.responsibleActorId??finding.actorId,shares:d.impact==='wipe'?1:0.5,
      category:'mechanic',findingId:finding.id,fightId:finding.fightId,timeMs:finding.timeMs,reason:d.reason.trim(),evidence:finding.evidence,
      pretriggerException:d.pretriggerException??null,exceptionEvidence:d.exceptionEvidence??null});
  }
  for(const [i,m] of manualIncidents.entries()){
    check(manualCategories.has(m.category)&&m.reason?.trim()&&m.evidence?.trim(),'Manual incident category, reason and external evidence are required');
    check(typeof m.incidentKey==='string'&&m.incidentKey.trim(),'Manual incident key required');
    const performance=['mechanic','dc-wipe'].includes(m.category);
    if(performance){
      check(fighters.has(m.fightId)&&m.beforeUnrecoverable===true,'Performance incident requires selected fight and pre-wipe confirmation');
      check(Number.isFinite(m.timeMs)&&m.timeMs>=0&&m.timeMs<=fighters.get(m.fightId).durationMs,'Manual performance timestamp required');
      check(cutoffs[m.fightId]===undefined||m.timeMs<cutoffs[m.fightId],'Manual incident after cutoff');
      if(!analysis.trigger.active)check(['damage-1pct','healing-avoidable-deaths'].includes(m.pretriggerException)&&m.exceptionEvidence?.trim(),'Manual performance incident needs trigger or documented permitted exception');
      if(m.category==='dc-wipe'||m.impact==='wipe')check(!fighters.get(m.fightId).kill,'No wipe charge on a kill pull');
      if(m.category==='mechanic')check(['avoidable-death','wipe'].includes(m.impact),'Manual mechanic impact required');
    }else check(m.requirementApplies===true,'Confirm the requirement applies; pre-trigger fixed-rule timing is not assumed');
    addIncident({incidentKey:m.incidentKey,actorId:m.actorId,shares:m.category==='mechanic'&&m.impact==='avoidable-death'?0.5:1,
      category:m.category,reason:m.reason.trim(),evidence:m.evidence.trim(),fightId:m.fightId??null,timeMs:m.timeMs??null,
      pretriggerException:m.pretriggerException??null,exceptionEvidence:m.exceptionEvidence??null});
  }
  for(const replacement of replacements){
    const row=rowFor(replacement.actorId);check(replacement.reason?.trim()&&replacement.termsDeclared===true,'Replacement reason and declared terms required');
    const retained=halfUnits(replacement.retainedShares);check(retained<=halfUnits(row.baseShares),'Replacement cannot increase normal entitlement');
    check(['unsaved-replacement','saved-replacement','no-replacement'].includes(replacement.mode),'Replacement mode required');
    if(replacement.mode==='no-replacement')check(retained===0||retained===halfUnits(row.baseShares)/2,'No-replacement outcome must be half cut or full removal');
    check(Number.isInteger(retained),'Half cut creates unsupported quarter shares; specify payout handling first');
    row.replacement={...replacement,retainedShares:retained/2};
    // Explicit final entitlement overrides incident sums, it never silently stacks them.
    row.removedHalfUnits=halfUnits(row.baseShares)-retained;
  }
  for(const row of rows){check(row.removedHalfUnits<=halfUnits(row.baseShares),'Deductions exceed entitlement; reviewer must resolve final cut');row.removedShares=row.removedHalfUnits/2;row.retainedShares=row.baseShares-row.removedShares;}
  const leader=rows.find(r=>r.role==='raidleader');
  const recipients=rows.filter(r=>['booster','helper'].includes(r.role)&&r.removedHalfUnits===0).map(r=>r.boosterId);
  const leaderEligible=!!leader&&leader.removedHalfUnits===0;
  const drafts=rows.filter(r=>r.removedShares>0).map(r=>({boosterId:r.boosterId,actorId:r.actorId,sharesBefore:r.baseShares,sharesRemoved:r.removedShares,sharesRetained:r.retainedShares,
    text:`Deduct — ${r.displayName??r.boosterId}\nShares: ${r.baseShares} → ${r.retainedShares} (${r.removedShares} removed)\n${r.incidents.map(i=>`- ${i.reason} [${i.shares} share${i.shares===1?'':'s'}]`).join('\n')}${r.replacement?`\nFinal replacement entitlement: ${r.retainedShares} shares. ${r.replacement.reason} (replaces incident total; does not stack)` : ''}`}));
  return {schemaVersion:1,id:id([analysis.id,decisions,manualIncidents,replacements,cutoffs,reviewer,eligiblePoolConfirmed]),analysisId:analysis.id,policyVersion:POLICY_VERSION,
    status:'reviewed-draft',reviewer,rows,decisions,manualIncidents,replacements,cutoffs,drafts,
    distribution:{status:'formula-only-not-a-payout',leaderEligible,leaderPercent:leaderEligible?30:0,boosterPercent:leader?leaderEligible?70:100:null,
      eligibleBoosterIds:recipients,eligiblePoolConfirmed,limitations:[...(!leader?['RL identity missing: allocation unresolved.']:[]),
        'All deductions must be finalized before recipient eligibility can be confirmed.','Division within the booster pool has not been specified; no equal split is assumed.',
        ...(!recipients.length?['No eligible booster recipients; redistribution requires resolution.']:[])]},
    limitations:['No payment or external post is executed.','Staff reviews appeals first, then adds RL; staff-ordered refunds after paid attendance are personally due from RL within 24 hours.']};
}
