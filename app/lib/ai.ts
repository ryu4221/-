// AIへの接続（サーバー専用）。OpenAI互換の「chat/completions」形式で、接続先を設定だけで切り替えられる。
// 優先順：環境変数 AI_BASE_URL・AI_API_KEY・AI_MODEL → 画面の「AIの設定」（管理者が登録、app_settingsに保存）
import {env} from 'cloudflare:workers';
import type {AiStatus} from './daily';
export const aiServices={
 cloudflare:{label:'Cloudflare Workers AI（無料枠あり）',base:(account:string)=>`https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`},
 gemini:{label:'Google Gemini',base:()=>'https://generativelanguage.googleapis.com/v1beta/openai'},
 custom:{label:'その他（OpenAI互換の接続先）',base:(url:string)=>url},
} as const;
type Config={baseUrl:string;key:string;model:string;service:string;source:'env'|'settings'};
const vars=env as unknown as Record<string,string|undefined>;
export async function aiConfig(db:D1Database):Promise<Config|null>{
 if(vars.AI_BASE_URL&&vars.AI_MODEL)return {baseUrl:vars.AI_BASE_URL,key:vars.AI_API_KEY??'',model:vars.AI_MODEL,service:'env',source:'env'};
 const rows=(await db.prepare("SELECT key,value FROM app_settings WHERE key IN ('aiBaseUrl','aiKey','aiModel','aiService')").all<{key:string;value:string}>()).results;
 const v=Object.fromEntries(rows.map(r=>[r.key,r.value]));
 return v.aiBaseUrl&&v.aiModel?{baseUrl:v.aiBaseUrl,key:v.aiKey??'',model:v.aiModel,service:v.aiService??'custom',source:'settings'}:null;
}
export async function aiStatus(db:D1Database):Promise<AiStatus>{const c=await aiConfig(db);return c?{configured:true,source:c.source,model:c.model,service:c.service}:{configured:false,source:null,model:'',service:''}}
export class AiError extends Error{}
// 考えてから答えるモデル（Qwen3など）は考える過程にも出力の枠を使うため、枠を広めにし、Qwen3は /no_think で考える過程を省く
export async function chat(c:Config,system:string,user:string){
 let r:Response;
 try{r=await fetch(c.baseUrl.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',...(c.key?{Authorization:'Bearer '+c.key}:{})},body:JSON.stringify({model:c.model,messages:[{role:'system',content:system},{role:'user',content:/qwen3/i.test(c.model)?user+'\n/no_think':user}],max_tokens:3000,temperature:0.4}),signal:AbortSignal.timeout(90000)})}
 catch{throw new AiError('AIにつながりませんでした。時間をおいてもう一度お試しください。')}
 if(r.status===401||r.status===403)throw new AiError('AIの鍵が正しくないか、使えない状態です。管理者が「AIの設定」を確認してください。');
 if(r.status===404)throw new AiError('AIのモデル名か接続先が見つかりません。管理者が「AIの設定」を確認してください。');
 if(r.status===429)throw new AiError('AIの無料で使える量を超えたか、短い時間に使いすぎました。しばらく（無料枠の場合は翌日まで）待ってからお試しください。');
 if(!r.ok)throw new AiError('AIが応答できませんでした（'+r.status+'）。時間をおいてもう一度お試しください。');
 const data=await r.json() as {choices?:{message?:{content?:string}}[]};
 const text=data.choices?.[0]?.message?.content;
 if(!text)throw new AiError('AIから文章が返ってきませんでした。もう一度お試しください。');
 return text;
}
