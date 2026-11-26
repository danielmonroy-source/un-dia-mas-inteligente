import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {simulate} from './history-size.mjs';
import {stateBytes} from './cargar-nube.mjs';
const require=createRequire(import.meta.url);
const Motor=require('../motor.js');
const {items}=require('../diagnostic-bank.js');
const D=require('../diagnostic.js');
require('../lesson-bank.js');
const L=require('../lessons.js');
const day='2026-01-01';
const activities=id=>L.byId[id].tasks;
const task=(id,index)=>activities(id)[index];
const out=(q,answer)=>L.evaluate(q,answer);
test('los siete niveles y los seis de problemas tienen variantes e inventario de tutor',()=>{
  const bank=L.inventory().filter(l=>activities(l.id)[0].evidence);
  assert.equal(bank.length,13);
  assert.equal(bank.flatMap(l=>l.activities).length,117);
  for(const l of bank){
    assert.ok(Motor.HAB[l.skill]&&l.related.every(key=>Motor.HAB[key]));
    assert.ok(l.objective&&l.explanation);
    assert.deepEqual(l.minutes,[5,10]);
    assert.ok(l.activities.some(q=>q.review)&&l.activities.some(q=>q.application));
    assert.notEqual(l.activities[3].id,l.activities[3].equivalent);
    for(const q of activities(l.id)){
      assert.ok(q.evidence&&q.difficulty>=1&&q.difficulty<=3);
      assert.equal(out(q,q.answer).ok,true);
      if(q.options)assert.equal(q.options.filter(x=>out(q,x).ok).length,1);
      if(q.unit)assert.ok(q.answer.endsWith(' '+q.unit));
    }
  }
});
test('construcciones, sumas, factores, rotaciones y estrategias corresponden a las cantidades',()=>{
  const groups=task('grupos-iguales',2);
  assert.deepEqual(out(groups,'5|3'),{ok:false,error:'grupos-por-elementos'});
  assert.equal(out(groups,'3|5').ok,true);
  assert.equal(out(task('suma-repetida',2),'5 + 5 + 5').ok,true);
  assert.equal(out(task('suma-repetida',3),'4 x 3').ok,true);
  assert.equal(out(task('arreglos',3),'4').ok,true);
  assert.equal(out(task('factores',4),'6').ok,true);
  for(const q of [...activities('estrategias-producto'),...activities('recordar-productos')]){
    const match=q.prompt.match(/(\d+) × (\d+)/);
    assert.equal(Number(q.answer),Number(match[1])*Number(match[2]));
  }
});
test('los problemas distinguen dato irrelevante, faltante, operación incorrecta, cálculo y unidad',()=>{
  assert.deepEqual(out(task('elegir-datos',1),'4+10'),{ok:false,error:'dato-irrelevante'});
  assert.deepEqual(out(task('elegir-datos',0),'2'),{ok:false,error:'dato-necesario'});
  assert.equal(out(task('elegir-datos',0),'objetos por grupo').ok,true);
  assert.equal(out(task('elegir-operacion',3),'7 - 4').ok,true);
  assert.equal(out(task('decidir-multiplicar',0),'2 × 3').error,'operacion');
  assert.equal(out(task('decidir-multiplicar',0),'3+2').ok,true);
  assert.equal(out(task('resolver-y-comprobar',4),'6').error,'unidad');
  assert.equal(out(task('resolver-y-comprobar',4),'6 sillas').ok,true);
  assert.equal(out(task('problema-dos-pasos',4),'12 sillas').error,'resultado-intermedio');
  for(const q of activities('problema-dos-pasos')){
    const n=q.prompt.match(/Hay (\d+).* con (\d+) [^ ]+ en cada grupo.*Entregan (\d+)/);
    const expected=Number(n[1])*Number(n[2])-(q.unit?Number(n[3]):0);
    assert.equal(Number(q.answer.split(' ')[0]),expected);
  }
});
function lessonState(){return {lessons:L.empty(),ku:{}};}
function reach(S,id){
  const run=L.start(S.lessons,id,day);
  for(let i=0;i<12;i++){
    const {q,stage,feedback}=L.status(run);
    if(stage==='independiente')return run;
    const row=L.act(S.lessons,run,q&&!feedback?'answer':'advance',day,q?.answer,S);
    if(row)L.attempt(S,run,row);
  }
  assert.fail('etapa independiente no encontrada');
}
test('las ayudas y errores se guardan, y la aplicación mantiene su tipo conceptual',()=>{
  const S=lessonState(),run=reach(S,'grupos-iguales');
  for(let i=0;i<4;i++)assert.equal(L.act(S.lessons,run,'help',day).level,i+1);
  assert.equal(L.act(S.lessons,run,'answer',day,'4|3'),null);
  L.act(S.lessons,run,'retry',day);
  const q=L.status(run).q,ind=L.act(S.lessons,run,'answer',day,q.answer,S);
  assert.equal(ind.strong,true);
  assert.equal(ind.evidence,'concepto');
  L.attempt(S,run,ind);
  L.act(S.lessons,run,'advance',day);
  const apply=L.act(S.lessons,run,'answer',day,L.status(run).q.answer,S);
  assert.equal(L.attempt(S,run,apply).extra.evidencia,'concepto');
  assert.equal(apply.fmt,'apl');
  assert.deepEqual(L.profile(S.lessons,'grupos-iguales').math,{concepto:2});
  assert.equal(L.status(structuredClone(run)).feedback.id,apply.id);
});
test('una dificultad diagnóstica de lectura redirige a comprensión y un curso de tablas no desbloquea dos pasos',()=>{
  const S=lessonState();
  S.diag=D.start();
  const sources=items.filter(q=>q.skill==='lec-info'&&q.level===1).slice(0,2);
  assert.equal(sources.length,2);
  for(const q of sources)D.record(S.diag,{item:q,phase:'base',session:q.session},'respuesta sintética incorrecta');
  assert.equal(L.recommendation(S,'problema-dos-pasos',day).id,'entender-oraciones');
  S.diag=D.start();
  assert.notEqual(L.recommendation(S,'problema-dos-pasos',day).id,'problema-dos-pasos');
  assert.equal(L.recommendation(S,'recordar-productos',day).id,'grupos-iguales');
});
test('escenario de dos dispositivos cruza el límite sin descartar evidencias de la simulación',()=>{
  const {state,snapshots,warningDay,limitDay}=simulate();
  const [,a,b,c]=snapshots;
  assert.ok(a.state<180000&&b.state>200000&&c.state>b.state);
  assert.ok(warningDay<limitDay&&limitDay<=90);
  assert.equal(Object.keys(state.daily).length,180);
  assert.ok(Object.keys(state.lessons.runs).length>60);
  assert.equal(stateBytes({t:'¡a:b,c!'}),Buffer.byteLength('{"t": "¡a:b,c!"}'));
});
