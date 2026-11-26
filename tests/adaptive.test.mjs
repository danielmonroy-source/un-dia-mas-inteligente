import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Motor=require('../motor.js');
const {items}=require('../diagnostic-bank.js');
const D=require('../diagnostic.js');
require('../lesson-bank.js');
const L=require('../lessons.js');
const day='2026-01-07';
const state=()=>({lessons:L.empty(),ku:{}});
function perform(S,id,date,stop){
  const run=L.start(S.lessons,id,date);
  for(let i=0;i<20;i++){
    const {stage,q,feedback,done}=L.status(run);
    if(done||stage===stop)return run;
    L.act(S.lessons,run,q&&!feedback?'answer':'advance',date,q?.answer??'Respuesta sintética.',S);
  }
  assert.fail('No se alcanzó la etapa');
}
test('el selector es estable, no cambia el estado y respeta tarea familiar y prerrequisitos',()=>{
  const S=state();
  S.lessonAssignments={'problema-dos-pasos':day};
  const before=structuredClone(S);
  const pick=L.nextAdaptive(S,day);
  assert.deepEqual(pick,L.nextAdaptive(S,day));
  assert.deepEqual(S,before);
  assert.equal(pick.reason,'prerrequisito');
  assert.equal(pick.target,'problema-dos-pasos');
  assert.equal(pick.id,'encontrar-accion');
});
test('reanuda la etapa real y después prioriza el repaso vencido',()=>{
  const S=state();
  perform(S,'grupos-iguales','2026-01-01');
  perform(S,'agrupar-diez',day,'aplicacion');
  assert.deepEqual(L.nextAdaptive(S,day),{id:'agrupar-diez',action:'aplicar',reason:'en-curso'});
  perform(S,'agrupar-diez',day);
  assert.deepEqual(L.nextAdaptive(S,day),{id:'grupos-iguales',action:'repasar',reason:'repaso-pendiente'});
});
test('ante evidencia contradictoria comprueba con otro ítem del diagnóstico',()=>{
  const S=state();S.diag=D.start();
  const pool=items.filter(q=>q.skill==='lec-info'&&q.level===1);
  assert.ok(pool.length>=2);
  for(const [i,q] of pool.slice(0,2).entries()) D.record(S.diag,{item:q,phase:'base',session:q.session},i?q.answer:'Respuesta incorrecta');
  assert.deepEqual(L.nextAdaptive(S,day),{skill:'lec-info',action:'evaluar',reason:'evidencia-mixta'});
});
test('el informe semanal usa evidencia y descarta días fuera del intervalo',()=>{
  const S=state();
  perform(S,'grupos-iguales','2025-12-31');
  perform(S,'agrupar-diez','2026-01-01');
  perform(S,'agrupar-diez','2026-01-04');
  assert.deepEqual(L.weekly(S,day),{independent:1,applied:1,retained:1});
  assert.equal(Motor.entre('2026-01-01',day),6);
});
