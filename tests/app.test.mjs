// Prueba de la app completa en Chromium con una nube simulada (no toca la base de datos real).
// Ejecutar: node --test tests/  (requiere Playwright; en la sesión en la nube ya viene instalado)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
  .replace("if(CODE)pull();else pinMigrate();", `window.syntheticProgress = ({day, record, points, attempt}) => {
    S.daily[day] = {...S.daily[day], ...record};
    S.pts += points;
    if(attempt)mot(attempt);
    save();
  };
  window.syntheticFinishLesson = id => {
    const data=S.lessons??=Lecciones.empty(), run=Lecciones.start(data,id,today());
    for(let i=0;run&&i<20;i++){
      const stage=Lecciones.status(run);
      if(stage.done)break;
      Lecciones.act(data,run,stage.q&&!stage.feedback?'answer':'advance',today(),stage.q?.answer??'Revisión sintética.',S);
    }
    save();
  };
  if(CODE)pull();else pinMigrate();`);
const motor = readFileSync(fileURLToPath(new URL('../motor.js', import.meta.url)), 'utf8');
const family = readFileSync(fileURLToPath(new URL('../family.js', import.meta.url)), 'utf8');
const bank = readFileSync(new URL('../diagnostic-bank.js', import.meta.url), 'utf8');
const diagnostic = readFileSync(new URL('../diagnostic.js', import.meta.url), 'utf8');
const CODE = 'a'.repeat(32);
const datosIniciales = () => ({ pts: 240, best: 20, streak: 1, last: '2024-02-29', days: { '2024-02-29': 5 }, facts: { '4x1': 3 }, med: {}, miss: {},
  sr: { med: {}, err: {}, fails: [] }, daily: {}, rd: { dino: 4 }, rk: { 4: 1 }, enLearned: { dog: 1 }, enKnown: {}, cal: { '2024-02-29': { m: { t: 10 }, t: 4, avg: 7.2 } },
  ts: Date.UTC(2024, 1, 29, 16), nombre: 'Persona de prueba', pin: '2580', mute: false, open: false, retoCfg: ['t', 'c', 'en', 'rd'] });

function nubeFalsa({ sinV3 = false, sinIntentos = false, code = CODE } = {}) {
  let n = 0; const stamp = () => new Date(Date.UTC(2024, 2, 1, 16, 0, 0, ++n)).toISOString();
  const db = { datos: datosIniciales(), actualizado: stamp(), respaldos: [], llamadas: [], intentos: [], escrituras: new Map(), offline: false };
  db.cambiarDesdeOtroDispositivo = f => { f(db.datos); db.actualizado = stamp(); };
  db.ruta = async route => {
    const fn = route.request().url().split('/rpc/')[1]; const b = JSON.parse(route.request().postData() || '{}'); db.llamadas.push(fn);
    if (db.offline) return route.abort();
    const json = x => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (b.p_codigo !== code) return route.fulfill({ status: 400, body: '{}' });
    const respaldar = motivo => db.respaldos.unshift({ id: db.respaldos.length + 1, creado: new Date().toISOString(), motivo, datos: JSON.parse(JSON.stringify(db.datos)) });
    switch (fn) {
      case 'tt_cargar': return json({ datos: db.datos, actualizado: db.actualizado });
      case 'tt_guardar': db.datos = b.p_datos; db.actualizado = stamp(); return json(db.actualizado);
      case 'tt_guardar3':
        if (sinV3) return route.fulfill({ status: 404, body: '{}' });
        if (db.beforeWrite) await db.beforeWrite(b);
        if (db.escrituras.has(b.p_id)) return json(db.escrituras.get(b.p_id));
        if (b.p_base !== db.actualizado) return json({ ok: false, conflicto: true, actualizado: db.actualizado });
        db.datos = b.p_datos; db.actualizado = stamp();
        const receipt = { ok: true, actualizado: db.actualizado };
        db.escrituras.set(b.p_id, receipt);
        if (db.dropReply) { db.dropReply = false; return route.abort(); }
        return json(receipt);
      case 'tt_respaldo_crear': respaldar(b.p_motivo); return json(true);
      case 'tt_respaldos_listar': return json(db.respaldos.map(r => ({ id: r.id, creado: r.creado, motivo: r.motivo, pts: r.datos.pts })));
      case 'tt_respaldo_cargar': return json((db.respaldos.find(r => r.id === b.p_id) || {}).datos ?? null);
      case 'tt_intentos_agregar':
        if (sinIntentos) return route.fulfill({ status: 404, body: '{}' });
        for (const a of b.p_intentos) if (!db.intentos.some(x => x.id === a.id)) db.intentos.push(a);
        return json(b.p_intentos.length);
      default: return route.fulfill({ status: 404, body: '{}' });
    }
  };
  return db;
}

let server, url, browser;
test.before(async () => {
  server = createServer((req, res) => {
    if (req.url==='/diagnostic-bank.js'||req.url==='/diagnostic.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(req.url.includes('bank')?bank:diagnostic); return;
    }
    if (['/lesson-bank.js','/lessons.js'].includes(req.url)) {
      res.writeHead(200, {'Content-Type':'text/javascript; charset=utf-8'});
      res.end(readFileSync(new URL('..'+req.url,import.meta.url)));return;
    }
    if (req.url==='/family.js') { res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(family); return; }
    if (req.url.startsWith('/motor.js')) { res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' }); res.end(motor); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}/index.html?p=${CODE}`;
  browser = await chromium.launch();
});
test.after(async () => { await browser?.close(); server?.close(); });

async function abrir(db, { sinMotor = false } = {}) {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await page.route('https://*.supabase.co/rest/v1/rpc/*', db.ruta);
  if (sinMotor) await page.route('**/motor.js*', r => r.fulfill({ status: 404, body: '' }));
  await page.goto(url);
  return { ctx, page, errores };
}
const esperar = async (cond, msg, ms = 8000) => { const t = Date.now(); while (!cond()) { if (Date.now() - t > ms) throw new Error('Tiempo agotado: ' + msg); await new Promise(r => setTimeout(r, 50)); } };

test('contraseña cifrada, guardado sin pisarse, borrar y restaurar, exportar', async () => {
  const db = nubeFalsa(); const { ctx, page, errores } = await abrir(db);

  await esperar(() => db.datos.pinH && !('pin' in db.datos), 'la contraseña se migra a hash y deja de subirse en texto');
  assert.equal(db.datos.pts, 240, 'no cambia el avance');
  assert.equal(db.datos.pinDef, true);

  await page.click('#papas > summary');
  await page.fill('#pin', '1111'); await page.click('#pinGo');
  assert.match(await page.textContent('#pinMsg'), /incorrecta/);
  await page.fill('#pin', '2580'); await page.click('#pinGo');
  await page.waitForSelector('#pbody', { state: 'visible' });
  assert.ok(await page.isVisible('#pinWarn'), 'avisa que es la contraseña de fábrica');

  const hashViejo = db.datos.pinH;
  await page.fill('#newpin', '4321'); await page.click('#setpin');
  await esperar(() => db.datos.pinH && db.datos.pinH !== hashViejo && db.datos.pinDef === false, 'la nueva contraseña se guarda');
  assert.ok(!JSON.stringify(db.datos).includes('4321'), 'la contraseña nunca viaja en texto');

  // Otro dispositivo guarda una lectura mientras esta pestaña cambia el sonido: no se debe perder ninguna de las dos cosas.
  db.cambiarDesdeOtroDispositivo(d => { d.rd.azteca = 6; d.pts = 320; d.ts += 10; });
  await page.click('#snd');
  await esperar(() => db.datos.mute === true && db.datos.rd.azteca === 6, 'se juntan los dos cambios');
  assert.equal(db.datos.pts, 320);

  // Borrar todo: pide la contraseña nueva y deja copia.
  await page.click('#reset');
  await page.fill('#rstPin', '2580'); await page.click('#rstGo');
  assert.match(await page.textContent('#rstMsg'), /incorrecta/);
  await page.fill('#rstPin', '4321'); await page.click('#rstGo');
  await esperar(() => db.datos.pts === 0, 'se borra el avance');
  assert.ok(db.respaldos.some(r => r.motivo === 'antes de borrar todo' && r.datos.pts === 320), 'hay copia antes de borrar');
  assert.ok(db.datos.cal['2024-02-29'], 'el historial de calificaciones se conserva como antes');

  // Restaurar desde la nube (dos toques para confirmar).
  await page.click('#bkList');
  const btn = page.locator('#bkBox [data-bk]').filter({ hasText: 'antes de borrar todo' }).first();
  await btn.click(); assert.equal(db.datos.pts, 0, 'el primer toque solo pide confirmación');
  await btn.click();
  await esperar(() => db.datos.pts === 320 && db.datos.rd.azteca === 6, 'se restaura la copia');
  assert.ok(db.datos.pinH && db.datos.pinDef === false, 'restaurar no regresa la contraseña vieja');

  // Exportar: archivo sin la contraseña.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#expBtn')]);
  const p = join(mkdtempSync(join(tmpdir(), 'udmi-')), 'copia.json'); await dl.saveAs(p);
  const copia = JSON.parse(readFileSync(p, 'utf8'));
  assert.equal(copia.datos.pts, 320); assert.ok(!('pinH' in copia.datos) && !('pin' in copia.datos));

  // Importar el mismo archivo.
  await page.setInputFiles('#impFile', p);
  await page.waitForFunction(() => /Se cargó la copia/.test(document.getElementById('bkMsg').textContent));

  assert.deepEqual(errores, [], 'sin errores de JavaScript');
  assert.equal(await page.locator('text=/^Error:/').count(), 0);
  await ctx.close();
});

test('si la nube todavía no tiene el guardado nuevo, conserva el avance local sin usar la escritura antigua', async () => {
  const db = nubeFalsa({ sinV3: true }); const { ctx, page, errores } = await abrir(db);
  await page.waitForFunction(() => document.querySelector('#cloud').textContent.includes('guardado seguro'));
  await page.click('#snd');
  assert.equal(db.datos.mute, false);
  assert.ok(!db.llamadas.includes('tt_guardar'));
  assert.deepEqual(errores, []);
  await ctx.close();
});

test('las actividades principales abren sin errores', async () => {
  const db = nubeFalsa(); const { ctx, page, errores } = await abrir(db);
  await page.waitForSelector('#daily [data-d="t"]');
  await page.click('#daily [data-d="t"]'); await page.waitForSelector('#play', { state: 'visible' });
  for (const k of ['c', 'en', 'rd']) {
    await page.goto(url); await page.waitForSelector(`#daily [data-d="${k}"]`); await page.click(`#daily [data-d="${k}"]`); await page.waitForTimeout(300);
  }
  assert.deepEqual(errores, []);
  await ctx.close();
});

// Contesta la tabla del reto con el teclado: la primera mal y las siguientes bien.
async function contestarTabla(page, n) {
  await page.waitForSelector('#daily [data-d="t"]');
  await page.click('#daily [data-d="t"]'); await page.waitForSelector('#play', { state: 'visible' });
  for (let i = 0; i < n; i++) {
    await page.waitForFunction(() => /×/.test(document.getElementById('q').textContent) && !document.getElementById('q').classList.contains('show'));
    const [a, b] = (await page.textContent('#q')).match(/(\d+) × (\d+)/).slice(1).map(Number);
    if (i === 0) { await page.keyboard.type(String(a * b + 1)); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
    await page.keyboard.type(String(a * b)); await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
  }
}

test('cada respuesta queda registrada y sube a la nube; el avance anterior se migra', async () => {
  const db = nubeFalsa(); const { ctx, page, errores } = await abrir(db);
  await esperar(() => db.datos.pinH, 'carga inicial');
  await contestarTabla(page, 4);
  await esperar(() => db.intentos.length >= 5, 'los intentos llegan a la nube');
  const t = db.intentos.find(x => x.ok === false);
  assert.ok(t && /^mul:\d+x\d+$/.test(t.k) && t.primero === true && t.origen === 'reto' && t.fmt === 'seq', JSON.stringify(t));
  assert.ok(db.intentos.some(x => x.ok && x.primero === false && x.k === t.k), 'el acierto después del error no cuenta como primer intento');
  await esperar(() => db.datos.ku, 'el resumen por conocimiento se guarda con el avance');
  assert.equal(db.datos.ku['en:dog'].mig, 1, 'las palabras aprendidas se migran');
  assert.equal(db.datos.pts > 240 || db.datos.pts === 240, true);
  assert.equal(db.datos.rk[4], 1, 'las medallas del reto no cambian');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tt-profile-v1:' + localStorage.getItem('tt-codigo'))).queue.length), 0, 'la cola queda vacía');
  // panel de papás
  await page.goto(url); await page.click('#papas > summary');
  await page.fill('#pin', '2580'); await page.click('#pinGo');
  await page.waitForSelector('#pbody', { state: 'visible' });
  assert.match(await page.textContent('#xprog'), /Seguimiento por habilidad/);
  assert.match(await page.textContent('#xprog'), /Vocabulario en inglés/);
  assert.deepEqual(errores, []);
  await ctx.close();
});

test('sin la tabla de intentos en la nube, las respuestas esperan en el dispositivo', async () => {
  const db = nubeFalsa({ sinIntentos: true }); const { ctx, page, errores } = await abrir(db);
  await esperar(() => db.datos.pinH, 'carga inicial');
  await contestarTabla(page, 2);
  await esperar(() => db.llamadas.includes('tt_intentos_agregar'), 'intenta subirlas');
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('tt-profile-v1:' + localStorage.getItem('tt-codigo'))).queue.length) >= 3);
  assert.deepEqual(errores, []);
  await ctx.close();
});

test('si motor.js no carga, la app sigue funcionando igual', async () => {
  const db = nubeFalsa(); const { ctx, page, errores } = await abrir(db, { sinMotor: true });
  await esperar(() => db.datos.pinH, 'carga inicial');
  await contestarTabla(page, 2);
  await esperar(() => db.datos.facts && Object.keys(db.datos.facts).length > 1, 'guarda el avance de siempre');
  assert.ok(!db.datos.ku);
  assert.deepEqual(errores, []);
  await ctx.close();
});

test('un navegador nuevo sin código no pierde nada: al poner el código carga la nube completa', async () => {
  const db = nubeFalsa(); db.datos.retoCfg = ['t', 'rd']; db.datos.colSum = 'sin3';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage(); const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
  await page.route('https://*.supabase.co/rest/v1/rpc/*', db.ruta);
  await page.goto(url.split('?')[0]);
  await page.waitForTimeout(800);
  assert.equal(await page.textContent('#sPts'), '0');
  // papá escribe el código en Para papás
  await page.click('#papas > summary');
  await page.fill('#pin', '2580'); await page.click('#pinGo');
  await page.waitForSelector('#pbody', { state: 'visible' });
  await page.fill('#codeIn', 'xyz'); await page.click('#codeGo');
  assert.match(await page.textContent('#codeMsg'), /no es válido/);
  await page.fill('#codeIn', url.split('?')[0] + '?p=' + CODE); await page.click('#codeGo');
  await page.waitForFunction(() => document.getElementById('sPts').textContent === '240');
  const S = await page.evaluate(() => JSON.parse(localStorage.getItem('tt-profile-v1:' + (localStorage.getItem('tt-codigo') || 'local'))).state);
  assert.deepEqual(S.retoCfg, ['t', 'rd'], 'la configuración de la nube no se pisa');
  assert.equal(S.colSum, 'sin3');
  await page.waitForTimeout(2500);
  assert.equal(db.datos.pts, 240);
  assert.deepEqual(db.datos.retoCfg, ['t', 'rd']);
  assert.deepEqual(errores, []);
  await ctx.close();
});

test('rechaza copias inválidas antes de hacer un respaldo o reemplazar el progreso', async () => {
  const db = nubeFalsa();
  const { ctx, page, errores } = await abrir(db);
  try {
    await esperar(() => db.datos.pinH, 'progreso sintético cargado');
    await page.click('#papas > summary');
    await page.fill('#pin', '2580');
    await page.click('#pinGo');
    await page.waitForSelector('#pbody', { state: 'visible' });
    const before = await page.evaluate(() => localStorage.getItem('tt-profile-v1:' + (localStorage.getItem('tt-codigo') || 'local')));
    const invalid = [
      '{',
      '{"app":"otra-app","v":1,"datos":{"pts":1}}',
      '{"app":"un-dia-mas-inteligente","v":2,"datos":{"pts":1}}',
      '{"pts":-1}',
      '{"pts":1,"daily":{"2024-02-29":{"cfg":false}}}',
      '{"pts":1,"rdLog":[null]}',
      '{"pts":1,"sr":{"fails":"incorrecto"}}',
      '{"pts":1,"ku":{"mul:4x1":{"n":1,"sd":null}}}',
      '{"pts":1,"datosFuturos":{"__proto__":{}}}'
    ];
    for (const buffer of invalid) {
      await page.setInputFiles('#impFile', { name: 'copia.json', mimeType: 'application/json', buffer: Buffer.from(buffer) });
      await page.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('No se cambió nada'));
      assert.equal(await page.evaluate(() => localStorage.getItem('tt-profile-v1:' + (localStorage.getItem('tt-codigo') || 'local'))), before);
      // Esperar el mensaje de cada archivo por separado.
      await page.locator('#bkMsg').evaluate(el => { el.textContent = ''; });
    }
    assert.equal(db.respaldos.length, 0);
    assert.deepEqual(errores, []);
    const compat = { pts: 14, nombre: 'Perfil de muestra', facts: { '2x2': 2 }, datoFuturo: { etiqueta: 'muestra' } };
    await page.setInputFiles('#impFile', { name: 'avance.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(compat)) });
    await page.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('Se cargó la copia'));
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('tt-profile-v1:' + (localStorage.getItem('tt-codigo') || 'local'))).state);
    assert.equal(restored.pts, 240, 'la copia antigua no sustituye los puntos actuales');
    assert.equal(restored.nombre, 'Persona de prueba');
    assert.equal(restored.facts['2x2'], 2);
    assert.deepEqual(restored.datoFuturo, compat.datoFuturo);
    assert.equal(restored.pinH, db.datos.pinH);
  } finally { await ctx.close(); }
});

test('muestra texto dinámico con caracteres HTML como texto literal', async () => {
  const db = nubeFalsa();
  const name = '<i>Perfil ficticio</i> & "voz"';
  db.datos.nombre = name;
  db.datos.enIdx = 1;
  db.datos.sr.fails = ['<i>cuenta sintética</i>'];
  db.datos.cal['2024-02-29'].m.t = '<i>nota sintética</i>';
  const { ctx, page, errores } = await abrir(db);
  try {
    await page.waitForFunction(value => document.querySelector('#hola').textContent.includes(value), name);
    await page.click('#daily [data-d="en"]');
    const phrase = page.locator('#enxBody .phr .en').filter({ hasText: name });
    assert.equal(await phrase.count(), 1);
    assert.equal(await phrase.locator('i').count(), 0);
    assert.equal(await phrase.locator('[data-say]').getAttribute('data-say'), 'My name is '+name+'.');
    assert.equal(await page.locator('#srprog .fails').textContent(), '<i>cuenta sintética</i>');
    assert.equal(await page.locator('#srprog .fails i').count(), 0);
    assert.ok((await page.textContent('#xprog')).includes('<i>nota sintética</i>'));
    assert.equal(await page.locator('#xprog i').count(), 0);
    assert.deepEqual(errores, []);
  } finally { await ctx.close(); }
});

test('el respaldo de voz en línea utiliza una frase genérica y conserva el audio del vocabulario', async () => {
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    const name = 'Alias Privado de Prueba';
    await page.addInitScript(alias => {
      localStorage.setItem('tablas-turbo-v2', JSON.stringify({ pts: 3, nombre: alias, enIdx: 1 }));
      Object.defineProperty(window, 'speechSynthesis', { value: undefined });
      window.audioUrls = [];
      window.Audio = class {
        constructor(src) { window.audioUrls.push(src); }
        pause() {}
        play() { return Promise.resolve(); }
      };
    }, name);
    await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1') ? r.continue() : r.abort());
    await page.goto(url.split('?')[0]);
    await page.click('#daily [data-d="en"]');
    await page.locator('#enxBody .en').filter({ hasText: name }).locator('button').click();
    const word = page.locator('#enxBody .wd').first();
    const vocab = await word.getAttribute('data-say');
    await word.click();
    const requests = await page.evaluate(() => window.audioUrls);
    assert.deepEqual(requests.map(u => new URL(u).searchParams.get('q')), ['My name is Alex.', vocab]);
    assert.ok(requests.every(u => new URL(u).hostname === 'translate.google.com'));
  } finally { await ctx.close(); }
});

test('dos dispositivos concilian partes, puntos, boleta e intentos concurrentes', async () => {
  const db = nubeFalsa();
  const a = await abrir(db);
  await esperar(() => db.datos.pinH, 'perfil inicial');
  const b = await abrir(db);
  const start = ctx => ctx.page.waitForFunction(() => document.querySelector('#cloud').textContent.includes('Al día'));
  try {
    await Promise.all([start(a),start(b)]);
    const day = '2024-03-02';
    const attempt = {k:'mul:2x2',ok:true,primero:true,fmt:'rcl',dia:day};
    await Promise.all([
      a.page.evaluate(v => window.syntheticProgress(v), {day,record:{t:2,tOk:true,tCal:8,cfg:['t','c']},points:10,attempt}),
      b.page.evaluate(v => window.syntheticProgress(v), {day,record:{t:2,col:true,colCal:9,cfg:['t','c']},points:20,attempt})
    ]);
    await esperar(() => db.datos.daily[day]?.bonus && db.intentos.length===2, 'las dos partes y sus intentos');
    assert.equal(db.datos.daily[day].tOk,true);
    assert.equal(db.datos.daily[day].col,true);
    assert.equal(db.datos.pts,320);
    assert.equal(db.datos.cal[day].avg,8.5);
    assert.equal(db.datos.ku['mul:2x2'].n,2);
    assert.equal(new Set(db.intentos.map(i=>i.id)).size,2);
  } finally { await Promise.all([a.ctx.close(),b.ctx.close()]); }
});

test('edición durante una escritura y respuesta perdida conservan progreso sin duplicados', async () => {
  const db = nubeFalsa();
  const {page,ctx} = await abrir(db);
  try {
    await esperar(() => db.datos.pinH, 'perfil inicial');
    let unblock,started;
    const waiting = new Promise(resolve => { started=resolve; });
    db.beforeWrite = async () => { db.beforeWrite=null; started(); await new Promise(resolve => {unblock=resolve;}); };
    db.dropReply=true;
    const write = points=>page.evaluate(points=>window.syntheticProgress({day:'2024-03-02',record:{t:2},points}),points);
    await write(10);
    await waiting;
    await write(20);
    unblock();
    await esperar(() => db.datos.pts===270,'se conserva la edición durante la escritura');
    assert.equal(db.escrituras.size,3,'el reintento reutiliza el comprobante de la primera escritura');
  } finally { await ctx.close(); }
});

test('avances sin conexión se reintentan al recuperar red', async () => {
  const db = nubeFalsa();
  const {page,ctx}=await abrir(db);
  try {
    await esperar(()=>db.datos.pinH,'perfil inicial');
    db.offline=true;
    await page.click('#snd');
    await page.waitForFunction(()=>document.querySelector('#cloud').textContent.includes('Sin conexión'));
    assert.equal(db.datos.mute,false);
    db.offline=false;
    await page.evaluate(()=>window.dispatchEvent(new Event('online')));
    await esperar(()=>db.datos.mute===true,'cambio pendiente recuperado');
  } finally { await ctx.close(); }
});

test('migra estado y cola antiguos al perfil de origen y aísla un código nuevo', async () => {
  const second='b'.repeat(32), source=nubeFalsa(), dest=nubeFalsa({code:second});
  dest.datos.pts=74;
  const ctx=await browser.newContext();
  try {
    const page=await ctx.newPage();
    await page.addInitScript(({code,datos})=>{
      if(localStorage.getItem('tt-profile-migrated'))return;
      localStorage.setItem('tt-codigo',code);
      localStorage.setItem('tablas-turbo-v2',JSON.stringify(datos));
      localStorage.setItem('tt-cola',JSON.stringify([{id:crypto.randomUUID(),k:'en:dog',ok:true,primero:true}]));
    },{code:CODE,datos:source.datos});
    await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1')?r.continue():r.abort());
    await page.route('https://*.supabase.co/rest/v1/rpc/*',r=>{
      return r.request().postDataJSON().p_codigo===second?dest.ruta(r):source.ruta(r)
    });
    await page.goto(url.replace(CODE,second));
    await page.waitForFunction(()=>document.querySelector('#sPts').textContent==='74');
    const migrated=await page.evaluate(code=>JSON.parse(localStorage.getItem('tt-profile-v1:'+code)),CODE);
    assert.equal(migrated.state.pts,240);
    assert.equal(migrated.queue.length,1);
    assert.equal(dest.intentos.length,0);
    await page.goto(url);
    await esperar(()=>source.intentos.length===1,'la cola vuelve solo al perfil inicial');
    assert.equal(dest.intentos.length,0);
  } finally { await ctx.close(); }
});

test('evita dos escritores para el mismo perfil en pestañas del mismo navegador', async () => {
  const db=nubeFalsa();
  const {ctx,page}=await abrir(db);
  try {
    await esperar(()=>db.datos.pinH,'perfil inicial');
    const other=await ctx.newPage();
    await other.goto(url);
    assert.match(await other.locator('body').innerText(),/ya está abierto en otra pestaña/);
    await page.close();
    await other.reload();
    await other.waitForFunction(()=>document.querySelector('#sPts')?.textContent==='240');
  } finally { await ctx.close(); }
});

test('transfiere la copia portable entre orígenes sin exportar la cola ni las credenciales', async () => {
  const ctx=await browser.newContext({acceptDownloads:true});
  try {
    const page=await ctx.newPage();
    const source=new URL(url);
    source.search='';
    const target=new URL(source);
    target.hostname='localhost';
    await page.addInitScript(origin=>{
      if(location.origin===origin&&!localStorage.getItem('tablas-turbo-v2')){
        localStorage.setItem('tablas-turbo-v2',JSON.stringify({pts:47,datosFuturos:{access_token:'sintetico'}}));
        localStorage.setItem('tt-cola',JSON.stringify([{id:crypto.randomUUID(),k:'en:dog',ok:true}]));
      }
    },source.origin);
    await page.route('**/*',route=>{
      const origin=new URL(route.request().url()).origin;
      return [source.origin,target.origin].includes(origin)?route.continue():route.abort()
    });
    const openParents=async()=>{
      await page.click('#papas > summary');
      await page.fill('#pin','2580');
      await page.click('#pinGo');
    };
    await page.goto(source.href);
    await openParents();
    const [download]=await Promise.all([page.waitForEvent('download'),page.click('#expBtn')]);
    const file=join(mkdtempSync(join(tmpdir(),'udmi-transfer-')),'progreso.json');
    await download.saveAs(file);
    const backup=JSON.parse(readFileSync(file,'utf8'));
    assert.equal(backup.datos.pts,47);
    assert.deepEqual(backup.datos.datosFuturos,{});
    assert.ok(!('pinH' in backup.datos)&&!('intentos' in backup));
    await page.goto(target.href);
    await page.waitForFunction(()=>document.querySelector('#sPts')?.textContent==='0');
    await openParents();
    await page.setInputFiles('#impFile',file);
    await page.waitForFunction(()=>document.querySelector('#sPts').textContent==='47');
  } finally { await ctx.close(); }
});

test('aventura pausa y reanuda; ayuda y primera respuesta llegan al perfil correcto', async()=>{
  const db=nubeFalsa(),a=await abrir(db);
  const otherCode='b'.repeat(32),other=nubeFalsa({code:otherCode});
  const b=await abrir(db);
  try{
    await esperar(()=>db.datos.pinH,'perfil inicial recuperado');
    await a.page.click('#diagLaunch');
    await a.page.click('[data-diag-session="1"]');
    const statement=await a.page.textContent('#diagPrompt');
    await a.page.click('[data-diag-hint]');
    await a.page.click('[data-diag-pause]');
    await a.page.reload();
    await a.page.click('#diagLaunch');
    await a.page.locator('[data-diag-session="1"]').filter({hasText:'Continuar'}).click();
    assert.equal(await a.page.textContent('#diagPrompt'),statement);
    assert.match(await a.page.textContent('#diagNotice'),/paso a paso/);
    await a.page.locator('[data-diag-option]').first().click();
    await esperar(()=>db.intentos.some(x=>x.origen==='diagnostico'&&x.pista&&x.primero),'evidencia del primer dispositivo');

    await b.page.click('#diagLaunch');
    await b.page.click('[data-diag-session="2"]');
    await b.page.locator('[data-diag-option]').first().click();
    await esperar(()=>Object.values(db.datos.diag?.answers||{}).some(x=>x.session===1)&&
      Object.values(db.datos.diag?.answers||{}).some(x=>x.session===2),'unión de evidencias');
    assert.equal(db.datos.pts,240);
    assert.ok(db.datos.ku['en:dog']);
    await esperar(()=>db.intentos.filter(x=>x.origen==='diagnostico'&&x.primero).length===2,'UUID registrados tras confirmar ambas escrituras');
    await a.page.click('#diagExit');
    await a.page.click('#papas > summary');
    await a.page.fill('#pin','2580');await a.page.click('#pinGo');
    await a.page.click('#diagMapLaunch');
    assert.match(await a.page.textContent('#diagMapBody'),/Informe para la familia/);
    await a.page.selectOption('#diagRubric select[name="legibilidad"]','parcial');
    await a.page.selectOption('#diagRubric select[name="organizacion"]','independiente');
    await a.page.selectOption('#diagRubric select[name="comprension"]','independiente');
    await a.page.selectOption('#diagRubric select[name="autonomia"]','con apoyo');
    await a.page.locator('#diagRubric button').click();
    await esperar(()=>db.datos.diagRubric?.legibilidad==='parcial','rúbrica guardada');

    await a.page.route('https://*.supabase.co/rest/v1/rpc/*',other.ruta);
    await a.page.goto(url.replace(CODE,otherCode));
    await a.page.click('#diagLaunch');
    assert.equal(await a.page.locator('[data-diag-session]').filter({hasText:'Continuar'}).count(),0);
    assert.equal(other.datos.diag,undefined);assert.equal(other.intentos.length,0);
    assert.deepEqual(a.errores,[]);assert.deepEqual(b.errores,[]);
  }finally{await Promise.all([a.ctx.close(),b.ctx.close()])}
});

test('lecciones guardan pausa y ayudas, sincronizan dos dispositivos y aíslan perfiles',async()=>{
  const db=nubeFalsa(),a=await abrir(db),b=await abrir(db);
  const otherCode='c'.repeat(32),other=nubeFalsa({code:otherCode});
  const phase=async(page,text)=>{await page.locator('#lessonPanel').getByText(text,{exact:false}).first().waitFor()};
  const shot=async(page,name)=>{
    if(process.env.UDMI_LESSON_SCREENSHOTS)await page.screenshot({path:join(process.env.UDMI_LESSON_SCREENSHOTS,name),fullPage:true});
  };
  try{
    await esperar(()=>db.datos.pinH,'perfil sintético inicial');
    await a.page.click('#lessonLaunch');
    await a.page.click('[data-lesson-start="encontrar-accion"]');
    assert.equal(await a.page.locator('#lessonStep').evaluate(el=>el===document.activeElement),true);
    assert.equal(await a.page.getByRole('button',{name:'Círculo azul'}).count(),1);
    await shot(a.page,'fase3-instrucciones.png');
    await a.page.getByRole('button',{name:'Círculo azul'}).click();
    await a.page.click('[data-lesson-check]');
    await a.page.click('[data-lesson-act="advance"]');
    await phase(a.page,'Aprende una estrategia');
    await a.page.click('[data-lesson-act="advance"]');
    await a.page.click('[data-lesson-act="advance"]');
    await a.page.getByRole('button',{name:'Cuadrado naranja'}).click();
    await a.page.click('[data-lesson-check]');
    await a.page.click('[data-lesson-act="advance"]');
    await phase(a.page,'Inténtalo por tu cuenta');
    const startPrompt=await a.page.textContent('#lessonPrompt');
    for(let i=0;i<4;i++)await a.page.click('[data-lesson-act="help"]');
    await phase(a.page,'Solución');
    await a.page.click('[data-lesson-pause]');
    await a.page.reload();
    await a.page.click('#lessonLaunch');
    await a.page.locator('[data-lesson-start="encontrar-accion"]').filter({hasText:'Continuar'}).click();
    await phase(a.page,'Solución');
    await a.page.click('[data-lesson-act="retry"]');
    assert.notEqual(await a.page.textContent('#lessonPrompt'),startPrompt);
    await a.page.fill('#lessonInput','subraya');
    await a.page.click('#lessonWritten button');
    await phase(a.page,'coincide');
    await esperar(()=>db.intentos.some(r=>r.origen==='leccion'&&r.extra.etapa==='independiente'&&!r.pista),'intento independiente confirmado');

    await b.page.click('#lessonLaunch');
    await b.page.click('[data-lesson-start="agrupar-diez"]');
    await b.page.fill('#lessonInput','4');
    assert.equal(await b.page.locator('#lessonBlocks .piece').count(),4);
    await b.page.click('#lessonWritten button');
    await b.page.click('[data-lesson-act="advance"]');
    await b.page.click('[data-lesson-act="advance"]');
    await b.page.click('[data-lesson-act="advance"]');
    // La práctica de este tramo muestra canje y piezas con etiquetas accesibles.
    await shot(b.page,'fase3-valor-posicional.png');
    await b.page.click('[data-lesson-exchange]');
    await b.page.fill('#lessonInput','1');
    await b.page.click('#lessonWritten button');
    await phase(b.page,'coincide');
    await esperar(()=>Object.values(db.datos.lessons?.runs||{}).some(r=>r.lesson==='agrupar-diez')&&
      Object.values(db.datos.lessons?.runs||{}).some(r=>r.lesson==='encontrar-accion'),'unión de ambos dispositivos');
    assert.equal(db.datos.pts,240);
    assert.ok(db.datos.ku['en:dog']);
    await a.page.click('#lessonExit');
    await a.page.click('#papas > summary');
    await a.page.fill('#pin','2580');await a.page.click('#pinGo');
    await a.page.click('#diagMapLaunch');
    await a.page.getByText('Lecciones guiadas y repasos',{exact:true}).click();
    await a.page.locator('[data-lesson-assign="entender-oraciones"]').first().click();
    await esperar(()=>db.datos.lessonAssignments?.['entender-oraciones'],'asignación familiar guardada');
    if(process.env.UDMI_LESSON_SCREENSHOTS)await a.page.locator('#diagMapBody summary').filter({hasText:'Lecciones guiadas y repasos'}).locator('..').locator('li').first().screenshot({path:join(process.env.UDMI_LESSON_SCREENSHOTS,'fase3-mapa-familiar.png')});

    await a.page.route('https://*.supabase.co/rest/v1/rpc/*',other.ruta);
    await a.page.goto(url.replace(CODE,otherCode));
    await a.page.click('#lessonLaunch');
    assert.equal(await a.page.locator('[data-lesson-start]').filter({hasText:'Continuar'}).count(),0);
    assert.equal(other.datos.lessons,undefined);
    assert.equal(other.intentos.length,0);
    await a.page.click('[data-lesson-start="entender-oraciones"]');
    await a.page.locator('#lessonPanel blockquote').waitFor();
    await shot(a.page,'fase3-lectura.png');
    assert.deepEqual([...a.errores,...b.errores],[]);
  }finally{await Promise.all([a.ctx.close(),b.ctx.close()])}
});

test('matemáticas permite construir grupos, reanudar y sincronizar la evidencia por perfil',async()=>{
  const db=nubeFalsa(),a=await abrir(db),b=await abrir(db);
  const screenshot=async(page,name)=>{
    if(process.env.UDMI_MATH_SCREENSHOTS)await page.screenshot({
      path:join(process.env.UDMI_MATH_SCREENSHOTS,name),fullPage:true});
  };
  try{
    await esperar(()=>db.datos.pinH,'perfil sintético inicial');
    await a.page.click('#lessonLaunch');
    await a.page.click('[data-lesson-start="grupos-iguales"]');
    await a.page.fill('#lessonInput','desiguales');
    await a.page.click('#lessonWritten button');
    for(let i=0;i<3;i++)await a.page.click('[data-lesson-act="advance"]');
    await a.page.fill('#math0','3');
    await a.page.fill('#math1','5');
    assert.equal(await a.page.locator('#lessonModel .math-rows i').count(),15);
    await screenshot(a.page,'fase35-grupos.png');
    await a.page.click('#lessonBuild button');
    await a.page.click('[data-lesson-act="advance"]');
    await a.page.fill('#math0','3');
    await a.page.fill('#math1','4');
    await a.page.click('#lessonBuild button');
    await a.page.getByText('Grupos y objetos por grupo',{exact:false}).waitFor();
    await a.page.click('[data-lesson-pause]');
    await esperar(()=>db.intentos.some(row=>row.err==='grupos-por-elementos'),'error observable sincronizado');
    await b.page.reload();
    await b.page.waitForFunction(()=>document.querySelector('#cloud').textContent.includes('Al día con la nube'));
    await b.page.click('#lessonLaunch');
    await b.page.locator('[data-lesson-start="grupos-iguales"]').filter({hasText:'Continuar'}).click();
    await b.page.click('[data-lesson-act="retry"]');
    await b.page.fill('#math0','3');
    await b.page.fill('#math1','4');
    await b.page.click('#lessonBuild button');
    await b.page.getByText('Tu respuesta coincide',{exact:false}).waitFor();
    await esperar(()=>db.intentos.some(row=>row.extra?.evidencia==='concepto'&&row.extra.etapa==='independiente'&&row.ok),
      'evidencia distinta en el segundo dispositivo');
    await b.page.click('#lessonExit');
    await b.page.click('#papas > summary');
    await b.page.fill('#pin','2580');await b.page.click('#pinGo');
    await b.page.click('#diagMapLaunch');
    await b.page.getByText('Lecciones guiadas y repasos',{exact:true}).click();
    const group=b.page.locator('#diagMapBody li').filter({hasText:'Construye grupos iguales'}).filter({hasText:'Comprensión conceptual'}).first();
    await group.getByText('Comprensión conceptual',{exact:false}).waitFor();
    if(process.env.UDMI_MATH_SCREENSHOTS)await group.screenshot({path:join(process.env.UDMI_MATH_SCREENSHOTS,'fase35-familia.png')});
    const code='d'.repeat(32),other=nubeFalsa({code});
    await b.page.route('https://*.supabase.co/rest/v1/rpc/*',other.ruta);
    await b.page.goto(url.replace(CODE,code));
    await b.page.click('#lessonLaunch');
    assert.equal(await b.page.locator('[data-lesson-start="grupos-iguales"]').filter({hasText:'Continuar'}).count(),0);
    assert.equal(other.datos.lessons,undefined);
    if(process.env.UDMI_MATH_SCREENSHOTS){
      await b.page.evaluate(()=>window.syntheticFinishLesson('encontrar-accion'));
      await b.page.click('#lessonExit');
      await b.page.click('#lessonLaunch');
      await b.page.click('[data-lesson-start="entender-pregunta"]');
      await b.page.locator('#lessonPrompt').filter({hasText:'¿Cuántos quedan?'}).waitFor();
      await screenshot(b.page,'fase35-problema.png');
    }
    assert.equal(db.datos.pts,240);
    assert.deepEqual([...a.errores,...b.errores],[]);
  }finally{await Promise.all([a.ctx.close(),b.ctx.close()]);}
});

test('aviso de capacidad preserva estado y revisión pendiente al recargar',async()=>{
  const db=nubeFalsa(),{ctx,page,errores}=await abrir(db);
  try{
    await esperar(()=>db.datos.pinH,'perfil sintético inicial');
    db.cambiarDesdeOtroDispositivo(d=>{d.syntheticPadding='x'.repeat(180000);});
    await page.reload();
    await page.locator('#profileCapacity').filter({hasText:'Historial cerca del límite'}).waitFor();
    db.cambiarDesdeOtroDispositivo(d=>{d.syntheticPadding='x'.repeat(201000);});
    await page.reload();
    const day='2026-01-01';
    await page.locator('#profileCapacity').filter({hasText:'El historial supera la capacidad'}).waitFor();
    await page.evaluate(day=>window.syntheticProgress({day,record:{tOk:true},points:11}),day);
    await page.locator('#profileCapacity').filter({hasText:'El historial supera la capacidad'}).waitFor();
    assert.equal(db.datos.pts,240);
    const key='tt-profile-v1:'+CODE;
    const read=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    await page.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.pending,key);
    const before=await read();
    assert.equal(before.state.pts,251);
    assert.equal(before.pending.state.daily[day].tOk,true);
    await page.reload();
    await page.locator('#profileCapacity').filter({hasText:'El historial supera la capacidad'}).waitFor();
    const after=await read();
    assert.equal(after.pending.id,before.pending.id);
    assert.equal(after.state.pts,251);
    assert.deepEqual(errores,[]);
  }finally{await ctx.close();}
});

test('mi práctica de hoy abre y reanuda la propuesta sin reemplazar el reto diario',async()=>{
  const db=nubeFalsa(),{ctx,page,errores}=await abrir(db);
  try{
    await esperar(()=>db.datos.pinH,'perfil sintético');
    await page.click('#adaptiveLaunch');
    const first=await page.locator('#adaptiveCard h3').textContent();
    await page.click('#adaptiveGo');
    assert.equal(await page.locator('#lessonStep').textContent(),first);
    await page.click('[data-lesson-act="help"]');
    await page.click('[data-lesson-pause]');
    await page.reload();
    await page.click('#adaptiveLaunch');
    assert.match(await page.locator('#adaptiveCard').textContent(),/Continúa donde hiciste la pausa/);
    await page.click('#adaptiveGo');
    assert.match(await page.locator('#lessonPanel').textContent(),/señala la palabra/);
    await page.click('#lessonExit');
    assert.equal(await page.locator('#tabs [data-t="reto"]').isVisible(),true);
    assert.equal(await page.locator('#sPts').textContent(),'240');
    assert.deepEqual(errores,[]);
  }finally{await ctx.close();}
});
