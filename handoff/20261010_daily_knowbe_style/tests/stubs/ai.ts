// テスト用の偽のAI（外部には何も送らない）
export class AiError extends Error{}
let replies:(string|Error)[]=[],sent:string[]=[];
export function setReplies(r:(string|Error)[]){replies=[...r];sent=[];}
export const sentPrompts=()=>sent;
export async function chat(_c:unknown,_s:string,user:string){sent.push(user);const r=replies.shift();if(r===undefined)throw new AiError('no reply');if(r instanceof Error)throw r;return r;}
