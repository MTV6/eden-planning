import {createHash} from 'node:crypto';
export function check(value,message){if(!value)throw new Error(message);}
export function id(value){return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);}
export function halfUnits(value){check(Number.isFinite(value)&&value>=0&&Number.isInteger(value*2),'Shares must be nonnegative multiples of 0.5');return value*2;}
export const POLICY_VERSION='eden-2026-10-24-v1';
export function reportCode(input){
  if(/^[A-Za-z0-9]{16}$/.test(input))return input;
  let url;try{url=new URL(input);}catch{throw Error('Enter a Warcraft Logs report URL or 16-character code');}
  check(url.protocol==='https:'&&/^(?:www\.|[a-z]{2}\.)?warcraftlogs\.com$/.test(url.hostname),'Only HTTPS Warcraft Logs report URLs are accepted');
  const match=url.pathname.match(/^\/reports\/([A-Za-z0-9]{16})(?:\/|$)/);check(match,'Invalid report URL');return match[1];
}
