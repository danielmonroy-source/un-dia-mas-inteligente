import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Motor=require('../motor.js');
require('../diagnostic-bank.js');
require('../diagnostic.js');
require('../lesson-bank.js');
const L=require('../lessons.js');
const day='2026-01-03';
const state=()=>({lessons:L.empty(),ku:{}});
const clone=structuredClone;
function driver(S,id='agrupar-diez',date=day){
  const run=L.start(S.lessons,id,date);
  const view=()=>L.status(run);
  const act=(kind,value)=>{
    const e=L.act(S.lessons,run,kind,date,value,S);
    if(e)L.attempt(S,run,e);
    return e;
  };
  return {run,view,act,correct:()=>act('answer',view().q.answer)};
}
function toIndependent(d){
  d.correct();d.act('advance');
  assert.equal(d.view().stage,'explicar');
  d.act('advance');d.act('advance');
  assert.equal(d.view().stage,'guiada');
  d.correct();d.act('advance');
  assert.equal(d.view().stage,'independiente');
}
function finish(d){
  while(!d.view().done){
    const {q,feedback}=d.view();
    if(q&&!feedback)d.act('answer',q.answer??'Una respuesta abierta sintética.');
    else d.act('advance');
  }
  return d.view().done;
}
test('el catálogo reutiliza habilidades, diferencia actividades diagnósticas y valida canjes',()=>{
  const seen=new Set();
  assert.equal(L.lessons.filter(l=>!['Multiplicación','Problemas'].includes(l.area)).length,18);
  for(const l of L.lessons){
    assert.ok(Motor.HAB[l.skill]);assert.ok(l.home);assert.ok(l.tasks.length>=7);
    assert.ok(l.prereq.every(id=>L.byId[id]));
    for(const q of l.tasks){
      assert.ok(!seen.has(q.id));seen.add(q.id);
      assert.ok(q.prompt&&q.explain);
      if(q.options)assert.ok(q.options.includes(q.answer));
      if(q.tokens)assert.ok(q.answer.split('|').every(x=>q.tokens.includes(x)));
      if(q.canje){const [a,b]=q.canje;assert.ok(q.blocks[a]>=(a<b?10:1));assert.equal(Math.abs(a-b),1);}
    }
  }
});
test('progresión, guardado, pausa implícita y reanudación desde el evento guardado',()=>{
  const S=state(),d=driver(S);
  toIndependent(d);
  const snapshot=clone(S);
  const resumed=driver(snapshot);
  assert.equal(resumed.run.id,d.run.id);
  assert.equal(resumed.view().q.id,d.view().q.id);
  const end=finish(resumed);
  assert.equal(end.due,'2026-01-06');
  assert.equal(L.start(snapshot.lessons,'agrupar-diez',day),null);
  const p=L.profile(snapshot.lessons,'agrupar-diez');
  assert.deepEqual([p.exposure,p.examples,p.guided,p.independent,p.applied,p.retained],[1,1,1,1,1,0]);
  assert.ok(L.valid(snapshot.lessons));
});
test('ayudas y accesibilidad se distinguen y demostrar la solución exige cambiar de actividad',()=>{
  const S=state(),d=driver(S);
  toIndependent(d);
  const original=d.view().q.id;
  assert.equal(d.act('access').kind,'access');
  assert.equal(d.view().level,0);
  for(const level of [1,2,3,4])assert.equal(d.act('help').level,level);
  assert.equal(d.correct(),null);
  assert.equal(d.act('retry').kind,'retry');
  assert.notEqual(d.view().q.id,original);
  const alternative=d.correct();
  assert.equal(alternative.strong,true);
  assert.equal(L.profile(S.lessons,'agrupar-diez').help,4);
  assert.equal(Object.values(d.run.events).filter(e=>e.q===original&&e.kind==='answer').length,0);
  assert.notEqual(Motor.estadoK(S, 'vp-ud:leccion-v1:agrupar-diez',day),'dom');
});
test('intentos guiados, asistidos y abiertos se mantienen fuera del dominio',()=>{
  const S=state(),d=driver(S,'resumen');
  d.correct();d.act('advance');d.act('advance');d.act('advance');
  const opened=d.act('answer','Una idea que quiero contar');
  assert.equal(opened.pending,true);
  assert.equal(opened.strong,false);
  assert.ok(!JSON.stringify(S.lessons).includes('Una idea que quiero contar'));
  d.act('advance');d.act('help');
  assert.equal(d.act('answer','Otra idea').strong,false);
  finish(d);
  assert.deepEqual(S.ku,{});
  assert.ok(L.openResponses(S.lessons,'resumen').length>=2);
});
test('recomendación desde dificultades, prerrequisitos y progreso independiente previo',()=>{
  const S=state();
  assert.equal(L.recommendation(S,'orden-tres',day).id,'encontrar-accion');
  assert.equal(L.recommendation(S,'idea-principal',day).id,'entender-oraciones');
  finish(driver(S,'encontrar-accion'));
  assert.equal(L.recommendation(S,'orden-tres',day).id,'orden-dos');
  finish(driver(S,'orden-dos'));
  assert.equal(L.recommendation(S,'orden-tres',day).id,'orden-tres');
});
test('práctica diferida conserva su evidencia y completa un ciclo sin dominio prematuro',()=>{
  const S=state(),d=driver(S);
  finish(d);
  const review=driver(S,'agrupar-diez','2026-01-06');
  assert.equal(review.view().stage,'repaso');
  assert.equal(review.correct().retained,true);
  assert.equal(finish(review).due,'2026-01-13');
  assert.equal(L.profile(S.lessons,'agrupar-diez').retained,1);
  assert.notEqual(Motor.estadoK(S,'vp-ud:leccion-v1:agrupar-diez','2026-01-06'),'dom');
});
test('unión concurrente conserva ambos ramales y concilia el motor por UUID sin tocar saberes anteriores',()=>{
  const S=state(),base=driver(S);
  toIndependent(base);
  S.ku['en:dog']={n:8,c:7};
  const R=clone(S),left=driver(S),right=driver(R);
  const x=left.correct();
  right.act('help');const y=right.correct();
  const combined={...S,lessons:L.union(S.lessons,R.lessons)};
  const run=combined.lessons.runs[base.run.id];
  assert.ok(run.events[x.id]);assert.ok(run.events[y.id]);
  assert.deepEqual(L.status(run).seq,L.status(L.union(R.lessons,S.lessons).runs[run.id]).seq);
  L.reconcile(combined);L.reconcile(combined);
  assert.equal(combined.ku['vp-ud:leccion-v1:agrupar-diez'].n,1);
  assert.deepEqual(combined.ku['en:dog'],{n:8,c:7});
  assert.ok(L.valid(combined.lessons));
  assert.equal(L.valid({v:1,runs:{bad:{}}}),false);
});

test('el dominio de una lección exige aplicación aunque la habilidad histórica no la exija',()=>{
  const S=state(),k='vp-ud:leccion-v1:agrupar-diez',legacy='vp-ud:previo';
  const common={ok:true,primero:true,pista:false,fmt:'rcl'};
  for(const dia of ['2026-01-03','2026-01-06','2026-01-14']){
    Motor.registrar(S,{...common,k,dia});
    Motor.registrar(S,{...common,k:legacy,dia});
  }
  assert.equal(Motor.estadoK(S,legacy,'2026-01-14'),'dom');
  assert.notEqual(Motor.estadoK(S,k,'2026-01-14'),'dom');
  Motor.registrar(S,{...common,k,dia:'2026-01-15',fmt:'apl'});
  assert.equal(Motor.estadoK(S,k,'2026-01-15'),'dom');
});
