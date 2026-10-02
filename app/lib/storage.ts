import {env} from 'cloudflare:workers';
export function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('Database unavailable');return db;}
export function bucket(){const b=(env as unknown as {BUCKET:R2Bucket}).BUCKET;if(!b)throw new Error('Storage unavailable');return b;}
export const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
