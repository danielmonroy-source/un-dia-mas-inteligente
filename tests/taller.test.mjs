import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';

test('cinco actividades editoriales funcionan con tacto y recuperación en móvil',async()=>{
  const routes={'/taller/':'taller/index.html','/taller/taller.css':'taller/taller.css',
    '/taller/taller.js':'taller/taller.js','/prototipos/prototypes.css':'prototypes/prototypes.css'};
  const server=createServer(async(req,res)=>{
    const file=routes[req.url];
    if(!file){res.writeHead(404).end();return}
    const types={html:'text/html',js:'text/javascript',css:'text/css'};
    res.setHeader('Content-Type',types[file.split('.').at(-1)]);
    res.end(await readFile(new URL('../'+file,import.meta.url)));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch();
    const page=await browser.newPage({viewport:{width:360,height:800},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const problems=[];
    page.on('pageerror',error=>problems.push(error.message));
    const url='http://127.0.0.1:'+server.address().port+'/taller/';
    const click=id=>page.locator('[data-do="'+id+'"]').tap();
    const text=()=>page.locator('#app').innerText();
    const shot=async name=>{
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth===document.documentElement.clientWidth));
      if(process.env.UDMI_TALLER_SCREENSHOTS)
        await page.screenshot({path:join(process.env.UDMI_TALLER_SCREENSHOTS,name+'.png'),fullPage:true});
    };
    const answer=async n=>{await page.locator('#answer').fill(String(n));await page.locator('#answer').press('Enter')};
    await page.goto(url);
    await click('open-tacos');
    await click('take');await click('plate-0');await click('pause');
    await page.reload();await click('open-tacos');
    assert.match(await text(),/Plato 1\s+1 taco/);
    await shot('taqueria');
    for(const i of [0,0,0,1,1,1,1,2,2,2,2]){await click('take');await click('plate-'+i)}
    assert.match(await text(),/4 \+ 4 \+ 4 = 12/);
    assert.match(await text(),/3 × 4 = 12/);
    await click('next');await answer(6);assert.match(await text(),/cuatro equipos/);
    await answer(8);assert.match(await text(),/Terminaste/);

    await page.goto(url);await click('open-bag');await shot('mochila');
    await click('item-car');await click('bag-check');assert.match(await text(),/Saca el carrito/);
    await click('item-car');
    for(const id of ['pencil','ruler','notebook'])await click('item-'+id);
    await click('bag-check');assert.match(await text(),/Para el recreo/);
    for(const id of ['ball','notebook'])await click('item-'+id);
    await click('bag-check');assert.match(await text(),/La pista está en la consigna/);

    await page.goto(url);await click('open-read');await shot('lectura');
    await click('line-2');assert.match(await text(),/qué hicieron después/);
    await click('line-1');await click('next');await click('read-effect');await click('read-right');
    assert.match(await text(),/Encontraste la causa/);

    await page.goto(url);await click('open-money');await shot('papeleria');
    await click('coin-0');await click('coin-1');await click('pay');
    assert.match(await text(),/3 pesos de más/);
    await click('coin-1');await click('coin-3');await click('pay');await answer(4);
    assert.match(await text(),/Faltaban cuatro pesos/);

    await page.goto(url);await click('open-english');
    await click('take');await click('place-on');assert.match(await text(),/encima/);
    for(const id of ['in','under','on']){
      await click('take');await click('place-'+id);
      if(id==='in')await shot('ingles');
      if(id!=='on')await click('next');
    }
    assert.match(await text(),/tres lugares distintos/);
    assert.deepEqual(problems,[]);
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
