import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../motor.js');

const D0 = '2026-12-01';
const dia = n => M.masDias(D0, n);
const ts = (n, h = 17) => Date.parse(dia(n) + 'T' + String(h).padStart(2, '0') + ':00:00');
// generador fijo (mismos números siempre) para los datos sintéticos
const prng = seed => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const reg = (S, n, a) => M.registrar(S, Object.assign({ ts: ts(n), dia: dia(n), primero: true, pista: false, fmt: 'rcl', origen: 'reto' }, a));

test('el catálogo tiene las 36 habilidades del plan y sus dependencias existen', () => {
  const plan = M.CATALOGO.filter(h => h.plan);
  assert.equal(plan.length, 36);
  assert.equal(new Set(M.CATALOGO.map(h => h.id)).size, M.CATALOGO.length);
  for (const h of M.CATALOGO) for (const d of h.dep) assert.ok(M.HAB[d], `${h.id} depende de ${d}, que no existe`);
  assert.equal(new Set(plan.map(h => h.area)).size, 9);
});

test('cada conocimiento de las actividades actuales tiene habilidad', () => {
  const casos = { 'mul:4x7': 'mul-346', 'mul:2x9': 'mul-2510', 'mul:8x3': 'mul-789', 'sr:suma-con': 'op-suma', 'sr:resta-sin': 'op-resta',
    'en:dog': 'en-vocab', 'enf:Good job!': 'en-frases', 'lec:info': 'lec-info', 'gen:orto': 'esc-orto', 'gen:cultq': 'comp-cultura', 'gen:reloj': 'comp-reloj' };
  for (const [k, h] of Object.entries(casos)) assert.equal(M.habilidadDe(k), h, k);
});

test('acertar muchas veces en un solo día no da dominio: queda en práctica', () => {
  const S = {};
  for (let i = 0; i < 5; i++) reg(S, 0, { k: 'mul:4x7', ok: true, primero: i === 0 });
  assert.equal(M.estadoK(S, 'mul:4x7', dia(0)), 'pra');
  assert.equal(S.ku['mul:4x7'].fn, 1, 'solo el primer intento del día cuenta para la escalera');
});

test('con pista o en orden no cuenta como acierto sin ayuda', () => {
  const S = {};
  reg(S, 0, { k: 'mul:6x7', ok: true, pista: true });
  reg(S, 1, { k: 'mul:6x8', ok: true, fmt: 'seq' });
  assert.equal(M.estadoK(S, 'mul:6x7', dia(1)), 'apr');
  assert.equal(M.estadoK(S, 'mul:6x8', dia(1)), 'apr');
  reg(S, 2, { k: 'mul:6x9', ok: false, err: 'calculo' });
  assert.equal(M.estadoK(S, 'mul:6x9', dia(2)), 'nec');
});

test('la escalera de repasos sigue 1, 3, 7, 14, 30 y 60 días', () => {
  const S = {}, k = 'en:cat';
  let n = 0;
  const fechas = [];
  for (let paso = 0; paso < 6; paso++) {
    reg(S, n, { k, ok: true });
    const e = S.ku[k];
    fechas.push(M.entre(dia(n), e.due));
    n = M.entre(D0, e.due);
  }
  const L = M.CFG.escalera;
  fechas.forEach((g, i) => assert.ok(Math.abs(g - L[i]) <= (i >= 2 ? 1 : 0), `escalón ${i}: ${g} días`));
});

test('repasar antes de tiempo no sube de escalón', () => {
  const S = {}, k = 'en:bird';
  reg(S, 0, { k, ok: true }); reg(S, 1, { k, ok: true });
  const due = S.ku[k].due, lv = S.ku[k].lv;
  reg(S, 2, { k, ok: true });
  assert.equal(S.ku[k].lv, lv);
  assert.equal(S.ku[k].due, due);
});

test('un fallo baja dos escalones y pide repaso mañana; si ya estaba en consolidación, pasa a "Necesita repaso"', () => {
  const S = {}, k = 'en:horse';
  reg(S, 0, { k, ok: true }); reg(S, 1, { k, ok: true });
  assert.equal(M.estadoK(S, k, dia(1)), 'con');
  reg(S, 4, { k, ok: true });
  const lv = S.ku[k].lv;
  reg(S, 11, { k, ok: false, err: 'otro' });
  assert.equal(S.ku[k].lv, lv - 2);
  assert.equal(S.ku[k].due, dia(12));
  assert.equal(M.estadoK(S, k, dia(11)), 'rep');
  reg(S, 12, { k, ok: true });
  assert.equal(M.estadoK(S, k, dia(12)), 'con');
});

test('sin repasar por mucho tiempo, lo consolidado pasa a "Necesita repaso"', () => {
  const S = {}, k = 'en:pig';
  reg(S, 0, { k, ok: true }); reg(S, 1, { k, ok: true });
  assert.equal(M.estadoK(S, k, dia(5)), 'con');
  assert.equal(M.estadoK(S, k, dia(30)), 'rep');
});

test('"Dominada" pide 3 días sin ayuda, uno tras 7 días o más, y en tablas una aplicación', () => {
  const S = {};
  for (const n of [0, 1, 4, 11]) { reg(S, n, { k: 'en:frog', ok: true }); reg(S, n, { k: 'mul:4x6', ok: true }); }
  assert.equal(M.estadoK(S, 'en:frog', dia(11)), 'dom');
  assert.equal(M.estadoK(S, 'mul:4x6', dia(11)), 'con', 'sin un problema resuelto no se da por dominada');
  reg(S, 12, { k: 'mul:4x6', ok: true, fmt: 'apl' });
  assert.equal(M.estadoK(S, 'mul:4x6', dia(12)), 'dom');
});

test('60 días de datos sintéticos: nada se domina antes de tiempo y los repasos caen en fecha', () => {
  const S = {}, r = prng(7), log = [];
  const tabla4 = Array.from({ length: 10 }, (_, i) => 'mul:4x' + (i + 1));
  const prob = { 'mul:4x6': 0.45, 'mul:4x7': 0.45, 'mul:4x8': 0.3 }; // las que más le cuestan
  for (let n = 0; n < 60; n++) {
    const wd = new Date(dia(n) + 'T12:00:00').getDay();
    if (wd === 0 || wd === 6) continue; // de lunes a viernes
    const hoy = dia(n);
    // reto: lo que toca repasar hoy, o toda la tabla el primer día
    const toca = n === 0 ? tabla4 : M.pendientes(S, hoy, k => k.startsWith('mul:'));
    for (const k of toca) {
      const ok = r() > (prob[k] || 0.1);
      reg(S, n, { k, ok, err: ok ? null : 'calculo' });
      if (!ok) reg(S, n, { k, ok: true, primero: false });
      if (M.estadoK(S, k, hoy) === 'dom') log.push([n, k]);
    }
    // una vez por semana, un problema con la tabla del 4
    if (wd === 3 && n > 20) reg(S, n, { k: 'mul:4x5', ok: true, fmt: 'apl' });
    // ningún conocimiento consolidado antes de 2 días con acierto sin ayuda
    for (const k of tabla4) {
      const e = S.ku[k]; if (!e) continue;
      const st = M.estadoK(S, k, hoy);
      if (st === 'con') assert.ok(e.sd.length >= 2, `${k} consolidado con ${e.sd.length} días`);
      if (st === 'dom') assert.ok(e.sd.length >= 3 && e.ap > 0, `${k} dominado sin pruebas suficientes`);
      if (e.due) assert.ok(e.due > hoy || M.pendientes(S, hoy).includes(k));
    }
  }
  const primera = log.length ? Math.min(...log.map(x => x[0])) : 99;
  assert.ok(primera >= 21, `algo se dominó el día ${primera}`);
  // las difíciles se repasaron más veces que las fáciles
  const fn = k => S.ku[k].fn;
  assert.ok(fn('mul:4x7') > fn('mul:4x1'), `4x7: ${fn('mul:4x7')} repasos, 4x1: ${fn('mul:4x1')}`);
  // resumen de la habilidad: solo 10 de las 30 multiplicaciones vistas, no pasa de "En práctica"
  const R = M.resumen(S, dia(59));
  assert.ok(M.EST[R['mul-346'].estado].r <= M.EST.pra.r);
  assert.equal(R['mul-346'].vistos, 10);
});

test('migración: la tabla del 4 y las 10 palabras quedan "En práctica" sin tocar puntos, medallas ni calendario', () => {
  const facts = {}; for (let i = 1; i <= 10; i++) facts['4x' + i] = 3;
  facts['2x3'] = 1; facts['7x8'] = 0;
  const words = ['dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'mouse', 'rabbit', 'frog'];
  const S = { pts: 1089, med: { '4-esc': 10 }, cal: { '2026-11-24': { avg: 9 } }, facts, miss: { '4x7': 2, '7x8': 3 },
    enLearned: Object.fromEntries(words.map(w => [w, 1])), last: '2026-11-24',
    daily: { '2026-11-24': { t: 4, tOk: true, tTries: 1, en: true, enW: words } } };
  const antes = JSON.stringify({ pts: S.pts, med: S.med, cal: S.cal, facts: S.facts, miss: S.miss });
  assert.equal(M.migrar(S, '2026-11-25'), true);
  assert.equal(JSON.stringify({ pts: S.pts, med: S.med, cal: S.cal, facts: S.facts, miss: S.miss }), antes);
  for (let i = 1; i <= 10; i++) assert.equal(M.estadoK(S, 'mul:4x' + i, '2026-11-25'), 'pra');
  for (const w of words) assert.equal(M.estadoK(S, 'en:' + w, '2026-11-25'), 'pra');
  assert.equal(M.estadoK(S, 'mul:2x3', '2026-11-25'), 'apr');
  assert.equal(M.estadoK(S, 'mul:7x8', '2026-11-25'), 'nec');
  assert.equal(S.ku['mul:4x7'].e.otro, 2);
  assert.ok(M.pendientes(S, '2026-11-25').includes('mul:4x7'), 'lo migrado se repasa desde hoy');
  assert.equal(M.migrar(S, '2026-11-26'), false, 'solo se migra una vez');
  // al primer acierto sin ayuda del día siguiente, ya son 2 días: consolidación
  M.registrar(S, { k: 'mul:4x7', ok: true, primero: true, fmt: 'rcl', dia: '2026-11-26' });
  assert.equal(M.estadoK(S, 'mul:4x7', '2026-11-26'), 'con');
});

test('unir el avance de dos dispositivos conserva los días sin ayuda de ambos', () => {
  const A = {}, B = {};
  reg(A, 0, { k: 'en:dog', ok: true }); reg(A, 1, { k: 'en:dog', ok: true });
  reg(B, 0, { k: 'en:dog', ok: true }); reg(B, 4, { k: 'en:dog', ok: false, err: 'otro' });
  reg(B, 2, { k: 'en:cat', ok: true });
  const U = M.unir(A.ku, B.ku);
  assert.deepEqual(U['en:dog'].sd, [dia(0), dia(1)]);
  assert.ok(U['en:cat']);
  assert.equal(U['en:dog'].e.otro, 1);
});

test('el registro para la nube no lleva datos personales y tiene un id único', () => {
  const S = {};
  const a = reg(S, 0, { k: 'mul:4x7', ok: false, err: 'calculo', ms: 3456.7, extra: { r: 27 } });
  assert.match(a.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(Object.keys(a).sort(), ['err', 'extra', 'fmt', 'id', 'k', 'ms', 'ok', 'origen', 'pista', 'primero', 'ts'].sort());
  assert.equal(a.ms, 3457);
  assert.notEqual(reg(S, 0, { k: 'mul:4x7', ok: true }).id, a.id);
});
