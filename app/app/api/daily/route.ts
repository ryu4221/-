import {database,json,sameOrigin} from '../../../lib/storage';
import {isAdmin,PinLocked} from '../../../lib/boardAdmin';
import {aiStatus,aiServices} from '../../../lib/ai';
import {dailyLimits} from '../../../lib/daily';
import {validDay} from '../../../lib/board';
export const dynamic='force-dynamic';
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const notAdmin=()=>json({error:'管理者の暗証番号が正しくありません。（管理者は回覧板の「職員名簿・管理者」で決めます）'},403);
const locked=()=>json({error:'暗証番号を続けてまちがえたため、10分ほど待ってからやり直してください。'},429);
const sourceKinds=['アセスメント','本案','個別支援計画','モニタリング'];
// ?person=ID：その人の特徴・使える資料・これまでの記録。どちらでも：文例とAIの状態。
export async function GET(req:Request){
 try{
  const db=database(),person=new URL(req.url).searchParams.get('person');
  const [examples,ai]=await Promise.all([db.prepare('SELECT id,kind,body FROM record_examples ORDER BY created').all(),aiStatus(db)]);
  if(!person)return json({examples:examples.results,ai});
  if(!await db.prepare('SELECT id FROM people WHERE id=?').bind(person).first())return json({error:'利用者が見つかりません。'},404);
  const [traits,docs,records]=await db.batch([
   db.prepare('SELECT traits FROM person_traits WHERE person=?').bind(person),
   db.prepare(`SELECT id,category,name,created FROM documents WHERE person=? AND category IN (${sourceKinds.map(()=>'?').join(',')}) ORDER BY created DESC`).bind(person,...sourceKinds),
   db.prepare('SELECT id,person,date,memo,record,consideration,author,created,updated FROM daily_records WHERE person=? ORDER BY date DESC,updated DESC LIMIT 60').bind(person),
  ]);
  return json({traits:(traits.results[0] as {traits?:string}|undefined)?.traits??'',docs:(docs.results as {name:string}[]).map(d=>({...d,readable:/\.txt$/i.test(d.name)})),records:records.results,examples:examples.results,ai});
 }catch{console.error('Daily read failed');return json({error:'読み込めませんでした。時間をおいて再度お試しください。'},503)}
}
// 小さな操作：特徴の保存、文例の追加・削除、AIの設定（管理者）
export async function PATCH(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 let data:Record<string,unknown>;try{data=await req.json()}catch{return json({error:'入力が正しくありません。'},400)}
 try{
  const db=database(),now=new Date().toISOString();
  switch(data.action){
   case 'traits':{
    const person=text(data.person),traits=text(data.traits);
    if(traits.length>dailyLimits.traits)return json({error:'特徴は2000文字までです。'},400);
    if(!await db.prepare('SELECT id FROM people WHERE id=?').bind(person).first())return json({error:'利用者が見つかりません。'},404);
    await db.prepare('INSERT INTO person_traits (person,traits,updated) VALUES (?,?,?) ON CONFLICT(person) DO UPDATE SET traits=excluded.traits,updated=excluded.updated').bind(person,traits,now).run();
    return json({traits});
   }
   case 'example':{
    const kind=data.kind==='consideration'?'consideration':'record',body=text(data.body);
    if(!body||body.length>dailyLimits.example)return json({error:'文例を3000文字以内で入力してください。'},400);
    const id=crypto.randomUUID();await db.prepare('INSERT INTO record_examples (id,kind,body,created) VALUES (?,?,?,?)').bind(id,kind,body,now).run();return json({id,kind,body});
   }
   case 'deleteExample':{
    if(!await isAdmin(db,data.staff,data.pin))return notAdmin();
    const r=await db.prepare('DELETE FROM record_examples WHERE id=?').bind(text(data.id)).run();return r.meta.changes?json({ok:true}):json({error:'文例が見つかりません。'},404);
   }
   case 'aiConfig':{
    if(!await isAdmin(db,data.staff,data.pin))return notAdmin();
    const service=text(data.service) as keyof typeof aiServices,model=text(data.model),key=text(data.key),target=text(data.target);
    if(!aiServices[service])return json({error:'AIのサービスを選んでください。'},400);
    if(!model||model.length>200)return json({error:'モデル名を入力してください。'},400);
    if(service==='cloudflare'&&!/^[0-9a-f]{32}$/i.test(target))return json({error:'CloudflareのアカウントID（32文字の英数字）を入力してください。'},400);
    if(service==='custom'&&!/^https?:\/\/[^\s]+$/.test(target))return json({error:'接続先のURL（https://〜）を入力してください。'},400);
    const baseUrl=aiServices[service].base(target);
    const stmts=[['aiService',service],['aiBaseUrl',baseUrl],['aiModel',model],...(key?[['aiKey',key]]:[])].map(([k,v])=>db.prepare('INSERT INTO app_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v));
    await db.batch(stmts);return json({ai:await aiStatus(db)});
   }
   case 'aiClear':{
    if(!await isAdmin(db,data.staff,data.pin))return notAdmin();
    await db.prepare("DELETE FROM app_settings WHERE key IN ('aiBaseUrl','aiKey','aiModel','aiService')").run();return json({ai:await aiStatus(db)});
   }
  }
  return json({error:'操作を確認してください。'},400);
 }catch(e){if(e instanceof PinLocked)return locked();console.error('Daily update failed');return json({error:'保存できませんでした。もう一度お試しください。'},503)}
}
// 記録の保存（id があれば上書き）
export async function PUT(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 try{
  const data=await req.json() as Record<string,unknown>;const db=database(),now=new Date().toISOString();
  const id=text(data.id),person=text(data.person),date=text(data.date),memo=text(data.memo),record=text(data.record),consideration=text(data.consideration),author=text(data.author).slice(0,50);
  if(!validDay(date))return json({error:'日付を確認してください。'},400);
  if(!record&&!consideration)return json({error:'記録か考察のどちらかを入れてください。'},400);
  if(memo.length>dailyLimits.memo||record.length>dailyLimits.record||consideration.length>dailyLimits.record)return json({error:'文章が長すぎます。'},400);
  if(!await db.prepare('SELECT id FROM people WHERE id=?').bind(person).first())return json({error:'利用者が見つかりません。'},404);
  if(id){const r=await db.prepare('UPDATE daily_records SET date=?,memo=?,record=?,consideration=?,author=?,updated=? WHERE id=? AND person=?').bind(date,memo,record,consideration,author,now,id,person).run();if(!r.meta.changes)return json({error:'記録が見つかりません。'},404);return json({id})}
  const nid=crypto.randomUUID();await db.prepare('INSERT INTO daily_records (id,person,date,memo,record,consideration,author,created,updated) VALUES (?,?,?,?,?,?,?,?,?)').bind(nid,person,date,memo,record,consideration,author,now,now).run();return json({id:nid});
 }catch{console.error('Daily save failed');return json({error:'記録を保存できませんでした。もう一度お試しください。'},503)}
}
// 記録の削除（管理者のみ）
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 try{
  const data=await req.json() as Record<string,unknown>;const db=database();
  if(!await isAdmin(db,data.staff,data.pin))return notAdmin();
  const r=await db.prepare('DELETE FROM daily_records WHERE id=?').bind(text(data.id)).run();return r.meta.changes?json({ok:true}):json({error:'記録が見つかりません。'},404);
 }catch(e){if(e instanceof PinLocked)return locked();console.error('Daily delete failed');return json({error:'削除できませんでした。'},503)}
}
