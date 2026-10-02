// Each enabled feature is represented by exactly one student in the classroom.
// Add a real feature route here when it is implemented; the room grows automatically.
export const classroomFeatures = [
  {id:'users',label:'利用者情報',href:'/users',avatar:'/classroom/student-chunky.png',description:'利用者様の基本情報・支援書類'},
  {id:'board',label:'回覧板',href:'/',avatar:'/classroom/student-board.png',description:'職員へのお知らせ・シフト表と確認チェック'},
];
export function classroomLayout(count:number){
  const columns=Math.min(3,Math.max(1,count));
  const rows=Math.max(1,Math.ceil(count/3));
  return {columns,rows,width:Math.min(1280,1000+Math.max(0,count-1)*65),height:600+(rows-1)*180};
}

