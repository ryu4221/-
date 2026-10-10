// 架空データだけで確認するテスト（実在の利用者・記録は使わない）。
// 実行：node tests/run-tests.mjs（lib を一時フォルダーへ写し、ai・dailyAssistant を偽物に差し替えて実行する）
import assert from 'node:assert/strict';
import {groundingIssues,formatDailyRecord,retainGroundedSentences,insertResponder,splitSentences,unanchored,unanchoredLabel} from './lib/dailyGrounding.ts';
import {resolveMode,lengthPlan,systemPrompt,userTail,exemplars,isWorkOnly,memoFacts} from './lib/dailyStyle.ts';
import {groundedDailyAi} from './lib/groundedDailyAi.ts';
import {setReplies,sentPrompts} from './lib/ai.ts';

let pass=0;const t=async(name:string,fn:()=>void|Promise<void>)=>{await fn();pass++;console.log('ok',name);};
const count=(s:string)=>s.replace(/\s/g,'').length;

// ── 書式 ──
await t('見出しをノウビーの書式にそろえる',()=>{
 const r=formatDailyRecord('9:40に作業開始のご連絡を頂きました。朝は眠いとのことでした。\n11:50に本人から作業終了の電話がありました。予定分を終えたとの報告でした。');
 assert.equal(r,'09:40作業開始の連絡頂きました。\n朝は眠いとのことでした。\n11:50作業終了の連絡頂きました。\n予定分を終えたとの報告でした。');
});
await t('担当職員の表示を見出しの後ろに付ける',()=>{
 assert.equal(insertResponder('09:40作業開始の連絡頂きました。\n本文。\n11:50作業終了の連絡頂きました。\n本文。','職員A'),'09:40作業開始の連絡頂きました。（職員A対応）\n本文。\n11:50作業終了の連絡頂きました。（職員A対応）\n本文。');
 assert.equal(insertResponder('10:00に来所されました。\n本文。','職員B'),'10:00に来所されました。（職員B対応）\n本文。');
});
await t('「」の中の句点で文を分けない',()=>{assert.deepEqual(splitSentences('「はい。やります」と話されました。次の文。'),['「はい。やります」と話されました。','次の文。']);});

// ── 根拠チェック ──
const memo='09:30 作業開始の連絡（在宅）\n作業：封入作業 5set\n眠い。体調は普段どおり\n本人の言葉：「ゆっくりやります」\n11:00 作業終了の連絡';
const ok=(record:string,consideration:string,m=memo)=>groundingIssues({record,consideration},m);
await t('正しい言い換えは通す（眠い→眠気、普段どおり→変わりない）',()=>{
 assert.deepEqual(ok('09:30作業開始の連絡頂きました。\n少し眠気があるとのことでした。体調は普段と変わらないとのお話です。「ゆっくりやります」と話されました。\n11:00作業終了の連絡頂きました。\n封入作業を終えたとの連絡でした。','封入作業5setされました。\n開始時から眠気があることを話していただき、普段と変わらない体調で作業に取り組まれました。今後も開始時の連絡で睡眠や体調を伺い、無理のないペースで取り組めるよう支援していきます。'),[]);
});
await t('入力にない職員の声かけ・休憩・了承を検出',()=>{
 const i=ok('眠気があるとのことでした。休憩を取るようお伝えしたところ、了解されました。','封入作業5setされました。\n今後も支援していきます。');
 assert.ok(i.includes('メモにない行動：職員の声かけ・対応'));assert.ok(i.includes('メモにない行動：休憩'));assert.ok(i.includes('メモにない行動：本人の了承'));
});
await t('「今後」を含む文でも前半の根拠なしの評価は検出し、方針部分は通す',()=>{
 assert.ok(ok('眠気があるとのことでした。','封入作業5setされました。\n集中して取り組めていたため、今後も見守っていきます。').includes('今日の根拠がない様子・評価：集中'));
 assert.deepEqual(ok('眠気があるとのことでした。','封入作業5setされました。\n眠気がある中でも作業を終えられています。今後も集中して取り組めるよう休憩の声かけを行っていきます。'),[]);
 assert.ok(ok('眠気があるとのことでした。','封入作業5setされました。\n以前より落ち着いて作業できるようになり、休憩の声かけを続けていきます。').length>0);
});
await t('否定の文も根拠が無ければ検出',()=>{
 assert.deepEqual(ok('体調の変化はありませんでした。','封入作業5setされました。\n今後も体調を伺っていきます。'),[]);
 const m2='作業：封入作業 5set\n本人の言葉：「ゆっくりやります」';
 assert.ok(ok('体調の変化はありませんでした。','封入作業5setされました。\n今後も体調を伺っていきます。',m2).includes('今日の根拠がない様子・評価：体調の変化・不調'));
});
await t('時刻・数量・発言・作業名・見本の内容の混入を検出',()=>{
 const i=groundingIssues({record:'10:15に昼食をとり「疲れました」と話されました。寝つきが悪かったとのことでした。',consideration:'チラシ折り5setされました。\n今後も支援していきます。'},memo,{distinct:exemplars.在宅.distinct});
 assert.ok(i.includes('メモにない時刻・数量：10:15'));assert.ok(i.some(x=>x.startsWith('メモにない発言')));
 assert.ok(i.includes('メモにない作業名：チラシ折り'));assert.ok(i.includes('メモにない内容（見本の内容）：寝つき'));
});
await t('引用の句読点・全角半角の違いは同じ発言として扱う',()=>{
 assert.deepEqual(ok('「ゆっくりやります。」と話されました。','封入作業5setされました。\n今後も体調を伺っていきます。'),[]);
});
await t('今日のメモと対応しない文（過去の記録の転用）は書き直しを頼み、削除はせず件数を返す',()=>{
 assert.equal(unanchored('少し眠気があるとのことでした。','眠い'),false);
 assert.equal(unanchored('睡眠が短かったとのことでした。','寝不足'),false);
 assert.equal(unanchored('腰の痛みがあるとのことでした。','腰が痛い'),false);
 assert.equal(unanchored('洗濯物を干してから作業を始められています。',memo),true);
 const i=ok('洗濯物を干してから作業を始められています。','封入作業5setされました。\n今後も体調を伺っていきます。');
 assert.ok(i.some(x=>x.startsWith(unanchoredLabel)));
 const c=retainGroundedSentences({record:'眠気があるとのことでした。洗濯物を干してから作業を始められています。',consideration:'封入作業5setされました。'},memo);
 assert.ok(c.record.includes('洗濯物'));assert.equal(c.unverified,1);
});
await t('根拠の無い文だけを除き、他の文は残す',()=>{
 const c=retainGroundedSentences({record:'眠気があるとのことでした。笑顔で集中して取り組まれていました。',consideration:'封入作業5setされました。\n以前より手際が向上しています。今後も体調を伺っていきます。'},memo);
 assert.equal(c.record,'眠気があるとのことでした。');assert.equal(c.consideration,'封入作業5setされました。\n今後も体調を伺っていきます。');assert.equal(c.removed,2);
});

// ── 書き方（利用の形・文字数・プロンプト） ──
await t('利用の形：指定を優先し、未指定はメモの語から書式だけ選ぶ',()=>{
 assert.equal(resolveMode('',memo),'在宅');assert.equal(resolveMode('','10:00 来所\n作業：封入'),'通所');
 assert.equal(resolveMode('','施設外就労\n作業：品出し'),'施設外');assert.equal(resolveMode('','作業：POP作成'),'未指定');assert.equal(resolveMode('通所',memo),'通所');
});
await t('文字数の目安はメモの事実の量に合わせる（作業名のみは短く、書き直しを頼まない）',()=>{
 assert.equal(isWorkOnly('作業：チラシ折り 5set'),true);
 const w=lengthPlan('在宅','作業：チラシ折り 5set');assert.equal(w.target.record[0],0);assert.equal(w.target.consideration[0],0);
 const rich=lengthPlan('在宅',exemplars.在宅.memo);assert.ok(memoFacts(exemplars.在宅.memo)>=6);
 assert.ok(rich.hint.record>=300&&rich.hint.record<=370,String(rich.hint.record));assert.ok(rich.hint.consideration>=155&&rich.hint.consideration<=190);
});
await t('system は利用の形ごとの見本を1組だけ含み、末尾指示は「書き直し」ではない',()=>{
 const s=systemPrompt('通所');assert.ok(s.includes(exemplars.通所.record));assert.ok(!s.includes(exemplars.在宅.record));
 assert.ok(systemPrompt('在宅').includes('作業開始の連絡頂きました'));assert.ok(!systemPrompt('通所').includes('（作業名）（量）されました'));
 const u=userTail('在宅',memo);assert.ok(!u.includes('書き直し'));assert.ok(u.includes('文字数の目安'));
});
await t('見本の出力そのものが規則チェックを通る（見本が書き方の手本として矛盾しない）',()=>{
 for(const m of ['在宅','通所','施設外','未指定'] as const){const e=exemplars[m];
  assert.deepEqual(groundingIssues({record:formatDailyRecord(e.record),consideration:e.consideration},e.memo),[],m);}
 assert.ok(count(exemplars.在宅.record)>=300&&count(exemplars.在宅.record)<=370,String(count(exemplars.在宅.record)));
 assert.ok(count(exemplars.在宅.consideration)>=155&&count(exemplars.在宅.consideration)<=190,String(count(exemplars.在宅.consideration)));
});

// ── 再調整の流れ（AIは偽物） ──
const cfg={} as never;
await t('初回に入力外の文があれば修正を1回頼み、正しい修正版を返す',async()=>{
 setReplies(['【日々の記録】\n9:30に作業開始のご連絡を頂きました。少し眠気があるとのことでした。休憩するようお伝えしました。\n11:00に作業終了のご連絡を頂きました。終えたとの連絡でした。\n【職員考察】\n封入作業5setされました。\n集中して取り組めていました。今後も支援していきます。',
  '【日々の記録】\n09:30作業開始の連絡頂きました。\n少し眠気があるとのことでした。\n11:00作業終了の連絡頂きました。\n終えたとの連絡でした。\n【職員考察】\n封入作業5setされました。\n眠気がある中で作業を終えられています。今後も開始時の連絡で体調を伺っていきます。']);
 const r=await groundedDailyAi(cfg,{system:'s',user:'u'},memo);
 assert.deepEqual(r.warnings,[]);assert.ok(r.record.startsWith('09:30作業開始の連絡頂きました。\n'));
 assert.ok(sentPrompts()[1].includes('メモにない行動：職員の声かけ・対応'));assert.ok(sentPrompts()[1].includes('今日の根拠がない様子・評価：集中'));
});
await t('修正後も残る入力外の文は除き、警告を付ける',async()=>{
 const bad='【日々の記録】\n09:30作業開始の連絡頂きました。\n少し眠気があるとのことでした。笑顔で作業されていました。\n【職員考察】\n封入作業5setされました。\n今後も体調を伺っていきます。';
 setReplies([bad,bad]);
 const r=await groundedDailyAi(cfg,{system:'s',user:'u'},memo);
 assert.ok(!r.record.includes('笑顔'));assert.equal(r.warnings.length,1);
});
await t('作業名のみのメモは短くても書き直しを頼まず、入力外の様子は除く',async()=>{
 const m='作業：チラシ折り 5set';const plan=lengthPlan('在宅',m);
 setReplies(['【日々の記録】\nチラシ折りを行いました。落ち着いて取り組まれていました。\n【職員考察】\nチラシ折り5setされました。\n次回は作業中の様子や体調を伺い、記録に残していきます。','【日々の記録】\nチラシ折りを行いました。\n【職員考察】\nチラシ折り5setされました。\n次回は作業中の様子や体調を伺い、記録に残していきます。']);
 const r=await groundedDailyAi(cfg,{system:'s',user:'u',target:plan.target},m);
 assert.equal(r.record,'チラシ折りを行いました。');assert.deepEqual(r.warnings,[]);
});
await t('事実が多いのに短すぎる時だけ書き直しを頼む',async()=>{
 const plan=lengthPlan('在宅',exemplars.在宅.memo);
 const short='【日々の記録】\n09:35作業開始の連絡頂きました。\n眠気があるとのことでした。\n11:40作業終了の連絡頂きました。\n予定分を終えたと報告がありました。\n【職員考察】\nチラシ折り4setされました。\n今後も体調を伺っていきます。';
 const full='【日々の記録】\n'+exemplars.在宅.record+'\n【職員考察】\n'+exemplars.在宅.consideration;
 setReplies([short,full]);
 const r=await groundedDailyAi(cfg,{system:'s',user:'u',target:plan.target},exemplars.在宅.memo,{distinct:[]});
 assert.ok(sentPrompts()[1].includes('【短い部分】'));assert.deepEqual(r.warnings,[]);assert.equal(r.record,exemplars.在宅.record);
});
await t('複数人を順に作っても、他の人の失敗で結果を失わない（逐次・個別呼出しの確認）',async()=>{
 const people=[{memo,ok:true},{memo:'作業：封入作業 3set',ok:false}];const out:Record<number,string>={};
 for(const [i,p] of people.entries()){
  setReplies(p.ok?['【日々の記録】\n09:30作業開始の連絡頂きました。\n少し眠気があるとのことでした。\n【職員考察】\n封入作業5setされました。\n今後も体調を伺っていきます。']:[new Error('timeout')]);
  try{out[i]=(await groundedDailyAi(cfg,{system:'s',user:'u'},p.memo)).record;}catch{out[i]='（失敗）';}
 }
 assert.ok(out[0].includes('眠気'));assert.equal(out[1],'（失敗）');
});
console.log(`\n${pass} 件すべて合格`);
