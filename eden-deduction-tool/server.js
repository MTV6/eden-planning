import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {detectSessions,analyzeRun,reviewRun,validateReport,WclClient,fromWclMetadata} from './src/index.js';
import {captureSelected} from './src/wcl.js';
import {id,check} from './src/util.js';

const root=new URL('./',import.meta.url);
const packs=await Promise.all(['demo','ulatek-heroic-observations'].map(n=>readFile(new URL(`packs/${n}.json`,root),'utf8').then(JSON.parse)));
const client=new WclClient();const jobs=new Map();let activeCapture=false;
const files=new Map([['/','public/index.html'],['/app.js','public/app.js'],['/style.css','public/style.css']]);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'Referrer-Policy':'no-referrer'};
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json',...headers});res.end(JSON.stringify(body));}
async function body(req){
  check(req.headers['content-type']?.startsWith('application/json'),'JSON requests required');let size=0,chunks=[];
  for await(const chunk of req){size+=chunk.length;check(size<=48*1024*1024,'Request exceeds 48 MiB import limit');chunks.push(chunk);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
export function createServer(){return http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host;check(host&&/^(127\.0\.0\.1|localhost):\d+$/.test(host),'Localhost Host required');
    if(req.headers.origin)check(req.headers.origin===`http://${host}`,'Cross-origin requests rejected');
    const url=new URL(req.url,`http://${host}`);
    if(req.method==='GET'&&files.has(url.pathname)){
      const path=files.get(url.pathname),data=await readFile(new URL(path,root));
      res.writeHead(200,{'Content-Type':path.endsWith('.html')?'text/html; charset=utf-8':path.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8',...headers});return res.end(data);
    }
    if(req.method==='GET'&&url.pathname==='/api/demo')return json(res,200,JSON.parse(await readFile(new URL('examples/mixed-report.json',root),'utf8')));
    if(req.method==='GET'&&url.pathname.startsWith('/api/jobs/')){const job=jobs.get(url.pathname.split('/').at(-1));return json(res,job?200:404,job??{error:'Job not found'});}
    if(req.method!=='POST')return json(res,404,{error:'Not found'});
    const input=await body(req);
    if(url.pathname==='/api/report')return json(res,200,fromWclMetadata(await client.report(input.url)));
    if(url.pathname==='/api/sessions')return json(res,200,detectSessions(input.report,input.options));
    if(url.pathname==='/api/analyze')return json(res,200,analyzeRun({...input,packs}));
    if(url.pathname==='/api/review'){
      // Recompute from evidence and configured packs; never trust a client-supplied analysis verdict.
      const analysis=analyzeRun({...input,packs});return json(res,200,reviewRun(analysis,input.review));
    }
    if(url.pathname==='/api/capture'){
      check(!activeCapture,'One capture is already running; wait for it to finish');
      validateReport(input.report);check(input.report.synthetic!==true,'Use demo data directly');
      // Refresh metadata server-side; clients cannot forge fight ranges for API acquisition.
      const metadata=fromWclMetadata(await client.report(input.report.code));
      const jobId=id([Date.now(),Math.random()]);const job={id:jobId,status:'running',progress:{stage:'queued'}};
      while(jobs.size>=6){const done=[...jobs].find(([,v])=>v.status!=='running');if(!done)break;jobs.delete(done[0]);}
      jobs.set(jobId,job);activeCapture=true;
      captureSelected(client,metadata,input.fightIds,p=>{job.progress=p;}).then(report=>{job.status='complete';job.report=report;},error=>{job.status='failed';job.error=error.message;}).finally(()=>{activeCapture=false;});
      return json(res,202,{jobId});
    }
    json(res,404,{error:'Not found'});
  }catch(error){json(res,400,{error:error.message??'Request failed'});}
});}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT??4317);check(Number.isSafeInteger(port)&&port>0&&port<65536,'Invalid PORT');
  createServer().listen(port,'127.0.0.1',()=>console.log(`Eden deduction review: http://127.0.0.1:${port} (local prototype; no payouts)`));
}
