import {readFile} from 'node:fs/promises';
import {detectSessions,analyzeRun} from './src/index.js';
const report=JSON.parse(await readFile(process.argv[2]??new URL('examples/mixed-report.json',import.meta.url),'utf8'));
const packs=await Promise.all(['demo','ulatek-heroic-observations'].map(p=>readFile(new URL(`packs/${p}.json`,import.meta.url),'utf8').then(JSON.parse)));
const sessions=detectSessions(report,{expectedPlayerIds:report.demoRoster?.map(r=>r.actorId)??[]});
const candidate=sessions.candidates.find(c=>c.id===sessions.recommendedId);
const selection=process.argv[3]?.split(',').map(Number)??candidate?.fightIds;
console.log(JSON.stringify(selection?{sessions,analysis:analyzeRun({report,fightIds:selection,roster:report.demoRoster??[],packs})}:{sessions,notice:'Choose fight IDs explicitly as the third argument; no confident automatic selection.'},null,2));
