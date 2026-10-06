import {database,bucket,json,sameOrigin} from '../../../../lib/storage';
import {aiConfig,chat,AiError} from '../../../../lib/ai';
import {buildPrompt,parseDraft,sampleDraft,mask,dailyLimits,type Example,type MaskSource} from '../../../../lib/daily';
import {validDay} from '../../../../lib/board';
export const dynamic='force-dynamic';
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const sourceKinds=['アセスメント','本案','個別支援計画','モニタリング'];
// 書類（テキスト）を読む。UTF-8 として読めないものは使わない。
async function readText(id:string){const obj=await bucket().get(id);if(!obj)return null;try{return new TextDecoder('utf-8',{fatal:true}).decode(await obj.arrayBuffer()).replace(/^﻿/,'')}catch{return null}}
// 日々の記録と職員考察の下書きを作る。preview=true なら、AIに送る内容（伏せ字済み）だけを返す。
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 let data:Record<string,unknown>;try{data=await req.json()}catch{return json({error:'入力が正しくありません。'},400)}
 try{
  const db=database();
  const person=text(data.person),date=text(data.date),memo=text(data.memo),traits=text(data.traits);
  const docIds=Array.isArray(data.docIds)?data.docIds.filter((x):x is string=>typeof x==='string').slice(0,6):[];
  if(!validDay(date))return json({error:'日付を確認してください。'},400);
  if(memo.length>dailyLimits.memo||traits.length>dailyLimits.traits)return json({error:'メモか特徴が長すぎます。'},400);
  if(!memo)return json({error:'今日の様子のメモを入れてください。メモに無いことは記録に書きません。'},400);
  const row=await db.prepare('SELECT name,profile FROM people WHERE id=?').bind(person).first<{name:string;profile:string}>();
  if(!row)return json({error:'利用者が見つかりません。'},404);
  let profile:Record<string,string>={};try{profile=JSON.parse(row.profile)}catch{}
  const src:MaskSource={name:row.name,kana:profile.kana,guardianName:profile.guardianName,address:profile.address,recipientNumber:profile.recipientNumber,email:profile.email,birthDate:profile.birthDate};
  // ほかの利用者の氏名も伏せる（資料や文例に出てくることがあるため）
  const others=(await db.prepare('SELECT name FROM people WHERE id<>?').bind(person).all<{name:string}>()).results.map(r=>r.name);
  const hide=(s:string)=>{let out=mask(s,src).replaceAll('本人','\u0000');for(const n of others)out=mask(out,{name:n}).replaceAll('本人','他の利用者');return out.replaceAll('\u0000','本人')};
  const docs:{category:string;name:string;text:string}[]=[];
  if(docIds.length){
   const rows=(await db.prepare(`SELECT id,category,name FROM documents WHERE person=? AND id IN (${docIds.map(()=>'?').join(',')}) AND category IN (${sourceKinds.map(()=>'?').join(',')})`).bind(person,...docIds,...sourceKinds).all<{id:string;category:string;name:string}>()).results;
   for(const d of rows){if(!/\.txt$/i.test(d.name))continue;const t=await readText(d.id);if(t)docs.push({category:d.category,name:'資料',text:t.slice(0,dailyLimits.docChars*2)})}
  }
  const examples=(await db.prepare('SELECT id,kind,body FROM record_examples ORDER BY created DESC LIMIT 12').all<Example>()).results;
  const recent=(await db.prepare('SELECT date,record,consideration FROM daily_records WHERE person=? AND date<? ORDER BY date DESC LIMIT 2').bind(person,date).all<{date:string;record:string;consideration:string}>()).results;
  const prompt=buildPrompt({date,memo:hide(memo),traits:hide(traits),docs:docs.map(d=>({...d,text:hide(d.text)})),examples:examples.map(e=>({...e,body:hide(e.body)})),recent:recent.map(r=>({...r,record:hide(r.record),consideration:hide(r.consideration)}))});
  const sent=prompt.system+'\n\n'+prompt.user;
  if(data.preview===true)return json({sent});
  const config=await aiConfig(db);
  if(!config)return json({...sampleDraft(hide(memo),hide(traits)),sample:true,sent});
  const draft=parseDraft(await chat(config,prompt.system,prompt.user));
  return json({...draft,sample:false,sent});
 }catch(e){if(e instanceof AiError)return json({error:e.message},502);console.error('Daily generate failed');return json({error:'下書きを作れませんでした。もう一度お試しください。'},503)}
}
