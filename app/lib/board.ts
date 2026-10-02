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
// フォルダーが無いときに一度で作れる候補（自動では作らない）。binder=綴り（シフト集）
export const suggestedFolders:{name:string;color:FolderColor;binder:boolean}[]=[{name:'シフト集',color:'blue',binder:true},{name:'会議・研修',color:'green',binder:false},{name:'連絡事項',color:'orange',binder:false},{name:'行事・イベント',color:'purple',binder:false}];
export const boardFileTypes=/\.(pdf|docx?|xlsx?|jpe?g|png|webp|txt)$/i;
export const boardAccept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.txt';
export const boardLimits={title:100,body:5000,name:50,target:200,comment:1000,note:500,files:5,fileSize:20*1024*1024,total:50*1024*1024,thumb:400*1024};
export type Staff={id:string;name:string;active:number;admin:number};
export type Folder={id:string;name:string;color:string;binder:number};
export type PostSummary={id:string;folder:string|null;title:string;body:string;author:string;important:number;archived:number;created:string;target:string;due:string|null;expires:string|null;pinned:number;version:number;thumb:number;files:number;fileNames:string|null;comments:number;readers:string|null;myVersion:number|null};
export type BoardFile={id:string;name:string;size:number;version:number};
export type Read={staff:string;name:string;readAt:string;version:number};
export type Version={version:number;note:string;author:string;created:string};
export type Comment={id:string;staff:string|null;name:string;body:string;created:string};
export type Template={id:string;name:string;title:string;body:string;target:string;folder:string|null};
export type PostDetail={post:PostSummary;files:BoardFile[];reads:Read[];versions:Version[];comments:Comment[]};
export type Board={staff:Staff[];folders:Folder[];posts:PostSummary[];templates:Template[];hasPin:boolean};

// 日付はすべて日本時間の YYYY-MM-DD で比べる
export const todayJST=(now=new Date())=>new Date(now.getTime()+9*3600e3).toISOString().slice(0,10);
export const addDays=(day:string,n:number)=>new Date(Date.parse(day+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
export const validDay=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
// 掲載中か（掲載終了・掲載期限切れは false）
export const isLive=(p:Pick<PostSummary,'archived'|'expires'>,today=todayJST())=>!p.archived&&!(p.expires&&p.expires<today);
// 対象者：名簿の名前（空白の有無は問わない）が書かれていればその人だけ。だれも当てはまらなければ全員。
const squash=(s:string)=>s.replace(/[\s　]/g,'');
export function targetsOf(target:string,staff:Staff[]){const active=staff.filter(s=>s.active);const t=squash(target);if(!t)return {list:active,everyone:true};const hit=active.filter(s=>t.includes(squash(s.name)));return hit.length?{list:hit,everyone:false}:{list:active,everyone:true};}
// 最新の版を見たか
export const seenLatest=(p:Pick<PostSummary,'version'|'myVersion'>)=>p.myVersion!=null&&p.myVersion>=p.version;
// 自分が確認すべきで、まだ確認していない掲示物か
export function needsMyCheck(p:PostSummary,me:string,staff:Staff[],today=todayJST()){if(!isLive(p,today)||seenLatest(p))return false;return targetsOf(p.target,staff).list.some(s=>s.id===me);}
// 確認期限の状態
export function dueState(due:string|null,today=todayJST()):'overdue'|'soon'|'ok'|null{if(!due)return null;if(due<today)return 'overdue';if(due<=addDays(today,2))return 'soon';return 'ok';}
// 最新の版を確認した人数（対象者のうち）
export function checkedCount(p:PostSummary,staff:Staff[]){const ids=new Set((p.readers??'').split(',').filter(Boolean));const list=targetsOf(p.target,staff).list;return {done:list.filter(s=>ids.has(s.id)).length,total:list.length};}

// 最初から使えるテンプレート。{来月} は書くときに「11月」のように置き換える
export const builtinTemplates:Omit<Template,'id'>[]=[
 {name:'シフト表',title:'{来月}のシフト表',body:'{来月}のシフト表です。\n変更の希望がある方は、○日までにお知らせください。',target:'',folder:null},
 {name:'会議のお知らせ',title:'○月○日 職員会議のお知らせ',body:'日時：○月○日（　）○時〜○時\n場所：\n議題：\n持ち物：',target:'',folder:null},
 {name:'研修のお知らせ',title:'○○研修のお知らせ',body:'日時：\n場所：\n内容：\n申込み・締切：',target:'',folder:null},
 {name:'行事のお知らせ',title:'○○（行事）のお知らせ',body:'日時：\n場所：\n内容：\n担当：\n準備するもの：',target:'',folder:null},
 {name:'連絡事項',title:'【連絡】',body:'',target:'',folder:null},
];
export function fillTemplate(text:string,now=new Date()){const m=(Number(todayJST(now).slice(5,7))%12)+1;return text.replaceAll('{来月}',m+'月');}
