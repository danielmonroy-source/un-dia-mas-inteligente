/* Evidence and resumable lesson runs. A run is an append-only graph of events. */
(function(root){
'use strict';
const {byId,lessons,mathTopics,hint}=root.LessonBank;
const stages=['activar','explicar','ejemplo','guiada','independiente','aplicacion','reflexion','agenda'];
const labels={activar:'Lo que ya sabes',explicar:'Aprende una estrategia',ejemplo:'Mira un ejemplo',guiada:'Practica con apoyo',independiente:'Inténtalo por tu cuenta',aplicacion:'Úsalo en otra situación',reflexion:'Piensa en lo aprendido',agenda:'Próximo repaso',repaso:'Recuerda y aplica'};
const date=/^\d{4}-\d{2}-\d{2}$/;
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const empty=()=>({v:1,runs:{}});
const normalize=x=>String(x??'').trim().toLocaleLowerCase('es-MX').normalize('NFD').replace(/\p{M}/gu,'').replace(/[.!?]+$/,'');
const nextDay=(day,n)=>root.Motor.masDias(day,n);
const rows=run=>Object.values(run?.events||{});
function valid(data){
  return obj(data)&&data.v===1&&obj(data.runs)&&Object.entries(data.runs).every(([id,r])=>
    uuid.test(id)&&obj(r)&&id===r.id&&Object.hasOwn(byId,r.lesson)&&date.test(r.day)&&obj(r.events)&&
    Object.entries(r.events).every(([key,e])=>uuid.test(key)&&obj(e)&&key===e.id&&
      (e.prev===''||uuid.test(e.prev))&&Number.isInteger(e.n)&&e.n>0&&
      ['answer','skip','help','access','advance','retry','done'].includes(e.kind)&&Object.hasOwn(labels,e.stage)&&date.test(e.day)&&
      (!e.q||byId[r.lesson].tasks.some(q=>q.id===e.q))&&
      (!Object.hasOwn(e,'level')||(Number.isInteger(e.level)&&e.level>=0&&e.level<=4))&&
      (!Object.hasOwn(e,'due')||date.test(e.due))&&typeof e.ts==='string'&&Number.isFinite(Date.parse(e.ts))));
}
function union(a,b){
  const runs={...a?.runs};
  for(const [id,r] of Object.entries(b?.runs||{})){
    const old=runs[id];
    runs[id]=old?{...old,events:{...r.events,...old.events}}:r;
  }
  return {v:1,runs};
}
function assignments(a,b){
  const out={};
  for(const id of Object.keys(byId)){
    const day=[a?.[id],b?.[id]].filter(x=>typeof x==='string'&&date.test(x)).sort().at(-1);
    if(day)out[id]=day;
  }
  return out;
}
function path(run){
  const sorted=rows(run).sort((a,b)=>a.n-b.n||a.id.localeCompare(b.id));
  const found=new Map([['',{depth:0}]]);
  let tip=null;
  for(const e of sorted){
    const p=found.get(e.prev);
    if(!p||e.n!==p.depth+1)continue;
    found.set(e.id,{event:e,depth:e.n});tip=e;
  }
  const chain=[];
  while(tip){chain.push(tip);tip=found.get(tip.prev)?.event}
  return chain.reverse();
}
function status(run){
  const seq=path(run),lesson=byId[run.lesson],steps=run.review?['repaso','reflexion','agenda']:stages;
  let cursor=0,feedback=null,level=0,alternate=false,done=null;
  for(const e of seq){
    if(e.kind==='help'){level=Math.max(level,e.level);continue}
    if(e.kind==='answer'){feedback=e;continue}
    if(e.kind==='retry'){feedback=null;level=0;alternate=true;continue}
    if(e.kind==='advance'||e.kind==='skip'){
      cursor+=e.kind==='skip'?3:1;feedback=null;level=0;alternate=false;
    }
    if(e.kind==='done')done=e;
  }
  const stage=steps[Math.min(cursor,steps.length-1)];
  const lookup={activar:0,guiada:alternate?1:2,independiente:alternate?5:3,aplicacion:alternate?6:4,repaso:alternate?(lesson.tasks.length>8?8:5):(lesson.tasks.length>7?7:6)};
  const q=lesson.tasks[lookup[stage]]||null;
  return {stage,cursor,total:steps.length,q,feedback,level,alternate,done,seq,lesson};
}
function profile(data,id){
  const runs=Object.values(data?.runs||{}).filter(r=>r.lesson===id).sort((a,b)=>a.day.localeCompare(b.day)||a.id.localeCompare(b.id));
  const complete=runs.map(r=>status(r).done).filter(Boolean).sort((a,b)=>String(a.ts).localeCompare(String(b.ts))||a.id.localeCompare(b.id));
  const evidence=runs.flatMap(rows);
  const math={};
  const errors={};
  for(const e of evidence){
    if(e.error)errors[e.error]=(errors[e.error]||0)+1;
    if(e.evidence&&e.ok&&(e.strong||e.evidence==='reconocimiento')&&(e.stage!=='repaso'||e.retained))
      math[e.evidence]=(math[e.evidence]||0)+1;
  }
  return {math,errors,active:runs.find(r=>!status(r).done),complete,
    due:complete.at(-1)?.due||'',exposure:evidence.filter(e=>e.kind==='advance'&&e.stage==='explicar').length,
    examples:evidence.filter(e=>e.kind==='advance'&&e.stage==='ejemplo').length,
    guided:evidence.filter(e=>e.kind==='answer'&&e.stage==='guiada').length,
    independent:evidence.filter(e=>e.strong&&e.stage==='independiente').length,
    applied:evidence.filter(e=>e.strong&&e.stage==='aplicacion').length,
    retained:evidence.filter(e=>e.retained).length,pending:evidence.filter(e=>e.pending).length,
    help:evidence.filter(e=>e.kind==='help').length,
    difficulty:evidence.filter(e=>e.kind==='answer'&&!e.ok&&!e.pending&&['independiente','aplicacion','repaso'].includes(e.stage)).length};
}
function start(data,id,day){
  if(!Object.hasOwn(byId,id))return null;
  const p=profile(data,id);
  if(p.active)return p.active;
  if(p.complete.length&&p.due>day)return null;
  const run={id:root.Motor.uuid(),lesson:id,day,review:!!p.complete.length&&p.applied>0,events:{}};
  data.runs[run.id]=run;return run;
}
function add(run,st,kind,day,fields={}){
  const id=root.Motor.uuid();
  const e={id,prev:st.seq.at(-1)?.id||'',n:st.seq.length+1,stage:st.stage,kind,day,ts:new Date().toISOString(),
    ...(st.q?{q:st.q.id}:{}),...fields};
  run.events[id]=e;return e;
}
function strongHistory(S,skill,day){
  if(root.Diagnostico?.map(S,day).some(r=>r.h.id===skill&&(r.conflict||r.initial.state==='nec')))return false;
  return ['con','dom'].includes(root.Motor.resumen(S,day)[skill]?.estado);
}
function evaluate(q,value){
  const clean=x=>{
    const text=normalize(x).replace(/\s+/g,' ');
    if(q.expression)return text.replace(/\s/g,'').replace(/[x*]/g,'×').replace(/-/g,'−');
    return q.expanded?text.replace(/\s/g,''):text;
  };
  const input=clean(value);
  const ok=!q.open&&[q.answer,...q.accept||[]].some(x=>clean(x)===input);
  if(ok||q.open||!q.evidence)return {ok};
  const exact=Object.entries(q.errors||{}).find(([answer])=>clean(answer)===input)?.[1];
  if(exact)return {ok,error:exact};
  if(q.unit&&/^\d+$/.test(input)&&input===clean(q.answer).split(' ')[0])return {ok,error:'unidad'};
  if(q.irrelevant&&input.split('+').includes(String(q.irrelevant)))return {ok,error:'dato-irrelevante'};
  if(q.build&&input.split('|').reverse().join('|')===q.answer)return {ok,error:'grupos-por-elementos'};
  return {ok,error:q.fallback||'respuesta-distinta'};
}
const inventory=()=>lessons.map(l=>({id:l.id,skill:l.skill,prerequisites:l.prereq,
  related:mathTopics[l.id]||[],objective:l.strategy,minutes:[5,10],explanation:true,
  activities:l.tasks.map((q,i)=>({id:q.id,objective:q.prompt,difficulty:q.difficulty||1,
    evidence:q.format==='rec'?'reconocimiento':q.evidence||q.format||'respuesta',equivalent:i===3?l.tasks[5].id:i===4?l.tasks[6].id:null,
    application:i===4||i===6,review:i===(l.tasks.length>7?7:6)||i===(l.tasks.length>8?8:5),parent:!!q.open}))}));
function act(data,run,kind,day,value,S){
  const st=status(run),{q,stage,level,feedback,alternate}=st;
  if(st.done)return null;
  if(kind==='help'){
    if(!q||feedback||level>=4)return null;
    return add(run,st,kind,day,{level:level+1});
  }
  if(kind==='access')return add(run,st,kind,day);
  if(kind==='answer'){
    if(!q||feedback||level===4||!String(value??'').trim())return null;
    const pending=!!q.open;
    const {ok,error}=evaluate(q,value);
    const bare=['independiente','aplicacion','repaso'].includes(stage)&&level===0;
    const fmt=q.format||(q.tokens||q.build?'mix':'rcl');
    const observed=bare&&fmt!=='rec'&&!q.canje&&!pending;
    const strong=ok&&observed;
    const retained=strong&&stage==='repaso'&&profile(data,run.lesson).complete.some(e=>e.applied&&e.due<=day);
    return add(run,st,kind,day,{ok,pending,strong,retained,observed,level,...(q.evidence?{evidence:fmt==='rec'?'reconocimiento':q.evidence}:{}),...(error?{error}:{}),fmt:stage==='aplicacion'&&strong?'apl':fmt});
  }
  if(kind==='retry'){
    if(!q||alternate||(!feedback&&level!==4)||feedback?.ok||feedback?.pending||!['guiada','independiente','aplicacion','repaso'].includes(stage))return null;
    // This alternate is used once per run, and never reuses the just demonstrated item.
    return add(run,st,kind,day);
  }
  if(kind!=='advance')return null;
  if(q&&!feedback&&level<4)return null;
  if(stage==='activar'&&!q.evidence&&feedback?.ok&&level===0&&q.format!=='rec'&&S&&strongHistory(S,st.lesson.skill,day))
    return add(run,st,'skip',day);
  if(stage!=='agenda')return add(run,st,'advance',day);
  const prev=profile(data,run.lesson);
  const applied=st.seq.some(e=>e.stage==='aplicacion'&&e.strong);
  const retained=st.seq.some(e=>e.retained);
  const interval=applied?3:retained?[7,14,30,60][Math.min(3,prev.retained-1)]:1;
  return add(run,st,'done',day,{due:nextDay(day,interval),applied,retained:false});
}
function recommendation(S,id,day,seen=new Set()){
  if(seen.has(id)||!Object.hasOwn(byId,id))return null;
  seen.add(id);
  const l=byId[id];
  const diag=root.Diagnostico?.map(S,day)||[];
  if(l.area==='Problemas'&&id!=='decidir-multiplicar'&&diag.some(r=>['ins-1','lec-oracion','lec-info'].includes(r.h.id)&&r.initial.state==='nec')){
    const target=diag.some(r=>r.h.id==='ins-1'&&r.initial.state==='nec')?'encontrar-accion':'entender-oraciones';
    if(!profile(S.lessons,target).applied)return byId[target];
  }
  for(const p of l.prereq){
    const evidence=profile(S.lessons,p);
    const math=Object.hasOwn(mathTopics,l.id)&&Object.hasOwn(mathTopics,p);
    if(evidence.applied||(!math&&((evidence.independent&&evidence.complete.length)||strongHistory(S,byId[p].skill,day))))continue;
    return recommendation(S,p,day,seen)||byId[p];
  }
  return l;
}
function attempt(S,run,e){
  if(e.kind!=='answer'||e.pending)return null;
  const l=byId[run.lesson];
  const a={id:e.id,k:l.skill+':leccion-v1:'+l.id,ok:e.ok,primero:true,pista:!e.observed&&
    (e.level>0||e.stage==='guiada'||e.stage==='activar'),fmt:e.fmt,origen:'leccion',ts:Date.parse(e.ts),
    dia:e.day,err:e.ok?null:e.error||'respuesta-distinta',extra:{ejercicio:e.q,etapa:e.stage,ayuda:e.level,retencion:e.retained,...(e.evidence?{evidencia:e.evidence}:{})}};
  if(motorEvidence(e))return root.Motor.registrar(S,a);
  return {...a,ts:e.ts,ms:null};
}
const motorEvidence=e=>e.observed&&(e.stage!=='repaso'||!e.ok||e.retained);
function reconcile(S){
  const runs=Object.values(S.lessons?.runs||{});
  const prefix=':leccion-v1:';
  if(!runs.length&&!S.lessons)return;
  const events=new Map();
  for(const run of runs)for(const e of rows(run)){
    if(e.kind==='answer'&&motorEvidence(e))events.set(e.id,{run,e});
  }
  const ku={...S.ku};
  for(const k of Object.keys(ku))if(k.includes(prefix))delete ku[k];
  const target={ku};
  for(const {run,e} of [...events.values()].sort((a,b)=>a.e.day.localeCompare(b.e.day)||a.e.ts.localeCompare(b.e.ts)||a.e.id.localeCompare(b.e.id)))attempt(target,run,e);
  S.ku=target.ku;
}
const openResponses=(data,id)=>Object.values(data?.runs||{}).filter(r=>r.lesson===id).flatMap(rows).filter(e=>e.pending);
const api={lessons,byId,labels,empty,valid,union,assignments,path,status,profile,start,act,recommendation,attempt,openResponses,reconcile,evaluate,inventory,hint};
root.Lecciones=api;
if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
