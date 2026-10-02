'use client';
import {Pencil} from 'lucide-react';
import {Profile,profileFields} from '../lib/profile';
const groups=[...new Set(profileFields.map(f=>f.group))];
export function BasicProfile({value,city,loading,onEdit}:{value:Profile;city:string;loading:boolean;onEdit:()=>void}){
 return <section className="basicProfile panel"><div className="toolbar"><h2>基本情報</h2><button className="textButton" disabled={loading} onClick={onEdit}><Pencil size={16}/>基本情報を編集</button></div>{loading?<p className="basicHint">読み込み中…</p>:<div className="basicContent">{groups.map(g=><section key={g}><h3>{g}</h3><dl className="basicGrid">{g==='住所・連絡先'&&<div><dt>請求先の市区町村</dt><dd>{city}</dd></div>}{profileFields.filter(f=>f.group===g).map(f=><div className={f.key==='address'||f.key==='memo'?'wide':''} key={f.key}><dt>{f.label}</dt><dd>{value[f.key]||<span className="muted">{f.key==='phone'&&value.phoneUnavailable?'取込時に非表示（手入力できます）':'未登録'}</span>}</dd></div>)}</dl></section>)}<p className="basicHint">住所欄はノービーの登録内容です。請求先と居住地が異なる場合は、住所欄に居住地が記載されています。</p></div>}</section>
}
export function BasicProfileEditor({value,onChange}:{value:Profile;onChange:(value:Profile)=>void}){
 return <div className="basicEditor"><p>分かる項目だけ入力できます。未入力の項目は空欄のまま保存されます。</p>{groups.map(g=><fieldset key={g}><legend>{g}</legend><div className="basicGrid">{profileFields.filter(f=>f.group===g).map(f=><label className={f.key==='address'||f.key==='memo'?'wide':''} key={f.key}>{f.label}{'type' in f&&f.type==='textarea'?<textarea rows={5} maxLength={10000} value={value[f.key]||''} onChange={e=>onChange({...value,[f.key]:e.target.value})}/>:<input type={'type' in f?f.type:'text'} maxLength={500} value={value[f.key]||''} onChange={e=>onChange({...value,[f.key]:e.target.value})}/>}</label>)}</div></fieldset>)}</div>
}

