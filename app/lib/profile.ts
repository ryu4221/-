export const profileFields=[
 {key:'kana',label:'フリガナ',group:'本人情報'},
 {key:'birthDate',label:'生年月日',type:'date',group:'本人情報'},
 {key:'gender',label:'性別',group:'本人情報'},
 {key:'recipientNumber',label:'受給者証番号',group:'本人情報'},
 {key:'disabilityTypes',label:'障害種別',group:'本人情報'},
 {key:'postalCode',label:'郵便番号',group:'住所・連絡先'},
 {key:'prefecture',label:'請求先の都道府県',group:'住所・連絡先'},
 {key:'address',label:'市区町村以降の住所・居住地',group:'住所・連絡先'},
 {key:'phone',label:'電話番号',type:'tel',group:'住所・連絡先'},
 {key:'email',label:'メールアドレス',group:'住所・連絡先'},
 {key:'guardianName',label:'保護者氏名',group:'緊急連絡先'},
 {key:'guardianRelation',label:'続柄',group:'緊急連絡先'},
 {key:'emergencyPhone',label:'緊急連絡先の電話番号',type:'tel',group:'緊急連絡先'},
 {key:'serviceStart',label:'サービス提供開始日',type:'date',group:'利用情報'},
 {key:'serviceEnd',label:'サービス提供終了日',type:'date',group:'利用情報'},
 {key:'memo',label:'備考',type:'textarea',group:'利用情報'},
] as const;
export type Profile=Partial<Record<(typeof profileFields)[number]['key'],string>>&{phoneUnavailable?:boolean};
export function validateProfile(value:unknown):Profile{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('基本情報の形式を確認してください。');
 const result:Profile={};
 for(const f of profileFields){const v=(value as Record<string,unknown>)[f.key];if(v===undefined)continue;if(typeof v!=='string'||v.length>(f.key==='memo'?10000:500))throw Error('基本情報の文字数を確認してください。');const s=v.trim();if('type' in f&&f.type==='date'&&s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('日付を確認してください。');}result[f.key]=s;}
 if((value as Record<string,unknown>).phoneUnavailable===true&&!result.phone)result.phoneUnavailable=true;
 return result;
}
