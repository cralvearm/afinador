// Prueba del afinador con un DOM simulado: carga app.js como el navegador y
// reproduce los gestos de la página. Se corre con:  jsc test-app.js
// En configure: jsc entra en el directorio donde se ejecuta; usar 'load'.

// ---------- Entorno mínimo de navegador ----------
var window = {
  AFINADOR: {
    clave: 'prueba.afinaciones',
    cuerdas: 6,
    afinaciones: [
      { id: 'templo', nombre: 'Templo silbante', fundamental: 190, fijo: true,
        cuerdas: [{ razon: '8/5' }, { razon: '5/4' }, { razon: '1/1' }, { razon: '3/4' }, { razon: '225/448' }, { razon: '7/16' }] },
      { id: 'pw', nombre: 'point/wave', fundamental: 110, fijo: true,
        cuerdas: [{ razon: '63/22' }, { razon: '24/11' }, { razon: '18/11' }, { razon: '14/11' }, { razon: '1/1' }, { razon: '31/44' }] },
    ],
  },
  addEventListener: function () {},
};
var navigator = {};
var localStorage = { _d: {}, getItem: function (k) { return k in this._d ? this._d[k] : null; }, setItem: function (k, v) { this._d[k] = String(v); } };
var performance = { t: 0, now: function () { this.t += 16; return this.t; } };
var location = { origin: 'http://prueba', pathname: '/', search: '' };
var URLSearchParams = function () { this.get = function () { return null; }; };

var elementos = {};
var cuenta = 0;
function elemento(id) {
  const e = {
    dataset: {}, style: {}, children: [], oyentes: {},
    appendChild: function (h) { this.children.push(h); },
    append: function () { for (const h of arguments) this.children.push(h); },
    addEventListener: function (ev, fn) { (this.oyentes[ev] = this.oyentes[ev] || []).push(fn); },
    accion: function (ev, dato) { (this.oyentes[ev] || []).forEach(function (f) { f(dato || {}); }); },
    setAttribute: function (k, v) { this[k] = v; },
    classList: { _s: new Set(), add: function (x) { this._s.add(x); }, remove: function (x) { this._s.delete(x); }, contains: function (x) { return this._s.has(x); }, toggle: function (x, f) { f ? this._s.add(x) : this._s.delete(x); } },
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
  };
  Object.defineProperty(e, 'id', { get: function () { return this.__id; }, set: function (v) { this.__id = v; elementos[v] = this; } });
  Object.defineProperty(e, 'innerHTML', { get: function () { return this.__html || ''; }, set: function (v) { this.__html = v; this.children = []; } });
  e.__id = id;
  elementos[id] = e;
  return e;
}
var document = {
  getElementById: function (id) { return elementos[id] || elemento(id); },
  createElement: function (tag) { return elemento('creado-' + ++cuenta); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
};

// ---------- Cargar el código ----------
load('app.js');

// ---------- Pruebas ----------
var fallos = 0;
function verificar(cond, texto) { print((cond ? 'OK      ' : 'FALLA   ') + texto); if (!cond) fallos++; }
function fundamental() { return elementos['fundInput'].value; }
function objetivo() { return elementos['targetOut'].textContent; }
function tocarTarjeta(n) {
  const t = elementos['strings'].children.find(function (x) { return +x.dataset.i === n; });
  t.accion('click');
}
function cambiarA(id) { elementos['tuningSelect'].value = id; elementos['tuningSelect'].accion('change'); }
function transponer(hz) { elementos['fundInput'].value = hz; elementos['fundInput'].accion('input'); }

verificar(objetivo() === '190', 'al partir, el objetivo de la cuerda 3 es 190 Hz');
verificar(fundamental() === '190', 'al partir, la fundamental mostrada es 190');

transponer('195');
verificar(objetivo() === '195', 'cambiar la fundamental mueve la cuerda 3 (razón 1/1)');
tocarTarjeta(3); // cuerda 4, razón 3/4
verificar(objetivo() === '146,25', 'la cuerda 4 se mueve también: 195 × 3/4 = 146,25');
tocarTarjeta(0); // cuerda 1, razón 8/5
verificar(objetivo() === '312', 'la cuerda 1 se mueve también: 195 × 8/5 = 312');
verificar(elementos['transBtn'].hidden === false, 'aparece el botón de guardar la transposición');

cambiarA('pw');
cambiarA('templo');
verificar(fundamental() === '190', 'sin guardar, cambiar de afinación y volver restaura 190');
verificar(objetivo() === '304', 'el objetivo de la cuerda activa vuelve a 190 × 8/5 = 304');

transponer('195');
elementos['transBtn'].accion('click');
const guardadas = JSON.parse(localStorage.getItem('prueba.afinaciones'));
verificar(guardadas.length === 1, '"Guardar como copia" deja una afinación guardada');
verificar(guardadas[0].fundamental === 195, 'la copia guardada queda en 195');
verificar(guardadas[0].cuerdas.length === 6 && guardadas[0].cuerdas[0].razon === '8/5', 'la copia conserva las razones');
cambiarA('templo');
verificar(fundamental() === '190', 'tras guardar la copia, la afinación original sigue en 190');
verificar(elementos['tuningSelect'].children.filter(function (o) { return o.value === guardadas[0].id; }).length === 1, 'la copia aparece en el selector');

if (fallos) throw new Error(fallos + ' verificaciones fallan');
print('afinador: todas las pruebas pasan');
