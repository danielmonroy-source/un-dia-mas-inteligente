import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const api = new URL(process.env.UDMI_SUPABASE_URL || '');
const key = process.env.UDMI_SUPABASE_PUBLISHABLE_KEY || '';
if (api.protocol !== 'https:' || api.pathname !== '/' || api.search || api.hash || api.username || api.password ||
    !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Configura un endpoint HTTPS y una clave sb_publishable_.');
const revision = process.env.VERCEL_GIT_COMMIT_SHA ||
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error('Commit inválido');
const output = new URL('../dist/', import.meta.url);
const motor = readFileSync(new URL('../motor.js', import.meta.url));
const config = Buffer.from('window.UDMI_CONFIG='+JSON.stringify({url:api.origin,key})+';\n');
const files = { 'motor.js': motor, 'config.js': config };
let html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inlineConfig = /const SB=.*\nconst SBK=.*\n/;
if (!inlineConfig.test(html) || !html.includes('motor.js?v=1')) throw new Error('Cambió el punto de entrada estático');
html = html.replace(inlineConfig, "const {url:SB,key:SBK}=window.UDMI_CONFIG;\n");
for (const [name,data] of Object.entries(files)) {
  const fingerprint = createHash('sha256').update(data).digest('hex').slice(0,16);
  const versioned = name.replace('.js', '-'+fingerprint+'.js');
  html = name==='motor.js'?html.replace('motor.js?v=1',versioned):
    html.replace('<script src="motor-', '<script src="'+versioned+'"></script>\n<script src="motor-');
  delete files[name];
  files[versioned] = data;
}
rmSync(output,{recursive:true,force:true});
mkdirSync(output,{recursive:true});
for (const [name,data] of Object.entries(files)) writeFileSync(new URL(name,output),data);
writeFileSync(new URL('index.html',output),html);
writeFileSync(new URL('version.json',output),JSON.stringify({commit:revision})+'\n');
