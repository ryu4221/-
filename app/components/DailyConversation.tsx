'use client';
import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {X,ChevronLeft,MessageCircle,Search,Sparkles,Copy,Save,SpellCheck,Check,Plus,Trash2,ShieldCheck,Settings2,BookOpen,History,Eye,RotateCcw} from 'lucide-react';
import {traitSuggestions,quickMemos,dailyLimits,type DailyInfo,type DailyRecord,type Draft,type Example,type AiStatus} from '../lib/daily';
import {proofread,applyFixes,type Issue} from '../lib/proofread';
import {todayJST} from '../lib/board';
import {boardStaffKey} from './BoardConversation';
type Step='menu'|'people'|'compose'|'draft'|'history'|'examples'|'settings';
type Line={speaker:'student'|'you';text:string};
type Person={id:string;name:string;city:string};
type ApiError=Error&{status?:number};
const shortDate=(d:string)=>new Date(d+'T00:00:00+09:00').toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',weekday:'short'});
// 文章チェック（規則）を下書きの欄の下に出す
function InlineCheck({value,onChange}:{value:string;onChange:(v:string)=>void}){
 const [open,setOpen]=useState(false);const issues=proofread(value).filter(i=>i.level!=='style');
 if(!value.trim())return null;
 return <div className="dailyCheck"><button type="button" className="talkSecondary" onClick={()=>setOpen(!open)}><SpellCheck size={15}/>{issues.length?'見直す所 '+issues.length+'か所':'誤字・脱字なし'}</button>{open&&issues.length>0&&<ul>{issues.map((i:Issue,n)=><li key={n}><span><s>{i.text}</s>{i.fix!==undefined&&<> → <b>{i.fix||'（削除）'}</b></>}<small>{i.message}</small></span>{i.fix!==undefined&&<button type="button" onClick={()=>onChange(applyFixes(value,[i]))}><Check size={14}/>直す</button>}</li>)}</ul>}</div>;
}
export default function DailyConversation({origin,onClose}:{origin:{x:number;y:number};onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),feed=useRef<HTMLDivElement>(null),returnFocus=useRef<Element|null>(null);
 const [step,setStep]=useState<Step>('menu'),[lines,setLines]=useState<Line[]>([{speaker:'student',text:'こんにちは。日々の記録の係です。今日の様子のメモから、「日々の記録」と「職員考察」の下書きを一緒に作ります。'}]);
 const [people,setPeople]=useState<Person[]>([]),[query,setQuery]=useState(''),[person,setPerson]=useState<Person|null>(null),[info,setInfo]=useState<DailyInfo|null>(null);
 const [traits,setTraits]=useState(''),[traitInput,setTraitInput]=useState(''),[docIds,setDocIds]=useState<string[]>([]),[date,setDate]=useState(todayJST()),[memo,setMemo]=useState('');
 const [draft,setDraft]=useState<Draft|null>(null),[recordId,setRecordId]=useState(''),[showSent,setShowSent]=useState(false),[preview,setPreview]=useState('');
 const [examples,setExamples]=useState<Example[]>([]),[exampleKind,setExampleKind]=useState<'record'|'consideration'>('record'),[exampleBody,setExampleBody]=useState('');
 const [ai,setAi]=useState<AiStatus|null>(null),[aiForm,setAiForm]=useState({service:'cloudflare',target:'',model:'',key:''}),[pin,setPin]=useState(''),[staff,setStaff]=useState<{id:string;name:string;admin:number}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState('');
 useEffect(()=>{returnFocus.current=document.activeElement;dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;(returnFocus.current as HTMLElement)?.focus?.()}},[]);
 useEffect(()=>{if(step==='draft'){feed.current?.querySelector('.dailyDraft')?.scrollIntoView({block:'start'});return}feed.current?.scrollTo({top:feed.current.scrollHeight,behavior:'instant'})},[lines,step,error]);
 // 記録を書いた人として、回覧板で選んだ職員名を使う
 useEffect(()=>{let id='';try{id=localStorage.getItem(boardStaffKey)||''}catch{}if(!id)return;fetch('/api/board').then(r=>r.ok?r.json() as Promise<{staff:{id:string;name:string;admin:number;active:number}[]}>:null).then(d=>{const s=d?.staff.find(x=>x.id===id&&x.active);if(s)setStaff(s)}).catch(()=>{})},[]);
 // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 呼び出し側で型を付ける
 async function api(url:string,init?:RequestInit):Promise<any>{const r=await fetch(url,init);const data=await r.json() as {error?:string};if(!r.ok){const e:ApiError=Error(data.error||'処理できませんでした。もう一度お試しください。');e.status=r.status;throw e}return data}
 const send=(method:string,body:object,url='/api/daily')=>api(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 function say(user:string,reply:string,next:Step){setError('');setLines(prev=>[...prev,{speaker:'you',text:user},{speaker:'student',text:reply}]);setStep(next)}
 function reply(t:string){setLines(prev=>[...prev,{speaker:'student',text:t}])}
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const traitList=traits.split('\n').map(s=>s.trim()).filter(Boolean);
 function choosePeople(){setQuery('');void run(async()=>{setPeople(await api('/api/records'));say('日々の記録を作りたい','どの利用者様の記録を作りますか？','people')})}
 function openPerson(p:Person,label=p.name+' 様'){void run(async()=>{const d:DailyInfo=await api('/api/daily?person='+p.id);setPerson(p);setInfo(d);setAi(d.ai);setTraits(d.traits);
  // 各種類の最新の読める資料を、はじめから選んでおく
  const latest:string[]=[];for(const k of ['アセスメント','本案','モニタリング']){const doc=d.docs.find(x=>x.readable&&(x.category===k||(k==='本案'&&x.category==='個別支援計画')));if(doc)latest.push(doc.id)}
  setDocIds(latest);setMemo('');setDate(todayJST());setDraft(null);setRecordId('');setPreview('');
  say(label,p.name+' 様ですね。今日の様子をメモしてください。特徴と資料を参考に、下書きを作ります。'+(d.ai.configured?'':'（AIがまだ設定されていないので、いまは見本の文章になります）'),'compose')})}
 function saveTraits(next:string){if(!person)return;setTraits(next);void run(async()=>{await send('PATCH',{action:'traits',person:person.id,traits:next})})}
 function addTrait(t:string){const v=t.trim();if(!v||traitList.includes(v))return;saveTraits([...traitList,v].join('\n'));setTraitInput('')}
 function generate(previewOnly=false){if(!person)return;if(!memo.trim()){setError('今日の様子のメモを入れてください。メモに無いことは記録に書きません。');return}
  void run(async()=>{const body={person:person.id,date,memo,traits,docIds,preview:previewOnly};
   if(previewOnly){const {sent}=await api('/api/daily/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setPreview(sent);reply('AIに送る内容を下に表示しました。名前・住所・電話番号などは伏せてあります。');return}
   const d:Draft=await api('/api/daily/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});setDraft(d);setRecordId('');setShowSent(false);
   say(draft?'もう一度作ってほしい':'下書きを作ってほしい',d.sample?'AIがまだ設定されていないので、メモを並べた見本の文章です。管理者が「AIの設定」をすると、AIが文章を作ります。':'下書きを作りました。事実と違う所がないか確認して、必要なら直してください。','draft')})}
 async function copy(label:string,value:string){try{await navigator.clipboard.writeText(value);setCopied(label);reply(label+'をコピーしました。ノウビーなどの記録欄に貼り付けてください。')}catch{setError('コピーできませんでした。文章を選んでコピーしてください。')}}
 function save(){if(!person||!draft)return;void run(async()=>{const {id}=await send('PUT',{id:recordId||undefined,person:person.id,date,memo,record:draft.record,consideration:draft.consideration,author:staff?.name??''});setRecordId(id);const d:DailyInfo=await api('/api/daily?person='+person.id);setInfo(d);reply(shortDate(date)+'の記録を保存しました。「これまでの記録」からいつでも見られます。')})}
 function openRecord(r:DailyRecord){setDate(r.date);setMemo(r.memo);setDraft({record:r.record,consideration:r.consideration,sample:false,sent:''});setRecordId(r.id);say(shortDate(r.date)+'の記録','保存した記録です。直して保存し直すこともできます。','draft')}
 function deleteRecord(){if(!staff){setError('削除は管理者だけができます。回覧板で自分の名前を選んでください。');return}if(!pin){setError('下の欄に管理者の暗証番号を入れてから、もう一度押してください。');return}void run(async()=>{await send('DELETE',{id:recordId,staff:staff.id,pin});const d:DailyInfo=await api('/api/daily?person='+person!.id);setInfo(d);setDraft(null);setRecordId('');say('この記録を削除する','記録を削除しました。','history')})}
 function openExamples(){void run(async()=>{const d=await api('/api/daily');setExamples(d.examples);setAi(d.ai);say('文例を登録したい','ノウビーの「日々の記録」や「職員考察」の文章を何件か貼り付けてください。AIはその書き方をまねします。名前は消してから貼ってください（自動でも伏せます）。','examples')})}
 function addExample(e:FormEvent){e.preventDefault();void run(async()=>{const ex:Example=await send('PATCH',{action:'example',kind:exampleKind,body:exampleBody});setExamples(prev=>[...prev,ex]);setExampleBody('');reply((ex.kind==='record'?'日々の記録':'職員考察')+'の文例を登録しました。')})}
 function deleteExample(ex:Example){if(!staff||!pin){setError('削除は管理者だけができます。下の欄に管理者の暗証番号を入れてから押してください。');return}void run(async()=>{await send('PATCH',{action:'deleteExample',id:ex.id,staff:staff.id,pin});setExamples(prev=>prev.filter(x=>x.id!==ex.id));reply('文例を削除しました。')})}
 function openSettings(){void run(async()=>{const d=await api('/api/daily');setAi(d.ai);say('AIの設定をしたい',d.ai.configured?'いまはAIにつながる設定になっています（'+d.ai.model+'）。変える場合は管理者の暗証番号が必要です。':'AIの接続先を登録します。管理者の暗証番号が必要です。','settings')})}
 function saveAi(e:FormEvent){e.preventDefault();if(!staff){setError('回覧板で自分の名前を選び、管理者になってから設定してください。');return}void run(async()=>{const d=await send('PATCH',{action:'aiConfig',staff:staff.id,pin,...aiForm});setAi(d.ai);setAiForm({...aiForm,key:''});reply('AIの設定を保存しました。記録を作ると、AIが下書きを書きます。')})}
 function clearAi(){if(!staff){setError('回覧板で自分の名前を選び、管理者になってから操作してください。');return}void run(async()=>{const d=await send('PATCH',{action:'aiClear',staff:staff.id,pin});setAi(d.ai);reply('AIの設定を消しました。いまは見本の文章になります。')})}
 const actorStyle={'--start-x':(origin.x-window.innerWidth/2)+'px','--start-y':(origin.y-Math.max(90,Math.min(window.innerHeight*.2,180)))+'px'} as CSSProperties;
 const pinField=<label className="dailyPin">管理者の暗証番号（削除・設定のときだけ）<input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} onChange={e=>setPin(e.target.value)}/>{!staff&&<small>回覧板で自分の名前を選ぶと使えます。</small>}</label>;
 return <dialog ref={dialog} className="talkDialog" aria-labelledby="dailyTitle" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><div className="encounterActor" style={actorStyle} aria-hidden="true"><span>日々の記録</span><img src="/classroom/student-daily.png" alt=""/></div><section className="talkPanel boardPanel"><div className="talkHeader"><div><MessageCircle size={18}/><h2 id="dailyTitle">日々の記録の係</h2><span>{person?person.name+' 様の記録':'お話し中'}</span></div><button aria-label="会話を閉じて教室に戻る" disabled={busy} onClick={onClose}><X size={23}/></button></div><div className="talkScroll" ref={feed}><div className="conversationLog" role="log" aria-label="会話" aria-live="polite">{lines.map((l,i)=><div key={i} className={'talkLine '+(l.speaker==='student'?'speaker-student':'you')}><small>{l.speaker==='student'?'日々の記録の係':'あなた'}</small><p>{l.text}</p></div>)}</div><div className="conversationActions" aria-busy={busy}>
 {step==='menu'&&<div className="talkChoices"><button disabled={busy} onClick={choosePeople}><Sparkles size={17}/>　日々の記録・職員考察を作る</button><button disabled={busy} onClick={openExamples}><BookOpen size={17}/>　文例（ノウビーの書き方）を登録する</button><button className="boardWho" disabled={busy} onClick={openSettings}><Settings2 size={15}/>　AIの設定（管理者）</button></div>}
 {step==='people'&&<><label className="talkSearch"><Search size={17}/><input autoFocus aria-label="氏名・市区町村で検索" value={query} onChange={e=>setQuery(e.target.value)} placeholder="氏名・市区町村で検索"/></label><div className="talkPeople">{people.filter(p=>(p.name+' '+p.city).includes(query)).map(p=><button key={p.id} disabled={busy} onClick={()=>openPerson(p)}><b>{p.name} 様</b><span>{p.city}</span></button>)}</div>{!people.length&&<p className="talkEmpty">まだ利用者様が登録されていません。</p>}</>}
 {step==='compose'&&person&&info&&<div className="dailyCompose">
  <section className="dailyBox"><h3>その人の特徴</h3><p className="boardHelp">朝が弱い・体力がないなど。考察を書くときの参考にします。変えるとすぐ保存されます。</p>
   <div className="dailyTraits">{traitList.map(t=><span key={t}>{t}<button aria-label={t+'を外す'} disabled={busy} onClick={()=>saveTraits(traitList.filter(x=>x!==t).join('\n'))}><X size={13}/></button></span>)}{!traitList.length&&<small>まだ登録されていません。</small>}</div>
   <div className="boardNameChips">{traitSuggestions.filter(t=>!traitList.includes(t)).map(t=><button key={t} type="button" disabled={busy} onClick={()=>addTrait(t)}>＋{t}</button>)}</div>
   <form className="dailyInline" onSubmit={e=>{e.preventDefault();addTrait(traitInput)}}><input aria-label="特徴を書いて追加" maxLength={100} placeholder="例：最近運動していない" value={traitInput} onChange={e=>setTraitInput(e.target.value)}/><button className="talkSecondary" disabled={busy||!traitInput.trim()}><Plus size={15}/>追加</button></form></section>
  <section className="dailyBox"><h3>参考にする資料</h3>{info.docs.length?<ul className="dailyDocs">{info.docs.map(d=><li key={d.id}><label className={d.readable?'':'disabled'}><input type="checkbox" disabled={!d.readable} checked={docIds.includes(d.id)} onChange={e=>setDocIds(e.target.checked?[...docIds,d.id]:docIds.filter(x=>x!==d.id))}/><span className="boardTag plain">{d.category}</span>{d.name}<small>{new Date(d.created).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'})}{d.readable?'':' ／ 読み取れない形式（テキストのみ使えます）'}</small></label></li>)}</ul>:<p className="talkEmpty">アセスメント・本案・モニタリングの書類がまだありません。メモと特徴だけで作ります。</p>}</section>
  <section className="dailyBox"><h3>今日の様子</h3><label className="dailyDate">日付<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <div className="boardNameChips">{quickMemos.map(q=><button key={q} type="button" onClick={()=>setMemo(memo.trim()?memo.trim()+'\n'+q:q)}>＋{q}</button>)}</div>
   <textarea className="proofText" rows={5} maxLength={dailyLimits.memo} placeholder={'箇条書きでかまいません。時刻があると段落に分けて書きます。例：\n9:40 開始の電話 寝不足気味 チラシ折り予定\n11:50 終了の電話 4set 途中で1回休憩\n「休みながらできた」'} value={memo} onChange={e=>setMemo(e.target.value)}/></section>
  <p className="proofNote"><ShieldCheck size={15}/>{ai?.configured?'「下書きを作る」を押すと、メモ・特徴・選んだ資料がAIに送られます。名前・住所・電話番号などは自動で伏せます。':'AIが未設定のため、いまは外部に何も送りません（見本の文章になります）。'}</p>
  <button className="talkPrimary" disabled={busy} onClick={()=>generate()}><Sparkles size={17}/>{busy?'作っています…':'下書きを作る'}</button>
  <div className="dailyRow"><button className="talkSecondary" disabled={busy} onClick={()=>generate(true)}><Eye size={15}/>AIに送る内容を確認</button>{info.records.length>0&&<button className="talkSecondary" disabled={busy} onClick={()=>say('これまでの記録を見たい','これまでに保存した記録です。','history')}><History size={15}/>これまでの記録（{info.records.length}件）</button>}</div>
  {preview&&<pre className="dailySent">{preview}</pre>}
 </div>}
 {step==='draft'&&draft&&<div className="dailyDraft">
  {draft.sample&&<p className="talkError">AIが未設定のため、これはメモを並べただけの見本です。管理者が「AIの設定」をすると、AIが文章を作ります。</p>}
  <label>日々の記録（{shortDate(date)}）<textarea className="proofText" rows={7} maxLength={dailyLimits.record} value={draft.record} onChange={e=>setDraft({...draft,record:e.target.value})}/></label>
  <InlineCheck value={draft.record} onChange={v=>setDraft({...draft,record:v})}/>
  <label>職員考察<textarea className="proofText" rows={6} maxLength={dailyLimits.record} value={draft.consideration} onChange={e=>setDraft({...draft,consideration:e.target.value})}/></label>
  <InlineCheck value={draft.consideration} onChange={v=>setDraft({...draft,consideration:v})}/>
  <p className="proofNote"><ShieldCheck size={15}/>AIの下書きです。メモに無いことが書かれていないか、必ず確認してから使ってください。</p>
  <div className="dailyRow"><button className="talkSecondary" onClick={()=>copy('日々の記録',draft.record)}><Copy size={15}/>{copied==='日々の記録'?'コピーしました':'記録をコピー'}</button><button className="talkSecondary" onClick={()=>copy('職員考察',draft.consideration)}><Copy size={15}/>{copied==='職員考察'?'コピーしました':'考察をコピー'}</button><button className="talkPrimary" disabled={busy} onClick={save}><Save size={16}/>{recordId?'保存し直す':'この内容で保存'}</button></div>
  <div className="dailyRow"><button className="talkSecondary" disabled={busy} onClick={()=>setStep('compose')}><ChevronLeft size={15}/>メモ・特徴に戻る</button>{!recordId&&<button className="talkSecondary" disabled={busy} onClick={()=>generate()}><RotateCcw size={15}/>もう一度作る</button>}{draft.sent&&<button className="talkSecondary" onClick={()=>setShowSent(!showSent)}><Eye size={15}/>AIに送った内容</button>}</div>
  {showSent&&<pre className="dailySent">{draft.sent}</pre>}
  {recordId&&<details className="boardMore"><summary><Trash2 size={15}/>この記録を削除する（管理者）</summary>{pinField}<button className="talkSecondary boardDanger" disabled={busy} onClick={deleteRecord}><Trash2 size={15}/>削除する</button></details>}
 </div>}
 {step==='history'&&info&&<><ul className="dailyHistory">{info.records.map(r=><li key={r.id}><button disabled={busy} onClick={()=>openRecord(r)}><b>{shortDate(r.date)}</b><span>{r.record.slice(0,60)}{r.record.length>60?'…':''}</span><small>{r.author?r.author+' さん':''}</small></button></li>)}</ul><button className="talkSecondary" onClick={()=>setStep('compose')}><ChevronLeft size={15}/>今日の記録に戻る</button></>}
 {step==='examples'&&<><div className="dailyExamples">{(['record','consideration'] as const).map(k=><section key={k} className="dailyBox"><h3>{k==='record'?'日々の記録':'職員考察'}の文例 <small>{examples.filter(e=>e.kind===k).length}件</small></h3>{examples.filter(e=>e.kind===k).map(ex=><div key={ex.id} className="dailyExample"><p>{ex.body}</p><button className="talkSecondary boardDanger" disabled={busy} onClick={()=>deleteExample(ex)}><Trash2 size={14}/>削除（管理者）</button></div>)}{!examples.some(e=>e.kind===k)&&<p className="talkEmpty">まだありません。登録するまでは、こちらで用意した見本の書き方を使います。</p>}</section>)}</div>
  <form className="talkInput" onSubmit={addExample}><fieldset className="boardExpires"><legend>文例の種類</legend><label><input type="radio" checked={exampleKind==='record'} onChange={()=>setExampleKind('record')}/>日々の記録</label><label><input type="radio" checked={exampleKind==='consideration'} onChange={()=>setExampleKind('consideration')}/>職員考察</label></fieldset><label>文例（ノウビーからコピーして貼り付け）<textarea className="proofText" rows={5} maxLength={dailyLimits.example} required value={exampleBody} onChange={e=>setExampleBody(e.target.value)} placeholder="例：9:40に作業開始のご連絡を頂きました。…"/></label><p className="proofNote"><ShieldCheck size={15}/>名前は消してから貼り付けてください。登録した利用者の名前は、AIに送る前にも自動で伏せます。2〜3件ずつあると書き方がそろいます。</p><button className="talkPrimary" disabled={busy}><Plus size={16}/>文例を登録する</button></form>{pinField}</>}
 {step==='settings'&&<><div className="dailyBox"><h3>いまの状態</h3><p>{ai?.configured?(ai.source==='env'?'サーバーの設定でAIにつながっています（'+ai.model+'）。':'AIにつながる設定です：'+ai.model):'AIは未設定です（見本の文章になります）。'}</p></div>
  {ai?.source!=='env'&&<form className="talkInput" onSubmit={saveAi}>
   <label>AIのサービス<select value={aiForm.service} onChange={e=>setAiForm({...aiForm,service:e.target.value})}><option value="cloudflare">Cloudflare Workers AI（無料枠あり・おすすめ）</option><option value="gemini">Google Gemini（無料枠は入力が改善に使われることあり）</option><option value="custom">その他（事務所のパソコンなど OpenAI互換の接続先）</option></select></label>
   {aiForm.service!=='gemini'&&<label>{aiForm.service==='cloudflare'?'CloudflareのアカウントID（32文字）':'接続先のURL（例：https://〜/v1）'}<input required value={aiForm.target} onChange={e=>setAiForm({...aiForm,target:e.target.value.trim()})}/></label>}
   <label>モデル名<input required placeholder={aiForm.service==='cloudflare'?'例：@cf/meta/llama-3.3-70b-instruct-fp8-fast':aiForm.service==='gemini'?'例：gemini-2.5-flash':'例：qwen2.5:14b'} value={aiForm.model} onChange={e=>setAiForm({...aiForm,model:e.target.value.trim()})}/><small className="boardHelp">使えるモデル名は、各サービスの管理画面で確認してください。日本語が得意なものを選ぶと文章が自然になります。</small></label>
   <label>鍵（APIトークン）<input type="password" autoComplete="off" placeholder={ai?.configured?'変えないときは空欄':''} value={aiForm.key} onChange={e=>setAiForm({...aiForm,key:e.target.value})}/><small className="boardHelp">鍵はサーバーだけで使い、画面には二度と表示しません。</small></label>
   {pinField}
   <button className="talkPrimary" disabled={busy}><Save size={16}/>設定を保存する</button>{ai?.configured&&<button type="button" className="talkSecondary boardDanger" disabled={busy} onClick={clearAi}>AIの設定を消す</button>}
  </form>}
 </>}
 {busy&&<p role="status" className="talkLoading">{step==='compose'?'下書きを作っています…（少し時間がかかります）':'確認しています…'}</p>}{error&&<p role="alert" className="talkError">{error}</p>}</div></div><div className="talkFooter"><button disabled={busy} onClick={()=>{setError('');setStep('menu');setLines([{speaker:'student',text:'ほかに、お手伝いできることはありますか？'}])}}><ChevronLeft size={15}/>最初の会話に戻る</button><button disabled={busy} onClick={onClose}>教室に戻る</button></div></section></dialog>
}
