import {createRequire} from 'node:module';
import {nubeMerge,stateBytes} from './cargar-nube.mjs';
const require=createRequire(import.meta.url);
const Motor=require('../motor.js');
const {items}=require('../diagnostic-bank.js');
require('../diagnostic.js');
require('../lesson-bank.js');
const L=require('../lessons.js');

function study(state,date,id,attempts){
  const run=L.start(state.lessons,id,date);
  if(!run)return;
  for(let i=0;i<24;i++){
    const {q,stage,feedback,done,level}=L.status(run);
    if(done)return;
    // One hint on a guided item gives the event distribution of ordinary use.
    const kind=q&&!feedback?(stage==='guiada'&&!level?'help':'answer'):'advance';
    const event=L.act(state.lessons,run,kind,date,q?.answer??'Ejemplo sintético.',state);
    const attempt=event&&L.attempt(state,run,event);
    if(attempt)attempts.set(attempt.id,attempt);
  }
}

export function simulate(days=180){
  const attempts=new Map();
  const diagnosis={v:1,seed:'sintetico',drafts:{},answers:{}};
  for(const [i,q] of items.filter((_,index)=>index%2===0).entries()){
    const id=Motor.uuid();
    diagnosis.answers[id]={q:q.id,phase:'base',session:q.session,
      ts:'2026-01-01T00:00:00Z',fmt:q.format,ok:i%3!==0,pista:false,helps:[],err:null};
    attempts.set(id,{id,origen:'diagnostico',fmt:q.format,ok:i%3!==0,extra:{ejercicio:q.id}});
  }
  const first={pts:0,best:0,days:{},daily:{},cal:{},med:{},facts:{},ku:{},diag:diagnosis,lessons:L.empty()};
  let state=first, warningDay=null, limitDay=null;
  const snapshots=[{day:0,state:stateBytes(first)}];
  for(let n=0;n<days;n++){
    const date=Motor.masDias('2026-01-01',n),left=structuredClone(state),right=structuredClone(state);
    left.daily[date]={cfg:['t','c','en','rd'],t:2,tOk:true,tCal:9,tTries:1,col:'suma',colOk:true,colCal:9};
    right.daily[date]={cfg:['t','c','en','rd'],enWd:true,enPd:true,enW:['dog'],enWf:8,enWn:8,enPf:4,enPn:4,rdPick:'example',rdOk:true,rdCal:10,rdN:4};
    left.pts+=12;right.pts+=15;left.days[date]=1;right.days[date]=1;
    if(n%7===0)left.med['2-flash']=8;
    for(let j=0;j<12;j++){
      const shard=j%2?left:right;
      const row=Motor.registrar(shard,{k:'mul:2x'+(1+j%10),ok:true,primero:true,fmt:'rcl',dia:date,ts:Date.parse(date)});
      attempts.set(row.id,row);
    }
    if(n%7===0||n%7===2)study(left,date,L.lessons[(n*5)%L.lessons.length].id,attempts);
    if(n%7===4)study(right,date,L.lessons[(n*5)%L.lessons.length].id,attempts);
    if(n%7===6){
      const due=L.lessons.find(l=>{const p=L.profile(state.lessons,l.id);return p.due&&p.due<=date;});
      if(due)study(right,date,due.id,attempts);
    }
    state=nubeMerge(left,right,state);
    const bytes=stateBytes(state);
    if(bytes>=180000&&!warningDay)warningDay=n+1;
    if(bytes>200000&&!limitDay)limitDay=n+1;
    if([60,90,180,days].includes(n+1))snapshots.push({
      day:n+1,state:bytes,lessons:stateBytes(state.lessons),daily:stateBytes(state.daily),cal:stateBytes(state.cal),
      ku:stateBytes(state.ku),diagnosis:stateBytes(state.diag),attempts:attempts.size,
      pending:stateBytes([...attempts.values()].slice(-14)),offlineZeroFlush:stateBytes([...attempts.values()])
    });
  }
  return {warningDay,limitDay,snapshots,state};
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){
  const {state,...report}=simulate();
  console.log(JSON.stringify(report,null,2));
}
