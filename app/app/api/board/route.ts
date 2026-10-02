import {database,bucket,json,sameOrigin} from '../../../lib/storage';
import {boardFileTypes,boardLimits,folderColors} from '../../../lib/board';
export const dynamic='force-dynamic';
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
// 一覧：?staff=ID でその職員の確認済みかどうか（seen）を付ける。?post=ID で本文・添付・確認した人。
export async function GET(req:Request){
 try{
  const q=new URL(req.url).searchParams;const db=database();const post=q.get('post');
  if(post){
   const row=await db.prepare('SELECT id,folder,title,body,author,important,archived,created FROM board_posts WHERE id=?').bind(post).first();
   if(!row)return json({error:'お知らせが見つかりません。'},404);
   const files=(await db.prepare('SELECT id,name,size FROM board_files WHERE post=? ORDER BY created').bind(post).all()).results;
   const reads=(await db.prepare('SELECT r.staff,s.name,r.read_at AS readAt FROM board_reads r JOIN board_staff s ON s.id=r.staff WHERE r.post=? ORDER BY r.read_at').bind(post).all()).results;
   return json({post:row,files,reads});
  }
  const staff=q.get('staff')||'';
  const [people,folders,posts]=await db.batch([
   db.prepare('SELECT id,name,active FROM board_staff ORDER BY created'),
   db.prepare('SELECT id,name,color FROM board_folders ORDER BY created'),
   db.prepare(`SELECT p.id,p.folder,p.title,p.body,p.author,p.important,p.archived,p.created,
    (SELECT COUNT(*) FROM board_files f WHERE f.post=p.id) AS files,
    (SELECT group_concat(f.name,' ') FROM board_files f WHERE f.post=p.id) AS fileNames,
    (SELECT COUNT(*) FROM board_reads r JOIN board_staff s ON s.id=r.staff WHERE r.post=p.id AND s.active=1) AS reads,
    EXISTS(SELECT 1 FROM board_reads r WHERE r.post=p.id AND r.staff=?) AS seen
    FROM board_posts p ORDER BY p.created DESC`).bind(staff),
  ]);
  return json({staff:people.results,folders:folders.results,posts:posts.results});
 }catch{console.error('Board read failed');return json({error:'回覧板を読み込めませんでした。時間をおいて再度お試しください。'},503)}
}
// お知らせを回す：multipart（title, body, folder, author=職員ID, important, file×最大5）
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 if(Number(req.headers.get('content-length'))>boardLimits.total+1024*1024)return json({error:'添付ファイルは合計50 MBまでです。'},413);
 try{
  const form=await req.formData();const title=text(form.get('title')),body=text(form.get('body')),folder=text(form.get('folder')),author=text(form.get('author'));
  const files=form.getAll('file').filter((f):f is File=>f instanceof File&&f.size>0);
  if(!title||title.length>boardLimits.title)return json({error:'件名を100文字以内で入力してください。'},400);
  if(body.length>boardLimits.body)return json({error:'本文は5000文字までです。'},400);
  if(!body&&!files.length)return json({error:'本文か添付ファイルのどちらかを入れてください。'},400);
  if(files.length>boardLimits.files)return json({error:'添付ファイルは5つまでです。'},400);
  if(files.some(f=>f.size>boardLimits.fileSize))return json({error:'添付ファイルは1つ20 MBまでです。'},400);
  if(files.reduce((n,f)=>n+f.size,0)>boardLimits.total)return json({error:'添付ファイルは合計50 MBまでです。'},400);
  if(files.some(f=>!boardFileTypes.test(f.name)))return json({error:'PDF・Word・Excel・画像・テキストのファイルを選択してください。'},400);
  const db=database();
  const writer=await db.prepare('SELECT name FROM board_staff WHERE id=? AND active=1').bind(author).first<{name:string}>();
  if(!writer)return json({error:'書いた人（職員）を選び直してください。'},400);
  if(folder&&!await db.prepare('SELECT id FROM board_folders WHERE id=?').bind(folder).first())return json({error:'フォルダーが見つかりません。'},404);
  const id=crypto.randomUUID(),now=new Date().toISOString(),b=bucket(),saved:string[]=[];
  try{
   const stmts=[db.prepare('INSERT INTO board_posts (id,folder,title,body,author,important,archived,created) VALUES (?,?,?,?,?,?,0,?)').bind(id,folder||null,title,body,writer.name,form.get('important')==='1'?1:0,now)];
   for(const f of files){const fid=crypto.randomUUID();await b.put('board/'+fid,f.stream(),{httpMetadata:{contentType:'application/octet-stream'}});saved.push(fid);stmts.push(db.prepare('INSERT INTO board_files (id,post,name,size,created) VALUES (?,?,?,?,?)').bind(fid,id,f.name.slice(0,250),f.size,now))}
   // 書いた人は確認済みとして記録する
   stmts.push(db.prepare('INSERT INTO board_reads (post,staff,read_at) VALUES (?,?,?)').bind(id,author,now));
   await db.batch(stmts);
  }catch(e){await Promise.all(saved.map(fid=>b.delete('board/'+fid)));throw e}
  return json({id});
 }catch{console.error('Board post failed');return json({error:'お知らせを保存できませんでした。もう一度お試しください。'},503)}
}
// 小さな操作：見ました／取り消し、掲載終了、フォルダー移動、フォルダー・職員の登録と変更。どれも削除はしない。
export async function PATCH(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 let data:Record<string,unknown>;try{data=await req.json()}catch{return json({error:'入力が正しくありません。'},400)}
 try{
  const db=database();const id=text(data.id);
  switch(data.action){
   case 'read':case 'unread':{
    const staff=text(data.staff);
    if(!await db.prepare('SELECT id FROM board_staff WHERE id=? AND active=1').bind(staff).first())return json({error:'職員を選び直してください。'},400);
    if(!await db.prepare('SELECT id FROM board_posts WHERE id=?').bind(id).first())return json({error:'お知らせが見つかりません。'},404);
    if(data.action==='read')await db.prepare('INSERT OR IGNORE INTO board_reads (post,staff,read_at) VALUES (?,?,?)').bind(id,staff,new Date().toISOString()).run();
    else await db.prepare('DELETE FROM board_reads WHERE post=? AND staff=?').bind(id,staff).run();
    return json({ok:true});
   }
   case 'archive':{
    const r=await db.prepare('UPDATE board_posts SET archived=? WHERE id=?').bind(data.archived?1:0,id).run();
    return r.meta.changes?json({ok:true}):json({error:'お知らせが見つかりません。'},404);
   }
   case 'move':{
    const folder=text(data.folder);
    if(folder&&!await db.prepare('SELECT id FROM board_folders WHERE id=?').bind(folder).first())return json({error:'フォルダーが見つかりません。'},404);
    const r=await db.prepare('UPDATE board_posts SET folder=? WHERE id=?').bind(folder||null,id).run();
    return r.meta.changes?json({ok:true}):json({error:'お知らせが見つかりません。'},404);
   }
   case 'folder':{
    const name=text(data.name),color=text(data.color);
    if(!name||name.length>boardLimits.name)return json({error:'フォルダー名を50文字以内で入力してください。'},400);
    if(!folderColors.some(c=>c.key===color))return json({error:'色を選んでください。'},400);
    if(await db.prepare('SELECT id FROM board_folders WHERE name=? AND id<>?').bind(name,id).first())return json({error:'同じ名前のフォルダーがあります。'},409);
    if(id){const r=await db.prepare('UPDATE board_folders SET name=?,color=? WHERE id=?').bind(name,color,id).run();if(!r.meta.changes)return json({error:'フォルダーが見つかりません。'},404);return json({id,name,color})}
    const nid=crypto.randomUUID();await db.prepare('INSERT INTO board_folders (id,name,color,created) VALUES (?,?,?,?)').bind(nid,name,color,new Date().toISOString()).run();return json({id:nid,name,color});
   }
   case 'staff':{
    if(id&&typeof data.active==='boolean'){const r=await db.prepare('UPDATE board_staff SET active=? WHERE id=?').bind(data.active?1:0,id).run();return r.meta.changes?json({ok:true}):json({error:'職員が見つかりません。'},404)}
    const name=text(data.name);
    if(!name||name.length>boardLimits.name)return json({error:'職員名を50文字以内で入力してください。'},400);
    if(await db.prepare('SELECT id FROM board_staff WHERE name=? AND id<>?').bind(name,id).first())return json({error:'同じ名前の職員が登録されています。'},409);
    if(id){const r=await db.prepare('UPDATE board_staff SET name=? WHERE id=?').bind(name,id).run();if(!r.meta.changes)return json({error:'職員が見つかりません。'},404);return json({id,name,active:1})}
    const nid=crypto.randomUUID();await db.prepare('INSERT INTO board_staff (id,name,active,created) VALUES (?,?,1,?)').bind(nid,name,new Date().toISOString()).run();return json({id:nid,name,active:1});
   }
  }
  return json({error:'操作を確認してください。'},400);
 }catch{console.error('Board update failed');return json({error:'保存できませんでした。もう一度お試しください。'},503)}
}
