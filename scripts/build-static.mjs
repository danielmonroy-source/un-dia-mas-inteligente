import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const preview=process.env.VERCEL_ENV==='preview';
const offline=process.env.UDMI_PREVIEW_LOCAL==='1';
if(offline&&!preview)throw new Error('La modalidad local solo se puede publicar como Preview.');
const variable=preview?'UDMI_PREVIEW_SUPABASE_':'UDMI_SUPABASE_';
const knownProduction='https://rrnuxiadvqqwzrhpdwpl.supabase.co';
let settings={offline:true};
if(!offline){
  const api=new URL(process.env[variable+'URL']||'');
  const key=process.env[variable+'PUBLISHABLE_KEY']||'';
  if(api.protocol!=='https:'||api.pathname!=='/'||api.search||api.hash||api.username||api.password||
      !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key))throw new Error('Configura un endpoint HTTPS y una clave sb_publishable_.');
  const production=process.env.UDMI_SUPABASE_URL?new URL(process.env.UDMI_SUPABASE_URL).origin:knownProduction;
  if(preview&&(api.origin===knownProduction||api.origin===production))
    throw new Error('Preview conectada requiere un proyecto Supabase aislado.');
  settings={url:api.origin,key,family:preview||process.env.UDMI_FAMILY_AUTH==='1'};
}
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
  'config.js':Buffer.from('window.UDMI_CONFIG='+JSON.stringify(settings)+';\n')
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
if(offline){
  const policy="default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; "+
    "img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'none'; base-uri 'none'; form-action 'none'";
  html=html.replace(/^<link [^\n]*fonts\.googleapis\.com[^\n]*>\n/gm,'');
  html=html.replace(/<head>/i,'<head>\n<meta http-equiv="Content-Security-Policy" content="'+policy+'">');
}
rmSync(output,{recursive:true,force:true});
mkdirSync(output,{recursive:true});
for(const [name,data] of Object.entries(files))writeFileSync(new URL(name,output),data);
writeFileSync(new URL('index.html',output),html);
writeFileSync(new URL('version.json',output),JSON.stringify({commit:revision})+'\n');
