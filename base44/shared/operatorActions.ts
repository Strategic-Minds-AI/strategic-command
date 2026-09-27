export async function hashToken(token) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join(''); }
export function publicDevice(d) {return {id:d.id,name:d.name,enabled:d.enabled,revoked:d.revoked,last_seen:d.last_seen,platform:d.platform,input_allowed:d.input_allowed,browser_configured:d.browser_configured,expires_at:d.expires_at,online:!d.revoked&&Date.parse(d.expires_at)>Date.now()&&Date.now()-Date.parse(d.last_seen||'')<30000};}
export function validateAction(action, args = {}) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Arguments must be an object.');
  const text=(key,max=1000)=>{const value=args[key];if(typeof value!=='string'||!value.length||value.length>max)throw new Error(key+' is required and must be at most '+max+' characters.');return value;};
  const integer=(key,min,max)=>{const value=args[key];if(!Number.isInteger(value)||value<min||value>max)throw new Error(key+' must be an integer between '+min+' and '+max);return value;};
  const url=()=>{const value=text('url',2000),parsed=new URL(value);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)throw new Error('Use an HTTP or HTTPS URL without credentials.');return value;};
  const session=()=>{const value=text('session_id',100);if(!/^[a-zA-Z0-9_-]+$/.test(value))throw new Error('Invalid session ID.');return value;};
  if(action==='screen_info'||action==='browser_health'||action==='browser_start'||action==='phone_status')return {};
  if(action==='phone_tap')return {x:integer('x',0,20000),y:integer('y',0,20000)};
  if(action==='phone_swipe')return {x1:integer('x1',0,20000),y1:integer('y1',0,20000),x2:integer('x2',0,20000),y2:integer('y2',0,20000),duration:integer('duration',100,2000)};
  if(action==='phone_text'){const value=text('text',120);if(!/^[A-Za-z0-9 ]+$/.test(value))throw new Error('Phone text supports letters, numbers, and spaces only.');return {text:value};}
  if(action==='phone_key'){const key=text('key',20);if(!['home','back','app_switch'].includes(key))throw new Error('Choose Home, Back, or Recent apps.');return {key};}
  if(action==='open_url')return {url:url()};
  if(action==='click'){const button=args.button||'left';if(!['left','right','middle'].includes(button))throw new Error('Invalid mouse button.');return {x:integer('x',0,20000),y:integer('y',0,20000),button};}
  if(action==='type_text')return {text:text('text')};
  if(action==='press_key'){const keys=text('keys',100).toLowerCase().split('+');if(keys.length>4||keys.some(k=>!/^[a-z0-9_]{1,20}$/.test(k)))throw new Error('Use up to four key names separated by +.');return {keys:keys.join('+')};}
  if(action==='scroll')return {amount:integer('amount',-30,30)};
  if(action==='browser_close')return {session_id:session()};
  if(action==='browser_action'){const kind=text('action_type',20);if(!['goto','click','fill','press','scroll'].includes(kind))throw new Error('Allowed browser actions: goto, click, fill, press, scroll.');const result={session_id:session(),action_type:kind};if(kind==='goto'){const value=text('value',2000);const u=new URL(value);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('Use an HTTP or HTTPS URL without credentials.');result.value=value;}else if(['fill','press','scroll'].includes(kind))result.value=text('value',1000);if(['click','fill'].includes(kind))result.selector=text('selector',500);return result;}
  throw new Error('Unsupported computer action.');
}
export function actionCapability(action,device) {if(action.startsWith('browser_'))return device.browser_configured===true;if(action==='screen_info'||action==='phone_status')return true;return device.input_allowed===true;}