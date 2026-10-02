// 回覧板の管理者確認（サーバー専用）。暗証番号は PBKDF2 でハッシュ化して board_settings に保存する。
const b64=(u:Uint8Array)=>btoa(String.fromCharCode(...u));
const unb64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
async function derive(pin:string,salt:Uint8Array<ArrayBuffer>){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:100000},key,256));}
export const validPin=(pin:unknown):pin is string=>typeof pin==='string'&&/^\d{4,8}$/.test(pin);
export async function hashPin(pin:string){const salt=crypto.getRandomValues(new Uint8Array(16));return b64(salt)+':'+b64(await derive(pin,salt));}
export async function checkPin(pin:string,stored:string){const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const got=await derive(pin,unb64(salt)),want=unb64(hash);if(got.length!==want.length)return false;let diff=0;for(let i=0;i<got.length;i++)diff|=got[i]^want[i];return diff===0;}
export async function storedPin(db:D1Database){return (await db.prepare("SELECT value FROM board_settings WHERE key='adminPin'").first<{value:string}>())?.value??null;}
// 暗証番号を5回まちがえると10分間は受け付けない（総当たり対策）
const LIMIT=5,LOCK_MS=10*60*1000;
type Fails={n:number;until:number};
async function fails(db:D1Database):Promise<Fails>{const v=(await db.prepare("SELECT value FROM board_settings WHERE key='pinFails'").first<{value:string}>())?.value;try{return v?JSON.parse(v):{n:0,until:0}}catch{return {n:0,until:0}}}
const saveFails=(db:D1Database,f:Fails)=>db.prepare("INSERT INTO board_settings (key,value) VALUES ('pinFails',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(f)).run();
export class PinLocked extends Error{}
// 管理者の操作か：名簿で管理者になっている現役の職員で、暗証番号が正しいこと
export async function isAdmin(db:D1Database,staff:unknown,pin:unknown){
 if(typeof staff!=='string'||!validPin(pin))return false;
 const f=await fails(db);if(f.until>Date.now())throw new PinLocked();
 const [row,stored]=await Promise.all([db.prepare('SELECT admin FROM board_staff WHERE id=? AND active=1').bind(staff).first<{admin:number}>(),storedPin(db)]);
 if(!row?.admin||!stored)return false;
 if(await checkPin(pin,stored)){if(f.n)await saveFails(db,{n:0,until:0});return true}
 const n=f.n+1;await saveFails(db,n>=LIMIT?{n:0,until:Date.now()+LOCK_MS}:{n,until:0});return false;
}
