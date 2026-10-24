import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Ledger} from './src/ledger/store.js';
import {DomainError, requireValue, string} from './src/ledger/policy.js';
import {WclClient} from './src/wcl/client.js';
import {Connection, WclService} from './src/wcl/service.js';

const root = new URL('./', import.meta.url);
const files = new Map([['/', 'public/index.html'], ['/app.js', 'public/app.js'], ['/wcl-ui.js', 'public/wcl-ui.js'], ['/review-ui.js', 'public/review-ui.js'], ['/style.css', 'public/style.css']]);
const security = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
function json(res, status, value) { res.writeHead(status, {...security, 'Content-Type': 'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); }
async function body(req) {
  requireValue(req.headers['content-type']?.startsWith('application/json'), 'JSON request required', 415);
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; requireValue(size <= 10 * 1024 * 1024, 'Import exceeds 10 MiB', 413); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new DomainError('Invalid JSON'); }
}
export function createServer({ledger = new Ledger(fileURLToPath(new URL('data/ledger.sqlite', root))), wclClient = null, connection = new Connection(fileURLToPath(new URL('data/wcl-credentials.json', root)))} = {}) {
  const wcl = new WclService({ledger, connection, client: wclClient ?? new WclClient({credentials: () => connection.credentials()})});
  const server = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host;
      requireValue(host && /^(127\.0\.0\.1|localhost):\d+$/.test(host), 'Localhost Host required', 403);
      if (req.headers.origin) requireValue(req.headers.origin === `http://${host}`, 'Cross-origin request rejected', 403);
      if (req.headers['sec-fetch-site']) requireValue(['same-origin', 'none'].includes(req.headers['sec-fetch-site']), 'Cross-site request rejected', 403);
      const path = new URL(req.url, `http://${host}`).pathname;
      if (req.method === 'GET' && files.has(path)) {
        const filename = files.get(path); const data = await readFile(new URL(filename, root));
        res.writeHead(200, {...security, 'Content-Type': filename.endsWith('.html') ? 'text/html; charset=utf-8' : filename.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8'}); return res.end(data);
      }
      if (req.method === 'GET' && path === '/api/state') return json(res, 200, {runs: ledger.listRuns(), policy: ledger.policy(), auditValid: ledger.verifyAudit(), localOnly: true});
      if (req.method === 'GET' && path === '/api/demo') return json(res, 200, JSON.parse(await readFile(new URL('examples/sample-run.json', root), 'utf8')));
      if (req.method === 'GET' && path === '/api/audit') return json(res, 200, ledger.history());
      if (req.method === 'GET' && path === '/api/wcl/status') return json(res, 200, {...connection.status(), jobs: wcl.listJobs()});
      if (req.method === 'GET' && path === '/api/wcl/searches') return json(res, 200, wcl.missing.list());
      const searchMatch = path.match(/^\/api\/wcl\/searches\/([a-z0-9-]+)$/);
      if (req.method === 'GET' && searchMatch) return json(res, 200, wcl.missing.get(searchMatch[1]));
      const importMatch = path.match(/^\/api\/wcl\/(drafts|jobs)\/([a-z0-9-]+)$/);
      if (req.method === 'GET' && importMatch) return json(res, 200, importMatch[1] === 'jobs' ? wcl.job(importMatch[2]) : wcl.preview(wcl.draft(importMatch[2])));
      const evidenceMatch=path.match(/^\/api\/wcl\/review\/([a-z0-9-]+)$/);
      if(evidenceMatch && req.method==='GET') return json(res,200,wcl.review.get(evidenceMatch[1]));
      const match = path.match(/^\/api\/runs\/([a-z0-9-]+)(?:\/(export|audit))?$/);
      if (match && req.method === 'GET') return json(res, 200, match[2] === 'export' ? ledger.exportRun(match[1]) : match[2] === 'audit' ? ledger.history(match[1]) : ledger.run(match[1]));
      if (req.method !== 'POST') return json(res, 404, {error: 'Not found'});
      const input = await body(req); const actor = string(input.actor, 'Local reviewer name', 100);
      if(evidenceMatch) return json(res,200,wcl.review.build(evidenceMatch[1],input,actor));
      if (path === '/api/wcl/credentials') { const status = await connection.save(input); ledger.audit(actor, 'wcl.connection.configured', {access: status.access}); return json(res, 200, status); }
      if (path === '/api/wcl/discover') return json(res, 201, await wcl.discover(input, actor));
      if (path === '/api/wcl/find-missing') return json(res, 201, await wcl.missing.search(input, actor));
      if (path === '/api/wcl/load-candidate') return json(res, 201, await wcl.missing.add(input, actor));
      if (path === '/api/wcl/capture') return json(res, 202, wcl.start(input, actor));
      if (path === '/api/wcl/cancel') return json(res, 200, wcl.cancel(input.jobId, actor));
      if (path === '/api/runs') return json(res, 201, ledger.importRun(input.run, actor));
      if (path === '/api/policy') {
        requireValue(Number.isInteger(input.expectedVersion), 'Current policy version required');
        return json(res, 201, ledger.publishPolicy(input.policy, actor, input.reason, input.expectedVersion));
      }
      if (match && !match[2]) return json(res, 200, ledger.act(match[1], input, actor));
      json(res, 404, {error: 'Not found'});
    } catch (error) { json(res, error instanceof DomainError ? error.status : 400, {error: error instanceof DomainError ? error.message : 'Invalid request. Check the imported data and field types.'}); }
  });
  server.wcl = wcl;
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4317); requireValue(Number.isSafeInteger(port) && port > 0 && port <= 65535, 'Invalid PORT');
  const ledger = new Ledger(process.env.EDEN_DB ?? fileURLToPath(new URL('data/ledger.sqlite', root)));
  const server = createServer({ledger});
  server.listen(port, '127.0.0.1', () => console.log(`Eden review ledger: http://127.0.0.1:${port} — local only; no live application`));
  const stop = () => server.close(async () => { await server.wcl.shutdown(); ledger.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
}
