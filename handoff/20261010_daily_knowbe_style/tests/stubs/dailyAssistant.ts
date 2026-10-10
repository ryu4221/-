// テスト用：正本 lib/dailyAssistant.ts の characterCount・parseDraft と同じ働き（空白・改行を除いて数える）
export const characterCount=(s:string)=>s.replace(/\s/g,'').length;
export function parseDraft(text:string){
 const t=text.replace(/<think>[\s\S]*?<\/think>/g,'').replace(/\r/g,'').trim();
 const r=t.match(/【日々の記録】\s*([\s\S]*?)(?=【職員考察】|$)/),c=t.match(/【職員考察】\s*([\s\S]*)$/);
 if(!r&&!c)return {record:t,consideration:''};
 return {record:(r?.[1]??'').trim(),consideration:(c?.[1]??'').trim()};
}
