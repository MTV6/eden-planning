import {check,id} from './util.js';
import {validateReport} from './report.js';
const intersection=(a,b)=>a.filter(v=>b.includes(v)).length;
export function detectSessions(report,options={}){
  validateReport(report);
  const gapMs=options.gapMs??45*60_000;
  check(Number.isFinite(gapMs)&&gapMs>=60_000,'Invalid session gap');
  const expected=[...new Set(options.expectedPlayerIds??[])];
  check(expected.every(v=>report.actors.some(a=>a.id===v)),'Expected roster contains unknown actor IDs');
  const fights=report.fights.filter(f=>f.encounterId>0).sort((a,b)=>a.startTime-b.startTime||a.id-b.id);
  const groups=[];
  for(const f of fights){
    const current=groups.at(-1),previous=current?.fights.at(-1);
    let reason=null;
    if(previous){
      const overlap=intersection(previous.playerIds,f.playerIds)/Math.max(1,Math.min(previous.playerIds.length,f.playerIds.length));
      if(f.startTime-previous.endTime>gapMs)reason='Long time gap';
      else if(f.difficulty!==previous.difficulty)reason='Difficulty changed';
      else if(overlap<0.5)reason='Major roster change';
      else if(current.fights.some(p=>p.encounterId===f.encounterId&&p.kill))reason='Previously killed boss appears again';
    }
    if(!current||reason)groups.push({fights:[f],boundaryReason:reason??'Report start'});else current.fights.push(f);
  }
  const candidates=groups.map(g=>{
    const playerIds=[...new Set(g.fights.flatMap(f=>f.playerIds))];
    const rosterMatch=expected.length?g.fights.reduce((s,f)=>s+intersection(expected,f.playerIds)/expected.length,0)/g.fights.length:null;
    const timeMatch=Number.isFinite(options.expectedStartTime)?Math.max(0,1-Math.abs(report.startTime+g.fights[0].startTime-options.expectedStartTime)/(3*60*60_000)):null;
    const score=rosterMatch===null?(timeMatch===null?null:timeMatch):timeMatch===null?rosterMatch:rosterMatch*0.8+timeMatch*0.2;
    return {id:id([report.code,g.fights.map(f=>f.id)]),fightIds:g.fights.map(f=>f.id),playerIds,
      startTime:report.startTime+g.fights[0].startTime,endTime:report.startTime+g.fights.at(-1).endTime,
      bosses:[...new Map(g.fights.map(f=>[f.encounterId,{id:f.encounterId,name:f.name}])).values()],
      wipes:g.fights.filter(f=>!f.kill).length,kills:g.fights.filter(f=>f.kill).length,
      rosterMatch,score,boundaryReason:g.boundaryReason,requiresConfirmation:true};
  });
  const ranked=candidates.filter(c=>c.score!==null).sort((a,b)=>b.score-a.score);
  const recommended=ranked.length&&ranked[0].score>=0.7&&(ranked.length===1||ranked[0].score-ranked[1].score>=0.15)?ranked[0].id:null;
  return {candidates,recommendedId:recommended,limitations:[
    'Session boundaries are hypotheses, not proof that a raid was an Eden boost.',
    'Back-to-back boosts with the same roster may be indistinguishable. Confirm or edit exact pulls.',
    'A real run can span difficulty changes, long breaks or roster replacements; merge candidate pulls when necessary.',
    ...(!expected.length?['No expected Eden roster supplied; identify the run before deduction review.']:[])]};
}
export function selectFights(report,fightIds){
  check(Array.isArray(fightIds)&&fightIds.length>0&&new Set(fightIds).size===fightIds.length,'Select distinct fight IDs');
  const selected=fightIds.map(v=>report.fights.find(f=>f.id===v));check(selected.every(Boolean),'Unknown fight selection');
  return selected.sort((a,b)=>a.startTime-b.startTime);
}
