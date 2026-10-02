'use client';
import type {CSSProperties} from 'react';
import {Star,Pin,Clock,Layers} from 'lucide-react';
import {colorOf,dueState,isLive,type Folder,type PostSummary} from '../../lib/board';
export const day=(iso:string)=>new Date(iso.length===10?iso+'T00:00:00+09:00':iso).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',weekday:'short'});
export const fullDay=(iso:string)=>new Date(iso+'T00:00:00+09:00').toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'numeric',day:'numeric',weekday:'short'});
export const stamp=(iso:string)=>new Date(iso).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
export const monthOf=(iso:string)=>new Date(iso).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long'});
export const size=(n:number)=>n<1024*1024?Math.max(1,Math.round(n/1024))+' KB':(n/1024/1024).toFixed(1)+' MB';
export const tagStyle=(color:string)=>{const c=colorOf(color);return {'--tag-bg':c.bg,'--tag-ink':c.ink} as CSSProperties};
export function FolderTag({folder}:{folder?:Folder}){return folder?<span className="boardTag">{folder.binder?<Layers size={12}/>:null}{folder.name}</span>:<span className="boardTag plain">フォルダーなし</span>}
export function DueTag({due}:{due:string|null}){const s=dueState(due);if(!s||!due)return null;return <span className={'boardDue '+s}><Clock size={12}/>{s==='overdue'?'確認期限切れ':s==='soon'?'期限まもなく':'確認期限'} {day(due)}</span>}
// 一覧と詳細で共通の印（ピン・重要・版・期限・掲載終了）
export function PostTags({post,folder,unseen}:{post:PostSummary;folder?:Folder;unseen?:boolean}){
 return <span className="boardItemHead"><FolderTag folder={folder}/>{!!post.pinned&&<span className="boardPin"><Pin size={12}/>ピン留め</span>}{!!post.important&&<span className="boardImportant"><Star size={12}/>重要</span>}{post.version>1&&<span className="boardVersion">第{post.version}版</span>}{isLive(post)&&<DueTag due={post.due}/>}{!isLive(post)&&<span className="boardTag plain">{post.archived?'掲載終了':'掲載期限切れ'}</span>}{unseen&&<span className="boardNew">{post.myVersion?'新しい版':'未確認'}</span>}</span>;
}
export function Thumb({post}:{post:PostSummary}){return post.thumb?<img className="boardThumb" src={'/api/board/thumb/'+post.id+'?v='+post.thumb} alt="" loading="lazy"/>:null}
