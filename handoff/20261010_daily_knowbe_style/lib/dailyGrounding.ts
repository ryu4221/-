// 日々の記録・職員考察の表示前チェック（規則による検出。意味全体の正しさを保証するものではない）
// 2026-10-10 改訂（ノウビー実記録 2026-07〜10 の書き方に合わせる）：
//  - 単語の完全一致ではなく、言い換えを根拠として認める（語群）。例：メモ「眠い」→記録「眠気があるとのことでした」は可。
//  - 「今後・次回・引き続き」を含む文は、その語より後ろ（方針）だけを観察チェックから外す。前半の事実部分は確認する。
//  - 職員の声かけ・対応、連絡・来所、休憩、以前との比較など、入力にない行動・経過も検出する。
//  - 否定の文（「体調の変化はありませんでした」）も、メモに「普段どおり」等の根拠が無ければ検出する。
//  - 見本（架空）の内容が今日の文章に混ざっていないかを確認する（options.distinct）。
type Draft={record:string;consideration:string};
export type GroundingOptions={distinct?:readonly string[]};
type Rule=readonly [label:string,claim:RegExp,evidence:RegExp];

const nfkc=(s:string)=>s.normalize('NFKC');
const quoteKey=(s:string)=>nfkc(s).replace(/[\s、。，．,.!！?？…・ー〜~]/g,'');
const numbers=(s:string)=>nfkc(s).replace(/(?<!\d)0+(?=\d)/g,'').match(/\d+(?:[.:]\d+)?/g)??[];

// 様子・評価（今日のメモに根拠が必要）
const stateRules:Rule[]=[
 ['集中',/集中/,/集中|黙々/],
 ['落ち着いた様子',/落ち着/,/落ち着|穏やか|安定|変わりな|変わらな|普段どおり|普段通り|いつもどおり|いつも通り/],
 ['明るい様子・笑顔',/明る|笑顔|笑い|にこやか/,/明る|笑/],
 ['元気な様子',/元気/,/元気/],
 ['丁寧',/丁寧/,/丁寧|一つずつ|ひとつずつ|確かめ|確認しながら|見本/],
 ['スムーズ',/スムーズ|順調|手際|手慣れ|効率/,/スムーズ|順調|迷わ|問題な|手際|慣れ|効率/],
 ['疲れ',/疲れ|疲労|だる|しんど/,/疲|だる|しんど|きつ/],
 ['眠気',/眠気|眠そう|寝不足|ぼんやり|睡眠/,/眠|ねむ|寝|ぼんやり|ぼーっと/],
 ['体調の変化・不調',/体調の変化|異常|不調|体調不良|体調を崩|痛み|痛く/,/変化|異常|不調|体調不良|崩|痛|熱|悪|しんど|だる/],
 ['作業速度',/スピード|速度|速く|早く|ペースが(?:上|速|早)/,/スピード|速度|速|早く|ペース/],
 ['自信',/自信/,/自信/],
 ['意欲',/意欲|やる気|前向き|積極/,/意欲|やる気|前向き|積極|頑張|がんば|楽しみ|やってみ/],
 ['自己管理',/自己管理|体調管理|自分で管理/,/管理|休憩|ペース|調整|服薬|睡眠/],
 ['主体性',/主体的|自主的|自ら/,/自分から|自ら|自主|主体/],
 ['理解',/理解し|理解され|把握/,/理解|分か|わか|把握|覚え|確認|手順|見本|説明/],
 ['自分のペース',/自分のペース|ご自身のペース|マイペース/,/ペース|休憩|ゆっくり|無理/],
];
// 行動・出来事（今日のメモに根拠が必要）
const actionRules:Rule[]=[
 ['本人の了承',/了解|了承|納得|承知/,/了解|了承|納得|承知|わかりました|分かりました|はい/],
 ['手順の確認',/手順|順番|やり方/,/手順|順番|見本|やり方/],
 ['休憩',/休憩|休みを|休みながら|休んで|休まれ/,/休憩|休み|休ん|休ま/],
 ['連絡・電話',/連絡|電話|LINE|メール/,/連絡|電話|LINE|ライン|メール|在宅/],
 ['来所・退所・送迎',/来所|退所|送迎|帰宅|帰られ/,/来所|退所|送迎|通所|帰/],
 ['片付け',/片付|片づ|かたづ/,/片付|片づ|かたづ|整理/],
 ['質問・相談',/質問|相談/,/質問|相談|聞|確認/],
 ['水分・食事・服薬',/水分|食事|昼食|朝食|朝ごはん|昼ごはん|服薬|お薬/,/水|お茶|食|ごはん|ご飯|薬/],
 ['職員の声かけ・対応',/声をかけ|声かけ|声掛け|お伝えし|伝えました|伝えています|伝えており|助言|説明しま|説明を(?:行|し)|促し|提案し/,/声かけ|声掛け|声をかけ|伝え|助言|説明|促|提案|職員[:：]|職員から|職員が/],
 ['見本',/見本/,/見本/],
];
// 以前との比較・経過（今日のメモだけでは言えないため、メモに根拠が必要）
const trendRules:Rule[]=[
 ['以前との比較・変化',/以前より|前回より|これまでより|先週より|向上|改善|上達|成長|増えて|減って|定着|身につ|身に付/,/以前|前回|これまで|先週|向上|改善|上達|成長|増え|減っ|定着|身に/],
];
const allRules=[...stateRules,...actionRules,...trendRules];
// 否定の文（「〜はありませんでした」）は「普段どおり」「特になし」等が根拠
const negated=/^.{0,8}?(?:な(?:い|く|し|かった)|ありません|ませんでした|見られませ)/;
const negationEvidence=/普段|いつも|変わりな|変わらな|問題な|大丈夫|良好|特にな|なし|無し|ない|ありません/;

// 日々の記録の文が、今日のメモのどの語にも対応しないか（過去の記録・見本からの転用の検出）。
// 漢字は1字単位で照合し、よく使う字は除く。言い換え（眠い→眠気、腰が痛い→腰の痛み）は通す。
// 実記録での試算：同じ人の前回の記録の文を混ぜた場合、規則だけでは約49%、この照合を加えると約68%を検出。
// 言い換えを誤って止める可能性があるため、この結果では文を削除せず、書き直しの依頼と確認の警告だけに使う。
const commonKanji=new Set([...'日時作業本人様子確認開始終了連絡頂間分自事今話方中体調気所者員職予定報告一度少特最後全意識状態場面内容取組前回以普段必要対応支援利用在宅通来退施設外行進思考見聞言出入上下大小手生活明朝昼夜午伺伝声送迎変化']);
const kanjiAlias:Record<string,string>={睡:'眠寝',眠:'睡寝',寝:'睡眠',疲:'労',労:'疲',食:'飯',飯:'食',帰:'宅'};
export function unanchored(sentence:string,memo:string){
 const m=nfkc(memo),s=nfkc(sentence).replace(/「[^」]*」/g,'');
 const keys=(s.match(/[一-龠々]{2,}|[ァ-ヶー]{2,}/g)??[]).flatMap(t=>/[ァ-ヶ]/.test(t)?[t.slice(0,2)]:[...t].filter(c=>!commonKanji.has(c)));
 if(!keys.length)return false;
 return !keys.some(k=>m.includes(k)||[...(kanjiAlias[k]??'')].some(a=>m.includes(a)));
}
export const unanchoredLabel='今日のメモと対応する語が無い文';

// 「」の中の句点では区切らない文分割
export function splitSentences(line:string){
 const out:string[]=[];let cur='',depth=0;
 for(const ch of line){cur+=ch;if(ch==='「'||ch==='『')depth++;else if((ch==='」'||ch==='』')&&depth>0)depth--;else if(depth===0&&/[。！？]/.test(ch)){out.push(cur);cur='';}}
 if(cur.trim())out.push(cur);
 return out;
}
// 方針の部分（今後・次回・引き続き〜）を除いた、事実として確認する部分
// 仮定・条件の節（〜の可能性、〜した際は）は事実の主張ではないので確認しない
const hypothetical=/可能性|おそれ|恐れ|場合|際に|際は|際には|時は|時には|ときは|たら、|れば、/;
const dropHypothetical=(text:string)=>text.split(/(?<=、)/).filter(c=>!hypothetical.test(c)).join('');
export function factualPart(sentence:string){
 const m=sentence.match(/今後|次回|これから|引き続き/);
 if(m)return dropHypothetical(sentence.slice(0,m.index));
 // 「今後」が無い方針の文（〜ていきます）は、最後の読点より前の節のうち、
 // 過去・継続・理由の形（〜た、〜ており、〜なり、〜ため）の節だけを事実として確認する
 if(/(?:ていきます|ていきたいと(?:考え|思い)ます|ようにします|(?:支援|確認|調整|声かけ|見守り)します|を(?:行います|続けます))[。]?\s*$/.test(sentence)){
  const clauses=sentence.split(/(?<=、)/);clauses.pop();
  return dropHypothetical(clauses.filter(c=>/た、$|ており、$|ていて、$|なり、$|ため、$|ので、$|ことから、$|ものの、$|が、$/.test(c)).join(''));
 }
 return dropHypothetical(sentence);
}
function ruleIssues(text:string,memo:string){
 const issues:string[]=[];
 for(const [label,claim,evidence] of allRules){
  const m=claim.exec(text);if(!m)continue;
  if(evidence.test(memo))continue;
  const after=text.slice(m.index+m[0].length);
  if(negated.test(after)&&negationEvidence.test(memo))continue;
  issues.push((trendRules.some(r=>r[0]===label)?'メモにない経過：':stateRules.some(r=>r[0]===label)?'今日の根拠がない様子・評価：':'メモにない行動：')+label);
 }
 return issues;
}
// 職員考察の1行目「（作業名）（量）されました。」の作業名がメモにあるか
function workLineIssue(line:string,memo:string){
 const m=nfkc(line).match(/^(.+?)(?:\d+\s*[A-Za-zぁ-んァ-ヶ一-龠]*)?を?(?:されました|行いました|しました)。?$/);
 if(!m)return '';
 const name=m[1].replace(/作業$|を$/,'').trim();
 return name&&!nfkc(memo).includes(name)?'メモにない作業名：'+name:'';
}
// 1文のチェック。kind は record（事実）か consideration（見立てと方針）か。
export function sentenceIssues(sentence:string,memo:string,kind:'record'|'consideration',options:GroundingOptions={},firstLine=false){
 const issues:string[]=[],memoNums=new Set(numbers(memo));
 for(const n of numbers(sentence))if(!memoNums.has(n))issues.push('メモにない時刻・数量：'+n);
 for(const q of sentence.matchAll(/「([^」]+)」/g))if(!quoteKey(memo).includes(quoteKey(q[1])))issues.push('メモにない発言：'+q[1]);
 for(const w of options.distinct??[])if(sentence.includes(w)&&!memo.includes(w))issues.push('メモにない内容（見本の内容）：'+w);
 if(kind==='consideration'&&firstLine&&sentence.trim().length<=30){const w=workLineIssue(sentence.trim(),memo);if(w)issues.push(w);}
 issues.push(...ruleIssues(kind==='record'?sentence:factualPart(sentence),memo));
 return issues;
}
export function groundingIssues(draft:Draft,memo:string,options:GroundingOptions={}){
 const issues:string[]=[];
 if(!draft.record.trim()||!draft.consideration.trim())issues.push('記録と職員考察の両方が必要です');
 for(const kind of ['record','consideration'] as const)draft[kind].split('\n').forEach((line,i)=>{
  splitSentences(line).forEach((s,j)=>issues.push(...sentenceIssues(s,memo,kind,options,i===0&&j===0)));
 });
 for(const line of draft.record.split('\n'))for(const s of splitSentences(line))if(unanchored(s,memo))issues.push(unanchoredLabel+'：'+s.trim().slice(0,40));
 return [...new Set(issues)];
}
// 在宅の開始・終了の見出しを、事業所のノウビーで最も多い書式「09:38作業開始の連絡頂きました。」にそろえる
// （実測：在宅475件中 約84%がこの形）。時刻は2桁にし、見出しは1行に独立させる。出来事や時刻は追加しない。
const headerRe=/(\d{1,2})[:：](\d{2})に?(?:ご?本人から)?(?:お?電話(?:で|にて))?、?作業の?(開始|終了)の?(?:ご連絡|ご報告|連絡|報告|お?電話)(?:がありました|を?頂きました|を?いただきました|を受けました|が入りました)。?/g;
export const headerLine=/^\d{2}:\d{2}(?:作業(?:開始|終了)の連絡頂きました|に?来所されました|に?退所されました)。/;
export function formatDailyRecord(record:string){
 return record.replace(/\r/g,'')
  .replace(headerRe,(_,h:string,m:string,k:string)=>`${h.padStart(2,'0')}:${m}作業${k}の連絡頂きました。`)
  .replace(/(?<![\d:])(\d):(\d{2})(?!\d)/g,'0$1:$2')
  .replace(/([^\n])[ \t　]*(\d{2}:\d{2}作業(?:開始|終了)の連絡頂きました。)/g,'$1\n$2')
  .replace(/(\d{2}:\d{2}作業(?:開始|終了)の連絡頂きました。)[ \t　]*(?=[^\n（(])/g,'$1\n')
  .replace(/\n{2,}/g,'\n').trim();
}
// 見出し行（在宅の開始・終了、通所の来所・退所）の直後に「（○○対応）」を付ける。addResponder から使う想定。
export function insertResponder(record:string,name:string){
 const n=name.trim();if(!n)return record;
 return record.split('\n').map(line=>{
  const m=line.match(headerLine);
  if(!m||line.slice(m[0].length).trimStart().startsWith('（'))return line;
  return m[0]+`（${n}対応）`+line.slice(m[0].length);
 }).join('\n');
}
// 修正後も根拠を確認できない文だけを除く。他の正しい文まで失敗扱いにしない。
export function retainGroundedSentences(draft:Draft,memo:string,options:GroundingOptions={}){
 let removed=0;
 const clean=(text:string,kind:'record'|'consideration')=>text.split('\n').map((line,i)=>splitSentences(line).filter((s,j)=>{
  const bad=sentenceIssues(s,memo,kind,options,i===0&&j===0).length>0;if(bad)removed++;return !bad;
 }).join('')).filter(l=>l.trim()).join('\n');
 const record=clean(draft.record,'record');
 // 語の対応が無い文は削除せず、件数だけ返す（画面で確認を促す）
 const unverified=record.split('\n').flatMap(splitSentences).filter(s=>unanchored(s,memo)).length;
 return {record,consideration:clean(draft.consideration,'consideration'),removed,unverified};
}
