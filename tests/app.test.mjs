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

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const motor = readFileSync(fileURLToPath(new URL('../motor.js', import.meta.url)), 'utf8');
const CODE = 'a'.repeat(32);
const datosIniciales = () => ({ pts: 240, best: 20, streak: 1, last: '2024-02-29', days: { '2024-02-29': 5 }, facts: { '4x1': 3 }, med: {}, miss: {},
  sr: { med: {}, err: {}, fails: [] }, daily: {}, rd: { dino: 4 }, rk: { 4: 1 }, enLearned: { dog: 1 }, enKnown: {}, cal: { '2024-02-29': { m: { t: 10 }, t: 4, avg: 7.2 } },
  ts: 179562043207, nombre: 'Persona de prueba', pin: '2580', mute: false, open: false, retoCfg: ['t', 'c', 'en', 'rd'] });

function nubeFalsa({ sinV2 = false, sinIntentos = false } = {}) {
  let n = 0; const stamp = () => new Date(Date.UTC(2024, 2, 1, 16, 0, 0, ++n)).toISOString();
  const db = { datos: datosIniciales(), actualizado: stamp(), respaldos: [], llamadas: [], intentos: [] };
  db.cambiarDesdeOtroDispositivo = f => { f(db.datos); db.actualizado = stamp(); };
  db.ruta = async route => {
    const fn = route.request().url().split('/rpc/')[1]; const b = JSON.parse(route.request().postData() || '{}'); db.llamadas.push(fn);
    const json = x => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x) });
    if (b.p_codigo !== CODE) return route.fulfill({ status: 400, body: '{}' });
    const respaldar = motivo => db.respaldos.unshift({ id: db.respaldos.length + 1, creado: new Date().toISOString(), motivo, datos: JSON.parse(JSON.stringify(db.datos)) });
    switch (fn) {
      case 'tt_cargar': return json({ datos: db.datos, actualizado: db.actualizado });
      case 'tt_guardar': db.datos = b.p_datos; db.actualizado = stamp(); return json(db.actualizado);
      case 'tt_guardar2':
        if (sinV2) return route.fulfill({ status: 404, body: '{}' });
        if (b.p_base && b.p_base !== db.actualizado) return json({ ok: false, conflicto: true, actualizado: db.actualizado });
        db.datos = b.p_datos; db.actualizado = stamp(); return json({ ok: true, actualizado: db.actualizado });
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

test('si la nube todavía no tiene el guardado nuevo, sigue guardando como antes', async () => {
  const db = nubeFalsa({ sinV2: true }); const { ctx, page, errores } = await abrir(db);
  await esperar(() => db.datos.pinH && db.llamadas.includes('tt_guardar'), 'usa tt_guardar como respaldo');
  await page.click('#snd');
  await esperar(() => db.datos.mute === true, 'guarda el cambio');
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
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('tt-cola')).length), 0, 'la cola queda vacía');
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
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('tt-cola')).length) >= 3);
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
  const S = await page.evaluate(() => JSON.parse(localStorage.getItem('tablas-turbo-v2')));
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
    const before = await page.evaluate(() => localStorage.getItem('tablas-turbo-v2'));
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
      assert.equal(await page.evaluate(() => localStorage.getItem('tablas-turbo-v2')), before);
      // Esperar el mensaje de cada archivo por separado.
      await page.locator('#bkMsg').evaluate(el => { el.textContent = ''; });
    }
    assert.equal(db.respaldos.length, 0);
    assert.deepEqual(errores, []);
    const compat = { pts: 14, nombre: 'Perfil de muestra', facts: { '2x2': 2 }, datoFuturo: { etiqueta: 'muestra' } };
    await page.setInputFiles('#impFile', { name: 'avance.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(compat)) });
    await page.waitForFunction(() => document.querySelector('#bkMsg').textContent.includes('Se cargó la copia'));
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('tablas-turbo-v2')));
    for (const key of Object.keys(compat)) assert.deepEqual(restored[key], compat[key]);
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
