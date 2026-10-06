'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {X,ChevronLeft,MessageCircle,SpellCheck,Check,Copy,Pencil,Wand2,EyeOff,ShieldCheck} from 'lucide-react';
import {proofread,applyFixes,signature,levelLabel,type Issue} from '../lib/proofread';
type Step='menu'|'input'|'result'|'about';
type Line={speaker:'student'|'you';text:string};
const MAX=20000;
// 文章チェック係：貼り付けた文章をこの画面の中だけで確かめる（保存・送信しない）
export default function ProofreadConversation({origin,onClose}:{origin:{x:number;y:number};onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),feed=useRef<HTMLDivElement>(null),returnFocus=useRef<Element|null>(null);
 const [step,setStep]=useState<Step>('menu'),[lines,setLines]=useState<Line[]>([{speaker:'student',text:'こんにちは。文章チェックの係です。支援記録や計画書、お知らせなどの誤字・脱字を一緒に確かめます。'}]);
 const [text,setText]=useState(''),[ignored,setIgnored]=useState<string[]>([]),[showStyle,setShowStyle]=useState(false),[copied,setCopied]=useState(false),[error,setError]=useState('');
 useEffect(()=>{returnFocus.current=document.activeElement;dialog.current?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;(returnFocus.current as HTMLElement)?.focus?.()}},[]);
 useEffect(()=>{if(step==='result'){feed.current?.querySelector('.proofSummary')?.scrollIntoView({block:'start'});return}feed.current?.scrollTo({top:feed.current.scrollHeight,behavior:'instant'})},[lines,step]);
 const all=useMemo(()=>step==='result'?proofread(text).filter(i=>!ignored.includes(signature(i))):[],[text,ignored,step]);
 const main=all.filter(i=>i.level!=='style'),style=all.filter(i=>i.level==='style');
 const shown=showStyle?all:main;
 const fixable=main.filter(i=>i.fix!==undefined);
 function say(user:string,reply:string,next:Step){setError('');setLines(prev=>[...prev,{speaker:'you',text:user},{speaker:'student',text:reply}]);setStep(next)}
 function reply(t:string){setLines(prev=>[...prev,{speaker:'student',text:t}])}
 function summary(found:Issue[]){const m=found.filter(i=>i.level!=='style'),s=found.length-m.length;return m.length?'見直したほうがよさそうな所が '+m.length+' か所ありました。'+(s?'ほかに表記の提案が '+s+' 件あります。':''):s?'誤字・脱字は見つかりませんでした。表記の提案が '+s+' 件あります。':'誤字・脱字は見つかりませんでした。'}
 function check(){const t=text.trim();if(!t){setError('文章を入れてください。');return}if(text.length>MAX){setError('一度にチェックできるのは'+MAX.toLocaleString()+'文字までです。');return}setIgnored([]);setCopied(false);const found=proofread(text);say('この文章をチェックしてほしい',summary(found)+(found.length?'下の一覧で、ひとつずつ「直す」か「このままにする」を選べます。':'念のため、名前や数字は目でも確かめてくださいね。'),'result')}
 function fix(i:Issue){setText(applyFixes(text,[i]));setCopied(false);reply('「'+i.text+'」を「'+i.fix+'」に直しました。')}
 function fixAll(){setText(applyFixes(text,fixable));setCopied(false);say('まとめて直す',fixable.length+' か所をまとめて直しました。表記の提案は、必要なものだけ選んでください。','result')}
 function ignore(i:Issue){setIgnored(prev=>[...prev,signature(i)]);reply('「'+i.text+'」はこのままにします。')}
 async function copy(){try{await navigator.clipboard.writeText(text);setCopied(true);reply('直した文章をコピーしました。もとの書類に貼り付けて使ってください。')}catch{setError('コピーできませんでした。下の文章を選んでコピーしてください。')}}
 // 文章の中で指摘の場所に色を付ける
 const marked=useMemo(()=>{const out:ReactNode[]=[];let at=0;shown.filter(i=>i.kind!=='読みやすさ').forEach(i=>{if(i.start<at)return;out.push(text.slice(at,i.start));out.push(<mark key={i.start} className={'proof-'+i.level} title={i.message}>{text.slice(i.start,i.end)}<sup>{shown.indexOf(i)+1}</sup></mark>);at=i.end});out.push(text.slice(at));return out},[shown,text]);
 const actorStyle={'--start-x':(origin.x-window.innerWidth/2)+'px','--start-y':(origin.y-Math.max(90,Math.min(window.innerHeight*.2,180)))+'px'} as CSSProperties;
 return <dialog ref={dialog} className="talkDialog" aria-labelledby="proofTitle" onCancel={e=>{e.preventDefault();onClose()}}><div className="encounterActor" style={actorStyle} aria-hidden="true"><span>文章チェック</span><img src="/classroom/student-proof.png" alt=""/></div><section className="talkPanel boardPanel"><div className="talkHeader"><div><MessageCircle size={18}/><h2 id="proofTitle">文章チェックの係</h2><span>お話し中</span></div><button aria-label="会話を閉じて教室に戻る" onClick={onClose}><X size={23}/></button></div><div className="talkScroll" ref={feed}><div className="conversationLog" role="log" aria-label="会話" aria-live="polite">{lines.map((l,i)=><div key={i} className={'talkLine '+(l.speaker==='student'?'speaker-student':'you')}><small>{l.speaker==='student'?'文章チェックの係':'あなた'}</small><p>{l.text}</p></div>)}</div><div className="conversationActions">
 {step==='menu'&&<div className="talkChoices"><button onClick={()=>say('文章をチェックしたい','チェックしたい文章を下に貼り付けてください。文章はこの画面の中だけで確かめて、どこにも保存・送信しません。','input')}><SpellCheck size={17}/>　文章をチェックする</button><button onClick={()=>say('どんなことを見てくれるの？','こんなことを確かめます。','about')}>チェックできること</button></div>}
 {step==='about'&&<><ul className="proofAbout"><li><b>誤字・脱字</b>「受給者症」「お願いしす」「少しづつ」など、よくある書きまちがい</li><li><b>重複</b>「にに」「。。」「支援支援」など、同じ字や言葉が続いているところ</li><li><b>話し言葉</b>「来れる」（ら抜き）、「してます」（い抜き）</li><li><b>敬語・重ね言葉</b>「おっしゃられる」「まず最初に」「約20分ほど」</li><li><b>日付と曜日</b>「10月5日（火）」のように曜日が合っていないところ、ない日付</li><li><b>括弧</b>「 」や（ ）の閉じ忘れ</li><li><b>表記の提案</b>「障害／障がい」の混在、「頂く→いただく」など書類の書き方</li></ul><p className="proofNote"><ShieldCheck size={15}/>決まった規則で確かめるので、文の意味まで読まないと分からない誤り（言葉の抜けなど）は見落とすことがあります。最後は目でも確認してください。</p><button className="talkPrimary" onClick={()=>say('文章をチェックしたい','チェックしたい文章を下に貼り付けてください。','input')}><SpellCheck size={17}/>文章をチェックする</button></>}
 {step==='input'&&<div className="talkInput"><label>チェックする文章<textarea className="proofText" autoFocus rows={9} maxLength={MAX} placeholder="ここに文章を貼り付けてください（支援記録、計画書、お知らせなど）" value={text} onChange={e=>setText(e.target.value)}/></label><p className="proofNote"><ShieldCheck size={15}/>文章はこの画面の中だけで確かめます。保存や送信はしません。画面を閉じると消えます。</p><span className="proofCount">{text.length.toLocaleString()} / {MAX.toLocaleString()} 文字</span><button className="talkPrimary" onClick={check}><SpellCheck size={17}/>チェックする</button>{text&&<button type="button" className="talkSecondary" onClick={()=>setText('')}>文章を消す</button>}</div>}
 {step==='result'&&<>
  <div className="proofSummary"><span className="proofBadge error">{main.filter(i=>i.level==='error').length}<small>誤りの可能性</small></span><span className="proofBadge warn">{main.filter(i=>i.level==='warn').length}<small>見直し推奨</small></span><span className="proofBadge style">{style.length}<small>表記の提案</small></span>{fixable.length>0&&<button className="talkPrimary" onClick={fixAll}><Wand2 size={16}/>まとめて直す（{fixable.length}か所）</button>}</div>
  <label className="boardToggles proofToggle"><input type="checkbox" checked={showStyle} onChange={e=>setShowStyle(e.target.checked)}/>表記の提案（{style.length}件）も表示する</label>
  <div className="proofPreview" aria-label="チェックした文章">{marked}</div>
  {shown.length>0?<ol className="proofList">{shown.map((i,n)=><li key={i.start+':'+i.kind+':'+n} className={'proof-'+i.level}><div className="proofHead"><span className="proofNum">{n+1}</span><span className="proofKind">{i.kind}</span><small>{levelLabel[i.level]}</small></div><p className="proofChange"><s>{i.text.length>40?i.text.slice(0,40)+'…':i.text}</s>{i.fix!==undefined&&<>　→　<b>{i.fix===''?'（削除）':i.fix}</b></>}</p><p className="proofMessage">{i.message}</p><div className="proofActions">{i.fix!==undefined&&<button className="talkSecondary" onClick={()=>fix(i)}><Check size={15}/>直す</button>}<button className="talkSecondary" onClick={()=>ignore(i)}><EyeOff size={15}/>このままにする</button></div></li>)}</ol>:<p className="talkEmpty">{style.length&&!showStyle?'誤字・脱字は見つかりませんでした。表記の提案を見るには、上のチェックを入れてください。':'見直す所はもうありません。'}</p>}
  <div className="boardPostActions"><button className="talkPrimary" onClick={copy}><Copy size={16}/>{copied?'コピーしました':'直した文章をコピー'}</button><button className="talkSecondary" onClick={()=>say('文章を書き直したい','文章を直したら、もう一度「チェックする」を押してください。','input')}><Pencil size={15}/>文章を編集する</button><button className="talkSecondary" onClick={()=>{setText('');say('別の文章をチェックしたい','次の文章を貼り付けてください。','input')}}>別の文章をチェック</button></div>
 </>}
 {error&&<p role="alert" className="talkError">{error}</p>}</div></div><div className="talkFooter"><button onClick={()=>{setError('');setStep('menu');setLines([{speaker:'student',text:'ほかに、確かめたい文章はありますか？'}])}}><ChevronLeft size={15}/>最初の会話に戻る</button><button onClick={onClose}>教室に戻る</button></div></section></dialog>
}
