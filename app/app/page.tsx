'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {BookOpen,LockKeyhole,Pause,Play,MousePointer2} from 'lucide-react';
import {classroomFeatures,classroomLayout} from '../lib/classroom';
import './classroom.css';
import StudentConversation from '../components/StudentConversation';
import BoardConversation,{boardStaffKey} from '../components/BoardConversation';
import ProofreadConversation from '../components/ProofreadConversation';
import {needsMyCheck,type Board} from '../lib/board';
export default function Classroom(){
 const [paused,setPaused]=useState(false); const [conversation,setConversation]=useState<{x:number;y:number;id:string}|null>(null);
 const [unread,setUnread]=useState(0);
 const [reduced,setReduced]=useState(false);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReduced(media.matches);sync();media.addEventListener('change',sync);try{setPaused(localStorage.getItem('classroom-motion-paused')==='true')}catch{}return()=>media.removeEventListener('change',sync)},[]);
 // 回覧板の生徒に、いま使っている職員の未確認件数を表示する
 useEffect(()=>{if(conversation)return;let staff='';try{staff=localStorage.getItem(boardStaffKey)||''}catch{}
  (staff?fetch('/api/board?staff='+encodeURIComponent(staff)).then(r=>r.ok?r.json() as Promise<Board>:null):Promise.resolve(null))
   .then(d=>setUnread(d&&d.staff.some(s=>s.id===staff&&s.active)?d.posts.filter(p=>needsMyCheck(p,staff,d.staff)).length:0)).catch(()=>{})},[conversation]);
 const stop=paused||reduced;
 function toggleMotion(){const next=!paused;setPaused(next);try{localStorage.setItem('classroom-motion-paused',String(next))}catch{}}
 const size=classroomLayout(classroomFeatures.length);
 return <div className="schoolApp"><header className="schoolHeader"><a href="/" className="schoolBrand"><span><BookOpen size={23}/></span><div>支援の教室<small>就労継続支援 B型</small></div></a><div className="schoolPrivate"><LockKeyhole size={14}/>プライベート</div></header><main className="schoolMain"><div className="schoolHeading"><div><p className="schoolEyebrow">いつもの教室から、今日の支援へ。</p><h1>おかえりなさい。</h1><p className="schoolIntro">生徒をタップして、今日のお仕事を相談しましょう。</p></div><div className="roomPlate"><span>わたしたちの教室</span><b>{String(classroomFeatures.length).padStart(2,'0')}<small>人の機能係</small></b></div></div><section aria-label="機能を選ぶ教室" className="classroomFrame" style={{'--room-max':size.width+'px','--room-height':size.height+'px','--extra-height':(size.rows-1)*180+'px'} as CSSProperties}><div className="roomTopline"><span className="roomTitle">ホームルーム</span><span>生徒を選んで話しかける</span></div><div className="classroomScene" data-paused={stop||!!conversation}><img className="roomBackdrop" src="/classroom/room.png" alt="" aria-hidden="true"/><div className="studentArea" style={{'--columns':size.columns,'--rows':size.rows} as CSSProperties}>{classroomFeatures.map((feature,index)=><div className="studentSlot" key={feature.id}><button className="student" onClick={e=>{const r=e.currentTarget.querySelector('.studentArt')!.getBoundingClientRect();setConversation({x:r.x+r.width/2,y:r.y+r.height/2,id:feature.id})}} aria-label={feature.label+'の生徒と話す'} style={{'--student-delay':index*3+'s'} as CSSProperties}><span className="studentLabel">{feature.label}<span className="labelCorner"/></span><span className="studentArt"><img src={feature.avatar} alt="" draggable={false}/></span><span className={'studentHint'+(feature.id==='board'&&unread?' studentAlert':'')}>{feature.id==='board'&&unread?'未確認 '+unread+'件':'タップして話す'}</span></button></div>)}</div></div><div className="roomBottomline"><span><MousePointer2 size={15}/><span>名前も生徒もタップできます</span></span><button onClick={toggleMotion} disabled={reduced} aria-pressed={stop} aria-label={stop?'生徒の動きを再開する':'生徒の動きを止める'}>{stop?<Play size={14}/>:<Pause size={14}/>}<span>{reduced?'動きを抑える設定':paused?'動きを再開':'動きを止める'}</span></button></div></section><div className="schoolFoot"><p>機能が増えると、新しい生徒が仲間入りします。</p><span>支援ファイル</span></div></main>{conversation&&(conversation.id==='board'?<BoardConversation origin={conversation} onClose={()=>setConversation(null)}/>:conversation.id==='proof'?<ProofreadConversation origin={conversation} onClose={()=>setConversation(null)}/>:<StudentConversation origin={conversation} onClose={()=>setConversation(null)}/>)}</div>
}

