import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';

test('los tres prototipos funcionan en Chromium móvil y respetan el espacio táctil',async()=>{
  const server=createServer(async(req,res)=>{
    const files={'/':'index.html','/prototypes.css':'prototypes.css','/prototypes.js':'prototypes.js'};
    const file=files[new URL(req.url,'http://127.0.0.1').pathname];
    if(!file){res.writeHead(404).end();return}
    const mime={'html':'text/html','css':'text/css','js':'text/javascript'};
    res.setHeader('Content-Type',mime[file.split('.').at(-1)]);
    res.end(await readFile(new URL('../prototypes/'+file,import.meta.url)));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  let browser;
  try{
    browser=await chromium.launch();
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const click=id=>page.locator('[data-action="'+id+'"]').click();
    const read=()=>page.locator('#app').innerText();
    const shot=async name=>{
      const dir=process.env.UDMI_REDESIGN_SCREENSHOTS;
      if(dir)await page.screenshot({path:join(dir,'prototipo-'+name+'.png'),fullPage:true});
    };
    const number=async n=>{await page.locator('#number').fill(String(n));await page.locator('#number').press('Enter')};
    const layout=async()=>{
      const issues=await page.evaluate(()=>{
        const w=document.documentElement.clientWidth;
        const buttons=[...document.querySelectorAll('#app button')].map(b=>b.getBoundingClientRect());
        return {overflow:document.documentElement.scrollWidth>w,small:buttons.some(r=>r.height<44),
          overlap:buttons.some((a,i)=>buttons.slice(i+1).some(b=>a.top<b.bottom&&a.bottom>b.top&&a.left<b.right&&a.right>b.left))};
      });
      assert.deepEqual(issues,{overflow:false,small:false,overlap:false});
    };
    await page.goto(origin);
    await layout();await shot('inicio');
    await click('open-practice');
    await number(5);
    assert.match(await read(),/una vez por cada grupo/);
    await click('hint');await layout();await shot('practica');
    await number(6);await click('finish');
    assert.match(await read(),/Volverás a practicar/);
    await page.reload();await click('open-practice');
    assert.match(await read(),/Tu repaso quedó listo/);
    await click('home');await click('open-lesson');
    await click('answer-3');await click('next');await click('next');await click('next');
    await click('add-0');await click('pause');
    await page.reload();await click('open-lesson');
    assert.match(await read(),/1, 0, 0 fichas/);
    await click('add-0');await click('add-1');await click('add-1');await click('add-2');await click('add-2');
    await layout();await shot('leccion');await click('check');await click('next');
    await number(12);await click('next');await number(12);await click('next');await click('answer-1');await click('next');
    assert.match(await read(),/Terminaste la lección/);
    await click('home');await click('open-adventure');await click('answer-2');
    assert.match(await read(),/objeto que debe contener/);
    await click('answer-1');await click('next');
    await page.setViewportSize({width:320,height:700});
    await layout();await shot('aventura');
    for(const i of [0,1,2]){await click('add-'+i);await click('add-'+i)}
    await click('check');await click('next');await click('answer-6');await click('next');
    assert.match(await read(),/Huerto preparado/);
    assert.deepEqual(errors,[]);
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
