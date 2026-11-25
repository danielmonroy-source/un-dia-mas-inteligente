(function(root){
'use strict';
const Motor=root.Motor;
if(!Motor||!root.DiagnosticBank)return;
const {sessions,items}=root.DiagnosticBank;
const byId=Object.fromEntries(items.map(x=>[x.id,x]));
const stations=[...new Set(items.map(x=>x.station))].map(id=>items.filter(x=>x.station===id));
const form={rec:'Reconocimiento',rcl:'Respuesta construida',apl:'Aplicación'};
const independent=e=>e.ok===true&&!e.pista&&e.fmt!=='rec';
const hash=s=>[...s].reduce((v,c)=>(Math.imul(v,31)+c.charCodeAt(0))>>>0,0);
const list=d=>Object.values(d?.answers||{}).filter(a=>byId[a.q]);
const skills=Motor.CATALOGO.map(h=>{
  const activities=items.filter(q=>q.skill===h.id);
  const context={Instrucciones:'Interpretar consignas y llevarlas a una acción visible.',
    Lectura:'Construir significado con acceso al texto.',
    'Valor posicional':'Relacionar cada cifra con el valor que aporta al número.',
    Operaciones:'Representar y resolver operaciones por posición.',
    Multiplicación:'Relacionar los grupos iguales, el producto y su aplicación.',
    Problemas:'Elegir y comprobar estrategias a partir del enunciado.',
    Escritura:'Comunicar una idea con una forma legible y comprensible.',
    Entorno:'Relacionar espacios, comunidades y formas de vida.',
    'Espacio y ritmo':'Interpretar posiciones, rutas o secuencias.',
    Inglés:'Asociar forma, significado y uso en un contexto.',
    Complementarias:'Aplicar el conocimiento en actividades de práctica del juego.'};
  const practice=({ 'lec-info':'Lecturas de práctica','op-suma':'Sumas en columna','op-resta':'Restas en columna',
    'mul-2510':'Tablas','mul-346':'Tablas','mul-789':'Tablas','esc-orto':'Ortografía','en-vocab':'Vocabulario',
    'en-frases':'Frases','comp-reloj':'Reloj','comp-dinero':'Dinero','comp-frac':'Fracciones','comp-logica':'Lógica',
    'comp-ciencia':'Ciencia','comp-cultura':'Cultura general'})[h.id];
  return {...h,description:context[h.area],difficulty:h.dep.length?2:1,evidence:[...new Set(activities.map(q=>q.kind||form[q.format]))],
    activities:activities.map(q=>q.id),practice:practice||null,minimum:2,
    progression:'Dos ejemplos distintos para una estimación. Confirmar con práctica, aplicación y retención.',
    application:activities.some(q=>q.format==='apl')||h.apl,requiresParent:h.id==='esc-letra'};
});
const start=()=>({v:1,seed:Motor.uuid(),answers:{},drafts:{}});
const startIfNeeded=S=>S.diag||=(start());
const aidKinds=['pista','escuchar','escuchar-consigna','consultar-texto','audio-no-disponible'];
const errorKinds=[null,'omitido','orden','opcion','respuesta','canje-suma','orden-resta','valor-posicional','detalle-lectura'];
const isHelp=a=>['pista','palabra-visible','solucion'].includes(a);
function aids(d,q){
  return d?.drafts?.[q.id]||[];
}
function aid(d,q,kind){
  if(aids(d,q).includes(kind))return false;
  d.drafts[q.id]=[...aids(d,q),kind];return true;
}
function union(a,b){
  if(!a||!b)return a||b;
  const answers={...b.answers,...a.answers};
  const drafts={};
  for(const q of new Set([...Object.keys(a.drafts||{}),...Object.keys(b.drafts||{})])){
    const choices=[...new Set([...(a.drafts?.[q]||[]),...(b.drafts?.[q]||[])])];
    if(!Object.values(answers).some(e=>e.q===q))drafts[q]=choices;
  }
  const resume=(a.resume?.at||0)>=(b.resume?.at||0)?a.resume:b.resume;
  return {v:1,seed:[a.seed,b.seed].sort()[0],answers,drafts,...(resume?{resume}:{})};
}
function valid(d){
  if(!d||d.v!==1||typeof d.seed!=='string'||!d.answers||!d.drafts||
    Array.isArray(d.answers)||Array.isArray(d.drafts)||Object.keys(d.answers).length>250)return false;
  const validAids=values=>Array.isArray(values)&&values.length<=6&&
    values.every(a=>aidKinds.includes(a));
  return Object.entries(d.answers).every(([id,a])=>/^[a-f0-9-]{36}$/.test(id)&&a&&
    byId[a.q]&&['base','apoyo','confirmar','nueva'].includes(a.phase)&&Number.isInteger(a.session)&&a.session>=1&&a.session<=6&&
    typeof a.ts==='string'&&Number.isFinite(Date.parse(a.ts))&&[true,false,null].includes(a.ok)&&
    validAids(a.helps)&&a.pista===a.helps.some(isHelp)&&a.fmt===byId[a.q].format&&errorKinds.includes(a.err))&&
    Object.entries(d.drafts).every(([q,v])=>byId[q]&&validAids(v))&&
    (!d.resume||(Number.isSafeInteger(d.resume.at)&&Number.isInteger(d.resume.session)&&d.resume.session>=1&&d.resume.session<=6));
}
function observations(records,skill){
  const groups=new Map();
  for(const a of records){
    if(byId[a.q].skill!==skill||a.ok===null)continue;
    const rows=groups.get(a.q)||[];
    rows.push(a);groups.set(a.q,rows);
  }
  let conflicting=false;
  const evidence=[];
  for(const rows of groups.values()){
    if(rows.some(a=>a.ok!==rows[0].ok))conflicting=true;
    // Duplicar el mismo ejercicio no cuenta como una confirmación.
    evidence.push(rows.find(a=>a.ok===false)||rows.find(a=>a.pista)||rows[0]);
  }
  return {evidence,conflicting};
}
function estimate(records,skill){
  const {evidence,conflicting}=observations(records,skill);
  const n=evidence.length, hits=evidence.filter(a=>a.ok).length, alone=evidence.filter(independent).length;
  const helped=evidence.filter(a=>a.pista).length;
  const mixed=conflicting||(hits>0&&hits<n);
  const enough=n>=2&&!mixed;
  const last=evidence.map(a=>a.ts).sort().at(-1)||null;
  const formats=[...new Set(evidence.map(a=>byId[a.q].kind||form[a.fmt]))];
  let state='sin',detail='Falta evidencia';
  if(n){
    if(mixed){state='apr';detail='Respuestas distintas: conviene comprobar de nuevo'}
    else if(enough&&!hits){state='nec';detail='Conviene enseñar y practicar desde el nivel inicial'}
    else if(enough&&alone>=2){state='pra';detail='Aplicación o construcción independiente observada'}
    else{state='apr';detail=helped?'Respondió con apoyo':hits?'Reconocimiento o evidencia parcial':'Falta otro ejemplo'}
  }
  const errors={},usedAids={};
  for(const a of evidence){
    if(a.err)errors[a.err]=(errors[a.err]||0)+1;
    for(const help of a.helps)usedAids[help]=(usedAids[help]||0)+1;
  }
  return {n,hits,alone,helped,mixed,enough,state,detail,last,errors,formats,usedAids,
    level:Math.max(0,...evidence.filter(a=>a.ok).map(a=>byId[a.q].level))};
}
const tasks=s=>stations.filter(q=>q[0].session===s);
function next(d,session,follow){
  if(!d)return null;
  const all=list(d), done=new Set(all.map(a=>a.q)), here=all.filter(a=>a.session===session);
  const planned=tasks(session);
  const baseline=new Set(here.filter(a=>a.phase==='base').map(a=>byId[a.q].station));
  const stats=skill=>estimate(all,skill);
  const result=(item,phase)=>item?{item,phase,session}:null;
  const noAudio=all.some(a=>a.ok===null&&a.helps.includes('audio-no-disponible'));
  const available=(pool,skipUnavailable=false)=>pool.filter(q=>!done.has(q.id)&&(!skipUnavailable||!noAudio||!q.audio));
  const weaker=here.slice().reverse().find(a=>a.ok===false||a.pista);
  if(session<6&&weaker&&here.filter(a=>a.phase==='apoyo').length<2&&here.at(-1)?.phase!=='apoyo'){
    const prerequisites=Motor.HAB[byId[weaker.q].skill]?.dep||[];
    for(const pre of prerequisites){
      const status=stats(pre);
      if(status.alone>=2)continue;
      const candidate=available(items.filter(q=>q.skill===pre&&q.session<=session)).sort((a,b)=>a.level-b.level)[0];
      if(candidate)return result(candidate,'apoyo')
    }
  }
  for(const group of planned){
    if(baseline.has(group[0].station))continue;
    const candidates=available(group);
    // Un prerrequisito ya observado en esta estación también puede cubrir su turno.
    if(!candidates.length)continue;
    const stat=stats(group[0].skill);
    const order=candidates.slice().sort((a,b)=>a.level-b.level);
    const initial=hash(d.seed+group[0].station)%order.length;
    const i=stat.alone>=2?order.length-1:stat.mixed||stat.helped||stat.n&&!stat.hits?0:initial;
    return result(order[i],'base')
  }
  if(session===6){
    if(!follow||here.some(a=>byId[a.q].skill===follow&&a.phase==='nueva'))return null;
    return result(available(items.filter(q=>q.skill===follow)).sort((a,b)=>a.level-b.level)[0],'nueva')
  }
  const limit=session===5?5:3;
  if(here.filter(a=>a.phase==='confirmar').length>=limit)return null;
  const candidates=available(items.filter(q=>(q.session===session||session===5&&q.session<5)&&
    (!stats(q.skill).enough||stats(q.skill).alone<2&&q.format!=='rec')),true);
  candidates.sort((a,b)=>{
    const priority=q=>{
      const ex=stats(q.skill);
      // Confirmar primero habilidades activadas e inciertas; cambiar de modalidad si existe otra.
      const shows=all.filter(e=>byId[e.q].skill===q.skill);
      return (shows.length?8:0)+(ex.mixed?4:0)+(!ex.enough?3:0)+
        (shows.some(e=>byId[e.q].kind!==q.kind||e.fmt!==q.format)?2:0)+
        (ex.alone>=2?q.level:-q.level)
    };
    return priority(b)-priority(a)||a.id.localeCompare(b.id)
  });
  return result(candidates[0],'confirmar')
}
function normalize(v){
  return String(v).normalize('NFC').trim().toLowerCase().replace(/[.!?]+$/,'').replace(/\s+/g,' ')
}
function correct(q,input){
  if(q.options)return input===q.answer;
  const answer=normalize(q.answer), value=normalize(input);
  if(/^\d+$/.test(answer))return value.replace(/\s/g,'').replace(/^(\d{1,3}),(\d{3})$/,'$1$2')===answer;
  return [answer,...(q.accept||[]).map(normalize)].includes(value)
}
function observedError(q,input){
  const value=normalize(input);
  if(q.id==='suma-canje-0'&&value==='35'||q.id==='suma-canje-1'&&value==='214')return 'canje-suma';
  if(q.id==='resta-canje-0'&&value==='45')return 'orden-resta';
  if(q.station==='idea'&&value===normalize(q.options[1]))return 'detalle-lectura';
  if(q.id==='descomponer-0'&&value===normalize(q.options[1]))return 'valor-posicional';
  return q.tokens?'orden':q.options?'opcion':'respuesta'
}
function record(d,task,input,omitted=false,now=Date.now()){
  const q=task.item;
  if(list(d).some(e=>e.q===q.id))return null;
  const helps=[...aids(d,q)];
  if(q.audio&&!helps.includes('escuchar')&&!omitted)return null;
  const ok=omitted?null:correct(q,input);
  const err=omitted?'omitido':ok?null:observedError(q,input);
  const id=Motor.uuid();
  const row={q:q.id,phase:task.phase,session:task.session,ts:new Date(now).toISOString(),
    fmt:q.format,ok,helps,pista:helps.some(isHelp),err};
  d.answers[id]=row;delete d.drafts[q.id];
  return {id,row,q}
}
function toAttempt({id,row,q}){
  if(row.ok===null)return null;
  return {id,k:q.skill+':'+q.station,origen:'diagnostico',ts:row.ts,fmt:row.fmt,ok:row.ok,primero:true,
    pista:row.pista,ms:null,err:row.err,
    extra:{v:1,item:q.id,hab:q.skill,tipo:q.kind||form[q.format],nivel:q.level,ayudas:row.helps}}
}
const completed=(d,s)=>!!d&&list(d).some(a=>a.session===s)&&!next(d,s);
function map(S,hoy){
  const historic=Motor.resumen(S,hoy),records=list(S.diag);
  return skills.map(h=>{
    const initial=estimate(records,h.id),previous=historic[h.id];
    const conflict=['con','dom'].includes(previous.estado)&&initial.n>=2&&initial.hits<initial.n ||
      previous.estado==='nec'&&initial.alone>=2;
    const pending=conflict||initial.mixed||h.requiresParent||h.activities.length>0&&!initial.enough;
    const nextAction=conflict?'Contrastar la evidencia anterior con un ejemplo nuevo':initial.mixed?'Comprobar con otro formato':
      previous.estado==='rep'?'Repasar y aplicar nuevamente':initial.state==='nec'?'Enseñar con un ejemplo guiado':
      initial.helped?'Practicar con ayuda que se retire poco a poco':h.requiresParent?'Observar otra muestra de escritura en papel':
      pending?'Recoger otro ejemplo':
      initial.alone>=2?'Proponer una aplicación en otro contexto':initial.n?'Practicar sin opciones':'Recoger evidencia si es prioritario';
    const rubric=h.requiresParent?S.diagRubric:null;
    return {h,initial,previous,conflict,pending,nextAction,rubric}
  })
}
function report(S,hoy){
  const rows=map(S,hoy).filter(r=>r.h.activities.length||r.rubric);
  const strengths=rows.filter(r=>r.initial.alone>=2&&!r.initial.mixed);
  const attention=rows.filter(r=>r.initial.state==='nec'||r.initial.helped||r.conflict||r.rubric?.autonomia==='con apoyo');
  const priority=h=>({alta:3,media:2,baja:1}[h.prio]||0);
  const rank=r=>(r.conflict?12:0)+(r.initial.state==='nec'?10:0)+(r.initial.helped?7:0)+
    (r.initial.mixed?5:0)+(r.initial.n?3:0)+priority(r.h);
  const queue=rows.filter(r=>r.initial.n&&(r.pending||attention.includes(r))).sort((a,b)=>rank(b)-rank(a)||a.h.id.localeCompare(b.h.id));
  const priorities=(queue.length?queue:strengths).slice(0,4);
  const errors={};
  for(const r of rows)for(const [e,n] of Object.entries(r.initial.errors))errors[e]=(errors[e]||0)+n;
  const foundations=[...new Set(priorities.flatMap(r=>r.h.dep))].map(id=>rows.find(r=>r.h.id===id))
    .filter(r=>r&&r.initial.alone<2&&r.previous.estado!=='dom');
  return {sessions:sessions.filter((_,i)=>completed(S.diag,i+1)).length,attempts:list(S.diag).filter(a=>a.ok!==null).length,
    strengths,attention,foundations,pending:rows.filter(r=>r.pending),priorities,errors,
    objectives:[priorities.slice(0,2),priorities.slice(2,4).length?priorities.slice(2,4):priorities.slice(0,2)]}
}

function readingPractice(prompt){
  const p=prompt.toLowerCase();
  if(/idea principal|de qué trata todo|mejor título/.test(p))return 'lec-idea-p:idea';
  if(/qué (?:pasó|ocurrió) (?:primero|después|al final)|qué hizo.+(?:primero|antes de |al final)|qué pasó (?:justo )?antes/.test(p))return 'lec-orden:secuencia';
  if(/inferir|deducir|se puede concluir/.test(p))return 'lec-infer:inferencia';
  if(/^¿quién|^¿cómo se llamaba/.test(p))return 'lec-info:personaje';
  if(/^¿dónde|^¿en qué lugar/.test(p))return 'lec-info:lugar';
  return 'lec-info:dato'
}
const practiceKinds={
  reloj:[['qué hora será','intervalo'],['cómo se dice','leer-formato']],
  din:[['¿cuánto dinero hay','conteo'],['cambio','cambio'],['¿te alcanza','comparar']],
  frac:[['cómo se lee','nombre'],['dónde hay más','comparar'],['una pizza tiene','problema'],['cuál pizza muestra','representar']],
  log:[['qué número','serie'],['qué figura','patron'],['no pertenece','clasificar']]
};
function practiceType(act,prompt){
  return practiceKinds[act]?.find(([part])=>prompt.toLowerCase().includes(part))?.[1]||
    ({cie:'dato-texto',cult:'dato-texto',cultq:'dato',orto:'ortografia',log:'razonamiento',reloj:'leer-reloj',frac:'reconocer'})[act]||'practica'
}

const api={sessions,items,skills,start,startIfNeeded,aids,aid,union,valid,next,correct,record,toAttempt,completed,map,report,estimate,readingPractice,practiceType};
root.Diagnostico=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
