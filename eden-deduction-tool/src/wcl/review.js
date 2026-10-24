import {gunzipSync, gzipSync} from 'node:zlib';
import {digest} from './scope.js';
import {requireValue, eligibility} from '../ledger/policy.js';
import {responsiblePlayer, reviewRoles} from '../ledger/participants.js';
import {ulatek, defensives} from './packs/ulatek.js';

const defaults = {contextSeconds:8, impactSeconds:3, rollSeconds:3};
export function reviewSettings(input = {}) {
  const value={};
  for(const [k,d] of Object.entries(defaults)) {value[k]=Number(input[k]??d);requireValue(Number.isFinite(value[k])&&value[k]>=1&&value[k]<=30, `Invalid review setting: ${k}`);}
  return value;
}
export function wclWindow(code,fightId,start,end) {
  requireValue(/^[A-Za-z0-9]{16}$/.test(code) && Number.isInteger(fightId),'Invalid WCL evidence reference');
  return `https://www.warcraftlogs.com/reports/${code}?fight=${fightId}&type=deaths&start=${Math.max(0,Math.floor(start))}&end=${Math.ceil(end)}`;
}
// Feed a complete captured fight once. Keeps short per-player windows and compact facts.
export function createReviewer({report,fight,settings=defaults,playerRefs}) {
  settings=reviewSettings(settings);
  const actors=new Map(report.masterData.actors.map(a=>[a.id,a])), abilities=new Map(report.masterData.abilities.map(a=>[a.gameID,a.name]));
  const active=new Map(), debuffState=new Map(), windows=new Map(), casts=new Map(), lastActivity=new Map(), gaps=new Map(), deaths=[], failures=[], rolls=[], interrupts=[];
  const begins=new Map(), controls=new Map(), damageHits=[], responses=[], eligiblePack=fight.encounterId===ulatek.encounterId&&ulatek.difficulties.includes(fight.difficulty);
  const actorName=id=>actors.get(id)?.name??'Unknown actor';
  const owner=id=>actors.get(id)?.petOwner??id;
  const instance=(id,n)=>`${id}:${n??1}`;
  const compact=(e,index)=>({id:`${fight.reportCode}-${fight.id}-${index}`,timeSeconds:(e.timestamp-fight.startTime)/1000,timestamp:e.timestamp,type:e.type,source:actorName(e.sourceID),sourceActor:e.sourceID,target:actorName(e.targetID),targetActor:e.targetID,abilityId:e.abilityGameID,ability:abilities.get(e.abilityGameID)??`Ability ${e.abilityGameID}`,amount:e.amount??0,overkill:e.overkill??null,hp:e.hitPoints??null,maxHp:e.maxHitPoints??null,x:e.x??null,y:e.y??null,targetInstance:e.targetInstance??1,sourceInstance:e.sourceInstance??1});
  let eventCount=0, lastTime=fight.startTime;
  function page(batch) {
    for(const [i,e] of batch.page.data.entries()) {
      requireValue(Number.isFinite(e.timestamp)&&e.timestamp>=lastTime&&e.timestamp<=fight.endTime,'Review events out of order or outside pull',502);lastTime=e.timestamp;eventCount++;
      const p=playerRefs.get(e.targetID),src=playerRefs.get(owner(e.sourceID)),v={...compact(e,`${batch.index}-${i}`),stack:e.stack??null};
      if(e.type==='combatantinfo'&&playerRefs.has(e.sourceID)) {
        if(!active.has(e.sourceID))active.set(e.sourceID,new Map());
        for(const aura of e.auras??[])if(defensives[aura.ability])active.get(e.sourceID).set(aura.ability,{abilityId:aura.ability,ability:abilities.get(aura.ability)??defensives[aura.ability],timeSeconds:0,source:'Pull-start aura snapshot'});
      }
      if(p) {
        if(!windows.has(e.targetID))windows.set(e.targetID,[]);
        const q=windows.get(e.targetID);while(q.length&&q[0].timestamp<e.timestamp-settings.contextSeconds*1000)q.shift();
        if(['damage','heal','absorbed','applydebuff','applydebuffstack'].includes(e.type))q.push(v);
        if(!active.has(e.targetID))active.set(e.targetID,new Map());
        if(!debuffState.has(e.targetID))debuffState.set(e.targetID,new Map());
        if(['applydebuff','refreshdebuff','applydebuffstack','removedebuffstack'].includes(e.type))debuffState.get(e.targetID).set(e.abilityGameID,{...v,stack:e.stack??1});
        if(e.type==='removedebuff')debuffState.get(e.targetID).delete(e.abilityGameID);
        if(defensives[e.abilityGameID]) {
          if(['applybuff','refreshbuff','applybuffstack'].includes(e.type))active.get(e.targetID).set(e.abilityGameID,v);
          if(e.type==='removebuff')active.get(e.targetID).delete(e.abilityGameID);
        }
        if(e.type==='death') {
          const damage=q.filter(x=>x.type==='damage'), healing=q.filter(x=>x.type==='heal');
          const lethal=damage.findLast(x=>x.hp===0&&x.timestamp>=e.timestamp-1000)??null;
          const recentCasts=(casts.get(e.targetID)??[]).filter(x=>x.timestamp>=e.timestamp-settings.contextSeconds*1000);
          deaths.push({id:v.id,kind:'death',playerId:p,physicalPlayerId:p,pullId:fight.key,timeSeconds:v.timeSeconds,timestamp:e.timestamp,
            lethal,damage:damage.slice(-15),damageEvents:damage.length,healing:healing.slice(-10),healingEvents:healing.length,healingAmount:healing.reduce((s,x)=>s+x.amount,0),
            activeDefensives:[...active.get(e.targetID).values()],recentDefensives:recentCasts.filter(x=>defensives[x.abilityId]),
            debuffs:[...debuffState.get(e.targetID).values()].slice(-20),lastActivity:lastActivity.get(e.targetID)??null,
            activityGapSeconds:lastActivity.has(e.targetID)?(e.timestamp-lastActivity.get(e.targetID).timestamp)/1000:null,
            url:wclWindow(fight.reportCode,fight.id,e.timestamp-settings.contextSeconds*1000,Math.min(fight.endTime,e.timestamp+3000)),
            summary:`${actorName(e.targetID)} died${lethal?` after ${lethal.ability}`:': lethal hit not established'}. Avoidability and responsibility require review.`,
            ruleId:'avoidable-death',afterWipeCall:Number.isFinite(fight.wipeCalledTime)&&e.timestamp>=fight.wipeCalledTime});
          active.get(e.targetID).clear(); // Buff state after death is unknown until observed again.
          debuffState.get(e.targetID).clear();
        }
      }
      if(src&&e.type==='cast'&&actors.get(e.sourceID)?.type==='Player') {
        const actor=e.sourceID,prev=lastActivity.get(actor);
        if(prev&&e.timestamp-prev.timestamp>=10000) {const list=gaps.get(actor)??[];list.push({from:prev.timeSeconds,to:v.timeSeconds,seconds:(e.timestamp-prev.timestamp)/1000});gaps.set(actor,list);}
        lastActivity.set(actor,v);const q=casts.get(actor)??[];q.push(v);while(q.length&&q[0].timestamp<e.timestamp-30000)q.shift();casts.set(actor,q);
        if(eligiblePack&&ulatek.movement.includes(e.abilityGameID))rolls.push({...v,playerId:src});
      }
      if(!eligiblePack)continue;
      while(responses.length&&responses[0].timestamp<e.timestamp-30000)responses.shift();
      if(src&&e.type==='cast'&&/^(Counter Shot|Spell Lock|Disrupt|Spear Hand Strike|Kick|Rebuke|Counterspell)$/.test(v.ability))responses.push({...v,playerId:src});
      if(e.type==='interrupt') {
        const key=instance(e.targetID,e.targetInstance),entry=controls.get(key)??[];
        const control={...v,playerId:src??null,extraAbilityId:e.extraAbilityGameID,extraAbility:abilities.get(e.extraAbilityGameID)??'Unknown interrupted spell'};
        entry.push(control);controls.set(key,entry);interrupts.push(control);
        begins.delete(`${key}:${e.extraAbilityGameID}`);
      }
      const mechanic=ulatek.controls[e.abilityGameID];
      if(mechanic&&actorName(e.sourceID)===mechanic.actor) {
        const key=`${instance(e.sourceID,e.sourceInstance)}:${e.abilityGameID}`;
        if(e.type==='begincast')begins.set(key,v);
        if(e.type==='cast') {
          failures.push({id:`cast-${v.id}`,kind:'missed-interrupt',pullId:fight.key,timeSeconds:v.timeSeconds,timestamp:e.timestamp,ability:v.ability,abilityId:v.abilityId,
            add:v.source,addInstance:v.sourceInstance,sourceActor:e.sourceID,began:begins.get(key)??null,cast:v,
            previousInterrupts:(controls.get(instance(e.sourceID,e.sourceInstance))??[]).slice(-3),recentResponses:[...responses],playerId:null,ruleId:'wipe-causing',
            afterWipeCall:Number.isFinite(fight.wipeCalledTime)&&e.timestamp>=fight.wipeCalledTime,
            url:wclWindow(fight.reportCode,fight.id,(begins.get(key)?.timestamp??e.timestamp)-1000,Math.min(fight.endTime,e.timestamp+settings.impactSeconds*1000)),
            summary:`${v.source} instance ${v.sourceInstance} completed ${v.ability}. Assign responsibility only after checking calls, reach and ability availability.`});
          begins.delete(key);
        }
      }
      if(e.type==='damage'&&ulatek.tankDamage.includes(e.abilityGameID))damageHits.push(v);
    }
  }
  function result() {
    const observations=failures.map(f=>({...f,nearbyDeaths:deaths.filter(d=>d.timestamp>=f.timestamp&&d.timestamp<=f.timestamp+settings.impactSeconds*1000).map(d=>({id:d.id,playerId:d.playerId,timeSeconds:d.timeSeconds,lethalAbility:d.lethal?.ability??null})),
      recentResponses:f.recentResponses }));
    for(const roll of rolls) {
      const before=damageHits.filter(h=>h.targetActor===roll.sourceActor&&h.timestamp<=roll.timestamp&&h.timestamp>=roll.timestamp-settings.rollSeconds*1000);
      const after=damageHits.filter(h=>h.targetActor===roll.sourceActor&&h.timestamp>roll.timestamp&&h.timestamp<=roll.timestamp+settings.rollSeconds*1000);
      if(!before.length||!after.length)continue;
      const nearbyDeaths=deaths.filter(d=>d.timestamp>=roll.timestamp&&d.timestamp<=roll.timestamp+settings.rollSeconds*1000&&d.lethal&&ulatek.tankDamage.includes(d.lethal.abilityId));
      observations.push({id:`roll-${roll.id}`,kind:'tank-movement',pullId:fight.key,playerId:roll.playerId,physicalPlayerId:roll.playerId,timeSeconds:roll.timeSeconds,timestamp:roll.timestamp,ruleId:'wipe-causing',cast:roll,nearbyDeaths:nearbyDeaths.map(d=>({id:d.id,playerId:d.playerId,timeSeconds:d.timeSeconds})),before:before.at(-1),after:after[0],
        afterWipeCall:Number.isFinite(fight.wipeCalledTime)&&roll.timestamp>=fight.wipeCalledTime,url:wclWindow(fight.reportCode,fight.id,roll.timestamp-3000,Math.min(fight.endTime,roll.timestamp+settings.rollSeconds*1000)),summary:'Roll observed between Mother’s Wrath damage ticks. Review movement, facing, assignment and causal impact.'});
    }
    // Recent control attempts must not use the bounded end-of-fight cast sample.
    return {pullId:fight.key,pack:eligiblePack?{id:ulatek.id,version:ulatek.version,note:ulatek.note}:null,eventCount,deaths,observations,interrupts,
      activity:[...gaps.entries()].map(([actor,gaps])=>({playerId:playerRefs.get(actor),gaps}))};
  }
  return {page,result};
}

export class EvidenceReview {
  constructor(service) {this.service=service;service.ledger.db.exec('CREATE TABLE IF NOT EXISTS wcl_reviews(run_id TEXT PRIMARY KEY,body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS wcl_review_snapshots(hash TEXT PRIMARY KEY,run_id TEXT NOT NULL,body TEXT NOT NULL)');}
  build(runId,input,actor) {
    const {ledger}=this.service,run=ledger.run(runId);requireValue(run.wcl,'Death review requires captured WCL evidence');
    const draft=this.service.draft(run.wcl.draftId),settings=reviewSettings(input.settings),facts=[];
    requireValue(new Set(run.wcl.pulls.map(p=>p.fightKey)).size===run.wcl.pulls.length,'Duplicate captured pull keys');
    const scope=draft.scope, keys=run.wcl.pulls.map(p=>p.fightKey);
    requireValue(!scope.duplicatePairs.some(([a,b])=>keys.includes(a)&&keys.includes(b)),'Duplicate recordings must be removed before review');
    for(const manifest of run.wcl.pulls) {
      const report=draft.reports.find(r=>r.meta.code===manifest.reportCode),fight=scope.fights.find(f=>f.key===manifest.fightKey);
      const refs=new Map(this.service.job(run.wcl.jobId).assignments.flatMap(p=>p.references.filter(r=>r.reportCode===manifest.reportCode).map(r=>[r.actorId,p.id])));
      const reviewer=createReviewer({report:report.raw,fight,playerRefs:refs,settings});let index=0,count=0,terminal=false,cursor=fight.startTime;
      for(const row of ledger.db.prepare('SELECT * FROM wcl_pages WHERE job_id=? AND fight_key=? ORDER BY page_index').iterate(run.wcl.jobId,fight.key)) {
        const batch=JSON.parse(gunzipSync(row.body).toString('utf8'));
        requireValue(digest(batch)===row.hash&&batch.index===index++&&!terminal&&batch.variables.start===cursor,'Stored evidence integrity/cursor mismatch',409);
        count+=batch.page.data.length;terminal=batch.page.nextPageTimestamp===null;cursor=batch.page.nextPageTimestamp;reviewer.page(batch);
      }
      requireValue(terminal&&index===manifest.pages&&count===manifest.rawEvents,'Incomplete stored capture',409);facts.push(reviewer.result());
    }
    const report={version:1,packVersion:ulatek.version,createdAt:new Date().toISOString(),runId,settings,facts};
    const hash=digest(report), payload=gzipSync(JSON.stringify(report));
    ledger.transaction(()=>{ledger.db.prepare('INSERT INTO wcl_reviews VALUES(?,?) ON CONFLICT(run_id) DO UPDATE SET body=excluded.body').run(runId,payload);ledger.db.prepare('INSERT OR IGNORE INTO wcl_review_snapshots VALUES(?,?,?)').run(hash,runId,payload);ledger.audit(actor,'wcl.review.generated',{snapshotHash:hash,settings,packVersion:ulatek.version,pulls:facts.length,deaths:facts.reduce((n,f)=>n+f.deaths.length,0),compressedBytes:payload.length},runId);});
    return this.get(runId);
  }
  get(runId) {
    const {ledger}=this.service,run=ledger.run(runId),row=ledger.db.prepare('SELECT body FROM wcl_reviews WHERE run_id=?').get(runId);
    if(!row)return {ready:false,runId};
    const report=JSON.parse(typeof row.body==='string'?row.body:gunzipSync(row.body).toString('utf8')),snapshotHash=digest(report),deaths=[],observations=[],excluded={buyer:0,lb:0,unclassified:0},unknown=[];
    const resolve=id=>responsiblePlayer(run,id), allowed=id=>reviewRoles.includes(resolve(id)?.role);
    const decorate=card=>{
      const target=card.playerId?resolve(card.playerId):null,rule=run.policy.rules.find(r=>r.id===card.ruleId),pull=run.pulls.find(p=>p.id===card.pullId);
      const applicable=rule?.outcomes.includes(pull.outcome)?eligibility(run,run.policy,rule,pull):{eligible:false,reason:'No applicable approved rule for this pull outcome.'};
      return {...card,snapshotHash,deductionPlayerId:target?.id??null,classification:target?.role??'unclassified',suggestedShares:rule?.outcomes.includes(pull.outcome)?rule.shares:null,ruleLabel:rule?.label??null,applicability:applicable,
        nearbyDeaths:card.nearbyDeaths?.filter(d=>allowed(d.playerId)),otherDeathsCount:card.nearbyDeaths?.filter(d=>!allowed(d.playerId)).length??0,
        caution:'Conditional rule amount only. Logs do not establish avoidability, assignment or a ready defensive cooldown. Confirm one responsible incident before accepting.'};
    };
    for(const fact of report.facts) {
      for(const d of fact.deaths){const related=fact.observations.find(o=>o.nearbyDeaths?.some(n=>n.id===d.id));const card={...d,incidentKey:related?.id??d.id};if(allowed(d.playerId))deaths.push(decorate(card));else{const role=resolve(d.playerId)?.role??'unclassified';excluded[role]=(excluded[role]??0)+1;if(role==='unclassified')unknown.push(d);}}
      for(const o of fact.observations)if(!o.playerId||allowed(o.playerId))observations.push(decorate({...o,incidentKey:o.id}));
    }
    return {ready:true,...report,facts:undefined,deaths,observations,unknown,excluded,summary:{pulls:report.facts.length,deaths:deaths.length,observations:observations.length,unclassifiedCharacters:run.players.filter(p=>!reviewRoles.includes(resolve(p.id)?.role)&&resolve(p.id)?.role==='unclassified').length},
      packPulls:report.facts.filter(f=>f.pack).map(f=>({pullId:f.pullId,...f.pack})),interrupts:report.facts.flatMap(f=>f.interrupts.map(i=>({...i,pullId:f.pullId}))),activity:report.facts.flatMap(f=>f.activity.map(i=>({...i,pullId:f.pullId})))};
  }
}
