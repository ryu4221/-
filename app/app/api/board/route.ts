import {database,bucket,json,sameOrigin} from '../../../lib/storage';
import {boardFileTypes,boardLimits,folderColors,validDay} from '../../../lib/board';
import {isAdmin,validPin,hashPin,storedPin,PinLocked} from '../../../lib/boardAdmin';
const locked=()=>json({error:'暗証番号を続けてまちがえたため、10分ほど待ってからやり直してください。'},429);
export const dynamic='force-dynamic';
const text=(v:unknown)=>typeof v==='string'?v.trim():'';
const day=(v:unknown)=>{const s=text(v);return s&&validDay(s)?s:null;};
const notAdmin=()=>json({error:'管理者の暗証番号が正しくありません。'},403);
const activeStaff=(db:D1Database,id:string)=>db.prepare('SELECT id,name,admin FROM board_staff WHERE id=? AND active=1').bind(id).first<{id:string;name:string;admin:number}>();
const postColumns='p.id,p.folder,p.title,p.body,p.author,p.important,p.archived,p.created,p.target,p.due,p.expires,p.pinned,p.version,p.thumb';
// 一覧：?staff=ID でその職員が確認した版（myVersion）を付ける。?post=ID で本文・添付・版・確認した人・コメント。
export async function GET(req:Request){
 try{
  const q=new URL(req.url).searchParams;const db=database();const post=q.get('post');
  if(post){
   const row=await db.prepare(`SELECT ${postColumns} FROM board_posts p WHERE p.id=?`).bind(post).first();
   if(!row)return json({error:'お知らせが見つかりません。'},404);
   const [files,reads,versions,comments]=await db.batch([
    db.prepare('SELECT id,name,size,version FROM board_files WHERE post=? ORDER BY version DESC,created').bind(post),
    db.prepare('SELECT r.staff,s.name,r.read_at AS readAt,r.version FROM board_reads r JOIN board_staff s ON s.id=r.staff WHERE r.post=? ORDER BY r.read_at').bind(post),
    db.prepare('SELECT version,note,author,created FROM board_versions WHERE post=? ORDER BY version DESC').bind(post),
    db.prepare('SELECT id,staff,name,body,created FROM board_comments WHERE post=? ORDER BY created').bind(post),
   ]);
   return json({post:row,files:files.results,reads:reads.results,versions:versions.results,comments:comments.results});
  }
  const staff=q.get('staff')||'';
  const [people,folders,posts,templates,pin]=await db.batch([
   db.prepare('SELECT id,name,active,admin FROM board_staff ORDER BY created'),
   db.prepare('SELECT id,name,color,binder FROM board_folders ORDER BY created'),
   db.prepare(`SELECT ${postColumns},
    (SELECT COUNT(*) FROM board_files f WHERE f.post=p.id) AS files,
    (SELECT group_concat(f.name,' ') FROM board_files f WHERE f.post=p.id) AS fileNames,
    (SELECT COUNT(*) FROM board_comments c WHERE c.post=p.id) AS comments,
    (SELECT group_concat(r.staff) FROM board_reads r WHERE r.post=p.id AND r.version>=p.version) AS readers,
    (SELECT r.version FROM board_reads r WHERE r.post=p.id AND r.staff=?) AS myVersion
    FROM board_posts p ORDER BY p.created DESC`).bind(staff),
   db.prepare('SELECT id,name,title,body,target,folder FROM board_templates ORDER BY created'),
   db.prepare("SELECT COUNT(*) AS n FROM board_settings WHERE key='adminPin'"),
  ]);
  return json({staff:people.results,folders:folders.results,posts:posts.results,templates:templates.results,hasPin:Number((pin.results[0] as {n:number}).n)>0});
 }catch{console.error('Board read failed');return json({error:'回覧板を読み込めませんでした。時間をおいて再度お試しください。'},503)}
}
// 添付ファイルと一覧用プレビュー（thumb）の検査
function attachments(form:FormData){
 const files=form.getAll('file').filter((f):f is File=>f instanceof File&&f.size>0);
 const thumb=form.get('thumb');
 if(files.length>boardLimits.files)return {error:'添付ファイルは5つまでです。'};
 if(files.some(f=>f.size>boardLimits.fileSize))return {error:'添付ファイルは1つ20 MBまでです。'};
 if(files.reduce((n,f)=>n+f.size,0)>boardLimits.total)return {error:'添付ファイルは合計50 MBまでです。'};
 if(files.some(f=>!boardFileTypes.test(f.name)))return {error:'PDF・Word・Excel・画像・テキストのファイルを選択してください。'};
 const preview=thumb instanceof File&&thumb.size>0&&thumb.size<=boardLimits.thumb&&/^image\/(webp|png|jpeg)$/.test(thumb.type)?thumb:null;
 return {files,preview};
}
// お知らせを回す（multipart）。post があれば、そのお知らせに新しい版を追加する（前の版も残る）。
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 if(Number(req.headers.get('content-length'))>boardLimits.total+2*1024*1024)return json({error:'添付ファイルは合計50 MBまでです。'},413);
 try{
  const form=await req.formData();const db=database();const b=bucket();
  const checked=attachments(form);if('error' in checked)return json({error:checked.error},400);
  const {files,preview}=checked;
  const writer=await activeStaff(db,text(form.get('author')));
  if(!writer)return json({error:'書いた人（職員）を選び直してください。'},400);
  const now=new Date().toISOString(),saved:string[]=[];
  const target=text(form.get('post'));
  let id:string,version:number;const stmts:D1PreparedStatement[]=[];
  if(target){
   const post=await db.prepare('SELECT version FROM board_posts WHERE id=?').bind(target).first<{version:number}>();
   if(!post)return json({error:'お知らせが見つかりません。'},404);
   const note=text(form.get('note'));
   if(note.length>boardLimits.note)return json({error:'追加のひとことは500文字までです。'},400);
   if(!files.length)return json({error:'追加するファイルを選んでください。'},400);
   id=target;version=post.version+1;
   stmts.push(db.prepare('UPDATE board_posts SET version=?'+(preview?',thumb=?':'')+' WHERE id=?').bind(...(preview?[version,version,id]:[version,id])));
   stmts.push(db.prepare('INSERT INTO board_versions (id,post,version,note,author,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,version,note,writer.name,now));
  }else{
   const title=text(form.get('title')),body=text(form.get('body')),folder=text(form.get('folder')),who=text(form.get('target'));
   const due=day(form.get('due')),expires=day(form.get('expires'));
   if(!title||title.length>boardLimits.title)return json({error:'件名を100文字以内で入力してください。'},400);
   if(body.length>boardLimits.body)return json({error:'本文は5000文字までです。'},400);
   if(who.length>boardLimits.target)return json({error:'対象者は200文字までです。'},400);
   if(!body&&!files.length)return json({error:'本文か添付ファイルのどちらかを入れてください。'},400);
   if((text(form.get('due'))&&!due)||(text(form.get('expires'))&&!expires))return json({error:'日付を確認してください。'},400);
   if(folder&&!await db.prepare('SELECT id FROM board_folders WHERE id=?').bind(folder).first())return json({error:'フォルダーが見つかりません。'},404);
   id=crypto.randomUUID();version=1;
   stmts.push(db.prepare('INSERT INTO board_posts (id,folder,title,body,author,important,archived,created,target,due,expires,pinned,version,thumb) VALUES (?,?,?,?,?,?,0,?,?,?,?,?,1,?)').bind(id,folder||null,title,body,writer.name,form.get('important')==='1'?1:0,now,who,due,expires,form.get('pinned')==='1'?1:0,preview?1:0));
   stmts.push(db.prepare('INSERT INTO board_versions (id,post,version,note,author,created) VALUES (?,?,1,?,?,?)').bind(crypto.randomUUID(),id,'',writer.name,now));
  }
  try{
   for(const f of files){const fid=crypto.randomUUID();await b.put('board/'+fid,f.stream(),{httpMetadata:{contentType:'application/octet-stream'}});saved.push('board/'+fid);stmts.push(db.prepare('INSERT INTO board_files (id,post,name,size,created,version) VALUES (?,?,?,?,?,?)').bind(fid,id,f.name.slice(0,250),f.size,now,version))}
   if(preview){await b.put('board/thumb/'+id,preview.stream(),{httpMetadata:{contentType:preview.type}})}
   // 書いた人は、その版を確認済みとして記録する
   stmts.push(db.prepare('INSERT INTO board_reads (post,staff,read_at,version) VALUES (?,?,?,?) ON CONFLICT(post,staff) DO UPDATE SET read_at=excluded.read_at,version=excluded.version').bind(id,writer.id,now,version));
   await db.batch(stmts);
  }catch(e){await Promise.all(saved.map(k=>b.delete(k)));throw e}
  return json({id,version});
 }catch{console.error('Board post failed');return json({error:'お知らせを保存できませんでした。もう一度お試しください。'},503)}
}
// 小さな操作。お知らせ・コメント・テンプレートの削除は DELETE（管理者のみ）。
export async function PATCH(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 let data:Record<string,unknown>;try{data=await req.json()}catch{return json({error:'入力が正しくありません。'},400)}
 try{
  const db=database();const id=text(data.id);
  const postExists=async()=>!!await db.prepare('SELECT id FROM board_posts WHERE id=?').bind(id).first();
  const updated=(r:D1Result)=>r.meta.changes?json({ok:true}):json({error:'お知らせが見つかりません。'},404);
  switch(data.action){
   case 'read':case 'unread':{
    const staff=await activeStaff(db,text(data.staff));
    if(!staff)return json({error:'職員を選び直してください。'},400);
    const post=await db.prepare('SELECT version FROM board_posts WHERE id=?').bind(id).first<{version:number}>();
    if(!post)return json({error:'お知らせが見つかりません。'},404);
    if(data.action==='read')await db.prepare('INSERT INTO board_reads (post,staff,read_at,version) VALUES (?,?,?,?) ON CONFLICT(post,staff) DO UPDATE SET read_at=excluded.read_at,version=excluded.version').bind(id,staff.id,new Date().toISOString(),post.version).run();
    else await db.prepare('DELETE FROM board_reads WHERE post=? AND staff=?').bind(id,staff.id).run();
    return json({ok:true});
   }
   case 'archive':return updated(await db.prepare('UPDATE board_posts SET archived=? WHERE id=?').bind(data.archived?1:0,id).run());
   case 'pin':return updated(await db.prepare('UPDATE board_posts SET pinned=? WHERE id=?').bind(data.pinned?1:0,id).run());
   case 'move':{
    const folder=text(data.folder);
    if(folder&&!await db.prepare('SELECT id FROM board_folders WHERE id=?').bind(folder).first())return json({error:'フォルダーが見つかりません。'},404);
    return updated(await db.prepare('UPDATE board_posts SET folder=? WHERE id=?').bind(folder||null,id).run());
   }
   case 'meta':{ // 対象者・確認期限・掲載期限の変更
    const who=text(data.target),due=day(data.due),expires=day(data.expires);
    if(who.length>boardLimits.target)return json({error:'対象者は200文字までです。'},400);
    if((text(data.due)&&!due)||(text(data.expires)&&!expires))return json({error:'日付を確認してください。'},400);
    return updated(await db.prepare('UPDATE board_posts SET target=?,due=?,expires=? WHERE id=?').bind(who,due,expires,id).run());
   }
   case 'comment':{
    const staff=await activeStaff(db,text(data.staff)),body=text(data.body);
    if(!staff)return json({error:'職員を選び直してください。'},400);
    if(!body||body.length>boardLimits.comment)return json({error:'コメントを1000文字以内で入力してください。'},400);
    if(!await postExists())return json({error:'お知らせが見つかりません。'},404);
    const cid=crypto.randomUUID();await db.prepare('INSERT INTO board_comments (id,post,staff,name,body,created) VALUES (?,?,?,?,?,?)').bind(cid,id,staff.id,staff.name,body,new Date().toISOString()).run();
    return json({id:cid});
   }
   case 'template':{
    const name=text(data.name),title=text(data.title),body=text(data.body),who=text(data.target),folder=text(data.folder);
    if(!name||name.length>boardLimits.name)return json({error:'テンプレート名を50文字以内で入力してください。'},400);
    if(!title||title.length>boardLimits.title||body.length>boardLimits.body||who.length>boardLimits.target)return json({error:'件名と内容を確認してください。'},400);
    if(await db.prepare('SELECT id FROM board_templates WHERE name=?').bind(name).first())return json({error:'同じ名前のテンプレートがあります。'},409);
    const tid=crypto.randomUUID();await db.prepare('INSERT INTO board_templates (id,name,title,body,target,folder,created) VALUES (?,?,?,?,?,?,?)').bind(tid,name,title,body,who,folder||null,new Date().toISOString()).run();
    return json({id:tid});
   }
   case 'folder':{
    const name=text(data.name),color=text(data.color);
    if(!name||name.length>boardLimits.name)return json({error:'フォルダー名を50文字以内で入力してください。'},400);
    if(!folderColors.some(c=>c.key===color))return json({error:'色を選んでください。'},400);
    if(await db.prepare('SELECT id FROM board_folders WHERE name=? AND id<>?').bind(name,id).first())return json({error:'同じ名前のフォルダーがあります。'},409);
    const binder=data.binder?1:0;
    if(id){const r=await db.prepare('UPDATE board_folders SET name=?,color=?,binder=? WHERE id=?').bind(name,color,binder,id).run();if(!r.meta.changes)return json({error:'フォルダーが見つかりません。'},404);return json({id,name,color,binder})}
    const nid=crypto.randomUUID();await db.prepare('INSERT INTO board_folders (id,name,color,binder,created) VALUES (?,?,?,?,?)').bind(nid,name,color,binder,new Date().toISOString()).run();return json({id:nid,name,color,binder});
   }
   case 'staff':{
    if(id&&typeof data.active==='boolean'){
     if(!data.active&&await db.prepare('SELECT 1 FROM board_staff WHERE id=? AND admin=1 AND (SELECT COUNT(*) FROM board_staff WHERE admin=1 AND active=1)<=1').bind(id).first())return json({error:'最後の管理者は退職・休職にできません。先に別の管理者を決めてください。'},400);
     const r=await db.prepare('UPDATE board_staff SET active=? WHERE id=?').bind(data.active?1:0,id).run();return r.meta.changes?json({ok:true}):json({error:'職員が見つかりません。'},404);
    }
    const name=text(data.name);
    if(!name||name.length>boardLimits.name)return json({error:'職員名を50文字以内で入力してください。'},400);
    if(await db.prepare('SELECT id FROM board_staff WHERE name=? AND id<>?').bind(name,id).first())return json({error:'同じ名前の職員が登録されています。'},409);
    if(id){const r=await db.prepare('UPDATE board_staff SET name=? WHERE id=?').bind(name,id).run();if(!r.meta.changes)return json({error:'職員が見つかりません。'},404);return json({id,name,active:1})}
    const nid=crypto.randomUUID();await db.prepare('INSERT INTO board_staff (id,name,active,admin,created) VALUES (?,?,1,0,?)').bind(nid,name,new Date().toISOString()).run();return json({id:nid,name,active:1,admin:0});
   }
   case 'setPin':{ // 暗証番号がまだ無ければ、決めた人が最初の管理者になる。あれば管理者が変更する。
    const staff=await activeStaff(db,text(data.staff));
    if(!staff)return json({error:'職員を選び直してください。'},400);
    if(!validPin(data.newPin))return json({error:'暗証番号は4〜8桁の数字にしてください。'},400);
    if(await storedPin(db)){if(!await isAdmin(db,staff.id,data.pin))return notAdmin()}
    await db.batch([db.prepare("INSERT INTO board_settings (key,value) VALUES ('adminPin',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(await hashPin(data.newPin)),db.prepare('UPDATE board_staff SET admin=1 WHERE id=?').bind(staff.id)]);
    return json({ok:true});
   }
   case 'admin':{ // 管理者が、ほかの職員を管理者にする／外す
    if(!await isAdmin(db,data.staff,data.pin))return notAdmin();
    const who=text(data.target);
    if(!data.admin&&await db.prepare('SELECT 1 FROM board_staff WHERE id=? AND admin=1 AND (SELECT COUNT(*) FROM board_staff WHERE admin=1 AND active=1)<=1').bind(who).first())return json({error:'管理者が一人もいなくなるため、外せません。'},400);
    const r=await db.prepare('UPDATE board_staff SET admin=? WHERE id=? AND active=1').bind(data.admin?1:0,who).run();
    return r.meta.changes?json({ok:true}):json({error:'職員が見つかりません。'},404);
   }
  }
  return json({error:'操作を確認してください。'},400);
 }catch(e){if(e instanceof PinLocked)return locked();console.error('Board update failed');return json({error:'保存できませんでした。もう一度お試しください。'},503)}
}
// 削除（管理者のみ）：kind=post（添付・確認記録・コメントも一緒に消す）／comment／template
export async function DELETE(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 let data:Record<string,unknown>;try{data=await req.json()}catch{return json({error:'入力が正しくありません。'},400)}
 try{
  const db=database();const id=text(data.id);
  if(!await isAdmin(db,data.staff,data.pin))return notAdmin();
  if(data.kind==='comment'){const r=await db.prepare('DELETE FROM board_comments WHERE id=?').bind(id).run();return r.meta.changes?json({ok:true}):json({error:'コメントが見つかりません。'},404)}
  if(data.kind==='template'){const r=await db.prepare('DELETE FROM board_templates WHERE id=?').bind(id).run();return r.meta.changes?json({ok:true}):json({error:'テンプレートが見つかりません。'},404)}
  if(data.kind!=='post')return json({error:'操作を確認してください。'},400);
  if(!await db.prepare('SELECT id FROM board_posts WHERE id=?').bind(id).first())return json({error:'お知らせが見つかりません。'},404);
  const files=(await db.prepare('SELECT id FROM board_files WHERE post=?').bind(id).all<{id:string}>()).results;
  await db.batch(['board_reads','board_comments','board_versions','board_files'].map(t=>db.prepare(`DELETE FROM ${t} WHERE post=?`).bind(id)).concat(db.prepare('DELETE FROM board_posts WHERE id=?').bind(id)));
  await bucket().delete([...files.map(f=>'board/'+f.id),'board/thumb/'+id]);
  return json({ok:true});
 }catch(e){if(e instanceof PinLocked)return locked();console.error('Board delete failed');return json({error:'削除できませんでした。もう一度お試しください。'},503)}
}
