// Ejecución explícita contra el entorno desechable, usando únicamente datos sintéticos.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

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
    assert.equal((await rpc('tt_fase2_revocar',{p_perfil:profile,p_dispositivo:child},parent)).status,204);
    assert.equal((await rpc('tt_fase2_estudio',{p_perfil:profile},student)).status,403);
    assert.equal((await rpc('tt_fase2_guardar_estudio',studentSave,student)).status,403);
    assert.equal((await rpc('tt_fase2_intentos',childAttempts,student)).status,403);
  }finally{
    await adminTable('tt_progreso?codigo=in.('+code+','+code2+')',undefined,'DELETE');
    for(const id of [child,owner])if(id)await call('/auth/v1/admin/users/'+id,{jwt:service,key:service,method:'DELETE'});
  }
});
