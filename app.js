(() => {
  // ---------- Datos ----------
  // Cuerdas ordenadas de la 1 (más aguda) a la última (más grave).
  // Con fundamental y razón, los Hz se calculan; la razón lleva la octava incluida. Sin razón, vale el hz guardado.
  const CFG = window.AFINADOR || {};
  const PRELOADED = CFG.afinaciones || [];
  const KEY = CFG.clave || 'afinador.afinaciones';
  const loadSaved = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
  const store = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };
  let saved = loadSaved();
  const all = () => PRELOADED.concat(saved);

  // ---------- Alturas ----------
  const NOMBRES = ['do', 'do♯', 're', 'mi♭', 'mi', 'fa', 'fa♯', 'sol', 'sol♯', 'la', 'si♭', 'si'];
  const A4 = 440;
  function noteLabel(hz) {
    const midi = 69 + 12 * Math.log2(hz / A4);
    const n = Math.round(midi);
    const cents = Math.round((midi - n) * 100);
    const oct = Math.floor(n / 12) - 1;
    const sign = cents > 0 ? '+' : cents < 0 ? '−' : '±';
    return `${NOMBRES[((n % 12) + 12) % 12]}${oct} ${sign}${Math.abs(cents)}`;
  }
  const fmtHz = (hz) => (Math.round(hz * 100) / 100).toString().replace('.', ',');
  const parseNum = (s) => { const v = parseFloat(String(s).replace(',', '.')); return isFinite(v) ? v : NaN; };
  function parseRatio(s) {
    s = String(s).trim();
    if (!s) return NaN;
    const m = s.match(/^(\d+(?:[.,]\d+)?)\s*[\/:]\s*(\d+(?:[.,]\d+)?)$/);
    if (m) { const d = parseNum(m[2]); return d ? parseNum(m[1]) / d : NaN; }
    return parseNum(s);
  }
  // Altura de la cuerda i de la afinación t. Con razón y fundamental se calcula; si no, vale el hz guardado.
  function hzOf(t, i) {
    const c = t.cuerdas[i];
    if (c.razon && t.fundamental > 0) { const r = parseRatio(c.razon); if (r > 0) return t.fundamental * r; }
    return c.hz;
  }
  const usaRazones = (t) => t.fundamental > 0 && t.cuerdas.every(c => c.razon && parseRatio(c.razon) > 0);

  // ---------- Estado ----------
  let current = all()[0] || null;
  let activeIdx = current ? Math.min(2, current.cuerdas.length - 1) : 0;
  let auto = false; // la cuerda la elige el intérprete; tocar una tarjeta la fija
  let candidata = null; // cuerda que el detector propone, a la espera de confirmarse
  const fundBase = new Map(); // fundamental guardada de cada afinación, para saber si hay transposición sin guardar

  // ---------- Selector y cuerdas ----------
  const sel = document.getElementById('tuningSelect');
  const meta = document.getElementById('tuningMeta');
  const stringsEl = document.getElementById('strings');
  function renderSelect() {
    sel.innerHTML = '';
    for (const t of all()) {
      const o = document.createElement('option');
      o.value = t.id; o.textContent = t.nombre; sel.appendChild(o);
    }
    if (current) sel.value = current.id;
  }
  function renderMeta() {
    meta.innerHTML = '';
    if (!current || !usaRazones(current)) return;
    const lab = document.createElement('label'); lab.textContent = 'fundamental';
    const inp = document.createElement('input'); inp.type = 'number'; inp.step = 'any'; inp.min = '1'; inp.id = 'fundInput';
    inp.value = String(Math.round(current.fundamental * 1000) / 1000);
    const unit = document.createElement('span'); unit.textContent = 'Hz';
    const btn = document.createElement('button'); btn.id = 'transBtn'; btn.textContent = current.fijo ? 'Guardar como copia' : 'Guardar fundamental';
    btn.hidden = true;
    const base = fundBase.get(current.id) ?? current.fundamental;
    if (!fundBase.has(current.id)) fundBase.set(current.id, current.fundamental);
    inp.addEventListener('input', () => {
      const v = parseNum(inp.value);
      if (!(v > 0)) return;
      current.fundamental = v; renderStrings(); if (toneOn) startTone();
      btn.hidden = Math.abs(v - base) < 1e-9;
    });
    btn.addEventListener('click', () => {
      if (current.fijo) {
        const t = { id: 'u-' + Date.now().toString(36), nombre: `${current.nombre} · ${fmtHz(current.fundamental)} Hz`, fundamental: current.fundamental, cuerdas: current.cuerdas.map(c => ({ razon: c.razon })) };
        current.fundamental = base;
        saved.push(t); store(saved); current = t;
      } else { store(saved); }
      fundBase.set(current.id, current.fundamental);
      renderSelect(); renderTuning(); renderLib();
    });
    meta.append(lab, inp, unit, btn);
  }
  function renderTuning() { renderMeta(); renderStrings(); }
  function renderStrings() {
    stringsEl.innerHTML = '';
    meterEl.hidden = !current;
    if (!current) { document.getElementById('formDetails').open = true; return; }
    stringsEl.style.gridTemplateColumns = `repeat(${current.cuerdas.length}, 1fr)`;
    // Se dibujan de la más grave a la más aguda, como en el clavijero.
    current.cuerdas.map((c, i) => [c, i]).reverse().forEach(([c, i]) => {
      const b = document.createElement('div');
      b.className = 'string' + (i === activeIdx ? ' active' : '');
      b.dataset.i = i; b.setAttribute('role', 'button'); b.tabIndex = 0;
      b.innerHTML = `<span class="n">${i + 1}</span>`;
      const pick = () => { activeIdx = i; renderStrings(); if (toneOn) startTone(); };
      b.addEventListener('click', pick);
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      stringsEl.appendChild(b);
    });
    updateTarget();
  }
  sel.addEventListener('change', () => {
    if (current && current.fijo && fundBase.has(current.id)) current.fundamental = fundBase.get(current.id);
    current = all().find(t => t.id === sel.value) || all()[0] || null;
    activeIdx = Math.min(activeIdx, current.cuerdas.length - 1);
    renderTuning(); if (toneOn) startTone();
  });

  // ---------- Medidor ----------
  const needle = document.getElementById('needle');
  const centsOut = document.getElementById('centsOut');
  const freqOut = document.getElementById('freqOut');
  const freqLine = document.getElementById('freqLine');
  const targetOut = document.getElementById('targetOut');
  const meter = document.getElementById('meter');
  const meterEl = meter;
  const status = document.getElementById('status');
  const STATUS_DEFAULT = status.textContent;
  (function drawTicks() {
    const g = document.getElementById('ticks');
    let s = '';
    for (let c = -50; c <= 50; c += 5) {
      const x = 300 + c * 5.4;
      const h = c % 25 === 0 ? 16 : c % 10 === 0 ? 10 : 6;
      s += `<line x1="${x}" y1="${52 - h}" x2="${x}" y2="52"></line>`;
    }
    g.innerHTML = s;
  })();
  const targetNote = document.getElementById('targetNote');
  function updateTarget() {
    if (!current) return;
    const hz = hzOf(current, activeIdx); targetOut.textContent = fmtHz(hz);
    const [nombre, desv] = noteLabel(hz).split(' ');
    targetNote.textContent = `(${nombre.replace(/\d+$/, '')} ${desv} cents)`;
  }
  let centsSuave = null, ultimaLectura = 0;
  const RETENCION = 1200; // ms que la última lectura queda a la vista sin señal nueva
  function showReading(hz) {
    if (!current) return;
    if (!hz) {
      // Sin señal, la lectura anterior se retiene un momento; después se apaga sin mover el trazado.
      if (performance.now() - ultimaLectura < RETENCION) return;
      centsSuave = null;
      centsOut.style.visibility = 'hidden'; freqLine.style.visibility = 'hidden';
      meter.classList.remove('in-tune'); needle.setAttribute('transform', 'translate(300 0)');
      return;
    }
    ultimaLectura = performance.now();
    centsOut.style.visibility = 'visible'; freqLine.style.visibility = 'visible';
    if (auto) {
      let best = 0, bestD = Infinity;
      current.cuerdas.forEach((c, i) => { const d = Math.abs(1200 * Math.log2(hz / hzOf(current, i))); if (d < bestD) { bestD = d; best = i; } });
      if (best !== activeIdx && bestD < 300) {
        candidata = (candidata && candidata.i === best) ? { i: best, n: candidata.n + 1 } : { i: best, n: 1 };
        if (candidata.n >= 4) { activeIdx = best; candidata = null; renderStrings(); }
      } else candidata = null;
    }
    const target = hzOf(current, activeIdx);
    const crudo = 1200 * Math.log2(hz / target);
    // Suavizado de la aguja: cada lectura mueve una cuarta parte del camino hacia el valor nuevo.
    centsSuave = centsSuave == null || Math.abs(crudo - centsSuave) > 40 ? crudo : centsSuave + 0.25 * (crudo - centsSuave);
    const cents = centsSuave;
    const clamped = Math.max(-50, Math.min(50, cents));
    needle.setAttribute('transform', `translate(${300 + clamped * 5.4} 0)`);
    const r = Math.round(cents);
    centsOut.innerHTML = `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r)}<small>cents</small>`;
    freqOut.textContent = fmtHz(hz);
    meter.classList.toggle('in-tune', Math.abs(cents) <= 3);
  }

  // ---------- Micrófono y detección ----------
  let ctx = null, analyser = null, micStream = null, raf = 0, micOn = false;
  const history = [];
  // Claridad mínima del periodo detectado (0 a 1) y umbral de nivel de entrada, ajustable en la página.
  const CLARIDAD = 0.85;
  const sensInput = document.getElementById('sens');
  const umbral = () => Math.pow(10, (sensInput ? +sensInput.value : -40) / 20);
  if (sensInput) sensInput.addEventListener('input', () => { document.getElementById('sensOut').textContent = '−' + Math.abs(+sensInput.value) + ' dB'; });
  // Lectura estable: se muestra sólo cuando la mayoría de las últimas lecturas coincide con la mediana.
  function lecturaEstable() {
    if (history.length < 4) return 0;
    const m = median(history);
    const cerca = history.filter(h => Math.abs(1200 * Math.log2(h / m)) < 25).length;
    return cerca >= Math.ceil(history.length * 0.7) ? m : 0;
  }
  function ensureCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  async function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status.textContent = 'Este navegador no da acceso al micrófono. Abre la página por https en Safari o Chrome.'; status.classList.add('err'); return;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      micDenied = true;
      status.textContent = 'Sin permiso de micrófono. Revisa el permiso del sitio en el navegador y vuelve a cargar la página.'; status.classList.add('err'); return;
    }
    const c = ensureCtx();
    const src = c.createMediaStreamSource(micStream);
    analyser = c.createAnalyser(); analyser.fftSize = 8192; analyser.smoothingTimeConstant = 0;
    src.connect(analyser);
    micOn = true; micBtn.textContent = 'Micrófono on'; status.classList.remove('err'); status.textContent = STATUS_DEFAULT;
    const buf = new Float32Array(analyser.fftSize);
    const tick = () => {
      analyser.getFloatTimeDomainData(buf);
      const hz = detect(buf, c.sampleRate);
      if (hz > 0) { history.push(hz); if (history.length > 10) history.shift(); }
      else if (history.length) history.shift();
      showReading(lecturaEstable());
      raf = requestAnimationFrame(tick);
    };
    tick();
  }
  function stopMic() {
    cancelAnimationFrame(raf); micOn = false;
    if (micStream) micStream.getTracks().forEach(t => t.stop());
    micStream = null; analyser = null; history.length = 0;
    micBtn.textContent = 'Micrófono off'; status.textContent = STATUS_DEFAULT; showReading(0);
  }
  // El micrófono se enciende solo. Si el navegador exige un gesto del usuario, se enciende con el primer toque en la página.
  // El botón lo apaga y lo enciende; apagado a mano, no se vuelve a encender solo.
  const micBtn = document.getElementById('micBtn');
  let micStarting = false, micDenied = false, micUserOff = false;
  micBtn.addEventListener('click', (e) => { e.stopPropagation(); if (micOn) { micUserOff = true; stopMic(); } else { micUserOff = false; micDenied = false; autoMic(); } });
  async function autoMic() {
    if (micOn || micStarting || micDenied || micUserOff) return;
    micStarting = true;
    try { await startMic(); } finally { micStarting = false; }
    if (micOn && ctx && ctx.state === 'suspended') ctx.resume();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { autoMic(); if (ctx && ctx.state === 'suspended') ctx.resume(); }, { passive: true }));
  window.addEventListener('load', autoMic);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !micOn) { micDenied = false; autoMic(); } });
  const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

  // Método de McLeod simplificado: diferencia cuadrática normalizada, primer pico claro, interpolación parabólica.
  function detect(buf, sr) {
    const n = buf.length;
    let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n); if (rms < umbral()) return -1;
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

  // ---------- Tono de referencia ----------
  let toneOn = false, osc = [], toneGain = null;
  const toneBtn = document.getElementById('toneBtn');
  function startTone() {
    if (!current) return;
    stopTone(false);
    const c = ensureCtx();
    const hz = hzOf(current, activeIdx);
    toneGain = c.createGain(); toneGain.gain.value = 0; toneGain.connect(c.destination);
    // Fundamental más dos parciales suaves, para que se oiga la altura y no un silbido.
    [[1, 0.18], [2, 0.05], [3, 0.025]].forEach(([k, g]) => {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = hz * k;
      const gg = c.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(toneGain); o.start(); osc.push(o);
    });
    toneGain.gain.linearRampToValueAtTime(1, c.currentTime + 0.05);
    toneOn = true; toneBtn.textContent = 'Silenciar tono';
    document.querySelectorAll('.string').forEach(s => s.classList.toggle('playing', +s.dataset.i === activeIdx));
  }
  function stopTone(updateUi = true) {
    if (toneGain) { const g = toneGain, os = osc, c = ctx; g.gain.linearRampToValueAtTime(0, c.currentTime + 0.05); setTimeout(() => { os.forEach(o => o.stop()); g.disconnect(); }, 80); }
    osc = []; toneGain = null; toneOn = false;
    if (updateUi) { toneBtn.textContent = 'Tono de referencia'; document.querySelectorAll('.string.playing').forEach(s => s.classList.remove('playing')); }
  }
  toneBtn.addEventListener('click', () => toneOn ? stopTone() : startTone());

  // ---------- Formulario ----------
  const entry = document.getElementById('entry');
  const fCount = document.getElementById('fCount'), fFund = document.getElementById('fFund'), fundField = document.getElementById('fundField');
  const modeHelp = document.getElementById('modeHelp');
  let mode = 'ratio';
  const HELP = {
    ratio: 'Escribe la razón tal como la cuenta la partitura, con la octava incluida. 7/16 sobre 190 Hz da 83,13 Hz; 7/4 daría 332,5 Hz.',
    hz: 'Frecuencia de cada cuerda al aire, con coma o punto decimal.',
    note: 'Nota con su octava en notación científica —la4 es 440 Hz, mi2 la sexta cuerda habitual— y desviación en cents respecto del temperamento igual.',
  };
  document.querySelectorAll('.modes button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    document.querySelectorAll('.modes button').forEach(x => x.classList.toggle('on', x === b));
    renderEntry();
  }));
  fCount.addEventListener('change', renderEntry);
  fFund.addEventListener('input', previewAll);
  function renderEntry() {
    if (!fCount.value) fCount.value = CFG.cuerdas || 6;
    fundField.style.visibility = mode === 'ratio' ? 'visible' : 'hidden';
    modeHelp.textContent = HELP[mode];
    const n = Math.max(1, Math.min(12, parseInt(fCount.value) || 6));
    let head = '<tr><th></th>';
    if (mode === 'ratio') head += '<th>Razón</th>';
    if (mode === 'hz') head += '<th>Hz</th>';
    if (mode === 'note') head += '<th>Nota</th><th>Octava</th><th>Cents</th>';
    head += '<th>Resulta</th></tr>';
    let rows = '';
    for (let i = 0; i < n; i++) {
      rows += `<tr data-i="${i}"><td class="n">${i + 1}</td>`;
      if (mode === 'ratio') rows += `<td><input type="text" data-k="ratio" placeholder="3/2" inputmode="decimal"></td>`;
      if (mode === 'hz') rows += `<td><input type="text" data-k="hz" placeholder="190" inputmode="decimal"></td>`;
      if (mode === 'note') {
        rows += `<td><select data-k="note">${NOMBRES.map((x, k) => `<option value="${k}">${x}</option>`).join('')}</select></td>`;
        rows += `<td><input type="number" data-k="oct" value="${i < 3 ? 3 : 2}" min="0" max="8" style="width:4.5em"></td>`;
        rows += `<td><input type="number" data-k="cents" value="0" step="1" min="-99" max="99" style="width:5.5em"></td>`;
      }
      rows += `<td class="prev">—</td></tr>`;
    }
    entry.innerHTML = head + rows;
    entry.querySelectorAll('input, select').forEach(el => el.addEventListener('input', previewAll));
    previewAll();
  }
  function rowHz(tr) {
    const g = (k) => tr.querySelector(`[data-k="${k}"]`);
    if (mode === 'hz') return parseNum(g('hz').value);
    if (mode === 'ratio') { const f = parseNum(fFund.value), r = parseRatio(g('ratio').value); return f > 0 && r > 0 ? f * r : NaN; }
    const n = +g('note').value, o = parseInt(g('oct').value), c = parseNum(g('cents').value) || 0;
    if (!isFinite(o)) return NaN;
    return A4 * Math.pow(2, ((o + 1) * 12 + n - 69 + c / 100) / 12);
  }
  function previewAll() {
    entry.querySelectorAll('tr[data-i]').forEach(tr => {
      const hz = rowHz(tr);
      tr.querySelector('.prev').textContent = hz > 0 ? `${fmtHz(hz)} Hz · ${noteLabel(hz)}` : '—';
    });
  }
  document.getElementById('saveBtn').addEventListener('click', () => {
    const nombre = document.getElementById('fName').value.trim();
    if (!nombre) { alert('Falta el nombre de la afinación.'); return; }
    const cuerdas = [];
    for (const tr of entry.querySelectorAll('tr[data-i]')) {
      const hz = rowHz(tr);
      if (!(hz > 0)) { alert(`La cuerda ${+tr.dataset.i + 1} no tiene una altura válida.`); return; }
      cuerdas.push(mode === 'ratio' ? { razon: tr.querySelector('[data-k="ratio"]').value.trim() } : { hz: Math.round(hz * 1000) / 1000 });
    }
    const t = { id: 'u-' + Date.now().toString(36), nombre, cuerdas };
    if (mode === 'ratio') t.fundamental = parseNum(fFund.value);
    saved.push(t); store(saved);
    current = t; activeIdx = 0;
    renderSelect(); renderTuning(); renderLib(); clearForm();
  });
  function clearForm() { ['fName', 'fFund'].forEach(id => document.getElementById(id).value = ''); fCount.value = CFG.cuerdas || 6; renderEntry(); }
  document.getElementById('clearBtn').addEventListener('click', clearForm);

  // ---------- Biblioteca ----------
  const libList = document.getElementById('libList');
  function renderLib() {
    libList.innerHTML = '';
    for (const t of all()) {
      const d = document.createElement('div'); d.className = 'lib-item';
      d.innerHTML = `<div><div class="name">${esc(t.nombre)}</div><div class="src">${t.cuerdas.map((c, i) => fmtHz(hzOf(t, i))).reverse().join(' · ')} Hz</div></div>`;
      const right = document.createElement('div');
      if (!t.fijo) {
        const del = document.createElement('button'); del.className = 'ghost'; del.textContent = 'Borrar';
        del.addEventListener('click', () => {
          if (!confirm(`¿Borrar "${t.nombre}"?`)) return;
          saved = saved.filter(x => x.id !== t.id); store(saved);
          if (current && current.id === t.id) { current = all()[0] || null; activeIdx = 0; }
          renderSelect(); renderTuning(); renderLib();
        });
        right.appendChild(del);
      }
      d.appendChild(right); libList.appendChild(d);
    }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // ---------- Exportar e importar ----------
  const ioText = document.getElementById('ioText'), ioStatus = document.getElementById('ioStatus');
  document.getElementById('exportBtn').addEventListener('click', () => {
    ioText.value = JSON.stringify(saved, null, 2);
    ioStatus.textContent = saved.length ? `${saved.length} afinación(es) en el cuadro. Selecciona el texto y cópialo.` : 'No hay afinaciones guardadas aparte de las de fábrica.';
  });
  document.getElementById('importBtn').addEventListener('click', () => {
    let list;
    try { list = JSON.parse(ioText.value); } catch { ioStatus.textContent = 'El texto no es JSON válido.'; return; }
    if (!Array.isArray(list)) list = [list];
    let added = 0;
    for (const t of list) {
      if (!t || !t.nombre || !Array.isArray(t.cuerdas) || !t.cuerdas.length) continue;
      const clean = { id: 'u-' + Date.now().toString(36) + added, nombre: String(t.nombre), cuerdas: t.cuerdas.map(c => c && c.razon ? { razon: String(c.razon) } : { hz: +(c && c.hz) }) };
      if (t.fundamental > 0) clean.fundamental = +t.fundamental;
      if (!clean.cuerdas.every((c, i) => hzOf(clean, i) > 0)) continue;
      saved.push(clean); added++;
    }
    store(saved);
    if (!current && saved.length) { current = saved[saved.length - 1]; activeIdx = 0; renderTuning(); }
    renderSelect(); renderLib();
    ioStatus.textContent = added ? `${added} afinación(es) importada(s).` : 'No había afinaciones válidas en el texto.';
  });

  // ---------- Arranque ----------
  renderSelect(); renderTuning(); renderLib(); renderEntry();
})();
