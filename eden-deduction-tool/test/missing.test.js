import test from 'node:test';
import assert from 'node:assert/strict';
import {Ledger} from '../src/ledger/store.js';
import {WclService} from '../src/wcl/service.js';
import {matchReport, resolveRealm, searchRoster} from '../src/wcl/missing.js';
import {metadata, buildScope} from '../src/wcl/scope.js';
import {createServer} from '../review-server.js';

const A='ABCDEFGHIJKLMNOP', B='QRSTUVWXYZabcdef', C='abcdefghijklmnop';
const epoch=Date.parse('2026-10-20T18:00:00Z');
const directory=[{name:'Twisting Nether',normalizedName:'TwistingNether',slug:'twisting-nether'}, {name:'Silvermoon',normalizedName:'Silvermoon',slug:'silvermoon'}];
function raw(code=A, region='eu') {
  const fight=(id,startTime,kill,encounterID=10)=>({id,startTime,endTime:startTime+10000,kill,encounterID,name:`Boss ${encounterID}`,difficulty:4,friendlyPlayers:[1,2,3],inProgress:false});
  return {code,title:'Synthetic comparison',revision:1,region:{slug:region},startTime:epoch,endTime:epoch+1000000,masterData:{actors:[{id:1,name:'Áster',server:'TwistingNether',type:'Player'},{id:2,name:'Briar',server:'Silvermoon',type:'Player'},{id:3,name:'Cedar',server:'Silvermoon',type:'Player'}],abilities:[]},fights:code===A?[fight(3,600000,true)]:[fight(1,100000,false,9),fight(2,200000,true,9),fight(3,600000,true)]};
}
function setup(t, override={}) {
  const ledger=new Ledger(); const calls=[];
  const client={realms:async()=>{calls.push('realms');return directory;},report:async code=>{calls.push(code);return raw(code);},characterReports:async(c,page)=>{calls.push(c.name+page);return {name:c.name,hidden:false,server:{slug:c.slug,region:{slug:c.region}},recentReports:{current_page:page,has_more_pages:false,data:[{code:B,title:'Other uploader',startTime:epoch,endTime:epoch+1000000,owner:{name:'Synthetic uploader'}}]}};},...override};
  const service=new WclService({ledger,client}); t.after(async()=>{await service.shutdown();ledger.close();});return {service,ledger,calls};
}
async function input(service) {const d=await service.discover({reports:[A],context:{roster:'Áster-Twisting Nether\nBriar-Silvermoon\nCedar-Silvermoon\nMissing-Silvermoon'}},'Reviewer');return {draftId:d.id,fightKeys:[`${A}:3`],roster:d.context.roster,start:'2026-10-20T18:00:00Z',end:'2026-10-20T20:00:00Z',playerLimit:4,pagesPerPlayer:2};}

test('realm directory resolves normalized/Unicode names without guessing ambiguous identities',()=>{
  assert.equal(resolveRealm('TwistingNether',directory),'twisting-nether');
  assert.equal(resolveRealm('UnknownRealm',directory),null);
  assert.equal(resolveRealm('Silvermoon',[...directory,{name:'Silvermoon',slug:'other'}]),null);
  assert.equal(searchRoster('Áster-Twisting Nether\nÁster-TwistingNether\nBriar-Silvermoon').length,2);
});
test('candidate matches preserve kills and wipes but reject unrelated dates, regions, difficulties and rosters',()=>{
  const a=metadata(raw()), base={...a.fights[0],startEpoch:epoch+600000,endEpoch:epoch+610000};
  const context={baseline:[base],roster:searchRoster('Áster-TwistingNether\nBriar-Silvermoon\nCedar-Silvermoon'),region:'eu',start:epoch,end:epoch+1000000};
  const found=matchReport(metadata(raw(B)),context);assert.equal(found.additionalKills,1);assert.equal(found.additionalWipes,1);assert.equal(found.overlapPulls,1);
  assert.equal(matchReport(metadata(raw(B,'us')),context),null);
  assert.equal(matchReport(metadata(raw(B)),{...context,start:epoch+2000000,end:epoch+3000000}),null);
  const other=raw(B);other.masterData.actors.forEach(a=>a.name='Other'+a.id);assert.equal(matchReport(metadata(other),context),null);
  other.fights.forEach(f=>f.difficulty=10);assert.equal(matchReport(metadata(other),context),null);
});
test('clock skew warns about duplicate pulls without merging different outcomes or far-apart attempts',()=>{
  const a=metadata(raw()), second=raw(B); second.startTime+=5500;
  assert.equal(buildScope([a,metadata(second)]).duplicatePairs.length,1);
  second.fights[2].kill=false;assert.equal(buildScope([a,metadata(second)]).duplicatePairs.length,0);
  second.fights[2].kill=true;second.startTime+=60000;assert.equal(buildScope([a,metadata(second)]).duplicatePairs.length,0);
});
test('search prioritizes absent players, deduplicates reports, caches repeat work and never imports a run',async t=>{
  const {service,ledger,calls}=setup(t),i=await input(service);calls.length=0;
  const a=await service.missing.search(i,'Reviewer');assert.equal(calls[1],'Missing1');assert.equal(a.candidates.length,1);assert.equal(calls.filter(c=>c===B).length,1);assert.equal(a.candidates[0].foundVia.length,4);assert.equal(ledger.listRuns().length,0);
  const before=calls.length,b=await service.missing.search(i,'Reviewer');assert.equal(calls.length,before);assert.equal(b.queries,0);assert.ok(b.cacheHits>=6);assert.equal(service.missing.list().length,2);
  assert.equal(ledger.verifyAudit(),true);
});
test('hidden, missing and malformed histories remain explicit and no-match is not full coverage',async t=>{
  const {service}=setup(t,{characterReports:async(c,page)=>c.name==='Missing'?null:c.name==='Áster'?{hidden:true}:c.name==='Briar'?{name:c.name,server:{slug:c.slug,region:{slug:'us'}},recentReports:{data:[]}}:{name:c.name,server:{slug:c.slug,region:{slug:c.region}},recentReports:{data:[],current_page:page,has_more_pages:true}}});
  const r=await service.missing.search(await input(service),'Reviewer');assert.equal(r.candidates.length,0);assert.ok(r.limited);assert.deepEqual(r.characters.map(c=>c.status),['character-unavailable','hidden','unavailable','page-limit']);assert.match(r.limitations.join(' '),/not that no other report exists/);
});
test('history pagination follows empty continuation and keeps report-level failures separate',async t=>{
  const {service}=setup(t,{characterReports:async(c,page)=>({name:c.name,server:{slug:c.slug,region:{slug:c.region}},recentReports:{current_page:page,has_more_pages:page===1,data:page===1?[]:[{code:B,startTime:epoch,endTime:epoch+1000000},{code:C,startTime:epoch,endTime:epoch+1000000}]}}),report:async code=>{if(code===C)throw Error('unavailable');return raw(code);}});
  const r=await service.missing.search({...await input(service),playerLimit:1},'Reviewer');assert.equal(r.characters[0].pages,2);assert.equal(r.candidates.length,1);assert.equal(r.errors.length,1);assert.equal(r.unsearchedCharacters,3);
});
test('loading candidate requires explicit choice and creates metadata-only selection with duplicate warning',async t=>{
  const {service,ledger}=setup(t),i=await input(service),r=await service.missing.search(i,'Reviewer');
  await assert.rejects(service.missing.add({searchId:r.id,code:B},'Reviewer'),/Confirm/);
  await assert.rejects(service.missing.add({searchId:r.id,code:C,confirmed:true},'Reviewer'),/not part/);
  const draft=await service.missing.add({searchId:r.id,code:B,confirmed:true},'Reviewer');assert.equal(draft.reports.length,2);assert.equal(draft.duplicatePairs.length,1);assert.equal(ledger.listRuns().length,0);assert.equal(service.listJobs().length,0);
});
test('bounded character queries reserve room to inspect candidate metadata and cache expires',async t=>{
  const {service,calls}=setup(t,{characterReports:async(c,page)=>({name:c.name,server:{slug:c.slug,region:{slug:c.region}},recentReports:{current_page:page,has_more_pages:true,data:[{code:B,startTime:epoch,endTime:epoch+1000000}]}})});
  const i=await input(service);i.roster+='\n'+Array.from({length:36},(_,n)=>`Extra${n}-Silvermoon`).join('\n');i.playerLimit=40;i.pagesPerPlayer=3;
  const r=await service.missing.search(i,'Reviewer');assert.ok(r.queries<=60);assert.equal(r.candidates.length,1);assert.ok(r.characters.some(c=>/reserved/.test(c.error??'')));
  let now=Date.now()+86400001;service.missing.now=()=>now;const before=calls.length;await service.missing.search({...i,playerLimit:1,pagesPerPlayer:1},'Reviewer');assert.ok(calls.length>before);
});
test('search rejects empty scope, wrong windows, large bounds and simultaneous searches',async t=>{
  const {service}=setup(t),i=await input(service);
  await assert.rejects(service.missing.search({...i,fightKeys:[]},'Reviewer'),/Select/);
  await assert.rejects(service.missing.search({...i,start:'2026-10-20T18:00:00'},'Reviewer'),/timezone/);
  await assert.rejects(service.missing.search({...i,end:'2026-10-22T18:00:00Z'},'Reviewer'),/12 hours/);
  await assert.rejects(service.missing.search({...i,playerLimit:41},'Reviewer'),/40 characters/);
  service.missing.busy=true;await assert.rejects(service.missing.search(i,'Reviewer'),/already running/);service.missing.busy=false;
});
test('HTTP search and restore persist reviewable results without capturing events',async t=>{
  const {service,ledger}=setup(t);const server=createServer({ledger,wclClient:service.client,connection:{status:()=>({configured:true})}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const origin=`http://127.0.0.1:${server.address().port}`,i=await input(server.wcl);
  const response=await fetch(origin+'/api/wcl/find-missing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...i,actor:'Reviewer'})});assert.equal(response.status,201);const result=await response.json();
  const history=await(await fetch(origin+'/api/wcl/searches')).json();assert.equal(history[0].id,result.id);
  assert.equal((await(await fetch(origin+'/api/wcl/searches/'+result.id)).json()).candidates.length,1);
  const forbidden=await fetch(origin+'/api/wcl/find-missing',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://unrelated.invalid'},body:JSON.stringify({...i,actor:'Reviewer'})});assert.equal(forbidden.status,403);
  assert.equal(ledger.listRuns().length,0);
});
