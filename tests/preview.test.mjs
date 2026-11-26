import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp,copyFile,readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';

test('preview local sin claves, ignora códigos y conserva solo su propio progreso',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'udmi-preview-'));
  let browser,server;
  const source=new URL('../',import.meta.url);
  const files=['index.html','motor.js','family.js','diagnostic-bank.js','diagnostic.js','lesson-bank.js','lessons.js'];
  const env={...process.env,VERCEL_GIT_COMMIT_SHA:'f'.repeat(40),UDMI_PREVIEW_LOCAL:'1',VERCEL_ENV:'preview'};
  const build=extra=>spawnSync(process.execPath,['scripts/build-static.mjs'],{cwd:dir,env:{...env,...extra},encoding:'utf8'});
  try{
    await mkdir(join(dir,'scripts'));
    await mkdir(join(dir,'prototypes'));
    files.push(...['index.html','prototypes.css','prototypes.js'].map(name=>'prototypes/'+name));
    await mkdir(join(dir,'taller'));
    files.push(...['index.html','taller.css','taller.js'].map(name=>'taller/'+name));
    for(const file of [...files,'scripts/build-static.mjs'])
      await copyFile(new URL(file,source),join(dir,file));
    const rejected=build({VERCEL_ENV:'production'});
    assert.notEqual(rejected.status,0);
    assert.match(rejected.stderr,/solo se puede publicar como Preview/);
    const shared=build({UDMI_PREVIEW_LOCAL:'0',UDMI_PREVIEW_SUPABASE_URL:'https://rrnuxiadvqqwzrhpdwpl.supabase.co',
      UDMI_PREVIEW_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_sintetica'});
    assert.notEqual(shared.status,0);
    assert.match(shared.stderr,/proyecto Supabase aislado/);
    const result=build({});
    assert.equal(result.status,0,result.stderr);
    const html=await readFile(join(dir,'dist','index.html'),'utf8');
    assert.ok(html.includes("connect-src 'none'"));
    assert.doesNotMatch(html,/supabase\.co|sb_publishable_/);
    assert.deepEqual(JSON.parse(await readFile(join(dir,'dist','version.json'),'utf8')),{commit:'f'.repeat(40)});
    server=createServer(async(req,res)=>{
      const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
      if(!/^[a-z0-9.-]+$/.test(name)){res.writeHead(404).end();return}
      try{
        const raw=await readFile(join(dir,'dist',name));
        res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/html');
        res.end(raw);
      }catch{res.writeHead(404).end()}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch();
    const page=await browser.newPage();
    const requests=[],errors=[];
    page.on('request',request=>requests.push(request.url()));
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      localStorage.setItem('tt-codigo','a'.repeat(32));
      localStorage.setItem('tt-profile-v1:local',JSON.stringify({state:{pts:777}}));
    });
    await page.goto(origin+'/?p='+'b'.repeat(32)+'&familia=1');
    await page.locator('#offlinePreviewNote').waitFor();
    assert.equal(await page.locator('#sPts').textContent(),'0');
    assert.equal(await page.locator('#codeIn').isVisible(),false);
    await page.click('#adaptiveLaunch');
    await page.click('#adaptiveGo');
    await page.click('[data-lesson-pause]');
    await page.reload();
    await page.click('#adaptiveLaunch');
    assert.match(await page.locator('#adaptiveCard').textContent(),/Continúa donde hiciste la pausa/);
    const stored=await page.evaluate(()=>({
      preview:JSON.parse(localStorage.getItem('tt-preview-v1:local')),
      normal:JSON.parse(localStorage.getItem('tt-profile-v1:local'))
    }));
    assert.ok(stored.preview.state.lessons);
    assert.equal(stored.normal.state.pts,777);
    assert.deepEqual(requests.filter(url=>!url.startsWith(origin+'/')),[]);
    assert.deepEqual(errors,[]);
  }finally{
    await browser?.close();
    await new Promise(resolve=>{if(server)server.close(resolve);else resolve()});
    await rm(dir,{recursive:true,force:true});
  }
});
