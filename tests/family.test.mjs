import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { nubeMerge } from './cargar-nube.mjs';

const source=readFileSync(new URL('../family.js',import.meta.url),'utf8');
const {archive,reconcile}=new Function(source+';return {archive:familyArchive,reconcile:familyReconcile}')();

test('la copia operativa cifra su contenido y rechaza una frase incorrecta',async()=>{
  const data={perfil:'sintético',device:{queue:[{id:'uuid-de-prueba'}]}};
  const encrypted=await archive(data,'frase sintética de recuperación');
  assert.ok(!JSON.stringify(encrypted).includes('uuid-de-prueba'));
  assert.deepEqual(await archive(encrypted,'frase sintética de recuperación',true),data);
  await assert.rejects(()=>archive(encrypted,'frase sintética incorrecta',true));
});

test('una copia con recibo ya confirmado conserva los puntos vivos y no suma la cola dos veces',()=>{
  const sourceCopy={perfil:'prueba',id:'recibo',server:{progreso:{datos:{pts:10}},intentos:[],copias:[],escrituras:[]},
    device:{dirty:true,anchor:{pts:10},state:{pts:20},queue:[{id:'intento'}]}};
  const live={progreso:{datos:{pts:40},version:'actual'},escrituras:[{id:'recibo'}]};
  const restored=reconcile(sourceCopy,live,nubeMerge);
  assert.equal(restored.p_datos.pts,40);assert.equal(restored.p_base,'actual');
  assert.equal(restored.p_intentos.length,1);
});
