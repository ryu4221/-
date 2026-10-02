// 回覧板の共通定義（サーバー・画面の両方で使う）
export const folderColors=[
 {key:'green',label:'みどり',bg:'#e3eedb',ink:'#3f6a43'},
 {key:'blue',label:'あお',bg:'#dfe9f3',ink:'#3b5f86'},
 {key:'orange',label:'だいだい',bg:'#f8e6cf',ink:'#93582a'},
 {key:'red',label:'あか',bg:'#f6dfda',ink:'#9a4436'},
 {key:'purple',label:'むらさき',bg:'#ebe2f1',ink:'#674d84'},
 {key:'gray',label:'はいいろ',bg:'#e9e9e2',ink:'#5d6259'},
] as const;
export type FolderColor=(typeof folderColors)[number]['key'];
export const colorOf=(key:string)=>folderColors.find(c=>c.key===key)??folderColors[5];
// フォルダーが無いときに一度で作れる候補（自動では作らない）
export const suggestedFolders:{name:string;color:FolderColor}[]=[{name:'シフト表',color:'blue'},{name:'会議・研修',color:'green'},{name:'連絡事項',color:'orange'},{name:'行事・イベント',color:'purple'}];
export const boardFileTypes=/\.(pdf|docx?|xlsx?|jpe?g|png|webp|txt)$/i;
export const boardAccept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt';
export const boardLimits={title:100,body:5000,name:50,files:5,fileSize:20*1024*1024,total:50*1024*1024};
export type Staff={id:string;name:string;active:number};
export type Folder={id:string;name:string;color:string};
export type PostSummary={id:string;folder:string|null;title:string;body:string;author:string;important:number;archived:number;created:string;files:number;fileNames:string|null;reads:number;seen:number};
export type BoardFile={id:string;name:string;size:number};
export type Read={staff:string;name:string;readAt:string};
export type PostDetail={post:PostSummary;files:BoardFile[];reads:Read[]};
