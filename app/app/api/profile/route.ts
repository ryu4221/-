import {database,json,sameOrigin} from '../../../lib/storage';
import {validateProfile} from '../../../lib/profile';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{const id=new URL(req.url).searchParams.get('person');if(!id)return json({error:'利用者を選択してください。'},400);const row=await database().prepare('SELECT profile FROM people WHERE id=?').bind(id).first<{profile:string}>();if(!row)return json({error:'利用者が見つかりません。'},404);return json(JSON.parse(row.profile));}catch{return json({error:'基本情報を読み込めませんでした。'},503)}}
export async function PUT(req:Request){
 if(!sameOrigin(req))return json({error:'許可されていない操作です。'},403);
 let data:{id:string;profile:unknown};let profile;
 try{data=await req.json();if(typeof data.id!=='string')throw Error('利用者を選択してください。');profile=validateProfile(data.profile);}catch(e){return json({error:e instanceof Error?e.message:'入力を確認してください。'},400)}
 try{const result=await database().prepare('UPDATE people SET profile=? WHERE id=?').bind(JSON.stringify(profile),data.id).run();if(!result.meta.changes)return json({error:'利用者が見つかりません。'},404);return json(profile);}catch{return json({error:'基本情報を保存できませんでした。'},503)}
}
