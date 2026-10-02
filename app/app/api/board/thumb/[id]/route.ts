import {bucket,json} from '../../../../../lib/storage';
export const dynamic='force-dynamic';
// 一覧に出す小さなプレビュー画像（投稿時にブラウザーで作ったもの）
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const file=await bucket().get('board/thumb/'+id);if(!file)return json({error:'プレビューがありません。'},404);const type=file.httpMetadata?.contentType;return new Response(file.body,{headers:{'Content-Type':type&&/^image\/(webp|png|jpeg)$/.test(type)?type:'application/octet-stream','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'}})}catch{return json({error:'プレビューを読み込めませんでした。'},503)}}
