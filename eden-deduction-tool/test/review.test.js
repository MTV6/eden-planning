import test from 'node:test';import assert from 'node:assert/strict';
import {Ledger} from '../src/ledger/store.js';import {WclService} from '../src/wcl/service.js';
import {createReviewer,reviewSettings,wclWindow} from '../src/wcl/review.js';
import {rosterMatches} from '../src/ledger/participants.js';import {createServer} from '../review-server.js';
const code='ABCDEFGHIJKLMNOP';
function raw(){return {code,title:'Synthetic pack validation',startTime:100000,endTime:130000,revision:1,region:{slug:'eu'},visibility:'public',masterData:{actors:[
  ...['Aster','Briar','Cedar','Buyer','Lootbody','Unknown'].map((name,i)=>({id:i+1,name,server:'Realm',type:'Player'})),
  {id:10,name:"Ula'tek",type:'NPC'},{id:11,name:'Weakened Doomscale',type:'NPC'},{id:20,name:'Pet',type:'Pet',petOwner:2}],abilities:[{gameID:1305650,name:'Anguished Cry'},{gameID:147362,name:'Counter Shot'},{gameID:119910,name:'Spell Lock'},{gameID:109132,name:'Roll'},{gameID:1298369,name:"Mother's Wrath"},{gameID:22812,name:'Barkskin'}]},fights:[{id:1,name:"Ula'tek",encounterID:3492,difficulty:4,startTime:0,endTime:30000,kill:false,inProgress:false,friendlyPlayers:[1,2,3,4,5,6]}]};}
function events(){return [
  {timestamp:0,type:'combatantinfo',sourceID:1,auras:[{ability:22812}]},
  {timestamp:500,type:'heal',sourceID:2,targetID:1,amount:200,overheal:400},
  {timestamp:1000,type:'damage',sourceID:10,targetID:1,amount:1000,hitPoints:0,overkill:500,abilityGameID:999},
  {timestamp:1001,type:'death',targetID:1},
  ...[4,5,6].map((targetID,i)=>({timestamp:1100+i*100,type:'death',targetID})),
  {timestamp:2000,type:'begincast',sourceID:11,sourceInstance:1,abilityGameID:1305650},
  {timestamp:2500,type:'cast',sourceID:2,targetID:11,targetInstance:2,abilityGameID:147362},
  {timestamp:2501,type:'interrupt',sourceID:20,targetID:11,targetInstance:2,abilityGameID:119910,extraAbilityGameID:1305650},
  {timestamp:5000,type:'cast',sourceID:11,sourceInstance:1,abilityGameID:1305650},
  {timestamp:5050,type:'damage',sourceID:11,targetID:2,amount:1000,hitPoints:0,abilityGameID:1305650},
  {timestamp:5051,type:'death',targetID:2},
  {timestamp:9900,type:'damage',sourceID:10,targetID:3,amount:500,hitPoints:500,abilityGameID:1298369},
  {timestamp:10000,type:'cast',sourceID:3,abilityGameID:109132},
  {timestamp:10400,type:'damage',sourceID:10,targetID:3,amount:500,hitPoints:0,abilityGameID:1298369},
  {timestamp:10401,type:'death',targetID:3}
];}
function direct(data=events(),fight={}){
 const r=raw(),f={id:1,key:`${code}:1`,reportCode:code,encounterId:3492,difficulty:4,startTime:0,endTime:30000,wipeCalledTime:null,...fight};
 const p=createReviewer({report:r,fight:f,playerRefs:new Map([1,2,3,4,5,6].map(n=>[n,`p${n}`]))});p.page({index:0,page:{data}});return p.result();
}
async function setup(t){const ledger=new Ledger(),report=raw(),service=new WclService({ledger,client:{report:async()=>report,async *pages(_code,f){yield {index:0,queryVersion:1,variables:{code,fightIDs:[1],start:0,end:30000},page:{data:events(),nextPageTimestamp:null}};}}});t.after(async()=>{await service.shutdown();ledger.close();});
 const d=await service.discover({reports:[code]},'Reviewer');const role=['booster','helper','raidleader','buyer','lb','unclassified'];const job=service.start({draftId:d.id,fightKeys:[`${code}:1`],assignments:d.players.map((p,i)=>({...p,role:role[i]})),scopeConfirmed:true,title:'Pack fixture'},'Reviewer');await service.tasks.get(job.id);const id=service.job(job.id).runId;assert.ok(id);return {ledger,service,id};}

test('death cards retain lethal damage, real healing, starting buff state and unknown cooldown readiness',()=>{
 const f=direct(),d=f.deaths[0];assert.equal(d.lethal.amount,1000);assert.equal(d.healingAmount,200);assert.equal(d.activeDefensives[0].ability,'Barkskin');assert.equal(d.recentDefensives.length,0);assert.equal(d.ruleId,'avoidable-death');assert.equal(d.lastActivity,null);assert.match(d.url,/start=0&end=4001/);
 const data=events();data.splice(1,0,{timestamp:10,type:'removebuff',targetID:1,abilityGameID:22812});assert.equal(direct(data).deaths[0].activeDefensives.length,0);
});
test('debuff stacks survive outside the short damage window and removed effects do not appear active',()=>{
 const data=events();data.splice(1,0,{timestamp:1,type:'applydebuffstack',targetID:1,abilityGameID:99,stack:5},{timestamp:2,type:'applydebuff',targetID:1,abilityGameID:98},{timestamp:3,type:'removedebuff',targetID:1,abilityGameID:98});const d=direct(data).deaths[0];assert.equal(d.debuffs.length,1);assert.equal(d.debuffs[0].stack,5);
});
test('Doomscale instances remain distinct and pet interrupts do not hide another add failure',()=>{
 const f=direct(),failed=f.observations.find(o=>o.kind==='missed-interrupt');assert.equal(failed.addInstance,1);assert.equal(failed.began.timeSeconds,2);assert.equal(failed.previousInterrupts.length,0);assert.equal(failed.recentResponses[0].targetInstance,2);assert.equal(failed.nearbyDeaths.length,1);assert.equal(f.interrupts[0].playerId,'p2');assert.equal(failed.playerId,null);
});
test('Blackout Kick is not an interrupt attempt and early responses survive long-fight processing',()=>{
 const data=events();data.splice(data.findIndex(e=>e.timestamp===5000),0,{timestamp:3000,type:'cast',sourceID:3,abilityGameID:100784});const report=raw();report.masterData.abilities.push({gameID:100784,name:'Blackout Kick'});const fight={id:1,key:`${code}:1`,reportCode:code,encounterId:3492,difficulty:4,startTime:0,endTime:100000};const reviewer=createReviewer({report,fight,playerRefs:new Map([[1,'p1'],[2,'p2'],[3,'p3']])});reviewer.page({index:0,page:{data:[...data,{timestamp:90000,type:'cast',sourceID:2,abilityGameID:147362}]}});const failure=reviewer.result().observations.find(o=>o.kind==='missed-interrupt');assert.equal(failure.recentResponses.length,1);assert.equal(failure.recentResponses[0].timeSeconds,2.5);
});
test('tank movement requires Mother’s Wrath ticks on both sides of Roll; pack is encounter/difficulty scoped',()=>{
 assert.equal(direct().observations.filter(o=>o.kind==='tank-movement').length,1);
 assert.equal(direct(events().filter(e=>e.timestamp!==10400)).observations.filter(o=>o.kind==='tank-movement').length,0);
 assert.equal(direct(events(),{difficulty:5}).observations.length,0);assert.equal(direct(events(),{encounterId:99}).observations.length,0);
});
test('wipe calls flag late deaths and cast failures without suppressing the stored evidence',()=>{
 const f=direct(events(),{wipeCalledTime:3000});assert.equal(f.observations[0].afterWipeCall,true);assert.equal(f.deaths[0].afterWipeCall,false);assert.equal(f.deaths.at(-1).afterWipeCall,true);
});
test('invalid settings, links and out-of-order streams fail closed',()=>{
 assert.throws(()=>reviewSettings({impactSeconds:0}));assert.throws(()=>reviewSettings({contextSeconds:NaN}));assert.throws(()=>wclWindow('bad',1,0,2));assert.throws(()=>direct([...events(),{timestamp:1,type:'death',targetID:1}]),/out of order/);
});
test('stored review excludes buyer/LB/unknown deaths and prices only from pinned rules',async t=>{
 const {ledger,service,id}=await setup(t),r=service.review.build(id,{},'Reviewer');assert.equal(r.deaths.length,3);assert.deepEqual(r.excluded,{buyer:1,lb:1,unclassified:1});assert.equal(r.unknown.length,1);assert.equal(r.deaths[0].suggestedShares,.5);assert.equal(r.observations[0].suggestedShares,1);assert.equal(r.observations[0].applicability.eligible,false);assert.equal(ledger.run(id).incidents.length,0);assert.equal(ledger.verifyAudit(),true);
 const policy=ledger.policy();policy.rules.find(x=>x.id==='avoidable-death').shares=2;ledger.publishPolicy(policy,'Admin','Changed future tariff');assert.equal(service.review.get(id).deaths[0].suggestedShares,.5);
});
test('classification changes refresh cached cards; explicit helper and alt links consolidate responsibility',async t=>{
 const {ledger,service,id}=await setup(t);service.review.build(id,{},'Reviewer');let run=ledger.run(id);const unknown=run.players.find(p=>p.name==='Unknown'),helper=run.players.find(p=>p.name==='Briar');
 run=ledger.act(id,{action:'classify',revision:run.revision,players:run.players.map(p=>p.id===unknown.id?{...p,ownerId:helper.id,classificationNote:'Confirmed by the owner in the run channel'}:p)},'Reviewer');
 const r=service.review.get(id);assert.equal(r.deaths.length,4);assert.equal(r.deaths.find(d=>d.playerId===unknown.id).deductionPlayerId,helper.id);
 const buyer=run.players.find(p=>p.role==='buyer');assert.throws(()=>ledger.act(id,{action:'classify',revision:run.revision,players:run.players.map(p=>p.id===buyer.id?{...p,ownerId:helper.id,classificationNote:'Cannot link a buyer'}:p)},'Reviewer'),/buyers\/LBs/);
});
test('same incident cannot be charged twice through linked alts and helper deductions retain evidence',async t=>{
 const {ledger,id}=await setup(t);let run=ledger.run(id);const main=run.players.find(p=>p.name==='Briar'),alt=run.players.find(p=>p.name==='Unknown');run=ledger.act(id,{action:'classify',revision:run.revision,players:run.players.map(p=>p.id===alt.id?{...p,ownerId:main.id,classificationNote:'Confirmed alt ownership by reviewer'}:p)},'Reviewer');
 const input={action:'add',playerId:alt.id,pullId:run.pulls[0].id,ruleId:'avoidable-death',reason:'Reviewed test incident',evidenceNote:'Specific recording evidence',incidentKey:'same',exception:'healing-deaths',applicabilityNote:'Reviewer attests a before-trigger healing exception'};
 run=ledger.act(id,{...input,revision:run.revision},'Reviewer');assert.equal(run.incidents[0].playerId,main.id);assert.equal(run.incidents[0].sourcePlayerId,alt.id);assert.throws(()=>ledger.act(id,{...input,playerId:main.id,revision:run.revision},'Reviewer'),/already has/);
});
test('exact roster matching preserves accents and leaves ambiguity/unmatched characters unresolved',()=>{
 const players=[{id:'a',character:'Áster-TwistingNether'},{id:'b',character:'Briar-Realm'}];assert.equal(rosterMatches(players,'Áster-Twisting Nether')[0].playerId,'a');assert.equal(rosterMatches(players,'Aster-TwistingNether')[0].status,'unmatched');assert.equal(rosterMatches([...players,{...players[0],id:'c'}],'Áster-TwistingNether')[0].status,'ambiguous');
});
test('corrupt stored evidence and duplicate recordings cannot generate apparently complete cards',async t=>{
 const {ledger,service,id}=await setup(t);const run=ledger.run(id);const d=service.draft(run.wcl.draftId);d.scope.duplicatePairs=[[run.pulls[0].id,run.pulls[0].id]];ledger.db.prepare('UPDATE wcl_drafts SET body=? WHERE id=?').run(JSON.stringify(d),d.id);assert.throws(()=>service.review.build(id,{},'Reviewer'),/Duplicate recordings/);d.scope.duplicatePairs=[];ledger.db.prepare('UPDATE wcl_drafts SET body=? WHERE id=?').run(JSON.stringify(d),d.id);ledger.db.prepare('UPDATE wcl_pages SET hash=? WHERE job_id=?').run('bad',run.wcl.jobId);assert.throws(()=>service.review.build(id,{},'Reviewer'),/integrity/);assert.equal(service.review.get(id).ready,false);
});
test('rebuilding retains earlier suggestion snapshots and audit references',async t=>{
 const {ledger,service,id}=await setup(t);service.review.build(id,{},'Reviewer');service.review.build(id,{settings:{contextSeconds:6}},'Reviewer');assert.equal(ledger.db.prepare('SELECT COUNT(*) n FROM wcl_review_snapshots WHERE run_id=?').get(id).n,2);const history=ledger.history(id).filter(a=>a.action==='wcl.review.generated');assert.equal(history.length,2);assert.ok(history.every(a=>a.details.snapshotHash));assert.equal(ledger.verifyAudit(),true);
});
test('HTTP review is read-only until explicitly generated, audited and protected against cross-origin writes',async t=>{
 const {ledger,service,id}=await setup(t),server=createServer({ledger,wclClient:service.client});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const url=`http://127.0.0.1:${server.address().port}/api/wcl/review/${id}`;
 assert.equal((await(await fetch(url)).json()).ready,false);assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:JSON.stringify({actor:'Reviewer'})})).status,403);
 assert.equal((await(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:'Reviewer'})})).json()).ready,true);assert.equal(ledger.run(id).incidents.length,0);
});
