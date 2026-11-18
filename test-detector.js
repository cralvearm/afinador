// Prueba del detector de periodo: señales sintéticas con respuesta conocida.
// Se corre con:  jsc test-detector.js   (JavaScriptCore de macOS, desde esta carpeta)

load('detect.js');

const SR = 24000; // como en la página: la mitad de la frecuencia de muestreo del micrófono
const N = 16384;
const UMBRAL = 0.01; // −40 dB

let semilla = 20260918;
const azar = () => { semilla = (semilla * 1103515245 + 12345) % 2147483648; return semilla / 2147483648; };

function senal(f, parciales, ruido) {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let v = 0;
    for (const [k, g] of parciales) v += g * Math.sin(2 * Math.PI * f * k * i / SR);
    buf[i] = v + (ruido ? ruido * (2 * azar() - 1) : 0);
  }
  return buf;
}

let fallos = 0;
function caso(nombre, f, buf, ok) {
  const det = detect(buf, SR, UMBRAL);
  const pasa = ok(det);
  if (pasa) print('OK      ' + nombre + '  →  ' + (det.toFixed ? det.toFixed(2) : det) + ' Hz');
  else { fallos++; print('FALLA   ' + nombre + '  →  ' + det); }
}
const cerca = (f, tolCents) => (det) => det > 0 && Math.abs(1200 * Math.log2(det / f)) < tolCents;

// Senos puros, de la sexta del bajo a la prima aguda.
caso('seno 82,41 Hz', 82.41, senal(82.41, [[1, 0.5]]), cerca(82.41, 3));
caso('seno 110 Hz', 110, senal(110, [[1, 0.5]]), cerca(110, 3));
caso('seno 196 Hz', 196, senal(196, [[1, 0.5]]), cerca(196, 3));
caso('seno 329,63 Hz', 329.63, senal(329.63, [[1, 0.5]]), cerca(329.63, 3));
caso('seno 440 Hz', 440, senal(440, [[1, 0.5]]), cerca(440, 3));
// Cuerda real: fundamental más parciales decrecientes.
caso('parciales 110 Hz', 110, senal(110, [[1, 0.5], [2, 0.25], [3, 0.17], [4, 0.12], [6, 0.06], [8, 0.04]]), cerca(110, 3));
// Fundamental débil y octava fuerte: no debe subir a la octava.
caso('octava dominante 196 Hz', 196, senal(196, [[1, 0.1], [2, 0.5]]), cerca(196, 3));
// Con ruido, tolerancia más amplia.
caso('ruido 10% a 110 Hz', 110, senal(110, [[1, 0.5]], 0.05), cerca(110, 15));
// Debajo del umbral o en silencio: sin lectura.
caso('amplitud bajo el umbral', 0, (() => { const b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = 0.002 * Math.sin(2 * Math.PI * 110 * i / SR); return b; })(), (d) => d === -1);
caso('silencio', 0, new Float32Array(N), (d) => d === -1);

if (fallos) throw new Error(fallos + ' casos fallan');
print('detector: ' + 'todas las pruebas pasan');
