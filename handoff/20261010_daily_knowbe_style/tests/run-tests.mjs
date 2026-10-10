// lib と偽の ai・dailyAssistant を一時フォルダーへ写し、Node の型除去で dailyStyle.test.mts を実行する
import {mkdtempSync,cpSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const here=dirname(fileURLToPath(import.meta.url)),dir=mkdtempSync(join(tmpdir(),'daily-style-'));
cpSync(join(here,'..','lib'),join(dir,'lib'),{recursive:true});
cpSync(join(here,'stubs'),join(dir,'lib'),{recursive:true});
for(const f of readdirSync(join(dir,'lib')))writeFileSync(join(dir,'lib',f),readFileSync(join(dir,'lib',f),'utf8').replace(/from '\.\/(\w+)'/g,"from './$1.ts'"));
cpSync(join(here,'dailyStyle.test.mts'),join(dir,'test.mts'));
const r=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning',join(dir,'test.mts')],{stdio:'inherit'});
process.exit(r.status??1);
