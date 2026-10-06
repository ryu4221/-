// 日々の記録・職員考察の作成（画面とサーバーの両方で使う）
export const traitSuggestions=['朝が弱い','体力がない','最近運動していない','集中が続きにくい','疲れやすい','人見知りがある','天候で体調が変わりやすい','手先が器用','丁寧に作業する','休憩の声かけが必要','睡眠が不規則','服薬の確認が必要','声かけで切り替えられる','新しいことに不安がある'];
export const quickMemos=['体調良好','体調不良の訴えあり','作業に集中できていた','途中で休憩','午前のみ利用','送迎あり','昼食完食','表情が明るい','口数が少ない','遅刻あり'];
export const dailyLimits={memo:2000,traits:2000,example:3000,record:5000,docChars:1800};
export type DocRef={id:string;category:string;name:string;created:string;readable:boolean};
export type DailyRecord={id:string;person:string;date:string;memo:string;record:string;consideration:string;author:string;created:string;updated:string};
export type Example={id:string;kind:'record'|'consideration';body:string};
export type AiStatus={configured:boolean;source:'env'|'settings'|null;model:string;service:string};
export type DailyInfo={traits:string;docs:DocRef[];records:DailyRecord[];examples:Example[];ai:AiStatus};
export type Draft={record:string;consideration:string;sample:boolean;sent:string};

// 個人を特定できる情報を伏せる（AIに送る前に必ず通す）
export type MaskSource={name:string;kana?:string;guardianName?:string;address?:string;phone?:string;emergencyPhone?:string;email?:string;recipientNumber?:string;birthDate?:string;postalCode?:string};
const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const parts=(s?:string)=>(s??'').split(/[\s　]+/).map(x=>x.trim()).filter(x=>x.length>=2);
export function mask(text:string,src:MaskSource){
 let out=text;
 const swap=(words:string[],to:string)=>{for(const w of [...new Set(words)].sort((a,b)=>b.length-a.length))if(w)out=out.replace(new RegExp(esc(w).replace(/\\? /g,'[\\s　]*'),'g'),to)};
 const literal=(v:string|undefined,to:string)=>{if(v&&v.trim().length>=2)out=out.split(v.trim()).join(to)};
 literal(src.address,'（住所）');literal(src.recipientNumber,'（受給者証番号）');literal(src.email,'（メール）');literal(src.birthDate,'（生年月日）');
 // 家族の氏名（フルネーム）を先に伏せてから、本人の氏名・名字・名前を伏せる
 swap([src.guardianName??'',(src.guardianName??'').replace(/[\s　]/g,'')],'家族');
 swap([src.name,src.name.replace(/[\s　]/g,''),...parts(src.name),src.kana??'',(src.kana??'').replace(/[\s　]/g,''),...parts(src.kana)],'本人');
 swap(parts(src.guardianName),'家族');
 out=out.replace(/(?<![0-9])\d{3}[-‐ー−]\d{4}(?![0-9-‐ー−])/g,'（郵便番号）').replace(/(?<![0-9])0\d{1,4}[-‐ー−]?\d{1,4}[-‐ー−]?\d{3,4}(?![0-9])/g,'（電話番号）').replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'（メール）');
 out=out.replace(/[0-9]{4}[-/年][0-9]{1,2}[-/月][0-9]{1,2}日?生/g,'（生年月日）');
 return out;
}

// 文例が無いときに使う見本（架空）。ノウビーの文例を登録すると、そちらを優先する。
export const defaultExamples:Example[]=[
 {id:'d1',kind:'record',body:'午前は封入作業に取り組まれる。開始直後は表情が硬かったが、職員の声かけで手順を確認すると落ち着いて作業を続けられた。11時頃に疲れの訴えがあり、10分ほど休憩を取る。午後は軽作業を行い、終了まで集中が続いた。昼食は完食。'},
 {id:'d2',kind:'consideration',body:'朝の立ち上がりに時間がかかる様子が続いているが、声かけと手順の確認で作業に入れている。休憩を自分から伝えられたことは、個別支援計画の目標である「体調に合わせて休憩を取る」に沿った行動と考えられる。引き続き、作業前の体調確認と早めの休憩の提案を行っていく。'},
];

export type PromptInput={date:string;memo:string;traits:string;docs:{category:string;name:string;text:string}[];examples:Example[];recent:{date:string;record:string;consideration:string}[]};
// AIへの指示。メモに無い出来事を作らないこと、事実（記録）と見立て（考察）を分けることを強く指示する。
export function buildPrompt(p:PromptInput){
 const ex=(kind:'record'|'consideration')=>{const list=(p.examples.filter(e=>e.kind===kind).length?p.examples:defaultExamples).filter(e=>e.kind===kind).slice(0,3);return list.map((e,i)=>`（文例${i+1}）\n${e.body.slice(0,600)}`).join('\n')};
 const system=[
  'あなたは就労継続支援B型事業所の支援員です。利用者の「日々の記録」と「職員考察」の下書きを、日本語で作成します。',
  '守ること：',
  '1. 「日々の記録」は、今日のメモに書かれた事実だけを、客観的に、時間の流れに沿って書く。メモに無い出来事・数字・発言は絶対に作らない。',
  '2. 「職員考察」は、記録の事実をもとに、本人の特徴・アセスメント・個別支援計画（本案）の目標・モニタリングの内容と結びつけて、支援員としての見立てと今後の支援方針を書く。断定しすぎず「〜と考えられる」「〜していく」などを使う。',
  '3. 文体・長さ・言い回しは文例に合わせる。文例が「〜される」「〜された」などの書き方なら同じようにする。',
  '4. 本人は「本人」と書く。氏名・住所などは書かない。',
  '5. 長さの目安：日々の記録は100〜300字、職員考察は100〜250字。',
  '6. 出力は次の形だけにする（前置きや説明は書かない）：\n【日々の記録】\n（本文）\n【職員考察】\n（本文）',
 ].join('\n');
 const docs=p.docs.map(d=>`■${d.category}（${d.name}）\n${d.text.slice(0,1800)}`).join('\n\n');
 const recent=p.recent.map(r=>`■${r.date}\n記録：${r.record.slice(0,300)}\n考察：${r.consideration.slice(0,300)}`).join('\n');
 const user=[
  `【日付】${p.date}`,
  `【今日のメモ】\n${p.memo||'（なし）'}`,
  `【本人の特徴】\n${p.traits||'（未登録）'}`,
  docs&&`【参考資料】\n${docs}`,
  recent&&`【最近の記録（流れの参考）】\n${recent}`,
  `【日々の記録の文例】\n${ex('record')}`,
  `【職員考察の文例】\n${ex('consideration')}`,
  '上の情報から、今日の「日々の記録」と「職員考察」を作成してください。',
 ].filter(Boolean).join('\n\n');
 return {system,user};
}
// AIの返事から2つの文章を取り出す
export function parseDraft(text:string){
 const t=text.replace(/\r/g,'').replace(/```[a-z]*\n?|```/g,'').trim();
 const r=t.match(/【日々の記録】\s*([\s\S]*?)(?=【職員考察】|$)/),c=t.match(/【職員考察】\s*([\s\S]*)$/);
 if(!r&&!c)return {record:t,consideration:''};
 return {record:(r?.[1]??'').trim(),consideration:(c?.[1]??'').trim()};
}
// AIが未設定のときの見本（メモと特徴から機械的に組み立てる。AIの文章ではない）
export function sampleDraft(memo:string,traits:string){
 const items=memo.split(/[\n、。]/).map(s=>s.trim()).filter(Boolean);
 const record=items.length?'本日は'+items.join('。')+'。':'（今日のメモを入れると、ここに記録の下書きが入ります。）';
 const t=traits.split(/\n/).map(s=>s.trim()).filter(Boolean);
 const consideration=(t.length?'本人の特徴（'+t.slice(0,3).join('、')+'）を踏まえ、':'')+'今日の様子から体調と作業のペースを確認しながら支援を続けていく。';
 return {record,consideration};
}
