'use client';
import {useState,type FormEvent} from 'react';
import {Check,Undo2,Paperclip,ExternalLink,Download,Printer,Pin,FilePlus2,Trash2,MessageSquare,Send,Settings2,Users,CalendarClock} from 'lucide-react';
import {targetsOf,boardLimits,isLive,type Board,type PostDetail} from '../../lib/board';
import {PostTags,DueTag,tagStyle,stamp,day,fullDay,size} from './parts';
export type PostActions={read:(read:boolean)=>void;comment:(body:string)=>Promise<boolean>;deleteComment:(id:string)=>void;pin:(v:boolean)=>void;archive:(v:boolean)=>void;move:(folder:string)=>void;meta:(m:{target:string;due:string;expires:string})=>void;addVersion:()=>void;remove:()=>void;back:()=>void};
export function PostView({detail,board,me,busy,isAdmin,on}:{detail:PostDetail;board:Board;me:string;busy:boolean;isAdmin:boolean;on:PostActions}){
 const p=detail.post,f=board.folders.find(x=>x.id===p.folder);
 const [comment,setComment]=useState(''),[editing,setEditing]=useState(false),[meta,setMeta]=useState({target:p.target,due:p.due??'',expires:p.expires??''});
 const targets=targetsOf(p.target,board.staff);
 const latest=detail.reads.filter(r=>r.version>=p.version),older=detail.reads.filter(r=>r.version<p.version);
 const pending=targets.list.filter(s=>!latest.some(r=>r.staff===s.id));
 const mine=detail.reads.find(r=>r.staff===me),seen=!!mine&&mine.version>=p.version,amTarget=targets.list.some(s=>s.id===me);
 const versions=detail.versions.length?detail.versions:[{version:1,note:'',author:p.author,created:p.created}];
 const filesOf=(v:number)=>detail.files.filter(x=>x.version===v);
 const fileList=(v:number)=>{const files=filesOf(v);return files.length?<ul className="boardFiles">{files.map(x=>{const view=/\.(pdf|png|jpe?g|webp)$/i.test(x.name);return <li key={x.id}><Paperclip size={16}/><span>{x.name}<small>{size(x.size)}</small></span>{view&&<a href={'/api/board/files/'+x.id} target="_blank" rel="noopener"><ExternalLink size={15}/>開く</a>}<a href={'/api/board/files/'+x.id+'?download=1'}><Download size={15}/>保存</a></li>})}</ul>:null};
 async function sendComment(e:FormEvent){e.preventDefault();if(comment.trim()&&await on.comment(comment.trim()))setComment('')}
 return <><article className="boardPost" style={tagStyle(f?.color??'gray')}>
  <PostTags post={p} folder={f}/><h3>{p.title}</h3>
  <p className="boardMeta"><span>{stamp(p.created)}</span><span>{p.author} さんが回しました</span></p>
  <dl className="boardFacts"><div><dt><Users size={14}/>対象者</dt><dd>{p.target?p.target:'全員'}{p.target&&targets.everyone&&<small>（名簿の名前が無いため全員に表示）</small>}</dd></div><div><dt><Check size={14}/>確認期限</dt><dd>{p.due?<>{fullDay(p.due)} <DueTag due={isLive(p)?p.due:null}/></>:'なし'}</dd></div><div><dt><CalendarClock size={14}/>掲載期限</dt><dd>{p.expires?fullDay(p.expires)+' まで':'無期限'}</dd></div></dl>
  {p.body&&<p className="boardBody">{p.body}</p>}
  {versions.map((v,i)=>{const files=fileList(v.version);if(i===0)return <section key={v.version} className="boardVersionBlock latest">{versions.length>1&&<h4>最新：第{v.version}版 <small>{stamp(v.created)} {v.author} さんが追加</small></h4>}{v.note&&<p className="boardNote">{v.note}</p>}{files}</section>;return null})}
  {versions.length>1&&<details className="boardHistory"><summary>これまでの版を見る（{versions.length-1}件）</summary>{versions.slice(1).map(v=><section key={v.version} className="boardVersionBlock"><h4>第{v.version}版 <small>{stamp(v.created)} {v.author} さん</small></h4>{v.note&&<p className="boardNote">{v.note}</p>}{fileList(v.version)??<p className="boardNote">添付なし</p>}</section>)}</details>}
  <div className="boardCheck">{seen?<><p><Check size={18}/>{mine&&stamp(mine.readAt)} に{p.version>1?'第'+p.version+'版を':''}確認しました</p><button className="talkSecondary" disabled={busy} onClick={()=>on.read(false)}><Undo2 size={15}/>確認を取り消す</button></>:<>{mine&&<p className="boardOlder">第{mine.version}版は確認済みです。新しい版を見たら押してください。</p>}<button className="boardSeen" disabled={busy||!me} onClick={()=>on.read(true)}><Check size={22}/>見ました</button>{!amTarget&&<p className="boardOlder">このお知らせの対象者ではありませんが、確認を記録できます。</p>}</>}</div>
  <div className="boardReads"><div><h4>見た人 <span>{latest.length}</span></h4><ul>{latest.map(r=><li key={r.staff}>{r.name}<small>{stamp(r.readAt)}</small></li>)}</ul></div><div><h4>まだの人 <span>{pending.length}</span></h4>{pending.length?<ul>{pending.map(s=><li key={s.id} className={older.some(r=>r.staff===s.id)?'older':'pending'}>{s.name}{older.some(r=>r.staff===s.id)&&<small>前の版は確認</small>}</li>)}</ul>:<p>対象者全員が確認しました。</p>}</div></div>
  <section className="boardComments"><h4><MessageSquare size={15}/>コメント <span>{detail.comments.length}</span></h4>{detail.comments.length>0&&<ul>{detail.comments.map(c=><li key={c.id}><div><b>{c.name}</b><small>{stamp(c.created)}</small>{isAdmin&&<button aria-label={c.name+'さんのコメントを削除'} disabled={busy} onClick={()=>on.deleteComment(c.id)}><Trash2 size={14}/></button>}</div><p>{c.body}</p></li>)}</ul>}
   <form onSubmit={sendComment}><textarea rows={2} maxLength={boardLimits.comment} placeholder="例：了解しました／この日はお休みを希望します" value={comment} onChange={e=>setComment(e.target.value)} aria-label="コメント"/><button className="talkPrimary" disabled={busy||!comment.trim()}><Send size={15}/>コメントする</button></form></section>
 </article>
 <div className="boardPostActions"><button className="talkSecondary" disabled={busy} onClick={on.back}>一覧に戻る</button><button className="talkSecondary" disabled={busy} onClick={on.addVersion}><FilePlus2 size={15}/>新しい版を追加</button><a className="talkSecondary" href={'/board/print?id='+p.id} target="_blank" rel="noopener"><Printer size={15}/>印刷・PDFで保存</a><button className="talkSecondary" disabled={busy} onClick={()=>on.pin(!p.pinned)}><Pin size={15}/>{p.pinned?'ピン留めを外す':'ピン留めする'}</button></div>
 <details className="boardMore" open={editing} onToggle={e=>setEditing((e.target as HTMLDetailsElement).open)}><summary><Settings2 size={15}/>そのほかの操作（対象者・期限・フォルダー・掲載・削除）</summary>
  <form className="talkInput boardMetaForm" onSubmit={e=>{e.preventDefault();on.meta(meta)}}><label>対象者（空欄なら全員）<input maxLength={boardLimits.target} value={meta.target} onChange={e=>setMeta({...meta,target:e.target.value})} placeholder="例：山田さん、佐藤さん"/></label><label>確認期限<input type="date" value={meta.due} onChange={e=>setMeta({...meta,due:e.target.value})}/></label><label>掲載期限（空欄なら無期限）<input type="date" value={meta.expires} onChange={e=>setMeta({...meta,expires:e.target.value})}/></label><button className="talkPrimary" disabled={busy}>この内容に変える</button></form>
  <div className="boardMoreRow"><label className="boardMove">フォルダーを移す<select disabled={busy} value={p.folder??''} onChange={e=>on.move(e.target.value)}><option value="">フォルダーなし</option>{board.folders.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><button className="talkSecondary" disabled={busy} onClick={()=>on.archive(!p.archived)}>{p.archived?'回覧板に戻す':'掲載を終える'}</button><button className="talkSecondary boardDanger" disabled={busy} onClick={on.remove}><Trash2 size={15}/>削除する（管理者）</button></div>
  {p.expires&&!isLive(p)&&!p.archived&&<p className="boardOlder">掲載期限（{day(p.expires)}）を過ぎたため、一覧では「掲載終了」に入っています。期限を変えると戻ります。</p>}
 </details></>;
}
