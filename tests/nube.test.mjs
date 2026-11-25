import test from 'node:test';
import assert from 'node:assert/strict';
import { nubeMerge } from './cargar-nube.mjs';

const base = () => ({ pts: 100, best: 5, streak: 1, last: '2024-02-29', days: { '2024-02-29': 5 }, facts: { '4x1': 3 }, med: {}, miss: { '4x3': 1 },
  sr: { med: {}, err: { llevar: 3 }, fails: ['88 + 36'] }, daily: {}, rd: { dino: 4 }, rk: { 4: 1 }, enLearned: { dog: 1 }, enKnown: {},
  cal: { '2024-02-29': { avg: 7.2 } }, rdLog: [{ d: '2024-02-29', h: '04:00 p.m.', id: 'dino', try: 1, ok: 4, n: 5 }], ts: 1000, nombre: 'Persona de prueba', mute: false });

test('no pierde avance hecho en dos dispositivos', () => {
  const tablet = base(), phone = base();
  tablet.pts = 180; tablet.daily['2024-03-01'] = { t: 6, tOk: true, tCal: 9 }; tablet.facts['6x7'] = 1; tablet.ts = 2000;
  phone.pts = 150; phone.enLearned.red = 1; phone.rd.azteca = 5; phone.rdLog = [{ d: '2024-03-01', h: '05:00 p.m.', id: 'azteca', try: 1, ok: 5, n: 6 }, ...phone.rdLog];
  phone.daily['2024-03-01'] = { t: 6, tOk: false, rd: 'azteca' }; phone.ts = 1500;
  const m = nubeMerge(tablet, phone);
  assert.equal(m.pts, 180);
  assert.equal(m.enLearned.red, 1);
  assert.equal(m.rd.azteca, 5);
  assert.equal(m.facts['6x7'], 1);
  assert.equal(m.daily['2024-03-01'].tOk, true, 'gana el registro del día con más partes hechas');
  assert.equal(m.rdLog.length, 2);
  assert.equal(m.rdLog[0].id, 'azteca', 'el registro de lecturas queda ordenado del más reciente al más antiguo');
  assert.equal(m.ts, 2000);
});

test('es simétrica en lo que se acumula', () => {
  const a = base(), b = base();
  a.miss['4x6'] = 2; a.ts = 3000; b.miss['4x3'] = 4; b.sr.err.otro = 2; b.ts = 2500;
  for (const m of [nubeMerge(a, b), nubeMerge(b, a)]) {
    assert.deepEqual(m.miss, { '4x3': 4, '4x6': 2 });
    assert.deepEqual(m.sr.err, { llevar: 3, otro: 2 });
  }
});

test('la configuración la decide el cambio más reciente', () => {
  const a = base(), b = base();
  a.mute = true; a.retoCfg = ['t', 'en']; a.ts = 5000; b.mute = false; b.retoCfg = ['t', 'c', 'en', 'rd']; b.ts = 4000;
  const m = nubeMerge(b, a);
  assert.equal(m.mute, true);
  assert.deepEqual(m.retoCfg, ['t', 'en']);
});

test('la racha viene del dispositivo que jugó más recientemente', () => {
  const a = base(), b = base();
  a.last = '2024-03-01'; a.streak = 2; a.ts = 1000; b.last = '2024-02-29'; b.streak = 1; b.ts = 9000;
  const m = nubeMerge(a, b);
  assert.equal(m.last, '2024-03-01'); assert.equal(m.streak, 2);
});

test('un borrado o una copia restaurada no se deshace con datos viejos de otro dispositivo', () => {
  const viejo = base(); viejo.pts = 900; viejo.ts = 1000;
  const borrado = { pts: 0, daily: {}, cal: viejo.cal, ts: 2000, resetAt: 2000 };
  assert.equal(nubeMerge(viejo, borrado).pts, 0);
  assert.equal(nubeMerge(borrado, viejo).pts, 0);
  // pero lo jugado después del borrado sí se conserva
  const despues = Object.assign(base(), { pts: 30, ts: 3000, resetAt: 2000 });
  assert.equal(nubeMerge(despues, borrado).pts, 30);
});

test('no modifica los objetos originales', () => {
  const a = base(), b = base(); b.ts = 5; const copia = JSON.stringify(a);
  nubeMerge(a, b);
  assert.equal(JSON.stringify(a), copia);
});

test('respeta los límites de tamaño de los historiales', () => {
  const a = base(), b = base();
  a.rdLog = Array.from({ length: 50 }, (_, i) => ({ d: '2026-10-' + String(i % 28 + 1).padStart(2, '0'), h: String(i), id: 'a' + i, try: 1 }));
  b.rdLog = Array.from({ length: 50 }, (_, i) => ({ d: '2026-09-' + String(i % 28 + 1).padStart(2, '0'), h: String(i), id: 'b' + i, try: 1 }));
  a.sr.fails = Array.from({ length: 12 }, (_, i) => 'a' + i); b.sr.fails = Array.from({ length: 12 }, (_, i) => 'b' + i);
  const m = nubeMerge(a, b);
  assert.equal(m.rdLog.length, 60);
  assert.equal(m.sr.fails.length, 12);
});

test('si un lado ya tiene la contraseña cifrada, la de texto desaparece', () => {
  const nuevo = Object.assign(base(), { pinH: 'abc', pinDef: true, ts: 2000 }), viejo = Object.assign(base(), { pin: '2580', ts: 1000 });
  for (const m of [nubeMerge(nuevo, viejo), nubeMerge(viejo, nuevo)]) { assert.equal(m.pinH, 'abc'); assert.ok(!('pin' in m)); }
});

test('junta el resumen por conocimiento y migra el lado que todavía no lo tiene', async () => {
  const { createRequire } = await import('node:module');
  globalThis.Motor = createRequire(import.meta.url)('../motor.js');
  const a = Object.assign(base(), { ts: 2000, ku: {} });
  Motor.registrar(a, { k: 'mul:6x7', ok: true, primero: true, fmt: 'rcl', dia: '2026-11-26' });
  const b = Object.assign(base(), { ts: 1000, facts: { '4x7': 3 }, enLearned: { dog: 1 } });
  for (const m of [nubeMerge(a, b), nubeMerge(b, a)]) {
    assert.ok(m.ku['mul:6x7'] && m.ku['mul:4x7'] && m.ku['en:dog'], Object.keys(m.ku).join());
  }
  delete globalThis.Motor;
});

test('reconoce la misma base aunque JSONB reordene sus claves', () => {
  const day='2024-03-01', common=base(), local=base(), remote=base();
  common.daily[day]={t:4,ex:{log:{cal:7,ok:true,n:10}}};
  local.daily[day]={t:4,ex:{log:{cal:9,ok:true,n:10}}};
  remote.daily[day]={t:4,ex:{log:{n:10,ok:true,cal:7}}};
  assert.equal(nubeMerge(local,remote,common).daily[day].ex.log.cal,9);
});
