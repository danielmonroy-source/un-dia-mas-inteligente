import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { nubeMerge } from './cargar-nube.mjs';

const require=createRequire(import.meta.url);
const Motor=require('../motor.js');
require('../diagnostic-bank.js');
const D=require('../diagnostic.js');
const day='2026-10-15';
const stamp=Date.parse(day+'T18:00:00Z');
const item=id=>D.items.find(q=>q.id===id);
const record=(d,id,value,help,phase='base')=>{
  const q=item(id);
  if(help)D.aid(d,q,'pista');
  return D.record(d,{item:q,phase,session:q.session},value,false,stamp)
};
const wrong=q=>q.options?q.options.find(x=>x!==q.answer):q.tokens?q.answer.split('|').reverse().join('|'):'0';

test('catálogo sin duplicaciones y preguntas con formatos y soluciones consistentes',()=>{
  assert.equal(D.skills.length,44);
  assert.equal(new Set(D.items.map(q=>q.id)).size,D.items.length);
  assert.equal(new Set(D.items.map(q=>q.session)).size,5);
  for(const h of D.skills){
    assert.ok(h.description&&h.progression&&Motor.EST.sin);
    for(const id of h.activities)assert.equal(item(id).skill,h.id);
  }
  for(const q of D.items){
    assert.ok(Motor.HAB[q.skill]&&q.explanation);
    if(q.options){
      assert.equal(new Set(q.options).size,q.options.length);
      assert.equal(q.options.filter(x=>D.correct(q,x)).length,1);
    }
    if(q.tokens)assert.ok(q.answer.split('|').every(x=>q.tokens.includes(x)));
  }
});

test('el motor varía ejemplos, sube dificultad con dos aciertos independientes y revisa un prerrequisito',()=>{
  const variants=new Set();
  for(let n=0;n<12;n++)variants.add(D.next({...D.start(),seed:String(n)},1).item.id);
  assert.equal(variants.size,2);
  const strong={...D.start(),seed:'0'};
  record(strong,'reconocer-numero-1','208');
  record(strong,'unidades-0','4');
  // En un segundo formato de la misma habilidad, ya hay dos aciertos construidos.
  record(strong,'unidades-1','7',false,'confirmar');
  assert.equal(D.next(strong,2).item.id,'decenas-1');

  const partial=D.start();
  record(partial,'millares-0','3');
  const detour=D.next(partial,2);
  assert.equal(detour.phase,'apoyo');
  assert.equal(detour.item.skill,'vp-c');
  assert.equal(detour.item.level,1);
});

test('primera respuesta, consulta y ayudas son eventos distintos del dominio',()=>{
  const d=D.start(), S={pts:470,ku:{},med:{'2-esc':10}};
  const q=item('idea-0');
  D.aid(d,q,'consultar-texto');D.aid(d,q,'escuchar-consigna');
  const first=D.record(d,{item:q,phase:'base',session:1},q.options[1],false,stamp);
  assert.equal(first.row.err,'detalle-lectura');
  assert.equal(first.row.pista,false);
  assert.equal(D.record(d,{item:q,phase:'base',session:1},q.answer),null);
  const attempt=D.toAttempt(first);
  assert.equal(attempt.id,first.id);assert.equal(attempt.origen,'diagnostico');
  const {ts,...rest}=attempt;
  Motor.registrar(S,{...rest,ts:Date.parse(ts)});
  assert.deepEqual(S,{pts:470,ku:{},med:{'2-esc':10}});
  const guided=record(d,'suma-canje-0','45',true);
  assert.equal(D.toAttempt(guided).pista,true);
  assert.equal(D.estimate(Object.values(d.answers),'op-suma').alone,0);
  assert.ok(D.valid(JSON.parse(JSON.stringify(d))));
});

test('la escucha necesita audio y la omisión queda disponible para evaluación posterior',()=>{
  const d=D.start(), q=item('en-escuchar-0'), task={item:q,phase:'base',session:5};
  assert.equal(D.record(d,task,q.answer),null);
  D.aid(d,q,'audio-no-disponible');
  const missed=D.record(d,task,'',true,stamp);
  assert.equal(D.toAttempt(missed),null);
  assert.equal(D.estimate(Object.values(d.answers),'en-vocab').state,'sin');
  const next={item:item('en-escuchar-1'),phase:'nueva',session:6};
  D.aid(d,next.item,'escuchar');
  assert.equal(D.record(d,next,next.item.answer,false,stamp).row.pista,false);
});

function simulate(behavior){
  const d={...D.start(),seed:'sintetico'};
  for(let i=1;i<=5;i++){
    for(let tries=0;tries<24;tries++){
      const task=D.next(d,i);
      if(!task)break;
      const q=task.item,{ok,help}=behavior(q,tries,i);
      if(q.audio)D.aid(d,q,'escuchar');
      if(help)D.aid(d,q,'pista');
      assert.ok(D.record(d,task,ok?q.answer:wrong(q),false,stamp+tries*1000));
    }
    assert.ok(D.completed(d,i));
  }
  return {S:{pts:350,med:{'4-tec':8},diag:d},report:D.report({diag:d},day)};
}

test('cinco perfiles sintéticos producen recomendaciones distintas y rastreables',()=>{
  const read=simulate(q=>({ok:!q.skill.startsWith('lec-')}));
  const math=simulate(q=>({ok:!/^vp-|^op-|^mul-|^prob-/.test(q.skill)}));
  const advanced=simulate(()=>({ok:true}));
  const inconsistent=simulate((q,i)=>({ok:i%2===0}));
  const aided=simulate(q=>({ok:true,help:q.skill.startsWith('ins-')||q.skill.startsWith('en-')}));
  const profiles=[read,math,advanced,inconsistent,aided];
  assert.ok(read.report.attention.some(r=>r.h.area==='Lectura'));
  assert.ok(math.report.attention.some(r=>r.h.area==='Operaciones'));
  assert.ok(advanced.report.strengths.some(r=>r.h.area==='Multiplicación'));
  assert.ok(inconsistent.report.pending.some(r=>r.initial.mixed));
  assert.ok(aided.report.attention.some(r=>r.initial.helped));
  assert.equal(new Set(profiles.map(v=>v.report.priorities.map(r=>r.h.id).join(','))).size,5);
  for(const {S,report} of profiles){
    assert.equal(report.sessions,5);assert.equal(S.pts,350);assert.equal(S.med['4-tec'],8);
    for(const r of report.priorities)assert.ok(r.initial.n>0);
    assert.ok(D.map(S,day).every(r=>r.initial.state!=='dom'));
    assert.ok(D.valid(S.diag));
  }
});

test('la unión conserva evidencia simultánea y nunca cuenta dos veces el mismo ítem',()=>{
  const a={pts:100,med:{'4-tec':8},diag:D.start()},b={pts:100,diag:D.start()};
  record(a.diag,'tabla-346-0','12');
  record(b.diag,'tabla-346-0','10');
  record(b.diag,'tabla-346-1','42');
  const merged=nubeMerge(a,b);
  assert.equal(Object.keys(merged.diag.answers).length,3);
  assert.equal(merged.med['4-tec'],8);
  const evidence=D.estimate(Object.values(merged.diag.answers),'mul-346');
  assert.equal(evidence.n,2);assert.equal(evidence.mixed,true);assert.equal(evidence.enough,false);
});

test('las claves históricas y las nuevas facetas siguen apuntando al catálogo',()=>{
  assert.equal(Motor.habilidadDe('lec:info'),'lec-info');
  for(const [prompt,key] of [
    ['¿Quién encontró la libreta?','lec-info:personaje'],
    ['¿Dónde estaba?','lec-info:lugar'],
    ['¿Qué hizo antes de salir?','lec-orden:secuencia'],
    ['¿Cuál es la idea principal?','lec-idea-p:idea']
  ])assert.equal(D.readingPractice(prompt),key);
  assert.equal(Motor.habilidadDe('gen:din:cambio'),'comp-dinero');
  assert.equal(D.practiceType('din','¿Cuánto te dan de cambio?'),'cambio');
});

test('la contradicción mantiene el dominio histórico y recomienda comprobarlo',()=>{
  const S={pts:210,diag:D.start(),ku:{'lec-idea-p:tema':{
    n:5,c:5,fn:3,fo:3,sd:['2026-10-01','2026-10-08','2026-10-15'],ap:1,lv:2,due:'2026-10-22',
    dd:day,lf:1,pk:5,e:{}
  }}};
  for(const q of D.items.filter(x=>x.station==='idea'))record(S.diag,q.id,wrong(q));
  const skill=D.map(S,day).find(r=>r.h.id==='lec-idea-p');
  assert.equal(skill.previous.estado,'dom');
  assert.equal(skill.initial.state,'nec');
  assert.equal(skill.conflict,true);assert.equal(skill.pending,true);
  assert.match(skill.nextAction,/Contrastar/);
});
