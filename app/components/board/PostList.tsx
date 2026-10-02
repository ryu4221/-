'use client';
import {Search,Paperclip,Check,MessageSquare,Users,Layers,ChevronRight} from 'lucide-react';
import {isLive,needsMyCheck,checkedCount,dueState,type Board,type PostSummary} from '../../lib/board';
import {PostTags,Thumb,tagStyle,monthOf,day} from './parts';
export type ListFilter={folder:string;unread:boolean;important:boolean;due:boolean;archived:boolean;query:string};
// 並び順：ピン留め → 新しい順
const order=(a:PostSummary,b:PostSummary)=>b.pinned-a.pinned||b.created.localeCompare(a.created);
export function PostList({board,me,filter,setFilter,busy,onOpen}:{board:Board;me:string;filter:ListFilter;setFilter:(f:ListFilter)=>void;busy:boolean;onOpen:(p:PostSummary)=>void}){
 const set=(patch:Partial<ListFilter>)=>setFilter({...filter,...patch});
 const words=filter.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const folderOf=(id:string|null)=>board.folders.find(f=>f.id===id);
 const live=(p:PostSummary)=>isLive(p);
 const mine=(p:PostSummary)=>needsMyCheck(p,me,board.staff);
 const count=(id:string)=>board.posts.filter(p=>live(p)&&(id==='none'?!p.folder:p.folder===id)).length;
 const unreadIn=(id:string)=>board.posts.filter(p=>p.folder===id&&mine(p)).length;
 const matches=board.posts.filter(p=>live(p)!==filter.archived&&(filter.folder==='all'||(filter.folder==='none'?!p.folder:p.folder===filter.folder))&&(!filter.unread||mine(p))&&(!filter.important||p.important)&&(!filter.due||(live(p)&&!!dueState(p.due)&&dueState(p.due)!=='ok'))&&words.every(w=>(p.title+' '+p.body+' '+p.author+' '+p.target+' '+(p.fileNames??'')).toLowerCase().includes(w))).sort(order);
 // 「すべて」で検索も絞り込みもしていないときは、綴りフォルダー（シフト集など）の掲示物を1枚にまとめる
 const collapse=filter.folder==='all'&&!words.length&&!filter.unread&&!filter.important&&!filter.due&&!filter.archived;
 const binders=collapse?board.folders.filter(f=>f.binder&&count(f.id)>0):[];
 const shown=collapse?matches.filter(p=>!(p.folder&&folderOf(p.folder)?.binder)||p.pinned):matches;
 const binderView=!!folderOf(filter.folder)?.binder&&!words.length;
 const item=(p:PostSummary)=>{const f=folderOf(p.folder),c=checkedCount(p,board.staff),unseen=mine(p);return <button key={p.id} className={'boardItem'+(unseen?' unseen':'')+(p.pinned?' pinned':'')} style={tagStyle(f?.color??'gray')} disabled={busy} onClick={()=>onOpen(p)}><Thumb post={p}/><span className="boardItemText"><PostTags post={p} folder={f} unseen={unseen}/><b>{p.title}</b><span className="boardMeta"><span>{day(p.created)}</span><span>{p.author}</span>{p.files>0&&<span><Paperclip size={13}/>{p.files}</span>}{p.comments>0&&<span><MessageSquare size={13}/>{p.comments}</span>}<span className={c.done>=c.total?'done':''}><Check size={13}/>確認 {c.done}/{c.total}人</span>{p.target&&<span><Users size={13}/>{p.target}</span>}</span></span></button>};
 return <><label className="talkSearch"><Search size={17}/><input aria-label="件名・本文・ファイル名で検索" value={filter.query} onChange={e=>set({query:e.target.value})} placeholder="件名・本文・ファイル名・書いた人・対象者で検索"/></label>
  <div className="talkFilters boardFolders" role="group" aria-label="フォルダー"><button className={filter.folder==='all'?'selected':''} aria-pressed={filter.folder==='all'} onClick={()=>set({folder:'all'})}>すべて</button>{board.folders.map(f=><button key={f.id} className={'boardTag'+(filter.folder===f.id?' selected':'')} aria-pressed={filter.folder===f.id} style={tagStyle(f.color)} onClick={()=>set({folder:f.id})}>{f.binder?<Layers size={13}/>:null}{f.name}<small>{count(f.id)}</small></button>)}{board.posts.some(p=>!p.folder)&&<button className={filter.folder==='none'?'selected':''} aria-pressed={filter.folder==='none'} onClick={()=>set({folder:'none'})}>フォルダーなし<small>{count('none')}</small></button>}</div>
  <div className="boardToggles"><label><input type="checkbox" checked={filter.unread} onChange={e=>set({unread:e.target.checked})}/>未確認だけ</label><label><input type="checkbox" checked={filter.important} onChange={e=>set({important:e.target.checked})}/>重要だけ</label><label><input type="checkbox" checked={filter.due} onChange={e=>set({due:e.target.checked})}/>確認期限が近い・過ぎた</label><label><input type="checkbox" checked={filter.archived} onChange={e=>set({archived:e.target.checked})}/>掲載終了を見る</label></div>
  <div className="boardList">
   {binders.map(f=>{const items=board.posts.filter(p=>live(p)&&p.folder===f.id).sort(order),latest=items[0],n=unreadIn(f.id);return <button key={f.id} className={'boardBinder'+(n?' unseen':'')} style={tagStyle(f.color)} disabled={busy} onClick={()=>set({folder:f.id})}>{latest&&<Thumb post={latest}/>}<span className="boardItemText"><span className="boardItemHead"><span className="boardTag"><Layers size={12}/>{f.name}</span><span className="boardBinderCount">{items.length}件をまとめています</span>{n>0&&<span className="boardNew">未確認 {n}</span>}</span><b>{latest?.title}</b><span className="boardMeta"><span>最新：{latest&&day(latest.created)}</span><span>開いて過去の分も見る</span></span></span><ChevronRight className="boardBinderArrow" size={20}/></button>})}
   {shown.map((p,i)=>{if(!binderView||p.pinned)return item(p);const m=monthOf(p.created),prev=shown[i-1],head=!prev||prev.pinned||monthOf(prev.created)!==m;return [head&&<h4 key={'m'+m} className="boardMonth">{m}</h4>,item(p)]})}
  </div>
  {!shown.length&&!binders.length&&<p className="talkEmpty">{board.posts.length?'条件に合うお知らせはありません。':'まだお知らせはありません。'}</p>}</>;
}
