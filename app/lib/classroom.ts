// Each enabled feature is represented by exactly one student in the classroom.
// Add a real feature route here when it is implemented; the room grows automatically.
export const classroomFeatures = [
  {id:'users',label:'利用者情報',href:'/users',avatar:'/classroom/student-chunky.png',description:'利用者様の基本情報・支援書類'},
  {id:'board',label:'回覧板',href:'/',avatar:'/classroom/student-board.png',description:'職員へのお知らせ・シフト表と確認チェック'},
  {id:'proof',label:'文章チェック',href:'/',avatar:'/classroom/student-proof.png',description:'誤字・脱字のチェック（文章は保存・送信しない）'},
  {id:'daily',label:'日々の記録',href:'/',avatar:'/classroom/student-daily.png',description:'日々の記録・職員考察の下書き作成（AI）'},
];
export function classroomLayout(count:number){
  // 広い画面では4人まで横一列。狭い画面の並びは classroom.css で2列にする。
  const columns=Math.min(4,Math.max(1,count));
  const rows=Math.max(1,Math.ceil(count/4));
  return {columns,rows,width:Math.min(1280,1000+Math.max(0,count-1)*65),height:600+(rows-1)*180};
}

