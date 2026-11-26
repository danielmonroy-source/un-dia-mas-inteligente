/* Motor de aprendizaje de "Un día más inteligente" (fase T1).
   Reglas fijas y visibles: no hay IA ni nada al azar.
   - Cada respuesta se registra como un intento.
   - Cada conocimiento (por ejemplo 4×7 o la palabra "dog") guarda un resumen corto en S.ku.
   - El estado se calcula siempre con las mismas reglas a partir de ese resumen.
   - Los repasos siguen la escalera 1, 3, 7, 14, 30 y 60 días.
   Funciona en el navegador (window.Motor) y en Node (pruebas). */
(function(root){
'use strict';

const CFG={
  escalera:[1,3,7,14,30,60], // días hasta el siguiente repaso en cada escalón
  criterio:0.85,             // aciertos al primer intento para pasar de "En práctica" a "En consolidación"
  minIntentos:8,             // el criterio solo se aplica con al menos estos intentos
  diasSd:8,                  // cuántos días con acierto sin ayuda se guardan
  maxCola:3000               // intentos pendientes de subir a la nube
};

/* --- Estados --- */
const ESTADOS=[
  {id:'sin',n:'Sin evaluar',r:0},
  {id:'nec',n:'Necesita aprender',r:1},
  {id:'apr',n:'En aprendizaje',r:2},
  {id:'pra',n:'En práctica',r:3},
  {id:'con',n:'En consolidación',r:4},
  {id:'dom',n:'Dominada',r:5},
  {id:'rep',n:'Necesita repaso',r:3.5}];
const EST={};ESTADOS.forEach(e=>EST[e.id]=e);

/* --- Catálogo: las 36 habilidades del plan, más las materias que ya existen --- */
const CAMPOS={len:'Lenguajes',sab:'Saberes y pensamiento científico',eti:'Ética, naturaleza y sociedades',hum:'De lo humano y lo comunitario'};
// [id, campo, área, nombre, depende de, prioridad, en papel?, pide aplicación para "Dominada"?, conocimientos esperados]
const H=[
 ['ins-1','len','Instrucciones','Seguir una instrucción de 1 paso',[],'alta'],
 ['ins-23','len','Instrucciones','Seguir instrucciones de 2 y 3 pasos en orden',['ins-1'],'alta'],
 ['ins-cond','len','Instrucciones','Instrucciones con condición',['ins-23'],'alta'],
 ['ins-decir','len','Instrucciones','Decir qué se pide antes de resolver',['ins-1'],'alta'],
 ['lec-oracion','len','Lectura','Comprender una oración',[],'alta'],
 ['lec-info','len','Lectura','Encontrar información en el texto',['lec-oracion'],'alta',0,1],
 ['lec-orden','len','Lectura','Ordenar acontecimientos',['lec-info'],'alta'],
 ['lec-idea-p','len','Lectura','Idea principal de un párrafo',['lec-info'],'alta'],
 ['lec-idea-t','len','Lectura','Idea principal frente a detalles',['lec-idea-p'],'alta'],
 ['lec-infer','len','Lectura','Inferencia sencilla',['lec-info'],'media'],
 ['lec-resumir','len','Lectura','Resumir con sus palabras',['lec-idea-t'],'media',1],
 ['vp-ud','sab','Valor posicional','Unidades y decenas',[],'alta'],
 ['vp-c','sab','Valor posicional','Centenas',['vp-ud'],'alta'],
 ['vp-um','sab','Valor posicional','Unidades de millar',['vp-c'],'alta'],
 ['vp-desc','sab','Valor posicional','Componer y descomponer números',['vp-c'],'alta'],
 ['vp-comp','sab','Valor posicional','Comparar y ordenar cantidades',['vp-c'],'alta'],
 ['op-suma','sab','Operaciones','Sumas sin llevar y llevando',['vp-ud'],'media',0,1,2],
 ['op-resta','sab','Operaciones','Restas sin pedir y pidiendo prestado',['vp-ud'],'media',0,1,2],
 ['op-mental','sab','Operaciones','Cálculo mental',['vp-ud'],'media'],
 ['mul-concepto','sab','Multiplicación','Qué es multiplicar: grupos iguales',['op-suma'],'alta'],
 ['mul-2510','sab','Multiplicación','Tablas del 2, 5 y 10',['mul-concepto'],'alta',0,1,30],
 ['mul-346','sab','Multiplicación','Tablas del 3, 4 y 6',['mul-2510'],'alta',0,1,30],
 ['mul-789','sab','Multiplicación','Tablas del 7, 8 y 9',['mul-346'],'media',0,1,30],
 ['prob-datos','sab','Problemas','Identificar la pregunta y los datos',['ins-1'],'alta'],
 ['prob-oper','sab','Problemas','Elegir la operación',['prob-datos'],'alta'],
 ['prob-sentido','sab','Problemas','Comprobar si el resultado tiene sentido',['prob-oper'],'media'],
 ['esc-ordenar','len','Escritura','Ordenar palabras para formar una oración',['lec-oracion'],'media'],
 ['esc-mayus','len','Escritura','Mayúsculas y punto final',['esc-ordenar'],'media'],
 ['esc-orto','len','Escritura','Ortografía de tercer grado',[],'baja'],
 ['esc-letra','len','Escritura','Letra legible (en papel)',[],'media',1],
 ['ent-comunidad','eti','Entorno','Mi comunidad y mi municipio (Apaxco)',[],'media'],
 ['ent-mexico','eti','Entorno','Mi estado y México: regiones y paisajes',['ent-comunidad'],'media'],
 ['ent-tradiciones','eti','Entorno','Tradiciones y pueblos originarios',['ent-mexico'],'media'],
 ['esp-dir','hum','Espacio y ritmo','Izquierda, derecha, arriba, abajo, adelante y atrás',[],'media'],
 ['esp-rutas','hum','Espacio y ritmo','Seguir rutas y leer mapas sencillos',['esp-dir'],'media'],
 ['esp-ritmo','hum','Espacio y ritmo','Repetir patrones de ritmo (fuera de pantalla)',[],'baja',1],
 // materias que ya existen: siguen en el mapa con prioridad baja
 ['en-vocab','len','Inglés','Vocabulario en inglés',[],'baja'],
 ['en-frases','len','Inglés','Frases en inglés',['en-vocab'],'baja'],
 ['comp-reloj','sab','Complementarias','El reloj',[],'baja'],
 ['comp-dinero','sab','Complementarias','Dinero',[],'baja'],
 ['comp-frac','sab','Complementarias','Fracciones',[],'baja'],
 ['comp-logica','sab','Complementarias','Lógica',[],'baja'],
 ['comp-ciencia','sab','Complementarias','Ciencia',[],'baja'],
 ['comp-cultura','eti','Complementarias','Cultura general',[],'baja']];
const CATALOGO=H.map(([id,campo,area,n,dep,prio,papel,apl,esperados])=>({id,campo,area,n,dep,prio,papel:!!papel,apl:!!apl,esperados:esperados||0,plan:!id.startsWith('en-')&&!id.startsWith('comp-')}));
const HAB={};CATALOGO.forEach(h=>HAB[h.id]=h);

const GENH={vp:'vp-c',orto:'esc-orto',log:'comp-logica',reloj:'comp-reloj',din:'comp-dinero',frac:'comp-frac',cie:'comp-ciencia',cult:'comp-cultura',cultq:'comp-cultura'};
/* A qué habilidad pertenece cada conocimiento */
function habilidadDe(k){
  const [p,r]=[k.slice(0,k.indexOf(':')),k.slice(k.indexOf(':')+1)];
  if(p==='mul'){const t=+r.split('x')[0];return [2,5,10,1].includes(t)?'mul-2510':[3,4,6].includes(t)?'mul-346':'mul-789'}
  if(p==='sr')return r.startsWith('suma')?'op-suma':'op-resta';
  if(p==='en')return 'en-vocab';
  if(p==='enf')return 'en-frases';
  if(p==='lec')return 'lec-info';
  if(p==='gen')return GENH[r]||null;
  if(HAB[p])return p; // conocimientos de módulos nuevos: "<habilidad>:<detalle>"
  return null}

/* --- Fechas (texto AAAA-MM-DD, sin horas) --- */
const dms=d=>Date.UTC(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8,10));
const masDias=(d,n)=>new Date(dms(d)+n*864e5).toISOString().slice(0,10);
const entre=(a,b)=>Math.round((dms(b)-dms(a))/864e5);
const hoyDe=ms=>{const x=new Date(ms);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
/* variación fija de ±1 día para que los repasos no lleguen todos juntos (depende solo del nombre) */
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)};
const jitter=(k,lv)=>lv>=2?hash(k)%3-1:0;

/* Un intento es "fuerte" (cuenta como acierto sin ayuda) si fue el primer intento, sin pista,
   y el formato pide recordar o aplicar (no en orden ni reconocer entre opciones). */
const FUERTE={rcl:1,mix:1,apl:1};
const esFuerte=a=>!!(a.ok&&a.primero&&!a.pista&&FUERTE[a.fmt]);

function nuevo(){return {n:0,c:0,fn:0,fo:0,sd:[],ap:0,lv:-1,due:'',dd:'',lf:null,pk:0,e:{}}}

/* Registra un intento en el resumen S.ku y devuelve el registro completo para la nube.
   a = {k, ok, primero, pista, fmt, origen, ms, err, extra, ts} */
function registrar(S,a){
  S.ku=S.ku||{};
  const ts=a.ts||Date.now(),d=a.dia||hoyDe(ts),k=a.k;
  const e=S.ku[k]=S.ku[k]||nuevo();
  e.n++;if(a.ok)e.c++;
  if(!a.ok&&a.err)e.e[a.err]=(e.e[a.err]||0)+1;
  if(a.ok&&a.fmt==='apl'&&a.primero)e.ap++;
  const fuerte=esFuerte(a);
  if(fuerte&&!e.sd.includes(d)){e.sd.push(d);e.sd.sort();if(e.sd.length>CFG.diasSd)e.sd.shift()}
  // solo el primer intento del día mueve la escalera de repasos
  if(a.primero&&e.dd!==d){
    e.dd=d;e.fn++;if(a.ok)e.fo++;e.lf=a.ok?1:0;if(!a.ok)e.ff=d;
    const L=CFG.escalera,vencido=!e.due||d>=e.due;
    if(!a.ok){e.lv=Math.max(0,e.lv-2);e.due=masDias(d,1)}
    else if(fuerte&&vencido){e.lv=Math.min(L.length-1,e.lv+1);e.due=masDias(d,L[e.lv]+jitter(k,e.lv))}
    else if(fuerte){/* repasó antes de tiempo: se guarda, pero no sube de escalón */}
    else{e.lv=Math.max(e.lv,0);if(!e.due||e.due>masDias(d,1))e.due=masDias(d,1)}
  }
  delete e.mig;
  const st=estado(e,d,habilidadDe(k));if(EST[st].r>(e.pk||0)&&st!=='rep')e.pk=EST[st].r;
  return {id:uuid(),k,ts:new Date(ts).toISOString(),origen:a.origen||'libre',fmt:a.fmt||'',ok:!!a.ok,primero:!!a.primero,pista:!!a.pista,ms:a.ms!=null?Math.round(a.ms):null,err:a.ok?null:(a.err||null),extra:a.extra||null}}

/* Estado de un conocimiento, con reglas fijas */
function estado(e,hoy,hab){
  if(!e||(!e.n&&!e.mig))return 'sin';
  if(!e.c)return 'nec';
  if(!e.sd.length)return 'apr';
  // necesita repaso: ya estuvo en consolidación o más y falló la última vez, o lleva mucho sin repasar
  const atraso=e.due&&hoy?entre(e.due,hoy):0,L=CFG.escalera;
  if((e.pk||0)>=EST.con.r&&(e.lf===0||atraso>Math.max(3,L[Math.max(0,e.lv)])))return 'rep';
  const sd=e.sd;let hueco=false;for(let i=1;i<sd.length;i++)if(entre(sd[i-1],sd[i])>=7)hueco=true;
  const pideApl=hab?!!(HAB[hab]&&HAB[hab].apl):false;
  const trasFallo=e.ff?sd.filter(x=>x>e.ff).length:sd.length; // después de un fallo hay que volver a demostrarlo 2 días
  if(sd.length>=3&&hueco&&e.lf!==0&&trasFallo>=2&&(!pideApl||e.ap>0))return 'dom';
  const prec=e.fn?e.fo/e.fn:0;
  if(sd.length>=2&&e.lf!==0&&(e.fn<CFG.minIntentos||prec>=CFG.criterio))return 'con';
  return 'pra'}
const estadoK=(S,k,hoy)=>estado((S.ku||{})[k],hoy,habilidadDe(k));

/* Resumen por habilidad para el panel de papás */
function resumen(S,hoy){
  const ku=S.ku||{},out={};
  CATALOGO.forEach(h=>out[h.id]={h,cuenta:{},vistos:0,fn:0,fo:0,estado:'sin'});
  for(const k in ku){const id=habilidadDe(k);if(!id||!out[id])continue;const o=out[id],e=ku[k],st=estado(e,hoy,id);
    o.cuenta[st]=(o.cuenta[st]||0)+1;if(st!=='sin')o.vistos++;o.fn+=e.fn;o.fo+=e.fo}
  for(const id in out){const o=out[id];if(!o.vistos)continue;
    if(o.cuenta.rep){o.estado='rep';continue}
    let min=9,st='sin';for(const s in o.cuenta){if(s==='sin')continue;if(EST[s].r<min){min=EST[s].r;st=s}}
    // con partes sin evaluar o por debajo del criterio, la habilidad no pasa de "En práctica"
    const cap=(o.h.esperados&&o.vistos<o.h.esperados)||(o.fn>=CFG.minIntentos&&o.fo/o.fn<CFG.criterio);
    if(cap&&EST[st].r>EST.pra.r)st='pra';
    o.estado=st}
  return out}

/* Conocimientos que ya toca repasar hoy, los más atrasados primero */
function pendientes(S,hoy,filtro){
  const ku=S.ku||{},r=[];
  for(const k in ku){const e=ku[k];if(!e.due||e.due>hoy)continue;if(filtro&&!filtro(k))continue;r.push([k,entre(e.due,hoy)])}
  return r.sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1)).map(x=>x[0])}

/* Pasa el avance que ya existe a S.ku, una sola vez. No toca puntos, medallas ni calificaciones.
   - Multiplicaciones que ya acertó varias veces seguidas (caja 2 o 3): "En práctica", repaso desde hoy.
   - Caja 1: "En aprendizaje". Caja 0 con fallos: "Necesita aprender".
   - Palabras de inglés aprendidas: "En práctica". */
function migrar(S,hoy){
  if(S.ku)return false;
  const ku={},D=S.daily||{},dias=Object.keys(D).sort();
  const diaTabla=t=>{for(let i=dias.length-1;i>=0;i--){const R=D[dias[i]];if(R&&+R.t===+t&&(R.tOk||R.tTries))return dias[i]}return S.last||hoy};
  for(const key in (S.facts||{})){
    const m=/^(\d+)x(\d+)$/.exec(key);if(!m)continue;
    const box=+S.facts[key]||0,miss=+((S.miss||{})[key])||0,d=diaTabla(+m[1]),e=nuevo();e.mig=1;
    if(box>=2){Object.assign(e,{n:box+miss,c:box,fn:1,fo:1,sd:[d],lv:0,due:d<hoy?hoy:masDias(d,1),dd:d,lf:1,pk:EST.pra.r})}
    else if(box===1){Object.assign(e,{n:1+miss,c:1,fn:1,fo:miss?0:1,lv:0,due:hoy,dd:d,lf:1,pk:EST.apr.r})}
    else if(miss){Object.assign(e,{n:miss,c:0,fn:1,fo:0,lv:0,due:hoy,dd:d,lf:0,ff:d,pk:EST.nec.r})}
    else continue;
    if(miss)e.e.otro=miss;
    ku['mul:'+key]=e}
  const diaPalabra=w=>{for(let i=dias.length-1;i>=0;i--){const R=D[dias[i]];if(R&&R.en&&(R.enW||[]).includes(w))return dias[i]}return null};
  for(const w in (S.enLearned||{})){const d=diaPalabra(w)||S.last||hoy,e=nuevo();
    Object.assign(e,{mig:1,n:2,c:2,fn:1,fo:1,sd:[d],lv:0,due:d<hoy?hoy:masDias(d,1),dd:d,lf:1,pk:EST.pra.r});
    ku['en:'+w]=e}
  S.ku=ku;return true}

/* Unir S.ku de dos dispositivos: gana el que tiene más intentos (empate: el más reciente) */
function unir(a,b){
  a=a||{};b=b||{};const r={};
  new Set([...Object.keys(a),...Object.keys(b)]).forEach(k=>{const x=a[k],y=b[k];
    if(!x||!y){r[k]=JSON.parse(JSON.stringify(x||y));return}
    const w=(x.n>y.n)||(x.n===y.n&&(x.dd||'')>=(y.dd||''))?x:y,o=JSON.parse(JSON.stringify(w)),z=w===x?y:x;
    o.sd=[...new Set([...(x.sd||[]),...(y.sd||[])])].sort().slice(-CFG.diasSd);
    o.pk=Math.max(x.pk||0,y.pk||0);if(x.ff||y.ff)o.ff=(x.ff||'')>(y.ff||'')?x.ff:y.ff;o.ap=Math.max(x.ap||0,y.ap||0);
    for(const t in (z.e||{}))o.e[t]=Math.max(o.e[t]||0,z.e[t]);
    r[k]=o});
  return r}

function uuid(){
  try{if(root.crypto&&root.crypto.randomUUID)return root.crypto.randomUUID()}catch(e){}
  const b=new Array(16);for(let i=0;i<16;i++)b[i]=Math.floor(Math.random()*256);
  b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=b.map(x=>(x+256).toString(16).slice(1)).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}

const Motor={CFG,ESTADOS,EST,CAMPOS,CATALOGO,HAB,habilidadDe,registrar,estado,estadoK,resumen,pendientes,migrar,unir,esFuerte,masDias,entre,hoyDe,uuid};
root.Motor=Motor;
if(typeof module!=='undefined'&&module.exports)module.exports=Motor;
})(typeof globalThis!=='undefined'?globalThis:this);
