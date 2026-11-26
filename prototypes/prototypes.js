'use strict';
const root=document.querySelector('#app');
const storage='udmi-prototipos-v1';
const fresh=()=>({sessions:{},skills:{}});
let data;
try{data=JSON.parse(localStorage.getItem(storage))||fresh()}catch{data=fresh()}
let mode='',paused=false,notice='',success=false,storageWarning=false;
const modes={
  practice:{label:'Mi práctica de hoy',verb:'Recordar',icon:'↻',description:'Recuerda algo que ya viste y recibe una pista si la necesitas.'},
  lesson:{label:'Lecciones guiadas',verb:'Aprender',icon:'✦',description:'Descubre cómo se multiplican grupos con la misma cantidad.'},
  adventure:{label:'Aventura de habilidades',verb:'Aplicar',icon:'⌖',description:'Ayuda a preparar el huerto siguiendo un encargo.'}
};
const save=()=>{try{localStorage.setItem(storage,JSON.stringify(data));storageWarning=false}catch{storageWarning=true}};
const today=()=>new Date().toLocaleDateString('sv-SE');
function nextDay(days){
  const d=new Date();d.setDate(d.getDate()+days);
  return d.toLocaleDateString('sv-SE');
}
const btn=(label,action,cls='action')=>'<button class="'+cls+'" data-action="'+action+'">'+label+'</button>';
const baskets=(n,size,bump=-1)=> '<div class="draw" role="img" aria-label="'+Array.from({length:n},(_,i)=>'Cesta '+(i+1)+' con '+(Array.isArray(size)?size[i]:size)+' fichas').join('. ')+'">'+Array.from({length:n},(_,i)=>
  '<span class="group'+(i===bump?' bump':'')+'">'+ '<i class="seed"></i>'.repeat(Array.isArray(size)?size[i]:size)+'</span>').join('')+'</div>';
const caption=count=>'<p class="muted">Cestas: '+count.join(', ')+' fichas.</p>';
const steps=['Lo que ya sabes','La idea','Mira cómo','Hazlo conmigo','Hazlo por tu cuenta','Úsalo en otro lugar','Comprueba'];
const practice=[
  {id:'grupos-a',a:2,b:3,question:'Hay 2 bolsas de 3 fichas. ¿Cuántas fichas hay?'},
  {id:'grupos-b',a:3,b:4,question:'Hay 3 cajas con 4 tizas en cada una. ¿Cuántas tizas hay?'},
  {id:'grupos-c',a:4,b:5,question:'Hay 4 sobres de 5 tarjetas. ¿Cuántas tarjetas hay?'},
  {id:'grupos-d',a:2,b:4,question:'Dos paquetes tienen 4 lápices cada uno. ¿Cuántos lápices hay?'},
  {id:'grupos-e',a:3,b:5,question:'Hay 3 filas de 5 sillas. ¿Cuántas sillas hay?'},
  {id:'grupos-f',a:5,b:6,question:'Cinco equipos tienen 6 integrantes cada uno. ¿Cuántas personas hay?'}
];
function start(which){
  mode=which;paused=false;notice='';success=false;
  if(!data.sessions[mode]||data.sessions[mode].done&&mode!=='practice'){
    if(mode==='practice'){
      const prev=data.skills.groups;
      if(!prev||prev.due<=today()){
        const tier=prev?.tier||0;
        const index=prev?.q===practice[tier].id?tier+3:tier;
        data.sessions[mode]={index,step:0,help:false,tries:0};
      }
    }else data.sessions[mode]={step:0,counts:[0,0,0],tries:0};
    save();
  }else if(mode==='practice'&&data.sessions[mode].done&&data.skills.groups.due<=today()){
    delete data.sessions[mode];start(mode);return;
  }
  notice=session()?.notice||'';success=session()?.success||false;
  render();
}
const session=()=>data.sessions[mode];
const choices=nums=>'<div class="choices">'+nums.map(n=>btn(n,'answer-'+n,'choice')).join('')+'</div>';
const numberInput=()=>'<label for="number">Tu respuesta</label><div class="controls"><input id="number" type="text" inputmode="numeric" maxlength="2" autocomplete="off">'+btn('Comprobar','check')+'</div>';
const readableDate=date=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'long'}).format(new Date(date+'T12:00:00'));
const escape=value=>String(value).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const feedback=()=>notice?'<p role="status" class="notice'+(success?' ok':'')+'">'+escape(notice)+'</p>':'';
const tools=()=>'<div class="controls">'+btn('Pista','hint','secondary')+'</div>';
function home(){
  return '<section class="hero"><div><p class="eyebrow">Espacio de aprendizaje</p><h1>Una idea nueva cada día</h1><p>Elige qué quieres hacer. Puedes volver cuando quieras.</p></div>'+
    baskets(3,3)+'</section><nav class="cards" aria-label="Actividades">'+Object.entries(modes).map(([id,m])=>
      '<button class="tile" data-action="open-'+id+'"><span class="icon" aria-hidden="true">'+m.icon+'</span><strong>'+m.verb+'</strong><span>'+m.label+'</span><small>'+m.description+'</small></button>').join('')+'</nav>';
}
function frame(content,max){
  const s=session();
  return '<section class="pane"><div class="stephead">'+btn('Inicio','home','secondary')+'<span>'+Math.min(s.step+1,max)+' de '+max+'</span>'+btn('Pausa','pause','secondary pause')+'</div>'+
    '<progress class="progress" max="'+max+'" value="'+Math.min(s.step+1,max)+'" aria-label="Progreso de la actividad"></progress>'+
    '<article class="sheet"><p class="eyebrow">'+modes[mode].label+'</p>'+content+'</article></section>';
}
function practiceScreen(s){
  if(!s||s.done){
    return '<section class="pane sheet"><p class="eyebrow">Mi práctica de hoy</p><h1>Tu repaso quedó listo</h1><p>Volverás a practicar el '+readableDate(data.skills.groups.due)+'. Puedes seguir con una lección o una misión.</p>'+btn('Volver al inicio','home')+'</section>';
  }
  const q=practice[s.index];
  return frame('<h1>Recuerda los grupos</h1><p>'+q.question+'</p>'+
    (s.help?baskets(q.a,q.b)+'<p class="muted">Ves '+q.a+' grupos. Cuenta '+q.b+' fichas en cada grupo.</p>':'')+
    (s.checked?feedback()+btn('Guardar y salir','finish'): numberInput()+tools()+feedback()),1);
}
function lessonScreen(s){
  if(s.done)return '<section class="pane sheet"><h1>Terminaste la lección</h1><p class="summary">Cuando todos los grupos tienen la misma cantidad, puedes sumar esa cantidad varias veces o multiplicar.</p>'+btn('Volver al inicio','home')+'</section>';
  const next=btn('Continuar','next');
  const screens=[
    '<h1>¿Cuántas hay en cada cesta?</h1>'+baskets(2,3)+'<p class="muted">Dos cestas con fichas moradas.</p>'+choices([2,3,6]),
    '<h1>Una cantidad que se repite</h1><p>Para multiplicar, primero comprueba que todos los grupos tienen la misma cantidad.</p>'+baskets(3,2)+'<p><strong>3 grupos de 2</strong> se puede escribir como <strong>3 × 2</strong>.</p>'+next,
    '<h1>Cuenta una cesta a la vez</h1>'+baskets(3,2)+'<p>La primera suma 2. La segunda lleva el total a 4. La tercera lo lleva a 6.</p><p><strong>2 + 2 + 2 = 6</strong></p>'+next,
    '<h1>Forma 3 grupos de 2</h1><p>Toca el botón de cada cesta para añadir una ficha.</p>'+baskets(3,s.counts,s.bump)+caption(s.counts)+
      '<div class="choices">'+s.counts.map((_,i)=>btn('+ Cesta '+(i+1),'add-'+i,'choice')).join('')+'</div><div class="controls">'+btn('Vaciar','clear','secondary')+btn('Comprobar','check')+'</div>',
    '<h1>Pruébalo por tu cuenta</h1><p>Hay 3 estantes con 4 libros en cada uno. ¿Cuántos libros hay?</p>'+numberInput(),
    '<h1>Úsalo en el recreo</h1><p>Cuatro equipos necesitan 3 pelotas por equipo. Escribe cuántas pelotas debes llevar.</p>'+numberInput(),
    '<h1>Explica qué se repite</h1><p>Hay 3 platos con 2 uvas en cada uno. ¿Por qué podemos usar una multiplicación?</p><div class="controls">'+btn('Todos los platos tienen 2 uvas','answer-1','choice')+btn('Hay 3 platos','answer-2','choice')+'</div>'
  ];
  const entered=s.checked;
  return frame(s.step===1||s.step===2?screens[s.step]:entered?
    '<h1>'+steps[s.step]+'</h1>'+feedback()+next:screens[s.step]+tools()+feedback(),7);
}
function adventureScreen(s){
  if(s.done)return '<section class="pane sheet"><div class="plant" aria-hidden="true">🌱</div><h1>Huerto preparado</h1><p>Escogiste qué información usar y repartiste las semillas por igual. Esa estrategia sirve para repartir materiales en clase.</p>'+btn('Volver al inicio','home')+'</section>';
  const challenge=[
    '<h1>El encargo del huerto</h1><p class="story">Prepara tres cestas. Pon dos semillas en cada una. Los guantes están colgados en la puerta.</p><p>Para empezar, toca lo que necesitas preparar.</p><div class="choices">'+btn('Cestas','answer-1','choice')+btn('Guantes','answer-2','choice')+'</div>',
    '<h1>Reparte las semillas</h1><p>Coloca dos semillas en cada una de las tres cestas del encargo.</p>'+baskets(3,s.counts,s.bump)+caption(s.counts)+'<div class="choices">'+s.counts.map((_,i)=>btn('+ Cesta '+(i+1),'add-'+i,'choice')).join('')+'</div><div class="controls">'+btn('Vaciar','clear','secondary')+btn('Entregar cestas','check')+'</div>',
    '<h1>Prepara los vasos</h1><p class="story">Cada semilla necesita un vaso. Prepara tantos vasos como semillas colocaste.</p>'+baskets(3,2)+choices([3,5,6])
  ];
  return frame(s.checked?'<h1>Encargo listo</h1>'+feedback()+btn(s.step===2?'Terminar misión':'Seguir misión','next'):challenge[s.step]+tools()+feedback(),3);
}
function render(focus=true){
  const s=session();
  root.innerHTML=!mode?home():paused?'<section class="pane sheet"><h1>Hasta que quieras volver</h1><p>Tu lugar está guardado en este navegador.</p><div class="controls">'+btn('Continuar','resume')+btn('Ir al inicio','home','secondary')+'</div></section>':
    mode==='practice'?practiceScreen(s):mode==='lesson'?lessonScreen(s):adventureScreen(s);
  if(storageWarning)root.insertAdjacentHTML('afterbegin','<p class="notice" role="alert">El navegador no pudo guardar esta actividad.</p>');
  if(focus){const heading=root.querySelector('h1');heading.tabIndex=-1;heading.focus({preventScroll:true});window.scrollTo(0,0)}
}
function answer(value){
  const s=session();
  const q=practice[s.index];
  const expected=mode==='practice'?q.a*q.b:mode==='lesson'?({0:3,4:12,5:12,6:1})[s.step]:({0:1,2:6})[s.step];
  const ok=value===expected;
  if(!ok)s.tries++;
  s.checked=ok;success=ok;
  if(mode==='practice'){
    if(ok){
      const tier=Math.max(0,Math.min(2,(s.index%3)+(s.help||s.tries?-1:1)));
      data.skills.groups={q:q.id,tier,due:nextDay(s.help||s.tries?1:3)};
    }
    notice=ok?'Sí. '+q.a+' grupos de '+q.b+' dan '+expected+'.':'Cuenta la misma cantidad una vez por cada grupo. Puedes pedir una pista.';
  }else if(mode==='lesson'){
    notice=ok?({0:'Hay 3 en cada cesta, aunque en total haya 6.',4:'3 grupos de 4 dan 12 libros.',5:'4 grupos de 3 dan 12 pelotas.',6:'La multiplicación funciona porque la misma cantidad se repite.'})[s.step]:
      ({0:'Mira una sola cesta. Aquí preguntamos por cada cesta.',4:'Cuenta 4 por cada estante.',5:'Suma 3 una vez por cada equipo.',6:'Comprueba si todos tienen la misma cantidad.'})[s.step];
  }else{
    notice=ok?(s.step===0?'Las cestas sirven para repartir las semillas. Los guantes no cambian el reparto.':'Hay seis semillas, así que hacen falta seis vasos.'):
      (s.step===0?'Busca el objeto que debe contener las semillas.':'Cuenta una semilla por cada vaso que vas a preparar.');
  }
}
root.addEventListener('keydown',e=>{
  if(e.target.id==='number'&&e.key==='Enter'){e.preventDefault();root.querySelector('[data-action="check"]').click()}
});
root.addEventListener('click',e=>{
  const button=e.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action.startsWith('open-')){start(action.slice(5));return}
  if(action==='home'){mode='';paused=false;render();return}
  const s=session();if(!s)return;
  if(action==='pause'||action==='resume'){paused=action==='pause';render();return}
  if(action==='hint'){
    s.help=true;success=false;
    notice=mode==='practice'?'Usa el dibujo para contar grupos iguales.':mode==='adventure'?
      ['Mira la primera oración del encargo.','Compara cada cesta con la cantidad pedida.','Cada ficha representa una semilla.'][s.step]:
      ({0:'Señala una sola cesta y cuenta sus fichas.',3:'Cada botón añade una ficha a una cesta. Detente cuando tenga dos.',4:'Puedes sumar cuatro tres veces.',5:'Cuenta de tres en tres para cada equipo.',6:'Compara cuántas uvas tiene cada plato.'})[s.step];
  }
  if(action.startsWith('answer-'))answer(Number(action.slice(7)));
  if(action.startsWith('add-')){
    const i=Number(action.slice(4));
    if(s.counts[i]<5)s.counts[i]++;
    s.bump=i;notice='';success=false;
  }
  if(action==='clear'){s.counts=[0,0,0];notice='';success=false}
  if(action==='check'){
    const input=root.querySelector('#number');
    if(input){
      const raw=input.value.trim();
      if(/^\d{1,2}$/.test(raw))answer(Number(raw));else notice='Escribe un número para comprobarlo.';
    }else{
      const ok=s.counts.every(n=>n===2);
      s.checked=ok;success=ok;
      notice=ok?'Hay dos fichas en cada una de las tres cestas. Son seis en total.':
        'Revisa cada cesta por separado. Si una tiene de más, pulsa Vaciar y prueba otra vez.';
    }
  }
  if(action==='finish'){s.done=true;notice='';success=false}
  if(action==='next'){
    s.step++;s.checked=false;s.help=false;s.counts=[0,0,0];
    if(s.step>=(mode==='lesson'?7:3))s.done=true;
    notice='';success=false;
  }
  s.notice=notice;s.success=success;save();
  const keepFocus=action.startsWith('add-')||action==='clear';
  render(!keepFocus);
  if(keepFocus)root.querySelector('[data-action="'+action+'"]')?.focus({preventScroll:true});
});
render();
