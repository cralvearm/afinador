// Detección de periodo por diferencia cuadrática normalizada —método de McLeod—,
// con el primer pico claro e interpolación parabólica. En archivo propio para que
// las páginas y las pruebas lo compartan.
// Claridad mínima del periodo detectado (0 a 1).
const CLARIDAD = 0.85;

function detect(buf, sr, umbralRms) {
  const n = buf.length;
  let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n); if (rms < umbralRms) return -1;
  const minLag = Math.floor(sr / 1200), maxLag = Math.floor(sr / 30);
  const nsdf = new Float32Array(maxLag + 1);
  for (let tau = minLag; tau <= maxLag; tau++) {
    let acf = 0, m = 0;
    for (let i = 0, j = tau; j < n; i++, j++) { acf += buf[i] * buf[j]; m += buf[i] * buf[i] + buf[j] * buf[j]; }
    nsdf[tau] = m ? 2 * acf / m : 0;
  }
  // Máximos locales entre cruces por cero positivos.
  const peaks = []; let tau = minLag;
  while (tau <= maxLag && nsdf[tau] > 0) tau++;
  while (tau <= maxLag) {
    while (tau <= maxLag && nsdf[tau] <= 0) tau++;
    let best = -1, bestV = 0;
    while (tau <= maxLag && nsdf[tau] > 0) { if (nsdf[tau] > bestV) { bestV = nsdf[tau]; best = tau; } tau++; }
    if (best > 0) peaks.push([best, bestV]);
  }
  if (!peaks.length) return -1;
  const gmax = Math.max(...peaks.map(p => p[1]));
  if (gmax < CLARIDAD) return -1;
  const chosen = peaks.find(p => p[1] >= 0.93 * gmax)[0];
  const a = nsdf[chosen - 1] || 0, b = nsdf[chosen], c2 = nsdf[chosen + 1] || 0;
  const denom = a - 2 * b + c2;
  const shift = denom ? 0.5 * (a - c2) / denom : 0;
  return sr / (chosen + shift);
}
