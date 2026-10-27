import {requireValue, DomainError} from '../ledger/policy.js';

export function reportCode(value) {
  requireValue(typeof value === 'string', 'Enter a WCL report URL or code');
  const text = value.trim(); if (/^[A-Za-z0-9]{16}$/.test(text)) return text;
  let url; try { url = new URL(text); } catch { throw new DomainError('Enter a Warcraft Logs report URL or 16-character code'); }
  requireValue(url.protocol === 'https:' && /^(?:www\.|[a-z]{2}\.)?warcraftlogs\.com$/.test(url.hostname) && !url.username && !url.password && !url.port, 'Only official HTTPS Warcraft Logs report URLs are supported');
  const match = url.pathname.match(/^\/reports\/([A-Za-z0-9]{16})(?:\/|$)/);
  requireValue(match, 'Invalid WCL report URL'); return match[1];
}
export const METADATA_QUERY = `query EdenReport($code:String!){reportData{report(code:$code,allowUnlisted:true){
  code title startTime endTime revision visibility region{slug}
  fights{id name encounterID difficulty startTime endTime kill inProgress friendlyPlayers wipeCalledTime}
  masterData{actors{id name type subType server petOwner} abilities{gameID name}}
}}}`;
export const EVENTS_QUERY = `query EdenEvents($code:String!,$fightIDs:[Int]!,$start:Float!,$end:Float!){reportData{report(code:$code,allowUnlisted:true){
  events(fightIDs:$fightIDs,startTime:$start,endTime:$end,dataType:All,includeResources:true,useAbilityIDs:true,useActorIDs:true,limit:10000){data nextPageTimestamp}
}}}`;
export const HISTORY_QUERY = `query EdenCharacterReports($name:String!,$realm:String!,$region:String!,$page:Int!){characterData{character(name:$name,serverSlug:$realm,serverRegion:$region){name hidden server{name slug region{slug}} recentReports(limit:50,page:$page){data{code title startTime endTime owner{name}} current_page has_more_pages}}}}`;
const abortError = () => new DomainError('Capture cancelled', 409);
export class WclClient {
  constructor({credentials = () => ({clientId: process.env.WCL_CLIENT_ID, clientSecret: process.env.WCL_CLIENT_SECRET}), fetchImpl = fetch, sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const cancel = () => { clearTimeout(timer); reject(abortError()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
    signal?.addEventListener('abort', cancel, {once: true});
  }), maxPages = 2000} = {}) { Object.assign(this, {credentials, fetchImpl, sleep, maxPages}); this.token = null; }
  async request(url, options, signal) {
    for (let attempt = 0; attempt <= 2; attempt++) {
      if (signal?.aborted) throw abortError();
      let response;
      try { response = await this.fetchImpl(url, {...options, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000), redirect: 'error'}); }
      catch { if (signal?.aborted) throw abortError(); if (attempt < 2) { await this.sleep(500 * 2 ** attempt, signal); continue; } throw new DomainError('Warcraft Logs network request failed or timed out. Retry later.', 502); }
      if (response.ok) { try { return await response.json(); } catch { throw new DomainError('Warcraft Logs returned invalid JSON', 502); } }
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        const retry = response.headers.get('retry-after');
        const delay = retry === null ? 1000 * 2 ** attempt : /^\d+(\.\d+)?$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now();
        requireValue(Number.isFinite(delay) && delay <= 60000, 'WCL rate limit requires a longer wait; retry later.', 429);
        await this.sleep(Math.max(0, delay), signal); continue;
      }
      throw new DomainError(response.status === 401 ? 'Warcraft Logs authentication failed (401). Check the local API credentials.' : response.status === 403 ? 'WCL denied access. This connection cannot read private or subscription-restricted reports.' : `Warcraft Logs request failed (${response.status}). Check report access or retry later.`, response.status === 429 ? 429 : 502);
    }
  }
  async accessToken(signal) {
    const {clientId, clientSecret} = this.credentials();
    requireValue(clientId && clientSecret, 'Configure a WCL API client ID and secret in the Warcraft Logs connection panel.', 409);
    // Values are kept in memory/server storage only and never included in errors or audit.
    const key = `${clientId}:${clientSecret}`;
    if (this.token?.key === key && this.token.expiresAt > Date.now() + 30000) return this.token.value;
    const body = await this.request('https://www.warcraftlogs.com/oauth/token', {method: 'POST', headers: {Authorization: `Basic ${Buffer.from(key).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded'}, body: 'grant_type=client_credentials'}, signal);
    requireValue(typeof body.access_token === 'string' && Number.isFinite(body.expires_in), 'Invalid WCL authentication response', 502);
    this.token = {key, value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000}; return this.token.value;
  }
  async query(query, variables, signal) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.accessToken(signal);
      try {
        const result = await this.request('https://www.warcraftlogs.com/api/v2/client', {method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify({query, variables})}, signal);
        requireValue(!result.errors?.length && result.data, 'WCL GraphQL request failed or returned incomplete data. Check report permissions and API compatibility; no review was created.', 502);
        return result.data;
      } catch (error) { if (attempt === 0 && error.message.includes('(401)')) { this.token = null; continue; } throw error; }
    }
  }
  async report(value, signal) {
    const code = reportCode(value), data = await this.query(METADATA_QUERY, {code}, signal);
    requireValue(data.reportData?.report, 'Report unavailable. Check its code and public access; private-report OAuth is not supported yet.', 404);
    return data.reportData.report;
  }
  async realms(region, signal) {
    const regions = (await this.query('query EdenRegions{worldData{regions{id slug}}}', {}, signal)).worldData?.regions;
    const found = regions?.find(r => r.slug.toLowerCase() === region);
    requireValue(found, 'WCL region unavailable', 502);
    const data = await this.query('query EdenRealms($id:Int!){worldData{region(id:$id){servers(limit:5000,page:1){data{name normalizedName slug} has_more_pages}}}}', {id: found.id}, signal);
    const page = data.worldData?.region?.servers;
    requireValue(Array.isArray(page?.data) && page.has_more_pages === false, 'Incomplete WCL realm directory', 502);
    return page.data;
  }
  async characterReports(character, page, signal) {
    return (await this.query(HISTORY_QUERY, {name: character.name, realm: character.slug, region: character.region, page}, signal)).characterData?.character ?? null;
  }
  async *pages(code, fight, signal) {
    reportCode(code); let start = fight.startTime;
    for (let index = 0; index < this.maxPages; index++) {
      const variables = {code, fightIDs: [fight.id], start, end: fight.endTime};
      const data = await this.query(EVENTS_QUERY, variables, signal), page = data.reportData?.report?.events;
      requireValue(page && Array.isArray(page.data) && Object.hasOwn(page, 'nextPageTimestamp'), 'Missing event page or pagination cursor; capture incomplete', 502);
      const next = page.nextPageTimestamp;
      requireValue(next === null || (Number.isFinite(next) && next > start && next <= fight.endTime), 'WCL pagination did not progress; capture incomplete', 502);
      requireValue(page.data.every(e => Number.isFinite(e.timestamp) && e.timestamp >= fight.startTime && e.timestamp <= fight.endTime), 'Event timestamp falls outside the selected pull', 502);
      yield {index, queryVersion: 1, variables, page};
      if (next === null) return;
      start = next; // Empty pages may still have a continuation cursor.
    }
    throw new DomainError('Event page budget exhausted; capture incomplete', 502);
  }
}
