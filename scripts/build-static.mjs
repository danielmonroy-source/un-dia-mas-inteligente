import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const preview=process.env.VERCEL_ENV==='preview';
const variable=preview?'UDMI_PREVIEW_SUPABASE_':'UDMI_SUPABASE_';
const api=new URL(process.env[variable+'URL']||'');
const key=process.env[variable+'PUBLISHABLE_KEY']||'';
if(api.protocol!=='https:'||api.pathname!=='/'||api.search||api.hash||api.username||api.password||
    !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key))throw new Error('Configura un endpoint HTTPS y una clave sb_publishable_.');
const knownProduction='https://rrnuxiadvqqwzrhpdwpl.supabase.co';
const production=process.env.UDMI_SUPABASE_URL?new URL(process.env.UDMI_SUPABASE_URL).origin:knownProduction;
if(preview&&(api.origin===knownProduction||api.origin===production))
  throw new Error('Preview requiere un proyecto Supabase aislado.');
const revision=process.env.VERCEL_GIT_COMMIT_SHA||
  execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[0-9a-f]{40}$/.test(revision))throw new Error('Commit inválido');
const output=new URL('../dist/',import.meta.url);
const contents={
  'motor.js':readFileSync(new URL('../motor.js',import.meta.url)),
  'family.js':readFileSync(new URL('../family.js',import.meta.url)),
  'diagnostic-bank.js':readFileSync(new URL('../diagnostic-bank.js',import.meta.url)),
  'diagnostic.js':readFileSync(new URL('../diagnostic.js',import.meta.url)),
  'lesson-bank.js':readFileSync(new URL('../lesson-bank.js',import.meta.url)),
  'lessons.js':readFileSync(new URL('../lessons.js',import.meta.url)),
  'config.js':Buffer.from('window.UDMI_CONFIG='+JSON.stringify({url:api.origin,key,family:preview||process.env.UDMI_FAMILY_AUTH==='1'})+';\n')
};
const files=Object.fromEntries(Object.entries(contents).map(([name,data])=>{
  const fingerprint=createHash('sha256').update(data).digest('hex').slice(0,16);
  return [name.replace('.js','-'+fingerprint+'.js'),data]
}));
const [motor,family,bank,diagnostic,lessonBank,lessons,config]=Object.keys(files);
let html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const inlineConfig=/const SB=.*\nconst SBK=.*\n/;
if(!inlineConfig.test(html)||!html.includes('motor.js?v=1')||!html.includes('family.js'))
  throw new Error('Cambió el punto de entrada estático');
html=html.replace(inlineConfig,'const {url:SB,key:SBK}=window.UDMI_CONFIG;\n')
  .replace('<script src="motor.js?v=1"></script>','<script src="'+config+'"></script>\n<script src="'+motor+'"></script>')
  .replace('src="family.js"','src="'+family+'"')
  .replace('src="diagnostic-bank.js"','src="'+bank+'"')
  .replace('src="diagnostic.js"','src="'+diagnostic+'"')
  .replace('src="lesson-bank.js"','src="'+lessonBank+'"')
  .replace('src="lessons.js"','src="'+lessons+'"');
rmSync(output,{recursive:true,force:true});
mkdirSync(output,{recursive:true});
for(const [name,data] of Object.entries(files))writeFileSync(new URL(name,output),data);
writeFileSync(new URL('index.html',output),html);
writeFileSync(new URL('version.json',output),JSON.stringify({commit:revision})+'\n');
