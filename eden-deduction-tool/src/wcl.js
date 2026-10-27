import {check,reportCode} from './util.js';
import {fromWclMetadata,normalizeWclPages,validateReport} from './report.js';
import {selectFights} from './sessions.js';

const META=`query EdenMetadata($code:String!){reportData{report(code:$code){code title startTime endTime revision
 fights{id name encounterID difficulty startTime endTime kill friendlyPlayers}
 masterData{abilities{gameID name} actors{id name type subType server}}}}}`;
const EVENTS=`query EdenEvents($code:String!,$fightIDs:[Int]!,$start:Float!,$end:Float!){reportData{report(code:$code){
 events(fightIDs:$fightIDs,startTime:$start,endTime:$end,dataType:All,includeResources:true,useAbilityIDs:true,useActorIDs:true){data nextPageTimestamp}}}}`;

export class WclClient{
  constructor({fetchImpl=fetch,env=process.env,sleep=ms=>new Promise(r=>setTimeout(r,ms)),retries=2,maxPages=1000}={}){
    Object.assign(this,{fetchImpl,env,sleep,retries,maxPages});this.token=null;
  }
  async request(url,options){
    for(let attempt=0;;attempt++){
      let response;
      try{response=await this.fetchImpl(url,{...options,signal:AbortSignal.timeout(30_000)});}catch{if(attempt>=this.retries)throw Error('WCL network request failed');await this.sleep(500*2**attempt);continue;}
      if(response.ok)return response.json();
      if((response.status===429||response.status>=500)&&attempt<this.retries){const header=response.headers.get('retry-after');
        const delay=header===null?1000*2**attempt:/^\d+(\.\d+)?$/.test(header)?Number(header)*1000:Date.parse(header)-Date.now();
        check(Number.isFinite(delay)&&delay<=60_000,'WCL rate limited; retry later');await this.sleep(Math.max(0,delay));continue;}
      throw Error(`WCL request failed (${response.status}); check report access/credentials`);
    }
  }
  async accessToken(){
    if(this.token&&this.token.expiresAt>Date.now()+30_000)return this.token.value;
    const key=this.env.WCL_CLIENT_ID,secret=this.env.WCL_CLIENT_SECRET;check(key&&secret,'Set server-side WCL_CLIENT_ID and WCL_CLIENT_SECRET in .env to load public reports');
    const body=await this.request('https://www.warcraftlogs.com/oauth/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
    check(typeof body.access_token==='string'&&Number.isFinite(body.expires_in),'Invalid WCL token response');
    this.token={value:body.access_token,expiresAt:Date.now()+body.expires_in*1000};return body.access_token;
  }
  async query(query,variables){
    for(let attempt=0;attempt<2;attempt++){
      const token=await this.accessToken();
      try{const body=await this.request('https://www.warcraftlogs.com/api/v2/client',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query,variables})});
        check(!body.errors?.length&&body.data,'WCL GraphQL error or incomplete response; no analysis produced');return body.data;
      }catch(error){if(attempt===0&&error.message.includes('(401)')){this.token=null;continue;}throw error;}
    }
  }
  async report(input){const code=reportCode(input),data=await this.query(META,{code});check(data.reportData?.report,'Report inaccessible; public reports only in this prototype');return data.reportData.report;}
  async eventPages(code,fight,onPage=async()=>{}){
    reportCode(code);const batches=[];let start=fight.startTime,total=0;
    for(let i=0;i<this.maxPages;i++){
      const variables={code,fightIDs:[fight.id],start,end:fight.endTime};
      const data=await this.query(EVENTS,variables),page=data.reportData?.report?.events;
      check(page&&Array.isArray(page.data)&&Object.hasOwn(page,'nextPageTimestamp'),'Missing WCL event page');
      const batch={queryVersion:1,variables,page};batches.push(batch);await onPage(batch);
      total+=page.data.length;check(total<=2_000_000,'Event memory limit reached; capture incomplete');
      if(page.nextPageTimestamp===null)return batches;
      check(Number.isFinite(page.nextPageTimestamp)&&page.nextPageTimestamp>start&&page.nextPageTimestamp<=fight.endTime,'Pagination did not progress; capture incomplete');start=page.nextPageTimestamp;
    }
    throw Error('Page budget exhausted; capture incomplete');
  }
}

// Accepts this client OR Grimoire's public report()/eventPages() client interface.
export async function captureSelected(client,metadata,fightIds,onProgress=()=>{}){
  const report=structuredClone(metadata),fights=selectFights(report,fightIds);
  for(const [index,fight] of fights.entries()){
    onProgress({stage:'capturing',fightId:fight.id,index,total:fights.length});
    const batches=await client.eventPages(report.code,fight,()=>{});
    const events=normalizeWclPages(batches.map(b=>({start:b.variables.start,...b.page})),fight);
    Object.assign(report.fights.find(f=>f.id===fight.id),{events,coverage:{status:'complete',source:'wcl-all-events',pageCount:batches.length}});
  }
  return validateReport(report);
}

// Offline handoff from Grimoire: only full raid All-events captures are admitted.
// Player-scoped coaching streams cannot establish complete raid-wide evidence.
export function fromGrimoireCapture({metadata,captures,snapshotId=null}){
  const report=fromWclMetadata(metadata);report.snapshotId=snapshotId;
  check(Array.isArray(captures),'Grimoire captures array required');
  for(const capture of captures){
    const fight=report.fights.find(f=>f.id===capture.fightId);check(fight,'Unknown Grimoire capture fight');
    check(Array.isArray(capture.batches)&&capture.batches.every(b=>b.queryVersion===1&&!b.stream&&b.variables.code===report.code&&b.variables.end===fight.endTime&&b.variables.fightIDs?.length===1&&b.variables.fightIDs[0]===fight.id),'Use unfiltered full-raid queryVersion=1 eventPages captures, not player-scoped streams');
    fight.events=normalizeWclPages(capture.batches.map(b=>({start:b.variables.start,...b.page})),fight);
    fight.coverage={status:'complete',source:'grimoire-full-raid-capture',pageCount:capture.batches.length};
  }
  return validateReport(report);
}
