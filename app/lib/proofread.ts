// 誤字脱字チェック（ブラウザーの中だけで判定する。文章はどこにも送らない・保存しない）
// 規則で見つけられる「よくある誤り」を指摘する。文脈が必要な誤りは見落とすことがある。
export type Level='error'|'warn'|'style';
export type Issue={start:number;end:number;text:string;fix?:string;kind:string;message:string;level:Level};
export const levelLabel:Record<Level,string>={error:'誤りの可能性が高い',warn:'見直し推奨',style:'表記の提案'};
type Rule={re:RegExp;kind:string;level:Level;message:string|((m:RegExpExecArray)=>string);fix?:(m:RegExpExecArray)=>string|undefined};
const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fromMap=(map:Record<string,string>,kind:string,level:Level,message:(wrong:string,right:string)=>string):Rule=>{const keys=Object.keys(map).sort((a,b)=>b.length-a.length);return {re:new RegExp(keys.map(esc).join('|'),'g'),kind,level,message:m=>message(m[0],map[m[0]]),fix:m=>map[m[0]]}};

// よくある誤字・誤変換・脱字（福祉の現場でよく使う言葉を含む）
const typos:Record<string,string>={
 '雰因気':'雰囲気','ふいんき':'ふんいき','危機一発':'危機一髪','完壁':'完璧','専問':'専門','講議':'講義','撤底':'徹底','異和感':'違和感','興味深々':'興味津々','絶対絶命':'絶体絶命','責任転化':'責任転嫁','意味深重':'意味深長','短刀直入':'単刀直入','心気一転':'心機一転','一同に会':'一堂に会','的を得':'的を射','汚名挽回':'汚名返上','取り付く暇':'取り付く島','うる覚え':'うろ覚え','やむおえ':'やむを得','止むおえ':'やむを得','いちよう':'いちおう','あいずち':'あいづち','少くない':'少なくない',
 'シュミレーション':'シミュレーション','コミニュケーション':'コミュニケーション','コミニケーション':'コミュニケーション','アボガド':'アボカド','エンターテイメント':'エンターテインメント','ヒアリンク':'ヒアリング','モニタリンク':'モニタリング','アセスメンド':'アセスメント','スケジュ-ル':'スケジュール','レクレーション':'レクリエーション','リクレーション':'レクリエーション',
 '受給者症':'受給者証','受給者照':'受給者証','手張':'手帳','工貸':'工賃','個別支援計書':'個別支援計画書','支援計格':'支援計画','送迎車輌':'送迎車両','服用薬':'服薬',
 'こんにちわ':'こんにちは','こんばんわ':'こんばんは','とゆう':'という','てゆうか':'というか',
 'ありがとうござます':'ありがとうございます','ありがとうごいざいます':'ありがとうございます','ございす':'ございます','お願いしす':'お願いします','お願いしまう':'お願いします','おねがいしす':'おねがいします','よろしくお願いしいます':'よろしくお願いします','いたしす':'いたします','致しす':'致します','くさだい':'ください','くだしい':'ください',
};
// 重ね言葉（意味が重なっている）
const doubles:Record<string,string>={'頭痛が痛':'頭が痛','まず最初に':'最初に','まず初めに':'初めに','一番最初':'最初','一番最後':'最後','後で後悔':'後悔','過半数を超':'過半数を占','違和感を感じ':'違和感を覚え','被害を被':'被害を受け','馬から落馬':'落馬','今の現状':'現状','今現在':'現在','必ず必須':'必須','あらかじめ予約':'予約','あらかじめ予定':'予定','返事を返':'返事をし','返信を返':'返信をし','いまだに未定':'未定','いまだ未定':'未定','すべて全部':'すべて','お体ご自愛':'ご自愛','後ろにバック':'バック','製造メーカー':'メーカー','元旦の朝':'元旦','各利用者ごと':'利用者ごと','各曜日ごと':'曜日ごと'};
// 二重敬語など
const honorifics:Record<string,string>={
 'おっしゃられる':'おっしゃる','おっしゃられた':'おっしゃった','おっしゃられました':'おっしゃいました','おっしゃられて':'おっしゃって',
 '拝見させていただ':'拝見し','お伺いさせていただ':'伺わせていただ','お伺いいたします':'伺います','ご拝読':'拝読',
};
const honorRe=/(ご覧|お越し|お帰り|お見え|お休み|お戻り|お出かけ|お召し上がり|お使い|お決め|お読み|お聞き|お待ち)になられ(る|た|ました|ます|ません|ない|て)/g;
const honorEnd:Record<string,string>={'る':'になる','た':'になった','ました':'になりました','ます':'になります','ません':'になりません','ない':'にならない','て':'になって'};

const rules:Rule[]=[
 fromMap(typos,'誤字・脱字','error',(w,r)=>'「'+w+'」は「'+r+'」の誤りではありませんか。'),
 {re:/づつ/g,kind:'誤字・脱字','level':'error',message:'「〜ずつ」と書くのが正しい表記です。',fix:()=>'ずつ'},
 {re:/くだい(?=[。、ねよ！!）」\s]|$)/g,kind:'誤字・脱字',level:'error',message:'「ください」の「さ」が抜けていませんか。',fix:()=>'ください'},
 // 同じ字・語の重なり
 {re:/(?<![をがのにへ])([をがのにへ])\1(?![をがのにへしる])/g,kind:'重複',level:'error',message:m=>'「'+m[1]+'」が2回続いています。',fix:m=>m[1]},
 {re:/(?<=[一-龯々ァ-ヶー])([はもでと])\1(?=[一-龯々ァ-ヶー、])/g,kind:'重複',level:'error',message:m=>'「'+m[1]+'」が2回続いています。',fix:m=>m[1]},
 {re:/、、+|。。+/g,kind:'重複',level:'error',message:'句読点が続いています。',fix:m=>m[0][0]},
 {re:/、。/g,kind:'記号',level:'error',message:'「、」と「。」が続いています。',fix:()=>'。'},
 {re:/(ます|ました|です|でした|ください|します|いたします)\1(?=[。、！!？?」）\s]|$)/g,kind:'重複',level:'error',message:m=>'「'+m[1]+'」が2回続いています。',fix:m=>m[1]},
 {re:/([一-龯々]{2,})\1/g,kind:'重複',level:'error',message:m=>'「'+m[1]+'」が2回続いています。',fix:m=>m[1]},
 {re:/([ぁ-ゔ]{3,})\1/g,kind:'重複',level:'warn',message:m=>'「'+m[1]+'」が2回続いています。',fix:m=>m[1]},
 // ら抜き言葉
 {re:/(見|来|食べ|寝|起き|出|着|決め|考え|受け|続け|覚え|答え|教え|調べ|比べ|伝え|変え|始め|止め|辞め|集め|投げ|逃げ|借り|信じ|感じ|降り|浴び|生き|任せ|乗せ|見せ|着替え|間違え|居)れ(?=る|ない|ます|ません|た|て|なかっ)/g,kind:'ら抜き言葉',level:'warn',message:m=>'「'+m[0]+'」は「ら」が抜けた話し言葉です。書類では「'+m[1]+'られ」が適切です。',fix:m=>m[1]+'られ'},
 // い抜き言葉（話し言葉）
 {re:/(し|見|来|出|着|寝|食べ|調べ|覚え|教え|考え|伝え|行っ|言っ|思っ|持っ|待っ|知っ|使っ|分かっ|わかっ|頑張っ|がんばっ|作っ|座っ|立っ|笑っ|困っ|喜ん|休ん|読ん|呼ん|遊ん|住ん|取り組ん|書い|聞い|置い|働い|歩い|泣い)(て|で)(?=る|た|ます|ました|ません|ない|なかった)(?!た[まびくしちめんっどて])/g,kind:'い抜き言葉',level:'warn',message:m=>'「'+m[0]+'」の後の「い」が抜けた話し言葉です。書類では「'+m[0]+'い」が適切です。',fix:m=>m[0]+'い'},
 fromMap(honorifics,'敬語','warn',(w,r)=>'「'+w+'」は敬語が重なっています（二重敬語）。「'+r+'」で十分です。'),
 {re:honorRe,kind:'敬語',level:'warn',message:m=>'「'+m[1]+'になられ…」は二重敬語です。「'+m[1]+honorEnd[m[2]]+'」で十分です。',fix:m=>m[1]+honorEnd[m[2]]},
 fromMap(doubles,'重ね言葉','warn',(w,r)=>'「'+w+'」は同じ意味の言葉が重なっています。「'+r+'」で十分です。'),
 {re:/約[0-9０-９一二三四五六七八九十百千万]+[^\s、。]{0,5}?(ほど|くらい|ぐらい|程度)/g,kind:'重ね言葉',level:'warn',message:m=>'「約」と「'+m[1]+'」は同じ意味です。どちらか一方にしましょう。',fix:m=>m[0].slice(1)},
 // 半角カタカナ
 {re:/[ｦ-ﾟ]+/g,kind:'記号',level:'warn',message:'半角カタカナです。全角にしましょう。',fix:m=>m[0].normalize('NFKC')},
 {re:/[^\S\n]{2,}/g,kind:'記号',level:'style',message:'空白が続いています。',fix:m=>m[0][0]},
 {re:/[ 　]+(?=[、。])/g,kind:'記号',level:'style',message:'句読点の前に空白があります。',fix:()=>''},
 // 表記の提案（公用文の書き方：補助動詞・形式名詞はひらがな）
 {re:/(?<=[てで一-龯])頂(?=き|く|け|いた|いて|ける|けま)/g,kind:'表記',level:'style',message:'「〜て頂く」の「頂く」は、ひらがなの「いただく」が一般的です。',fix:()=>'いただ'},
 {re:/(?<=[ぁ-ん一-龯])下さ(?=い|る|っ)/g,kind:'表記',level:'style',message:'「〜て下さい」の「下さい」は、ひらがなの「ください」が一般的です。',fix:()=>'くださ'},
 {re:/致し(?=ます|まし|ません|かね)/g,kind:'表記',level:'style',message:'「致します」は、ひらがなの「いたします」が一般的です。',fix:()=>'いたし'},
 {re:/出来(?=る|ます|ない|ません|た|まし|れば|ず|て)/g,kind:'表記',level:'style',message:'「出来る」は、ひらがなの「できる」が一般的です。',fix:()=>'でき'},
 {re:/(?<=[るたいうくすつぬむぶぐ])事(?=が|は|を|に|も|で|と|な|。|、)/g,kind:'表記',level:'style',message:'「〜する事」の「事」は、ひらがなの「こと」が一般的です。',fix:()=>'こと'},
 {re:/(?<=[るたうくすつぬむぶぐ]|ない)様(?=に|な|だ|です|で)/g,kind:'表記',level:'style',message:'「〜する様に」の「様」は、ひらがなの「よう」が一般的です。',fix:()=>'よう'},
];

// 表記ゆれ：同じ文章の中で書き方が混ざっているもの（多い方にそろえる提案）
const variants:string[][]=[['障害','障がい','障碍'],['子供','子ども'],['利用者様','利用者さん'],['ください','下さい'],['いただ','頂'],['行う','行なう'],['〜','～'],['か月','ヶ月','カ月','ヵ月','ケ月'],['B型','Ｂ型'],['A型','Ａ型'],['メール','Eメール'],['サービス管理責任者','サビ管']];
function variantIssues(text:string):Issue[]{
 const out:Issue[]=[];
 for(const group of variants){
  const hits=group.map(v=>{const pos:number[]=[];let i=text.indexOf(v);while(i>=0){pos.push(i);i=text.indexOf(v,i+v.length)}return {v,pos}}).filter(h=>h.pos.length);
  if(hits.length<2)continue;
  const main=hits.reduce((a,b)=>b.pos.length>a.pos.length?b:a);
  for(const h of hits)if(h!==main)for(const p of h.pos)out.push({start:p,end:p+h.v.length,text:h.v,fix:main.v,kind:'表記ゆれ',level:'style',message:'この文章では「'+main.v+'」と「'+h.v+'」が混ざっています。「'+main.v+'」にそろえると読みやすくなります。'});
 }
 // 全角数字と半角数字の混在
 const full=[...text.matchAll(/[０-９]+/g)],half=[...text.matchAll(/(?<![A-Za-z])[0-9]+/g)];
 if(full.length&&half.length){const toHalf=half.length>=full.length;for(const m of toHalf?full:half)out.push({start:m.index!,end:m.index!+m[0].length,text:m[0],fix:toHalf?m[0].normalize('NFKC'):m[0].replace(/[0-9]/g,d=>String.fromCharCode(d.charCodeAt(0)+0xFEE0)),kind:'表記ゆれ',level:'style',message:'全角と半角の数字が混ざっています。'+(toHalf?'半角':'全角')+'にそろえましょう。'})}
 // です・ます と だ・である の混在
 const polite=[...text.matchAll(/(です|ます|ました|でした|ません|ください)(?=。)/g)],plain=[...text.matchAll(/(である|だ|だった|ではない)(?=。)/g)];
 if(polite.length&&plain.length){const minority=polite.length>=plain.length?plain:polite;for(const m of minority)out.push({start:m.index!,end:m.index!+m[0].length,text:m[0],kind:'表記ゆれ',level:'style',message:polite.length>=plain.length?'「です・ます」の文の中に「だ・である」の文が混ざっています。':'「だ・である」の文の中に「です・ます」の文が混ざっています。'})}
 return out;
}

// 括弧の対応
const pairs:Record<string,string>={'「':'」','『':'』','（':'）','(':')','【':'】','［':'］','〔':'〕','“':'”'};
const closers=Object.fromEntries(Object.entries(pairs).map(([o,c])=>[c,o]));
function bracketIssues(text:string):Issue[]{
 const out:Issue[]=[],stack:{ch:string;at:number}[]=[];
 for(let i=0;i<text.length;i++){const ch=text[i];
  if(pairs[ch]){stack.push({ch,at:i});continue}
  if(closers[ch]){const top=stack[stack.length-1];if(top&&top.ch===closers[ch])stack.pop();else out.push({start:i,end:i+1,text:ch,kind:'括弧',level:'error',message:'「'+ch+'」に対応する「'+closers[ch]+'」がありません。'})}
 }
 for(const s of stack)out.push({start:s.at,end:s.at+1,text:s.ch,kind:'括弧',level:'error',message:'「'+s.ch+'」を閉じる「'+pairs[s.ch]+'」がありません。'});
 return out;
}

// 日付と曜日の食い違い（年が無いときは今年。11〜12月に1〜2月の日付なら来年とみなす）
const week='日月火水木金土';
const num=(s:string)=>Number(s.normalize('NFKC'));
function dateIssues(text:string,now:Date):Issue[]{
 const out:Issue[]=[];const jst=new Date(now.getTime()+9*3600e3),thisYear=jst.getUTCFullYear(),thisMonth=jst.getUTCMonth()+1;
 const check=(index:number,whole:string,y:number|null,m:number,d:number,w:string,wAt:number)=>{
  const year=y??(thisMonth>=11&&m<=2?thisYear+1:thisYear);
  const dt=new Date(Date.UTC(year,m-1,d));
  if(m<1||m>12||dt.getUTCMonth()!==m-1){out.push({start:index,end:index+whole.length,text:whole,kind:'日付',level:'error',message:year+'年に'+m+'月'+d+'日はありません。'});return}
  const right=week[dt.getUTCDay()];
  if(right!==w)out.push({start:wAt,end:wAt+1,text:w,fix:right,kind:'日付',level:'error',message:year+'年'+m+'月'+d+'日は'+right+'曜日です（「'+w+'」になっています）。'+(y?'':'年が書かれていないため'+year+'年として確認しました。')});
 };
 for(const m of text.matchAll(/(?:(令和|R)?\s*([0-9０-９]{1,4})\s*年\s*)?([0-9０-９]{1,2})\s*月\s*([0-9０-９]{1,2})\s*日\s*[（(]\s*([日月火水木金土])/g)){
  let y:number|null=m[2]?num(m[2]):null;if(y!==null&&(m[1]||y<100))y=2018+y;
  check(m.index!,m[0],y,num(m[3]),num(m[4]),m[5],m.index!+m[0].length-1);
 }
 for(const m of text.matchAll(/(?<![0-9０-９/])([0-9０-９]{1,2})\s*[/／]\s*([0-9０-９]{1,2})\s*[（(]\s*([日月火水木金土])/g))check(m.index!,m[0],null,num(m[1]),num(m[2]),m[3],m.index!+m[0].length-1);
 return out;
}

// 一文が長すぎる
function lengthIssues(text:string):Issue[]{const out:Issue[]=[];let start=0;for(const part of text.split(/(?<=[。！？!?\n])/)){const body=part.trim();if(body.length>120)out.push({start,end:start+part.length,text:part,kind:'読みやすさ',level:'style',message:'一文が'+body.length+'文字あります。2つ以上の文に区切ると読みやすくなります。'});start+=part.length}return out}

const rank:Record<Level,number>={error:0,warn:1,style:2};
export function proofread(text:string,now=new Date()):Issue[]{
 const found:Issue[]=[];
 for(const r of rules){r.re.lastIndex=0;for(const m of text.matchAll(r.re)){if(!m[0]||(r.kind==='重複'&&r.level==='warn'&&/っ/.test(m[1])))continue;found.push({start:m.index!,end:m.index!+m[0].length,text:m[0],fix:r.fix?.(m),kind:r.kind,level:r.level,message:typeof r.message==='string'?r.message:r.message(m)})}}
 found.push(...bracketIssues(text),...dateIssues(text,now),...variantIssues(text));
 const long=lengthIssues(text);
 // 重なった指摘は、重要度の高いもの（同じなら先に見つかったもの）だけを残す。「長い文」は重ねて表示してよい。
 const kept:Issue[]=[];
 for(const i of found.sort((a,b)=>rank[a.level]-rank[b.level]||a.start-b.start))if(!kept.some(k=>i.start<k.end&&k.start<i.end))kept.push(i);
 return [...kept,...long].sort((a,b)=>a.start-b.start||rank[a.level]-rank[b.level]);
}
// 指摘を文章に反映する（後ろから順に置き換えるので位置がずれない）
export function applyFixes(text:string,issues:Issue[]){let out=text;for(const i of [...issues].filter(i=>i.fix!==undefined).sort((a,b)=>b.start-a.start))out=out.slice(0,i.start)+i.fix+out.slice(i.end);return out}
export const signature=(i:Issue)=>i.kind+'|'+i.text;
