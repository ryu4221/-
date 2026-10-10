import {chat,AiError} from './ai';
import {parseDraft,characterCount} from './dailyAssistant';
import {groundingIssues,formatDailyRecord,retainGroundedSentences,type GroundingOptions} from './dailyGrounding';
// 2026-10-10 改訂：
//  - 短すぎる時の書き直しは「今日のメモの事実の量から決めた下限」（dailyStyle.lengthPlan の target）未満の時だけ頼む。
//    事実の少ない日に、目安の字数まで水増しさせない。
//  - 書き直しの指示は、事実の追加ではなく「メモの各項目を事業所の言い方で1〜2文にする」ことに限る。
//  - 見本（架空）の内容の混入も検出する（options.distinct）。
export async function groundedDailyAi(config:Parameters<typeof chat>[0],prompt:{system:string;user:string;target?:{record:readonly number[];consideration:readonly number[]}},memo:string,options:GroundingOptions={}){
 let correction='',repairUnavailable='',draft={record:'',consideration:''};
 const isShort=(d:typeof draft)=>!!prompt.target&&(characterCount(d.record)<prompt.target.record[0]||characterCount(d.consideration)<prompt.target.consideration[0]);
 for(let attempt=0;attempt<2;attempt++){
  try{draft=parseDraft(await chat(config,prompt.system,prompt.user+correction));}
  catch(e){if(attempt===0||(!draft.record&&!draft.consideration))throw e;repairUnavailable='文章の調整を完了できませんでした。最初に作成した文章から確認できない文を除いて表示しています。';break;}
  draft={...draft,record:formatDailyRecord(draft.record)};
  const issues=groundingIssues(draft,memo,options);
  if(!issues.length&&!isShort(draft))return {...draft,warnings:[] as string[]};
  correction='\n\n【修正する下書き（正しい文はそのまま残す）】\n【日々の記録】\n'+draft.record+'\n【職員考察】\n'+draft.consideration
   +(issues.length?'\n【今日のメモで確認できない部分】\n'+issues.join('\n')+'\nこの部分は削除するか、今日のメモに書かれている内容どおりに直してください。':'')
   +(isShort(draft)?`\n【短い部分】現在は記録${characterCount(draft.record)}字・考察${characterCount(draft.consideration)}字です。今日のメモの項目のうち文章になっていないものを、事業所の言い方で1〜2文ずつ加えてください（本人の申告は「〜とのことでした」、様子は「〜されていました」）。考察は「今日の取り組み→そこから言えること→今後も（場面と方法）支援していきます。」の3〜4文にしてください。メモに無い出来事・声かけ・様子は足さないでください。`:'')
   +'\n指定の2見出しで全文を出力してください。';
 }
 const clean=retainGroundedSentences(draft,memo,options),warnings:string[]=[];
 if(repairUnavailable)warnings.push(repairUnavailable);
 if(!clean.record&&!clean.consideration)throw new AiError('今日の事実を確認できる文章が残りませんでした。作業中の様子や本人の話を追記して、もう一度作成してください。');
 if(clean.removed)warnings.push('入力にない数値・発言・行動や、根拠を確認できない様子・評価を含む文を除きました。残った文章と不足部分を確認してください。');
 if(clean.unverified)warnings.push(`日々の記録に、今日のメモと対応する語が見つからない文が${clean.unverified}つあります。今日の出来事か確認してください。`);
 if(isShort(clean))warnings.push('文字数は目安より短めです。必要に応じて、作業中の様子・本人の話・職員の対応を今日のメモに追記して作り直してください。');
 return {record:formatDailyRecord(clean.record),consideration:clean.consideration,warnings};
}
