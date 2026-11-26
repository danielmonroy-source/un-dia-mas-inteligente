'use strict';
const app=document.querySelector('#app');
const icons={
 taco:'<path d="M4 23a12 12 0 0 1 24 0z" fill="#ffc06b" stroke="#9e481d" stroke-width="2"/><path d="m7 18 5-4 4 2 4-2 5 4" fill="none" stroke="#34845e" stroke-width="3"/>',
 pencil:'<path d="M6 25 8 18 22 4l6 6-14 14z" fill="#f2af3f" stroke="#593b18" stroke-width="2"/>',
 ruler:'<rect x="4" y="11" width="24" height="10" rx="2" fill="#b9ede0" stroke="#2a6657" stroke-width="2"/><path d="M9 11v5m5-5v3m5-3v5m5-5v3" stroke="#2a6657" stroke-width="2"/>',
 notebook:'<rect x="7" y="4" width="19" height="24" rx="3" fill="#dacbff" stroke="#563699" stroke-width="2"/><path d="M11 4v24m5-17h6m-6 5h6" stroke="#563699" stroke-width="2"/>',
 ball:'<circle cx="16" cy="16" r="11" fill="#ffdbb5" stroke="#884b31" stroke-width="2"/><path d="M5 16h22M16 5q-10 11 0 22m0-22q10 11 0 22" fill="none" stroke="#884b31"/>',
 car:'<path d="m5 19 1-6 5-1 4-5h8l4 6v6z" fill="#ffd3d8" stroke="#8f3749" stroke-width="2"/><circle cx="10" cy="21" r="3" fill="#513a59"/><circle cx="23" cy="21" r="3" fill="#513a59"/>',
 bear:'<circle cx="8" cy="8" r="4" fill="#bf815d"/><circle cx="24" cy="8" r="4" fill="#bf815d"/><circle cx="16" cy="17" r="11" fill="#e4aa82"/><path d="M11 15h2m6 0h2m-7 5h4" stroke="#5a3926" stroke-width="2"/>',
 coin:'<circle cx="16" cy="16" r="12" fill="#ffe099" stroke="#8e671f" stroke-width="2"/><path d="M20 11h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6h-6m4-15v17" fill="none" stroke="#8e671f" stroke-width="2"/>',
 box:'<rect x="5" y="9" width="22" height="17" rx="2" fill="#dfb487" stroke="#805230" stroke-width="2"/><path d="M4 9h24M16 9v8" stroke="#805230" stroke-width="2"/>'
};
const svg=name=>'<svg viewBox="0 0 32 32" aria-hidden="true">'+icons[name]+'</svg>';
const objects=[['pencil','Lápiz'],['ruler','Regla'],['notebook','Cuaderno'],['ball','Pelota'],['car','Carrito'],['bear','Oso']];
const modes={tacos:'Tres platos en la taquería',bag:'La mochila de mañana',read:'La cancha mojada',money:'Paga en la papelería',english:'In, on, under'};
const lines=['Al salir al recreo, Camila y Omar llevaron el balón a la cancha.','El suelo estaba mojado por la lluvia, así que la maestra les pidió que jugaran bajo el techo.','Guardaron el balón y jugaron a las adivinanzas.'];
let mode='',s,notice='',paused=false,last='';
const memory='udmi-taller-editorial-v1';
function readSaved(){
  try{return JSON.parse(localStorage.getItem(memory))||{}}catch{return {}}
}
const saved=readSaved();
function keep(){
  saved[mode]=s;
  try{localStorage.setItem(memory,JSON.stringify(saved))}catch{notice='El navegador no pudo guardar. Puedes seguir aquí.'}
}
const esc=x=>String(x).replace(/[&<>]/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[k]));
const button=(label,id,cls='action',attr='')=>'<button class="'+cls+'" data-do="'+id+'" '+attr+'>'+label+'</button>';
const note=()=>'<p class="status" role="status">'+esc(notice)+'</p>';
const start=key=>{
  mode=key;paused=false;notice='';
  s=saved[key]||{step:0,plates:[0,0,0],selected:[],coins:[],place:'',evidence:-1};
};
const wrap=(title,body)=>'<section class="pane"><div class="stephead">'+button('Taller','home','secondary')+
  button('Pausa','pause','secondary')+'</div><article class="sheet"><p class="eyebrow">'+modes[mode]+'</p><h1>'+title+'</h1>'+body+note()+'</article></section>';
const field=label=>'<label class="worksheet">'+label+'<input inputmode="numeric" maxlength="3" id="answer" autocomplete="off"></label>'+button('Comprobar','answer');
function tacos(){
  if(s.step===1)return wrap('Lo mismo en cada plato','<div class="stage"><div class="objects">'+s.plates.map((n,i)=>'<div class="plate"><span>Plato '+(i+1)+'</span><span class="dish">'+svg('taco').repeat(n)+'</span><span>4 tacos</span></div>').join('')+'</div><p class="balance">4 + 4 + 4 = 12</p><p class="balance">3 × 4 = 12</p></div><p>Hay tres platos. En cada uno se repite el cuatro. Multiplicar es una manera corta de escribir esa suma.</p>'+button('Otra situación','next'));
  if(s.step===2)return wrap('En la cancha','<p>Cuatro equipos necesitan dos balones por equipo.</p>'+field('¿Cuántos balones hay que llevar?'));
  const plates=s.plates.map((n,i)=>button('<span>Plato '+(i+1)+'</span><span class="dish">'+svg('taco').repeat(n)+'</span><span>'+n+(n===1?' taco':' tacos')+'</span>','plate-'+i,'plate'+(last==='plate-'+i?' flash':''))).join('');
  return wrap('Sirve los tacos','<p>Tres amigos pidieron cuatro tacos cada uno. Toca un taco y luego el plato donde lo quieres poner.</p><div class="stage">'+
    button(svg('taco')+'<span>Tomar un taco</span>','take','object','aria-pressed="'+!!s.hold+'"')+
    '<div class="objects">'+plates+'</div></div>'+button('Volver a empezar','clear','secondary'));
}
function bag(){
  if(s.step===1)return wrap('Para el recreo','<p>Hoy también tienes fútbol. Guarda la pelota y el cuaderno. Deja los demás objetos en casa.</p>'+bagObjects());
  if(s.step===2)return wrap('La pista está en la consigna','<p>Busca primero qué necesitas guardar. Deja fuera lo que la consigna pide dejar en casa.</p>'+button('Volver al taller','home'));
  return wrap('Prepara la mochila','<p>Mañana tienes clase de matemáticas. Guarda un lápiz, una regla y un cuaderno. Deja los juguetes en casa.</p>'+bagObjects());
}
function bagObjects(){
  return '<div class="stage objects">'+objects.map(([id,label])=>
    button(svg(id)+'<span>'+label+'</span>','item-'+id,'object','aria-pressed="'+s.selected.includes(id)+'"')).join('')+
    '</div><p>En la mochila: '+esc(s.selected.map(id=>objects.find(x=>x[0]===id)?.[1]||'').join(', ')||'ningún objeto')+'.</p>'+button('Cerrar mochila','bag-check');
}
function reading(){
  if(s.step===1)return wrap('Un aviso distinto','<p>En el parque cerraron el tobogán porque se rompió un escalón. Los niños se fueron a los columpios.</p><p>¿Qué explica el cierre?</p>'+button('Se rompió un escalón','read-right','secondary')+' '+button('Se fueron a los columpios','read-effect','secondary'));
  return wrap('Busca la pista en el texto','<p>¿Por qué no usaron la cancha? Toca la oración que lo explica.</p><div class="reading">'+
    lines.map((line,i)=>button(line,'line-'+i,'sentence','aria-pressed="'+(s.evidence===i)+'"')).join('')+'</div>'+
    (s.step===0&&s.evidence===1?button('Probar con otro texto','next'):''));
}
const coins=[10,5,5,2,2,1,1];
function money(){
  if(s.step===1)return wrap('¿Cuánto falta?','<p>Ahora un borrador cuesta 9 pesos. Ya pusiste una moneda de 5.</p>'+field('Escribe cuántos pesos faltan.'));
  const total=s.coins.reduce((n,i)=>n+coins[i],0);
  return wrap('Un cuaderno de 12 pesos','<p>La papelería pide el importe exacto. Toca las monedas que pondrías en el mostrador.</p><div class="stage objects">'+
    coins.map((n,i)=>button(svg('coin')+'<span>'+n+' '+(n===1?'peso':'pesos')+'</span>','coin-'+i,'object','aria-pressed="'+s.coins.includes(i)+'"')).join('')+
    '</div><p class="balance">En el mostrador: '+total+' pesos</p>'+button('¿Quedó exacto?','pay'));
}
function english(){
  const word=s.step===0?'in':s.step===1?'under':'on';
  return wrap('Coloca la pelota','<p>Lee o escucha el encargo. Toca la pelota y elige su lugar.</p><p lang="en"><strong>Put the ball '+word+' the box.</strong></p>'+
    button('Escuchar en inglés','audio','secondary')+'<div class="stage">'+button(svg('ball')+'<span>Pelota</span>','take','object','aria-pressed="'+!!s.hold+'"')+
    '<div class="objects">'+[['on','Encima'],['in','Dentro'],['under','Debajo']].map(([id,label])=>button('<span class="placement '+id+'">'+svg('box')+(s.place===id?'<i>'+svg('ball')+'</i>':'')+'</span><span>'+label+'</span>','place-'+id,'object')).join('')+'</div></div>'+
    (s.place===word&&s.step<2?button('Otro encargo','next'):''));
}
function render(focus=''){
  if(!mode)app.innerHTML='<section class="hero"><div><p class="eyebrow">Preview · cinco actividades</p><h1>Prueba una actividad</h1><p>El taller guarda tu lugar en este navegador.</p></div></section><nav class="cards" aria-label="Actividades">'+
    Object.entries(modes).map(([key,title])=>button('<strong>'+title+'</strong>','open-'+key,'tile')).join('')+'</nav>';
  else if(paused)app.innerHTML='<section class="pane sheet"><h1>Haz una pausa</h1>'+button('Continuar','resume')+' '+button('Volver al taller','home','secondary')+'</section>';
  else if(s.done)app.innerHTML=wrap('Terminaste la actividad','<p>'+esc(s.done)+'</p>'+button('Volver al taller','home')+' '+button('Volver a probar','reset','secondary'));
  else app.innerHTML={tacos,bag,read:reading,money,english}[mode]();
  const el=[...app.querySelectorAll('button')].find(b=>b.dataset.do===focus)||app.querySelector('h1');
  if(el?.tagName==='H1')el.tabIndex=-1;
  el?.focus({preventScroll:true});
}
const objectName=id=>(['ruler','ball'].includes(id)?'la ':'el ')+objects.find(x=>x[0]===id)[1].toLowerCase();
function bagCheck(){
  const expected=s.step===0?['pencil','ruler','notebook']:['ball','notebook'];
  const extra=s.selected.find(x=>!expected.includes(x));
  const missing=expected.find(x=>!s.selected.includes(x));
  if(extra){notice='Revisa qué debe quedarse en casa. Saca '+objectName(extra)+' de la mochila.';return}
  if(missing){notice='Vuelve a leer la lista. Todavía falta '+objectName(missing)+'.';return}
  s.selected=[];s.step++;notice=s.step===1?'La mochila de matemáticas tiene lo necesario. Ahora cambió el encargo.':'Los dos objetos de la nueva lista quedaron en la mochila.';
}
function pay(){
  const total=s.coins.reduce((n,i)=>n+coins[i],0);
  if(total===12){s.step=1;notice='Pagaste justo 12 pesos. Ahora cambia el precio.'}
  else notice=total<12?'Todavía faltan '+(12-total)+' pesos. Busca una moneda o una combinación.':
    'Hay '+(total-12)+' pesos de más. Toca una moneda que ya pusiste para retirarla.';
}
const toggle=(arr,id)=>arr.includes(id)?arr.filter(x=>x!==id):[...arr,id];
function command(a){
  if(a.startsWith('open-')){start(a.slice(5));return}
  if(a==='home'){mode='';return}
  if(a==='pause'||a==='resume'){paused=a==='pause';return}
  if(a==='reset'){delete saved[mode];start(mode);return}
  if(a==='next'){s.step++;s.hold=false;s.place='';notice='';return}
  if(a==='take'){s.hold=true;notice=mode==='tacos'?'Toca un plato.':'Elige un lugar para la pelota.';return}
  if(a==='clear'){s.plates=[0,0,0];s.hold=false;notice='';return}
  if(a.startsWith('plate-')){
    const i=Number(a.at(-1));last=a;
    if(!s.hold){notice='Toma un taco antes de elegir un plato.';return}
    if(s.plates[i]===4){notice='Ese plato ya tiene cuatro. Busca uno al que le falten tacos.';return}
    s.plates[i]++;s.hold=false;notice='Taco en el plato '+(i+1)+'.';
    if(s.plates.every(n=>n===4)){s.step=1;notice=''}
    return;
  }
  if(a.startsWith('item-')){s.selected=toggle(s.selected,a.slice(5));notice='';return}
  if(a.startsWith('coin-')){s.coins=toggle(s.coins,Number(a.at(-1)));notice='';return}
  if(a==='bag-check'){bagCheck();return}
  if(a==='pay'){pay();return}
  if(a.startsWith('line-')){
    s.evidence=Number(a.at(-1));
    notice=['Esa oración dice qué llevaron. Busca qué condición hizo que cambiaran de lugar.',
      'El suelo mojado fue la causa. Guardar el balón ocurrió después.',
      'Ahí dice qué hicieron después. Busca por qué tuvieron que cambiar de juego.'][s.evidence];
    return;
  }
  if(a==='read-right'){s.done='Encontraste la causa en otro texto. El escalón roto explica el cierre.';notice='';return}
  if(a==='read-effect'){notice='Eso pasó después del cierre. Busca qué hizo que cerraran el tobogán.';return}
  if(a==='answer'){
    const val=document.querySelector('#answer').value.trim();
    const expected=mode==='tacos'?8:4;
    if(/^\d+$/.test(val)&&Number(val)===expected){
      s.done=mode==='tacos'?'Cuatro grupos de dos dan ocho. Cambió la historia y se repitió el tamaño de cada grupo.':'Faltaban cuatro pesos. Cinco más cuatro llegan a nueve.';
      notice='';
    }else notice=mode==='tacos'?'Dibuja cuatro equipos y pon dos marcas en cada uno. Cuenta todas las marcas.':'Empieza en cinco y cuenta los saltos que faltan para llegar a nueve.';
    return;
  }
  if(a==='audio'){
    const word=['in','under','on'][s.step];
    const englishVoice=window.speechSynthesis?.getVoices().find(v=>v.localService&&v.lang.toLowerCase().startsWith('en'));
    if(!englishVoice){notice='Aquí puedes leer el encargo. Este navegador no tiene una voz local en inglés.';return}
    const msg=new SpeechSynthesisUtterance('Put the ball '+word+' the box.');
    msg.voice=englishVoice;msg.lang=englishVoice.lang;window.speechSynthesis.speak(msg);
    return;
  }
  if(a.startsWith('place-')){
    if(!s.hold){notice='Toca primero la pelota.';return}
    const expected=['in','under','on'][s.step];
    s.place=a.slice(6);s.hold=false;
    const spanish={in:'dentro',under:'debajo',on:'encima'};
    notice=s.place===expected?'Sí. '+expected+' indica '+spanish[expected]+'.':
      'La pelota está '+spanish[s.place]+'. Vuelve a leer la palabra '+expected+' y prueba otro lugar.';
    if(s.place===expected&&s.step===2){s.done='Usaste in, under y on para poner la pelota en tres lugares distintos.';notice=''}
  }
}
app.addEventListener('click',event=>{
  const b=event.target.closest('[data-do]');if(!b)return;
  last='';command(b.dataset.do);if(mode)keep();render(b.dataset.do);
});
app.addEventListener('keydown',event=>{
  if(event.target.id==='answer'&&event.key==='Enter'){
    event.preventDefault();app.querySelector('[data-do="answer"]').click();
  }
});
render();
