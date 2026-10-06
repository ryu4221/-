// @ts-nocheck -- Nodeの型除去で直接実行するため、.ts拡張子つきで読み込む
// 誤字脱字チェックの規則の確認（実行：node --experimental-strip-types scripts/proofread.test.mts）
// 「見つけるべきもの」と「誤って指摘してはいけない普通の文」を確かめる。規則を変えたら必ず実行する。
import {proofread,applyFixes} from '../lib/proofread.ts';
const now=new Date('2026-10-06T00:00:00Z');
let fail=0;
const show=(t:string)=>proofread(t,now).map(i=>`[${i.level}/${i.kind}] ${i.text}${i.fix!==undefined?' → '+i.fix:''}`);
function hits(text:string,expectFix:string){const fixed=applyFixes(text,proofread(text,now).filter(i=>i.level!=='style'));if(fixed!==expectFix){fail++;console.log('✗ FIX',JSON.stringify(text),'\n   got ',JSON.stringify(fixed),'\n   want',JSON.stringify(expectFix),'\n  ',show(text))}}
function clean(text:string,allowStyle=true){const r=proofread(text,now).filter(i=>allowStyle?i.level!=='style':true);if(r.length){fail++;console.log('✗ FALSE POSITIVE',JSON.stringify(text),show(text))}}
function flags(text:string,kind:string){if(!proofread(text,now).some(i=>i.kind===kind)){fail++;console.log('✗ MISSED',kind,JSON.stringify(text),show(text))}}
// 見つけるべきもの
hits('本日はは作業に参加。','本日は作業に参加。');
hits('今日もも作業所へ。','今日も作業所へ。');
hits('作業所でで昼食。','作業所で昼食。');
hits('本日は作業にに参加しました。','本日は作業に参加しました。');
hits('利用者様をを送迎しました。','利用者様を送迎しました。');
hits('よろしくお願いしす。','よろしくお願いします。');
hits('ありがとうござます。','ありがとうございます。');
hits('少しづつ慣れてきています。','少しずつ慣れてきています。');
hits('受給者症の更新があります。','受給者証の更新があります。');
hits('次回のモニタリンクは来月です。','次回のモニタリングは来月です。');
hits('明日は来れますか。','明日は来られますか。');
hits('一人で着替えれるようになった。','一人で着替えられるようになった。');
hits('作業に集中してます。','作業に集中しています。');
hits('今日は休んでました。','今日は休んでいました。');
hits('支援支援計画を作成。','支援計画を作成。');
hits('提出してください。。','提出してください。');
hits('確認しましたました。','確認しました。');
hits('まず最初に検温します。','最初に検温します。');
hits('違和感を感じるとのこと。','違和感を覚えるとのこと。');
hits('施設長がおっしゃられた通りです。','施設長がおっしゃった通りです。');
hits('資料をご覧になられましたか。','資料をご覧になりましたか。');
hits('約30分ほど休憩しました。','30分ほど休憩しました。');
hits('ﾚｸﾘｴｰｼｮﾝを行います。','レクリエーションを行います。');
hits('レクレーションに参加。','レクリエーションに参加。');
hits('10月5日（火）に会議があります。','10月5日（月）に会議があります。');
hits('2026年10月6日(月)','2026年10月6日(火)');
hits('10/7(火)は休みです。','10/7(水)は休みです。');
hits('こちらに記入してくだい。','こちらに記入してください。');
flags('「本日の予定を確認する。','括弧');
flags('予定）を確認。','括弧');
flags('2月30日（月）','日付');
flags('障害福祉サービスと障がい者支援について、障害の特性を','表記ゆれ');
flags('支援する事が大切です。','表記');
flags('ご協力頂きありがとうございます。','表記');
flags('ご確認下さい。','表記');
flags('お願い致します。','表記');
flags('一人で出来るようになった。','表記');
// 誤って指摘してはいけない普通の文
clean('本日は10月6日（火）です。');
clean('利用者様の様子を確認し、ご家族に連絡しました。');
clean('ますます元気に作業に取り組んでいます。');
clean('いろいろな作業を少しずつ覚えています。');
clean('ゆっくりゆっくり歩いていました。');
clean('ののしるような言葉はありませんでした。');
clean('母は元気です。もも缶を食べました。');
clean('ここで待っていてください。');
clean('見ればわかる。出れば間に合う。');
clean('忘れないように伝えています。');
clean('捨てる・育てる・立てる作業を行った。');
clean('支援計画書を作成し、本人に説明した。');
clean('「今日は楽しかった」と話していた。');
clean('（午前）軽作業、（午後）清掃。');
clean('日々の様子、時々笑顔が見られる。');
clean('これからも見守ります。');
clean('お疲れさまでした。ありがとうございました。');
clean('してたまに休む。',false); // 「していた」と区別できないので許容範囲外ならメモ
clean('入れる、入れない、入れます。');
clean('来年度の計画について話し合った。');
clean('作業時間は約30分です。');
clean('砕いてくだいた氷');
clean('太ももが痛いと話した。母はは元気。'.slice(0,10));
clean('父と母は元気です。');
clean('ここでで');
console.log(fail?fail+' 件の失敗':'すべて合格');if(fail)process.exit(1);
