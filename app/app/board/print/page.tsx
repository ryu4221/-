'use client';
import {useEffect,useState} from 'react';
import {Printer,ChevronLeft} from 'lucide-react';
import {targetsOf,type Board,type PostDetail} from '../../../lib/board';
import {stamp,fullDay,size} from '../../../components/board/parts';
import '../../classroom.css';
// 掲示物を紙・PDFに残すための画面。ブラウザーの印刷で「PDFに保存」を選ぶとPDFになる。
export default function BoardPrint(){
 const [data,setData]=useState<{detail:PostDetail;board:Board}|null>(null),[error,setError]=useState('');
 useEffect(()=>{const id=new URLSearchParams(location.search).get('id')??'';Promise.all([fetch('/api/board?post='+encodeURIComponent(id)),fetch('/api/board')]).then(async([a,b])=>{const detail=await a.json() as PostDetail&{error?:string},board=await b.json() as Board&{error?:string};if(!a.ok||!b.ok)throw Error(id?detail.error||board.error||'読み込めませんでした。':'お知らせが指定されていません。');setData({detail,board});document.title=detail.post.title+'｜回覧板'}).catch(e=>setError((e as Error).message))},[]);
 if(error)return <main className="boardPrint"><p role="alert">{error}</p></main>;
 if(!data)return <main className="boardPrint"><p>読み込み中…</p></main>;
 const {detail,board}=data,p=detail.post,folder=board.folders.find(f=>f.id===p.folder);
 const targets=targetsOf(p.target,board.staff),latest=detail.reads.filter(r=>r.version>=p.version),pending=targets.list.filter(s=>!latest.some(r=>r.staff===s.id));
 const versions=detail.versions.length?detail.versions:[{version:1,note:'',author:p.author,created:p.created}];
 return <main className="boardPrint">
  <div className="boardPrintBar"><button onClick={()=>window.close()}><ChevronLeft size={16}/>閉じる</button><span>印刷画面で送信先を「PDFに保存」にすると、PDFで保存できます。</span><button className="primary" onClick={()=>window.print()}><Printer size={16}/>印刷・PDFで保存</button></div>
  <article className="boardPaper">
   <header><span>回覧板{folder?'　／　'+folder.name:''}</span><span>{p.important?'【重要】':''}{p.version>1?'第'+p.version+'版':''}</span></header>
   <h1>{p.title}</h1>
   <table className="boardPaperFacts"><tbody>
    <tr><th>掲示日</th><td>{stamp(p.created)}（{p.author}）</td><th>対象者</th><td>{p.target||'全員'}</td></tr>
    <tr><th>確認期限</th><td>{p.due?fullDay(p.due):'なし'}</td><th>掲載期限</th><td>{p.expires?fullDay(p.expires)+' まで':'無期限'}</td></tr>
   </tbody></table>
   {p.body&&<div className="boardPaperBody">{p.body}</div>}
   {versions.map(v=>{const files=detail.files.filter(f=>f.version===v.version);if(!files.length&&!v.note)return null;return <section key={v.version} className="boardPaperFiles"><h2>{versions.length>1?'第'+v.version+'版（'+stamp(v.created)+'）':'添付ファイル'}</h2>{v.note&&<p>{v.note}</p>}<ul>{files.map(f=><li key={f.id}>{f.name}（{size(f.size)}）{/\.(png|jpe?g|webp)$/i.test(f.name)&&v.version===p.version&&<img src={'/api/board/files/'+f.id} alt={f.name}/>}</li>)}</ul></section>})}
   <section className="boardPaperChecks"><h2>確認欄（最新の版）</h2><table><thead><tr><th>氏名</th><th>確認</th><th>日時</th></tr></thead><tbody>{latest.map(r=><tr key={r.staff}><td>{r.name}</td><td>✓</td><td>{stamp(r.readAt)}</td></tr>)}{pending.map(s=><tr key={s.id}><td>{s.name}</td><td></td><td></td></tr>)}</tbody></table></section>
   {detail.comments.length>0&&<section className="boardPaperFiles"><h2>コメント</h2><ul>{detail.comments.map(c=><li key={c.id}><b>{c.name}</b>（{stamp(c.created)}）：{c.body}</li>)}</ul></section>}
   <footer>印刷日時：{stamp(new Date().toISOString())}　支援の教室・回覧板</footer>
  </article>
 </main>;
}
