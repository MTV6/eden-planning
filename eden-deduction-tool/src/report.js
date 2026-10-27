import {check,id} from './util.js';
export function validateReport(report){
  check(report&&Array.isArray(report.actors)&&Array.isArray(report.fights),'Expected actors and fights arrays');
  check(typeof report.code==='string'&&report.code.length>0,'Report code required');
  check(Number.isFinite(report.startTime),'Report startTime must be Unix milliseconds');
  check(new Set(report.actors.map(a=>a.id)).size===report.actors.length,'Duplicate actor IDs');
  const actors=new Set(report.actors.map(a=>a.id));
  for(const a of report.actors)check(Number.isSafeInteger(a.id)&&typeof a.name==='string','Invalid actor identity');
  check(new Set(report.fights.map(f=>f.id)).size===report.fights.length,'Duplicate fight IDs');
  for(const f of report.fights){
    check(Number.isSafeInteger(f.id)&&Number.isSafeInteger(f.encounterId)&&Number.isSafeInteger(f.difficulty),'Invalid fight identity');
    check(Number.isFinite(f.startTime)&&Number.isFinite(f.endTime)&&f.endTime>f.startTime,'Invalid fight interval');
    check(typeof f.kill==='boolean'&&Array.isArray(f.playerIds)&&f.playerIds.every(a=>actors.has(a)),'Missing/unknown fight roster or kill status');
    check(new Set(f.playerIds).size===f.playerIds.length,'Duplicate fight roster identity');
    check(Array.isArray(f.events),'Fight events must be an array');
    check(new Set(f.events.map(e=>e.id)).size===f.events.length,'Duplicate normalized event IDs');
    for(const e of f.events)check(typeof e.id==='string'&&typeof e.type==='string'&&Number.isFinite(e.time)&&e.time>=0&&e.time<=f.endTime-f.startTime,'Invalid event identity/time');
  }
  return report;
}
export function fromWclMetadata(raw){
  check(raw&&Array.isArray(raw.fights)&&Array.isArray(raw.masterData?.actors),'Missing WCL metadata');
  const actors=raw.masterData.actors.filter(a=>a.type==='Player').map(a=>({id:a.id,name:a.name,realm:a.server??null}));
  const known=new Set(actors.map(a=>a.id));
  const fights=raw.fights.filter(f=>f.encounterID>0).map(f=>({id:f.id,name:f.name,encounterId:f.encounterID,difficulty:f.difficulty,
    startTime:f.startTime,endTime:f.endTime,kill:f.kill,playerIds:(f.friendlyPlayers??[]).filter(a=>known.has(a)),
    coverage:{status:'not-loaded',source:'wcl-all-events'},events:[]}));
  return validateReport({schemaVersion:1,code:raw.code,title:raw.title,startTime:raw.startTime,revision:raw.revision??null,
    snapshotId:null,synthetic:false,actors,abilities:raw.masterData.abilities??[],fights});
}
export function normalizeWclPages(pages,fight){
  check(Array.isArray(pages)&&pages.length>0,'No captured event pages');
  let cursor=fight.startTime;
  const events=[];
  for(const [pageIndex,batch] of pages.entries()){
    check(batch.start===cursor&&Array.isArray(batch.data)&&Object.hasOwn(batch,'nextPageTimestamp'),'Incomplete or discontinuous event pagination');
    const next=batch.nextPageTimestamp;
    check(next===null||(Number.isFinite(next)&&next>cursor&&next<=fight.endTime),'Non-progressing pagination');
    check(next!==null||pageIndex===pages.length-1,'Pages after terminal page');
    for(const [eventIndex,raw] of batch.data.entries()){
      if(!Number.isFinite(raw.timestamp))throw Error('Event missing timestamp');
      if(raw.timestamp<fight.startTime||raw.timestamp>fight.endTime)throw Error('Event outside selected pull');
      // Identical multi-hits can be legitimate: preserve source order, never dedupe by payload.
      events.push({id:id([fight.id,pageIndex,eventIndex,raw]),type:raw.type,time:raw.timestamp-fight.startTime,
        sourceId:raw.sourceID??null,targetId:raw.targetID??null,abilityId:raw.abilityGameID??raw.ability?.gameID??null,
        killingAbilityId:raw.killingAbilityGameID??null,amount:raw.amount??null,overkill:raw.overkill??null,
        provenance:{page:pageIndex,event:eventIndex}});
    }
    cursor=next;
  }
  check(cursor===null,'Capture not complete: terminal page missing');
  return events.sort((a,b)=>a.time-b.time);
}
