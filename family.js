/* Sesión de estudio persistente y sesión parental separada por pestaña. */
function familyClient(config) {
  const ns='tt-family:'+config.url+':';
  const read=(store,key)=>{try{return JSON.parse(store.getItem(ns+key))}catch{return null}};
  const write=(store,key,value)=>value===null?store.removeItem(ns+key):store.setItem(ns+key,JSON.stringify(value));
  const store=role=>role==='padre'?sessionStorage:localStorage;
  const consoleOnly=new URLSearchParams(location.search).get('familia')==='1';
  const mode=()=>consoleOnly?{role:'padre',id:null}:read(sessionStorage,'adult-profile')?{role:'padre',id:read(sessionStorage,'adult-profile')}:
    {role:'estudio',id:read(localStorage,'study-profile')};
  const saveSession=(role,value)=>write(store(role),role,value);
  const request=async(path,body,token)=>{
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(config.url+path,{method:'POST',signal:controller.signal,
        headers:{apikey:config.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
        body:JSON.stringify(body)});
      if(!response.ok)throw new Error(String(response.status));
      const raw=await response.text();
      return raw?JSON.parse(raw):null
    }finally{clearTimeout(timer)}
  };
  const auth=(path,body)=>request('/auth/v1/'+path,body);
  const sessions={};
  const expiry=value=>Date.now()+(value.expires_in||3600)*1000;
  async function token(role){
    const current=read(store(role),role);
    if(!current||(role==='padre'&&current.adultUntil<=Date.now()))throw new Error('401');
    if(current.expiresAt>Date.now()+30000)return current.access_token;
    if(!sessions[role])sessions[role]=(async()=>{
      try{
        const next=await auth('token?grant_type=refresh_token',{refresh_token:current.refresh_token});
        if(read(store(role),role)?.refresh_token!==current.refresh_token)throw new Error('401');
        saveSession(role,{...next,expiresAt:expiry(next),adultUntil:current.adultUntil});
        return next.access_token
      }finally{delete sessions[role]}
    })();
    return sessions[role]
  }
  const rpc=async(role,fn,body={})=>request('/rest/v1/rpc/'+fn,body,await token(role));
  async function studyDevice(){
    let session=read(localStorage,'estudio');
    if(!session){
      session=await auth('signup',{});
      saveSession('estudio',{...session,expiresAt:expiry(session)});
    }
    await token('estudio');
    return session.user.id
  }
  return {
    mode,rpc,studyDevice,consoleOnly,
    email:email=>auth('otp',{email,create_user:false}),
    async verify(email,code){
      const session=await auth('verify',{email,token:code,type:'email'});
      saveSession('padre',{...session,expiresAt:expiry(session),adultUntil:Date.now()+9*60000});
    },
    adult:()=>{const session=read(sessionStorage,'padre');return !!session&&session.adultUntil>Date.now()},
    selectAdult:id=>write(sessionStorage,'adult-profile',id),
    selectStudy:id=>write(localStorage,'study-profile',id),
    async forgetAdult(){
      try{await request('/auth/v1/logout?scope=local',{},await token('padre'))}catch{}
      saveSession('padre',null);write(sessionStorage,'adult-profile',null)
    },
    replaceStudy(){
      // Conservar el identificador del perfil y toda su información offline.
      saveSession('estudio',null)
    }
  }
}

async function familyArchive(value,passphrase,decrypt=false){
  const encoder=new TextEncoder();
  if(passphrase.length<12)throw new Error('Usa una frase de copia de al menos 12 caracteres.');
  const salt=decrypt?Uint8Array.from(atob(value.salt),c=>c.charCodeAt(0)):crypto.getRandomValues(new Uint8Array(16));
  const iv=decrypt?Uint8Array.from(atob(value.iv),c=>c.charCodeAt(0)):crypto.getRandomValues(new Uint8Array(12));
  if(salt.length!==16||iv.length!==12)throw new Error('Formato de copia incorrecto.');
  const material=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'},material,
    {name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const params={name:'AES-GCM',iv,additionalData:encoder.encode('udmi-operativa-v1')};
  const encode=bytes=>{let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)};
  if(decrypt){
    if(value.formato!=='udmi-operativa-v1')throw new Error('Formato de copia incorrecto.');
    const bytes=Uint8Array.from(atob(value.datos),c=>c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt(params,key,bytes)))
  }
  const encrypted=await crypto.subtle.encrypt(params,key,encoder.encode(JSON.stringify(value)));
  return {formato:'udmi-operativa-v1',salt:encode(salt),iv:encode(iv),datos:encode(new Uint8Array(encrypted))}
}

// Construye una restauración contra la versión viva. Un comprobante determina
// si la escritura pendiente ya está incluida y evita sumar su delta otra vez.
function familyReconcile(archive,live,merge){
  const device=archive.device;
  const received=id=>live.escrituras.some(r=>r.id===id);
  let state=merge(archive.server.progreso.datos,live.progreso.datos,undefined,true);
  if(!received(archive.id)&&device?.dirty&&device.state){
    const acknowledged=device.pending&&received(device.pending.id);
    const anchor=acknowledged?device.pending.state:device.anchor;
    if(anchor&&anchor.resetAt!==live.progreso.datos.resetAt)throw new Error('Un reinicio separa esta copia del progreso actual.');
    state=merge(device.state,state,anchor,true);
  }
  const attempts=new Map(archive.server.intentos.map(a=>[a.id,a]));
  for(const attempt of device?.queue||[])if(!attempts.has(attempt.id))attempts.set(attempt.id,attempt);
  return {p_perfil:archive.perfil,p_base:live.progreso.version,p_id:archive.id,p_datos:state,
    p_intentos:[...attempts.values()],p_copias:archive.server.copias,p_escrituras:archive.server.escrituras}
}
