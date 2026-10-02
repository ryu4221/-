'use client';
// 一覧用の小さなプレビュー画像を、投稿する人のブラウザーで作る。PDFは1ページ目、画像はそのまま縮小。
// 作れなかったときは null（プレビューなしで投稿できる）。
const WIDTH=320;
async function toBlob(canvas:HTMLCanvasElement){return new Promise<Blob|null>(r=>canvas.toBlob(b=>r(b),'image/webp',.8)).then(b=>b&&b.type==='image/webp'?b:new Promise<Blob|null>(r=>canvas.toBlob(r,'image/jpeg',.8)));}
async function fromPdf(file:File){
 // 1ページだけ描くので、別スレッドのworkerは使わずページ内で動かす（開発・本番とも同じ読み込み方）
 const [pdfjs,worker]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs')]);
 (globalThis as {pdfjsWorker?:unknown}).pdfjsWorker=worker;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});const doc=await task.promise;
 try{const page=await doc.getPage(1);const base=page.getViewport({scale:1});const viewport=page.getViewport({scale:WIDTH/base.width});const canvas=document.createElement('canvas');canvas.width=Math.round(viewport.width);canvas.height=Math.min(Math.round(viewport.height),WIDTH*2);const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);await page.render({canvasContext:ctx,viewport}).promise;return toBlob(canvas);}finally{void task.destroy()}
}
async function fromImage(file:File){const bmp=await createImageBitmap(file);const scale=Math.min(1,WIDTH/bmp.width);const canvas=document.createElement('canvas');canvas.width=Math.round(bmp.width*scale);canvas.height=Math.min(Math.round(bmp.height*scale),WIDTH*2);canvas.getContext('2d')!.drawImage(bmp,0,0,canvas.width,Math.round(bmp.height*scale));bmp.close();return toBlob(canvas);}
export async function makeThumbnail(files:File[]):Promise<Blob|null>{
 const file=files.find(f=>/\.(pdf|png|jpe?g|webp)$/i.test(f.name));if(!file)return null;
 try{const blob=/\.pdf$/i.test(file.name)?await fromPdf(file):await fromImage(file);return blob&&blob.size<=400*1024?blob:null;}catch(e){console.warn('preview skipped',e);return null}
}
