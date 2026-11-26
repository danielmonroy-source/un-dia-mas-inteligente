// Ejecución explícita contra el entorno desechable, usando únicamente datos sintéticos.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import {stateBytes} from './cargar-nube.mjs';

const api = new URL(process.env.API_URL || 'http://127.0.0.1:54321');
const auth = process.env.AUTH_URL ? new URL(process.env.AUTH_URL) : api;
const rest = process.env.REST_URL ? new URL(process.env.REST_URL) : api;
for (const url of [api,auth,rest]) {
  assert.equal(url.protocol,'http:');
  assert.equal(url.hostname,'127.0.0.1','Este ensayo solo permite endpoints locales');
}
const apiKey = process.env.ANON_KEY;
const service = process.env.SERVICE_ROLE_KEY;
assert.ok(apiKey && service,'Carga las variables locales de supabase status -o env');

async function call(path,{jwt=apiKey, method='POST', body, key=apiKey}={}){
  const isAuth=path.startsWith('/auth/v1/');
  const base=isAuth?auth:rest;
  const endpoint=base===api?path:path.replace(/^\/(auth|rest)\/v1/,'');
  const res=await fetch(new URL(endpoint,base),{method,headers:{apikey:key,Authorization:'Bearer '+jwt,
    'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
  const raw=await res.text();
  return {status:res.status,data:raw?JSON.parse(raw):null}
}
const rpc=(name,body,jwt)=>call('/rest/v1/rpc/'+name,{body,jwt});
async function adminTable(table,body,method='POST'){
  const r=await call('/rest/v1/'+table,{jwt:service,key:service,body,method});
  assert.ok(r.status<300,table+' '+r.status);
  return r.data
}
test('Supabase local: CAS, UUID, acceso de estudio, rechazo administrativo y revocación',async()=>{
  const code=randomUUID().replaceAll('-',''),code2=randomUUID().replaceAll('-','');
  const email=randomUUID()+'@example.test',password=randomUUID();
  let owner,child;
  try{
    const created=await call('/auth/v1/admin/users',{jwt:service,key:service,body:{email,password,email_confirm:true}});
    assert.ok(created.status<300,JSON.stringify({status:created.status,data:created.data}));
    owner=created.data.id;
    const login=await call('/auth/v1/token?grant_type=password',{body:{email,password}});
    assert.equal(login.status,200,'inicio real con Supabase Auth');
    const parent=login.data.access_token;
    const study=await call('/auth/v1/signup',{body:{}});
    assert.equal(study.status,200,'sesión anónima de Auth');
    child=study.data.user.id;
    const student=study.data.access_token;
    const [row]=await adminTable('tt_progreso',[{codigo:code,datos:{pts:10}},{codigo:code2,datos:{pts:20}}]);
    await adminTable('tt_familia',{codigo:code,user_id:owner});
    const write={p_codigo:code,p_datos:{pts:11},p_base:row.actualizado,p_id:randomUUID()};
    const writes=[write,{...write,p_id:randomUUID()}];
    const results=await Promise.all(writes.map(request=>rpc('tt_guardar3',request,parent)));
    assert.equal(results.filter(r=>r.data?.ok).length,1);
    assert.equal(results.filter(r=>r.data?.conflicto).length,1);
    const winner=results.findIndex(r=>r.data?.ok);
    assert.deepEqual((await rpc('tt_guardar3',writes[winner],parent)).data,results[winner].data);
    const attempt={id:randomUUID(),k:'mul:2x2',ts:new Date().toISOString(),ok:true,primero:true};
    const writeAttempts=()=>rpc('tt_intentos_agregar',{p_codigo:code,p_intentos:[attempt]},parent);
    const both=await Promise.all([writeAttempts(),writeAttempts()]);
    assert.deepEqual(both.map(r=>r.data).sort(),[0,1]);
    const enrollment=await rpc('tt_fase2_autorizar',{p_codigo:code,p_dispositivo:child},parent);
    assert.equal(enrollment.status,200);
    const profile=enrollment.data;
    const other=await rpc('tt_fase2_autorizar',{p_codigo:code2,p_dispositivo:child},parent);
    assert.equal(other.status,403);
    assert.equal((await rpc('tt_solo_cuenta',{p_codigo:code,p_on:true},parent)).status,200);
    const read=await rpc('tt_fase2_estudio',{p_perfil:profile},student);
    assert.deepEqual(read.data.datos,{pts:11});
    const studentSave={p_perfil:profile,p_datos:{pts:12,pin:'synthetic',retoT:9,resetAt:99,
      daily:{'2024-03-02':{tOk:true,cfg:['t'],redo:{t:true},prevCal:{t:3}}}},
      p_base:read.data.actualizado,p_id:randomUUID()};
    assert.equal((await rpc('tt_fase2_guardar_estudio',studentSave,student)).data.ok,true);
    const learnerProgress=await rpc('tt_fase2_estudio',{p_perfil:profile},student);
    assert.deepEqual(learnerProgress.data.datos,{pts:12,daily:{'2024-03-02':{tOk:true}}});
    assert.equal((await rpc('tt_fase2_guardar_estudio',{...studentSave,
      p_datos:{pts:0},p_id:randomUUID(),p_base:learnerProgress.data.actualizado},student)).status,403);
    assert.equal((await rpc('tt_fase2_autorizar',{p_codigo:code,p_dispositivo:child},student)).status,403);
    assert.equal((await rpc('tt_fase2_revocar',{p_perfil:profile,p_dispositivo:child},student)).status,403);
    assert.equal((await rpc('tt_guardar3',write,student)).status,403);
    const childAttempts={p_perfil:profile,p_intentos:[{...attempt,id:randomUUID()}]};
    assert.equal((await rpc('tt_fase2_intentos',childAttempts,student)).data,1);
    assert.equal((await rpc('tt_fase2_intentos',childAttempts,student)).data,0);
    assert.equal((await rpc('tt_fase2_copia',{p_perfil:profile},student)).status,403);
    const backup=await rpc('tt_fase2_copia',{p_perfil:profile},parent);
    assert.equal(backup.data.progreso.datos.pts,12);
    assert.equal(backup.data.intentos.length,2);
    assert.equal(backup.data.escrituras.length,2);
    assert.equal((await rpc('tt_fase2_guardar_estudio',studentSave,student)).data.ok,true);
    assert.equal((await rpc('tt_fase2_guardar_estudio',{...studentSave,p_id:randomUUID(),
      p_datos:{pts:11}},student)).data.conflicto,true);
    const diagnosticId=randomUUID();
    const diag={v:1,seed:'perfil-sintetico',drafts:{},answers:{
      [diagnosticId]:{q:'idea-0',phase:'base',session:1,ts:new Date().toISOString(),fmt:'rec',
        ok:true,pista:false,helps:['consultar-texto'],err:null}
    }};
    const diagnosis=await rpc('tt_fase2_guardar_estudio',{p_perfil:profile,p_datos:{pts:12,diag,
      diagRubric:{legibilidad:'independiente'},diagPlan:{'lec-info':'2026-11-26'}},
      p_base:learnerProgress.data.actualizado,p_id:randomUUID()},student);
    assert.equal(diagnosis.data.ok,true,'estudio sincroniza evidencias');
    const diagnosisAgain=await rpc('tt_fase2_guardar_estudio',{p_perfil:profile,p_datos:{pts:12,diag:{...diag,answers:{}}},
      p_base:diagnosis.data.actualizado,p_id:randomUUID()},student);
    assert.equal(diagnosisAgain.data.ok,true);
    const diagnosisRead=await rpc('tt_fase2_estudio',{p_perfil:profile},student);
    assert.deepEqual(diagnosisRead.data.datos.diag.answers,diag.answers,'se conserva el UUID ya registrado');
    assert.equal(diagnosisRead.data.datos.diagRubric,undefined);
    assert.equal(diagnosisRead.data.datos.diagPlan,undefined);
    const run=randomUUID(),first=randomUUID(),second=randomUUID();
    const makeEvent=(id,prev,n)=>({id,prev,n,stage:'activar',kind:'access',q:'agrupar-diez-0',
      day:'2026-01-03',ts:new Date().toISOString()});
    const makeLessons=events=>({v:1,runs:{[run]:{id:run,lesson:'agrupar-diez',review:false,day:'2026-01-03',events}}});
    const saveLessons=(base,lessons)=>rpc('tt_fase2_guardar_estudio',{p_perfil:profile,
      p_base:base,p_id:randomUUID(),p_datos:{lessons,lessonAssignments:{'agrupar-diez':'2026-01-03'}}},student);
    const one=makeEvent(first,'',1),two=makeEvent(second,first,2);
    const writeOne=await saveLessons(diagnosisRead.data.actualizado,makeLessons({[first]:one}));
    assert.equal(writeOne.data.ok,true);
    const writeTwo=await saveLessons(writeOne.data.actualizado,makeLessons({[second]:two}));
    assert.equal(writeTwo.data.ok,true);
    const readLessons=await rpc('tt_fase2_estudio',{p_perfil:profile},student);
    assert.deepEqual(readLessons.data.datos.lessons.runs[run].events,{[first]:one,[second]:two});
    assert.equal(readLessons.data.datos.lessonAssignments,undefined,'un dispositivo de estudio no puede asignar lecciones');
    assert.equal((await saveLessons(writeTwo.data.actualizado,{v:1,runs:{bad:{}}})).status,400);
    const pad={pts:12,unknownSyntheticPadding:''};
    const required=200000-stateBytes(pad);
    const withPadding=extra=>({...pad,unknownSyntheticPadding:'ñ'.repeat(Math.floor(required/2))+
      'x'.repeat(required%2+extra)});
    const writeAtLimit=(base,d)=>rpc('tt_fase2_guardar_estudio',{p_perfil:profile,p_base:base,
      p_id:randomUUID(),p_datos:d},student);
    assert.equal(stateBytes(withPadding(0)),200000);
    const atLimit=await writeAtLimit(writeTwo.data.actualizado,withPadding(0));
    assert.equal(atLimit.data.ok,true);
    assert.equal((await writeAtLimit(atLimit.data.actualizado,withPadding(1))).status,400);
    const afterCap=await rpc('tt_fase2_estudio',{p_perfil:profile},student);
    assert.equal(afterCap.data.actualizado,atLimit.data.actualizado);
    assert.deepEqual(afterCap.data.datos.lessons,readLessons.data.datos.lessons);
    assert.equal((await rpc('tt_fase2_revocar',{p_perfil:profile,p_dispositivo:child},parent)).status,204);
    assert.equal((await rpc('tt_fase2_estudio',{p_perfil:profile},student)).status,403);
    assert.equal((await rpc('tt_fase2_guardar_estudio',studentSave,student)).status,403);
    assert.equal((await rpc('tt_fase2_intentos',childAttempts,student)).status,403);
  }finally{
    await adminTable('tt_progreso?codigo=in.('+code+','+code2+')',undefined,'DELETE');
    for(const id of [child,owner])if(id)await call('/auth/v1/admin/users/'+id,{jwt:service,key:service,method:'DELETE'});
  }
});

test('Recuperación familiar real de navegador a navegador y corte del acceso anterior',async()=>{
  const { chromium }=await import('playwright');
  const { createServer }=await import('node:http');
  const { readFile, mkdtemp, rm }=await import('node:fs/promises');
  const { tmpdir }=await import('node:os');
  const { join }=await import('node:path');
  const html=(await readFile(new URL('../index.html',import.meta.url),'utf8'))
    .replace('<script src="motor.js?v=1"></script>',
      '<script>window.UDMI_CONFIG={url:location.origin,key:'+JSON.stringify(apiKey)+',family:true}</script><script src="motor.js?v=1"></script>')
    .replace('if(family)familyUi();',`window.syntheticRound=(day,part,points,knowledge)=>{
       S.daily[day]={...S.daily[day],...part};
       S.pts+=points;
       mot({k:knowledge,ok:true,primero:true,fmt:'rcl',dia:day});
       save();
       renderHome();
    };
    if(family)familyUi();`);
  const assets={
    '/motor.js':await readFile(new URL('../motor.js',import.meta.url)),
    '/family.js':await readFile(new URL('../family.js',import.meta.url)),
    '/diagnostic-bank.js':await readFile(new URL('../diagnostic-bank.js',import.meta.url)),
    '/diagnostic.js':await readFile(new URL('../diagnostic.js',import.meta.url)),
    '/lesson-bank.js':await readFile(new URL('../lesson-bank.js',import.meta.url)),
    '/lessons.js':await readFile(new URL('../lessons.js',import.meta.url))
  };
  let otp='';
  const server=createServer(async(req,res)=>{
    const path=req.url.split('?')[0];
    try{
      if(req.method==='GET'){
        if(path in assets){
          res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(assets[path])
        }
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(html)
      }
      const chunks=[];
      for await(const chunk of req)chunks.push(chunk);
      const body=JSON.parse(Buffer.concat(chunks).toString());
      if(path==='/auth/v1/otp'){
        // La entrega del correo se sustituye por el generador oficial de GoTrue.
        // El OTP, su verificación y las sesiones son reales.
        const generated=await call('/auth/v1/admin/generate_link',{jwt:service,key:service,
          body:{type:'magiclink',email:body.email}});
        otp=generated.data.email_otp||generated.data.properties?.email_otp||'';
        if(!otp)throw new Error('No se generó el OTP de prueba: '+JSON.stringify(generated));
        res.writeHead(200,{'Content-Type':'application/json'});return res.end('{}')
      }
      const bearer=req.headers.authorization?.replace(/^Bearer /,'');
      const forwarded=await call(req.url,{body,jwt:bearer});
      res.writeHead(forwarded.status,{'Content-Type':'application/json'});
      res.end(forwarded.data===null?'':JSON.stringify(forwarded.data))
    }catch(e){res.statusCode=500;res.end(JSON.stringify({error:e.message}))}
  });
  await new Promise(resolve=>server.listen(0,resolve));
  const port=server.address().port, oldOrigin='http://127.0.0.1:'+port, newOrigin='http://localhost:'+port;
  const temp=await mkdtemp(join(tmpdir(),'udmi-familia-'));
  const browser=await chromium.launch();
  const code=randomUUID().replaceAll('-',''),email=randomUUID()+'@example.test';
  const pass='frase sintética para copia';
  const ids=[];
  const check=async(fn,note)=>{
    for(let i=0;i<100;i++){
      if(await fn())return;
      await new Promise(resolve=>setTimeout(resolve,75));
    }
    assert.fail(note)
  };
  const openApp=async(context,origin,path='/')=>{
    const page=await context.newPage();
    await page.route('**/*',r=>{
      const address=new URL(r.request().url());
      if(context===b&&address.pathname==='/rest/v1/rpc/tt_cargar')return r.abort();
      return [oldOrigin,newOrigin].includes(address.origin)?r.continue():r.abort()
    });
    await page.goto(origin+path);
    return page
  };
  const parents=async(page)=>{
    if(!await page.locator('#familia').evaluate(el=>el.open))await page.locator('#familia summary').click();
    await page.fill('#familyAddress',email);
    await page.locator('#familyEmail button').click();
    await page.waitForSelector('#familyVerify',{state:'visible'});
    assert.ok(otp);
    await page.fill('#familyOtp',otp);
    await page.locator('#familyVerify button').click();
    await page.waitForSelector('#familyAdult',{state:'visible'})
  };
  const context=()=>browser.newContext({acceptDownloads:true});
  const admin=await context(),a=await context(),b=await context(),destination=await context();
  const day='2024-03-02';
  try{
    const owner=await call('/auth/v1/admin/users',{jwt:service,key:service,
      body:{email,password:randomUUID(),email_confirm:true}});
    assert.equal(owner.status,200);ids.push(owner.data.id);
    await adminTable('tt_progreso',{codigo:code,datos:{
      pts:20,pinH:'hash-sintético-legado',nombre:'Perfil sintético',open:true,colSum:'con3',daily:{},days:{},med:{'2-esc':8},retoCfg:['t','c']
    }});
    const control=await openApp(admin,oldOrigin,'/?familia=1');
    await parents(control);
    await control.fill('#familyLegacy',code);
    await control.locator('#familyLink button').click();
    await control.waitForFunction(()=>document.querySelector('#familyProfiles').options.length===1);
    const perfil=await control.inputValue('#familyProfiles');

    async function prepareDevice(ctx,origin,expected=20){
      const page=await openApp(ctx,origin);
      await page.locator('#familia summary').click();
      await page.click('#studyPair');
      await page.waitForFunction(()=>document.querySelector('#studyUid').textContent.length===36);
      const uid=await page.textContent('#studyUid');ids.push(uid);
      await control.fill('#familyDevice',uid);
      await control.locator('#familyPair button').click();
      await control.waitForFunction(value=>document.querySelector('#familyDevices').textContent.includes(value),uid);
      await page.click('#studyCheck');
      await page.waitForFunction(()=>document.querySelector('#papas')?.hidden===true);
      await page.waitForFunction(points=>document.querySelector('#sPts')?.textContent===String(points),expected);
      return {page,uid}
    }

    const legacy=await rpc('tt_cargar',{p_codigo:code});
    const oldAttempt={id:randomUUID(),k:'mul:2x1',ok:true,primero:true,ts:new Date().toISOString()};
    await b.addInitScript(({origin,code,legacy,oldAttempt})=>{
      if(location.origin!==origin||localStorage.getItem('udmi-legacy-test-seeded'))return;
      localStorage.setItem('tt-codigo',code);
      localStorage.setItem('tt-profile-v1:'+code,JSON.stringify({
        state:legacy.datos,anchor:legacy.datos,version:legacy.actualizado,dirty:false,queue:[oldAttempt]
      }));
      localStorage.setItem('udmi-legacy-test-seeded','1')
    },{origin:oldOrigin,code,legacy:legacy.data,oldAttempt});
    const A=await prepareDevice(a,oldOrigin),B=await prepareDevice(b,oldOrigin);
    await check(async()=>(await rpc('tt_intentos_cargar',{p_codigo:code,p_desde:'2000-01-01'})).data
      ?.some(x=>x.id===oldAttempt.id),'se traslada el intento de la cola legada solo al perfil vinculado');
    await A.page.reload();
    await A.page.waitForFunction(()=>document.querySelector('#sPts').textContent==='20');
    assert.equal(await A.page.locator('#papas').isVisible(),false);
    await b.setOffline(true);
    await A.page.evaluate(d=>window.syntheticRound(d,{t:2,tOk:true,tCal:9,cfg:['t','c']},10,'mul:2x2'),day);
    await B.page.evaluate(d=>window.syntheticRound(d,{t:2,col:true,colCal:8,cfg:['t','c']},20,'sr:suma'),day);
    await check(async()=>Number(await A.page.locator('#sPts').textContent())===30,'primer avance en A');
    await check(async()=>(await rpc('tt_cargar',{p_codigo:code})).data?.datos.pts===30,'subida de A');
    // La pestaña offline queda cerrada antes de recuperar conexión, preservando la cola.
    await B.page.close();await b.setOffline(false);
    const capture=await openApp(b,oldOrigin,'/?familia=1');
    await parents(capture);
    await capture.click('#familyCopy');
    await capture.waitForFunction(()=>document.querySelector('#familyStatus').textContent.includes('Copia guardada'));
    await capture.fill('#familyPass',pass);
    const [download]=await Promise.all([capture.waitForEvent('download'),capture.click('#familyDownload')]);
    const path=join(temp,'operativa.json');
    await download.saveAs(path);
    const archive=JSON.parse(await readFile(path,'utf8'));
    assert.equal(archive.formato,'udmi-operativa-v1');
    assert.equal(Object.hasOwn(archive,'server'),false);
    const queued=await capture.evaluate(({origin,perfil})=>{
      const profile=JSON.parse(localStorage.getItem('tt-profile-v1:familia:'+origin+':'+perfil));
      return {points:profile.state.pts,uuid:profile.queue[0].id,base:profile.version}
    },{origin:oldOrigin,perfil});
    assert.equal(queued.points,40);assert.ok(queued.uuid&&queued.base);

    await A.page.evaluate(d=>window.syntheticRound(d,{t:2,tOk:true,tCal:9},20,'mul:2x3'),day);
    await check(async()=>(await rpc('tt_cargar',{p_codigo:code})).data?.datos.pts===50,'avance posterior a la copia');
    const recovered=await openApp(destination,newOrigin,'/?familia=1');
    await parents(recovered);
    assert.equal(await recovered.inputValue('#familyProfiles'),perfil,'recuperación de la misma cuenta en otro origen');
    const restore=async()=>{
      await recovered.fill('#familyPass',pass);
      await recovered.setInputFiles('#familyUpload',path);
      await recovered.waitForSelector('#familyRestore',{state:'visible'});
      await recovered.click('#familyRestore');
      await recovered.waitForFunction(()=>document.querySelector('#familyStatus').textContent.includes('Progreso conciliado'));
    };
    await restore();await restore();
    const after=await rpc('tt_cargar',{p_codigo:code});
    assert.equal(after.data.datos.pts,120,'avance posterior + cola offline + bono diario único');
    assert.equal(after.data.datos.daily[day].tOk,true);
    assert.equal(after.data.datos.daily[day].col,true);
    assert.equal(after.data.datos.daily[day].bonus,true);
    assert.equal(after.data.datos.cal[day].avg,8.5);
    assert.equal(after.data.datos.pinH,'hash-sintético-legado');
    assert.equal(after.data.datos.colSum,'con3');assert.equal(after.data.datos.med['2-esc'],8);
    assert.ok(after.data.datos.ku['mul:2x3']);assert.ok(after.data.datos.ku['sr:suma']);
    assert.notEqual(after.data.actualizado,queued.base);
    // Tomar una nueva copia permite probar que las filas, las versiones y el vínculo
    // continúan accesibles mediante el mismo JWT emitido por Auth.
    const parentToken=await recovered.evaluate(origin=>{
      return JSON.parse(sessionStorage.getItem('tt-family:'+origin+':padre')).access_token
    },newOrigin);
    const operation=await rpc('tt_fase2_copia',{p_perfil:perfil},parentToken);
    assert.equal(operation.data.intentos.length,4);
    assert.equal(new Set(operation.data.intentos.map(x=>x.id)).size,4);
    assert.ok(operation.data.intentos.some(x=>x.id===queued.uuid));
    assert.ok(operation.data.intentos.some(x=>x.id===oldAttempt.id));
    assert.ok(operation.data.copias.length>=1);
    assert.ok(operation.data.escrituras.some(x=>x.version===after.data.actualizado));
    const roster=await rpc('tt_familia_dispositivos',{p_perfil:perfil},parentToken);
    assert.equal(roster.data.length,2);

    const returned=await openApp(b,oldOrigin);
    await returned.waitForFunction(()=>document.querySelector('#sPts').textContent==='120');
    await check(async()=>await returned.evaluate(({origin,perfil})=>{
      const record=JSON.parse(localStorage.getItem('tt-profile-v1:familia:'+origin+':'+perfil));
      return record.queue.length===0&&!localStorage.getItem('tt-profile-v1:familia:'+origin+':'+perfil+':transfer')
    },{origin:oldOrigin,perfil}),'la cola transferida se confirma también en el dispositivo original');
    assert.equal((await rpc('tt_cargar',{p_codigo:code})).data.datos.pts,120);

    const session=await A.page.evaluate(origin=>{
      const key='tt-family:'+origin+':estudio', session=JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key,JSON.stringify({...session,expiresAt:0}));
      return session.access_token
    },oldOrigin);
    await A.page.reload();
    await A.page.waitForFunction(()=>document.querySelector('#sPts').textContent==='120');
    assert.equal((await rpc('tt_familia_cortar',{p_perfil:perfil},session)).status,403);
    assert.equal((await rpc('tt_familia_restaurar',{p_perfil:perfil,p_base:after.data.actualizado,p_id:randomUUID(),
      p_datos:{pts:1000},p_intentos:[],p_copias:[],p_escrituras:[]},session)).status,403);
    assert.equal((await rpc('tt_familia_cortar',{p_perfil:perfil},parentToken)).status,204);
    assert.equal((await rpc('tt_guardar',{p_codigo:code,p_datos:{pts:0}},parentToken)).status,403);
    assert.equal((await rpc('tt_guardar2',{p_codigo:code,p_datos:{pts:0},p_base:null},parentToken)).status,403);
    assert.equal((await rpc('tt_solo_cuenta',{p_codigo:code,p_on:false},parentToken)).status,403);
    assert.equal((await rpc('tt_fase2_revocar',{p_perfil:perfil,p_dispositivo:A.uid},parentToken)).status,204);
    await A.page.reload();
    await A.page.waitForSelector('#studyHelp',{state:'visible'});
    assert.equal(await A.page.textContent('#sPts'),'120','el dispositivo revocado conserva la copia local');

    const nextContext=await context(),C=await prepareDevice(nextContext,newOrigin,120);
    await nextContext.setOffline(true);
    await C.page.evaluate(({day,origin})=>{
      window.syntheticRound(day,{},5,'mul:2x4');
      const key='tt-family:'+origin+':estudio', session=JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key,JSON.stringify({...session,expiresAt:0,refresh_token:'token-de-prueba-inválido'}))
    },{day,origin:newOrigin});
    await nextContext.setOffline(false);
    await C.page.reload();
    await C.page.waitForSelector('#studyHelp',{state:'visible'});
    assert.equal(await C.page.textContent('#sPts'),'125');
    assert.equal((await rpc('tt_familia_leer',{p_perfil:perfil},parentToken)).data.datos.pts,120);
    await C.page.locator('#familia summary').click();
    await C.page.click('#studyPair');
    await C.page.waitForFunction(()=>document.querySelector('#studyUid').textContent.length===36);
    const replacement=await C.page.textContent('#studyUid');ids.push(replacement);
    assert.notEqual(replacement,C.uid);
    await control.fill('#familyDevice',replacement);
    await control.locator('#familyPair button').click();
    await control.waitForFunction(value=>document.querySelector('#familyDevices').textContent.includes(value),replacement);
    await C.page.click('#studyCheck');
    await check(async()=>(await rpc('tt_familia_leer',{p_perfil:perfil},parentToken)).data?.datos.pts===125,
      'se sincroniza el progreso local después de renovar la autorización');
    await check(async()=>(await rpc('tt_fase2_copia',{p_perfil:perfil},parentToken)).data?.intentos.length===5,
      'se conserva el intento pendiente de la sesión vencida');

  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
    await rm(temp,{recursive:true,force:true});
    await adminTable('tt_progreso?codigo=eq.'+code,undefined,'DELETE');
    for(const id of ids)await call('/auth/v1/admin/users/'+id,{jwt:service,key:service,method:'DELETE'});
  }
});
