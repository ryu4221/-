import {database,bucket,json,sameOrigin} from '../../../lib/storage';
export const dynamic='force-dynamic';
const kinds=['個別支援計画','原案','本案','会議議事録','アセスメント','モニタリング'];
// Correct imported filenames without replacing file contents or creating duplicates.
export async function PATCH(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 try{
  const data=await req.json() as {id?:unknown;name?:unknown;expectedName?:unknown};
  if(typeof data.id!=='string'||typeof data.name!=='string'||typeof data.expectedName!=='string')return json({error:'入力が正しくありません。'},400);
  const name=data.name.trim();
  if(!name||name.length>250||/[\\/\u0000-\u001f]/.test(name)||! /\.(pdf|docx?|xlsx?|jpe?g|png|webp|txt)$/i.test(name))return json({error:'ファイル名を確認してください。'},400);
  const db=database();
  const existing=await db.prepare('SELECT name FROM documents WHERE id=?').bind(data.id).first<{name:string}>();
  if(!existing)return json({error:'書類が見つかりません。'},404);
  if(existing.name!==data.expectedName)return json({error:'書類名が変更されています。再読み込みしてください。'},409);
  if(existing.name.split('.').pop()?.toLowerCase()!==name.split('.').pop()?.toLowerCase())return json({error:'拡張子は変更できません。'},400);
  const result=await db.prepare('UPDATE documents SET name=? WHERE id=? AND name=?').bind(name,data.id,data.expectedName).run();
  if(!result.meta.changes)return json({error:'書類名が変更されています。再読み込みしてください。'},409);
  return json({id:data.id,name});
 }catch{return json({error:'ファイル名を変更できませんでした。'},503)}
}
// All application routes are protected by Sites owner-only access policy.
export async function GET(req:Request){try{const id=new URL(req.url).searchParams.get('person');const db=database();if(id)return json((await db.prepare('SELECT id,category,name,size,created FROM documents WHERE person=? ORDER BY created DESC').bind(id).all()).results);return json((await db.prepare('SELECT p.id,p.name,p.city, (SELECT COUNT(*) FROM documents d WHERE d.person=p.id) AS count FROM people p ORDER BY p.name').all()).results)}catch{console.error('Record read failed');return json({error:'情報を読み込めませんでした。時間をおいて再度お試しください。'},503)}}
export async function POST(req:Request){if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);try{const data=await req.json() as {name?:unknown;city?:unknown;id?:unknown};const name=typeof data.name==='string'?data.name.trim():'';const city=typeof data.city==='string'?data.city.trim():'';if(!name||!city||name.length>100||city.length>100)return json({error:'氏名と市区町村を100文字以内で入力してください。'},400);const db=database();const id=data.id||crypto.randomUUID();if(typeof id!=='string')return json({error:'入力が正しくありません。'},400);if(data.id){const result=await db.prepare('UPDATE people SET name=?, city=? WHERE id=?').bind(name,city,id).run();if(!result.meta.changes)return json({error:'利用者が見つかりません。'},404)}else await db.prepare('INSERT INTO people (id,name,city) VALUES (?,?,?)').bind(id,name,city).run();return json({id,name,city})}catch{console.error('Record save failed');return json({error:'保存できませんでした。入力を確認して再度お試しください。'},503)}}
export async function PUT(req:Request){if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);if(Number(req.headers.get('content-length'))>21*1024*1024)return json({error:'ファイルは20 MBまでです。'},413);try{const form=await req.formData();const file=form.get('file');const person=form.get('person');const category=form.get('category');if(!(file instanceof File)||!file.size||file.size>20*1024*1024)return json({error:'空でない20 MB以下のファイルを選択してください。'},400);if(typeof person!=='string'||typeof category!=='string'||!kinds.includes(category))return json({error:'利用者と書類の種類を確認してください。'},400);if(!/\.(pdf|docx?|xlsx?|jpe?g|png|webp|txt)$/i.test(file.name))return json({error:'PDF・Word・Excel・画像・テキストのファイルを選択してください。'},400);const db=database();if(!await db.prepare('SELECT id FROM people WHERE id=?').bind(person).first())return json({error:'利用者が見つかりません。'},404);const id=crypto.randomUUID();const b=bucket();await b.put(id,file.stream(),{httpMetadata:{contentType:'application/octet-stream'}});try{await db.prepare('INSERT INTO documents (id,person,category,name,size,created) VALUES (?,?,?,?,?,?)').bind(id,person,category,file.name.slice(0,250),file.size,new Date().toISOString()).run()}catch(e){await b.delete(id);throw e}return json({id})}catch{console.error('Document save failed');return json({error:'書類を保存できませんでした。もう一度お試しください。'},503)}}

