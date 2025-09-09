/* =================== DOM =================== */
const canvas   = document.getElementById('Flor');
const ctx      = canvas.getContext('2d');
const B1       = document.getElementById('B1');
const loveText = document.getElementById('loveText');
const bgm      = document.getElementById('bgm');
const vol      = document.getElementById('vol');

/* =================== Estado global =================== */
let hasStarted = false;     // ← NO animar hasta botón
let animId = null;          // id del requestAnimationFrame actual

/* =================== Música (móvil + desktop) =================== */
// Mantén el control de volumen
vol.addEventListener('input', () => {
  const v = Number.isFinite(+vol.value) ? +vol.value : 0.7;
  bgm.volume = Math.max(0, Math.min(1, v));
});

// Detecta móvil para no tocar desktop innecesariamente
const IS_MOBILE = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// “Desbloqueo” del audio en el primer gesto del usuario (solo móvil)
function unlockAudioOnce() {
  if (!IS_MOBILE) return;
  try {
    bgm.muted = true;
    const p = bgm.play();            // intento reproducir
    if (p && p.catch) p.catch(() => {});
    bgm.pause();                     // paro enseguida
    bgm.currentTime = 0;
    bgm.muted = false;
  } catch {}
  window.removeEventListener('pointerdown', unlockAudioOnce, true);
}
if (IS_MOBILE) {
  // cualquier toque en la página antes del botón sirve para desbloquear
  window.addEventListener('pointerdown', unlockAudioOnce, true);
}

async function startMusic() {
  try {
    const v = Number.isFinite(+vol.value) ? +vol.value : 0.7;
    bgm.volume = Math.max(0, Math.min(1, v));
    bgm.load();            // asegura datos listos (iOS)
    bgm.currentTime = 0;   // desde el inicio
    await bgm.play();      // ahora ya no depende de mover el slider
  } catch {
    // Si el navegador aún bloquea, el siguiente toque al botón lo arrancará.
  }
}

/* =================== Parámetros visuales =================== */
const PETAL_OFFSET_MUL = 0.58;
const PETAL_SCALE_Y    = 1.9;
const DUR_TALLO = 1200;
const DUR_PET   = 700;
const PALETA    = ['#ffdb27', '#ffd000', '#ffe27a', '#f7c948', '#f4d35e'];

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* =================== Canvas & DPR =================== */
function scaleCanvasToDPR() {
  const rect = canvas.getBoundingClientRect();
  const dpr  = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(rect.width  * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width  = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* =================== Primitivas de dibujo =================== */
function dibujarPetalo(x, y, radioX, escalaY, rot, color, prog, offset = 0) {
  const pasos = 100;
  const hasta = Math.floor(pasos * prog);
  const dAng  = (Math.PI / pasos) * 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.translate(offset, 0);
  ctx.scale(1, escalaY);

  ctx.shadowColor = color;
  ctx.shadowBlur  = 6;

  ctx.beginPath();
  for (let i = 0; i <= hasta; i++) {
    const ang = i * dAng;
    const r   = Math.sin(ang) * radioX;
    const px  = Math.cos(ang) * r;
    const py  = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function dibujarTalloConvergente(x, y, baseX, baseY, t, grosor = 3, color = '#113b11') {
  const ex = x + (baseX - x) * t;
  const ey = y + (baseY - y) * t;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineWidth = grosor;
  ctx.strokeStyle = color;
  ctx.stroke();

  return { ex, ey };
}

function dibujarParDeHojas(x, y, ex, ey, hojaT) {
  const hx  = x + (ex - x) * 0.4;
  const hy  = y + (ey - y) * 0.4;
  const hx2 = x + (ex - x) * 0.65;
  const hy2 = y + (ey - y) * 0.65;
  dibujarPetalo(hx  + 18 * hojaT, hy,  14, 2, Math.PI * 1.05, '#2ecc71', hojaT);
  dibujarPetalo(hx2 - 18 * hojaT, hy2, 14, 2, Math.PI * 0.05, '#2ecc71', hojaT);
}

function dibujarCentro(x, y) {
  const g = ctx.createRadialGradient(x - 3, y - 3, 2, x, y, 12);
  g.addColorStop(0, '#fffbe9');
  g.addColorStop(1, '#ffe27a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,226,122,0.85)';
  ctx.stroke();
}

function dibujarSombraSuelo(baseX, baseY) {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#6f58ff';
  ctx.beginPath();
  ctx.ellipse(baseX, baseY + 8, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* =================== Modelo Flor =================== */
let hojasPairsRestantes = 0;

class Flor {
  constructor({ x, y, petalos, radio, color, baseX, baseY, start = 0, z = 0 }) {
    this.x = x; this.y = y;
    this.baseX = baseX; this.baseY = baseY;
    this.petalos = petalos;
    this.radio   = radio;
    this.color   = color;
    this.start   = start;
    this.z       = z;
    this.grosor  = 2 + Math.random() * 2;
    this.petalOffset = this.radio * PETAL_OFFSET_MUL;
    this.rotJitter   = Array.from({ length: this.petalos }, () => (Math.random() - 0.5) * 0.25);
    this.tieneHojas  = false;
  }

  draw(now, t0) {
    const t  = now - t0 - this.start;
    const kt = clamp(t / DUR_TALLO, 0, 1);

    let ex, ey;
    if (kt > 0) {
      ({ ex, ey } = dibujarTalloConvergente(
        this.x, this.y, this.baseX, this.baseY, kt, this.grosor, '#0f3b12'
      ));
      if (kt > 0.6 && !this.tieneHojas && hojasPairsRestantes > 0) {
        this.tieneHojas = true;
        hojasPairsRestantes--;
      }
    }

    if (this.tieneHojas && ex !== undefined) {
      const hojaT = kt > 0.6 ? Math.min(1, (kt - 0.6) / 0.4) : 0;
      dibujarParDeHojas(this.x, this.y, ex, ey, hojaT);
    }

    const angStep = (Math.PI * 2) / this.petalos;
    for (let i = 0; i < this.petalos; i++) {
      const startPet = DUR_TALLO + i * DUR_PET;
      const local    = t - startPet;
      if (local >= 0) {
        const prog = clamp(local / DUR_PET, 0, 1);
        const rot  = angStep * i + this.rotJitter[i];
        dibujarPetalo(this.x, this.y, this.radio, PETAL_SCALE_Y, rot, this.color, prog, this.petalOffset);
      }
    }
    if (t >= 0) dibujarCentro(this.x, this.y);
    return t >= DUR_TALLO + this.petalos * DUR_PET + 200;
  }
}

/* =================== Distribución =================== */
function distribuirRamilleteSuave(count, centroX, centroY, spreadX, spreadY, baseX, baseY) {
  const capas = [
    { frac: 0.35, radioMul: 0.85, minDist: 48, z: 0 },
    { frac: 0.40, radioMul: 1.00, minDist: 54, z: 1 },
    { frac: 0.25, radioMul: 1.15, minDist: 60, z: 2 },
  ];
  const nums = capas.map(c => Math.max(1, Math.round(count * c.frac)));
  while (nums.reduce((a, b) => a + b, 0) > count) nums[0]--;
  while (nums.reduce((a, b) => a + b, 0) < count) nums[2]++;

  const puntos = [];
  const isMobile = canvas.clientWidth <= 768;

  capas.forEach((capa, idx) => {
    const n   = nums[idx];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.random() * 2 - 1);
      const b = (Math.random() * 2 - 1);
      const r = Math.sqrt(Math.random());
      const x0 = centroX + (a * r) * spreadX;
      let   y0 = centroY + (b * r) * spreadY;
      if (y0 > centroY) y0 = centroY + (y0 - centroY) * 0.6;

      const dx = baseX - x0, dy = baseY - y0;
      const mag  = Math.hypot(dx, dy) || 1;
      const tilt = isMobile ? 0.008 : 0.03;

      const x = x0 + (dx / mag) * spreadX * tilt;
      const y = y0 + (dy / mag) * spreadY * tilt;

      pts.push({ x, y });
    }

    // relajación + sujeción al óvalo
    const iter = 10;
    for (let it = 0; it < iter; it++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const p = pts[i], q = pts[j];
          let dx = q.x - p.x, dy = q.y - p.y;
          let d = Math.hypot(dx, dy) || 1e-6;
          const minD = capa.minDist;
          if (d < minD) {
            const push = (minD - d) * 0.5;
            dx /= d; dy /= d;
            p.x -= dx * push; p.y -= dy * push;
            q.x += dx * push; q.y += dy * push;
          }
        }
      }
      for (const p of pts) {
        p.x = centroX + clamp(p.x - centroX, -spreadX, spreadX);
        p.y = centroY + clamp(p.y - centroY, -spreadY, spreadY);
      }
    }
    for (const p of pts) puntos.push({ ...p, z: capa.z, radioMul: capa.radioMul });
  });

  puntos.sort((a, b) => (a.z - b.z) || (a.y - b.y));
  return puntos;
}

function dibujarLazo(baseX, baseY) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#a276ff';
  ctx.strokeStyle = '#7a56d9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(baseX - 36, baseY - 8, 72, 16, 8);
  else ctx.rect(baseX - 36, baseY - 8, 72, 16);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX - 22, baseY - 20, baseX - 46, baseY - 2);
  ctx.quadraticCurveTo(baseX - 22, baseY + 10, baseX, baseY);
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + 22, baseY - 20, baseX + 46, baseY - 2);
  ctx.quadraticCurveTo(baseX + 22, baseY + 10, baseX, baseY);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/* =================== Layout / Config =================== */
function getConfigMedidasFijas(){
  const w = canvas.width, h = canvas.height, min = Math.min(w, h);

  // PC / Tablet (tu setup)
  let centroX = w * 0.40, baseX = w * 0.40;
  let centroY = h * 0.32, baseY = h * 0.60;
  let spreadX = min * 0.25;
  let spreadY = min * 0.22 * 0.80;
  const count = 12;

  // Móvil (se mantiene tu layout original)
  if (canvas.clientWidth <= 768) {
    centroX = w * 0.15; baseX = w * 0.15;
    centroY = h * 0.15; baseY = h * 0.35;
    spreadX = min * 0.13;
    spreadY = min * 0.14;

    const marginX = 60, marginY = 20;   // margen por pétalos/sombras
    const maxXSpan = Math.min(centroX - marginX, (w - centroX) - marginX);
    const maxYSpan = Math.min(centroY - marginY, (h - centroY) - marginY);
    spreadX = clamp(spreadX, 8, maxXSpan);
    spreadY = clamp(spreadY, 8, maxYSpan);
  }
  return { count, centroX, centroY, spreadX, spreadY, baseX, baseY };
}

/* =================== Animación controlada =================== */
function animarRamoRamillete(config = getConfigMedidasFijas()) {
  hojasPairsRestantes = 4;
  const t0 = performance.now();

  const puntos = distribuirRamilleteSuave(
    config.count, config.centroX, config.centroY,
    config.spreadX, config.spreadY, config.baseX, config.baseY
  );

  const flores = puntos.map((p, i) => {
    const petalos   = 6 + Math.floor(Math.random() * 5);
    const baseRadio = 16 + Math.random() * 10;
    const radio     = baseRadio * p.radioMul;
    const color     = PALETA[Math.floor(Math.random() * PALETA.length)];
    const start     = Math.floor(i * 130 + Math.random() * 100);
    return new Flor({ x:p.x, y:p.y, petalos, radio, color,
      baseX:config.baseX, baseY:config.baseY, start, z:p.z });
  });

  function loop(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dibujarSombraSuelo(config.baseX, config.baseY);
    dibujarLazo(config.baseX, config.baseY);
    let done = 0;
    for (const f of flores) if (f.draw(now, t0)) done++;
    if (done < flores.length) animId = requestAnimationFrame(loop);
  }
  cancelAnimationFrame(animId ?? 0);   // no superponer loops
  animId = requestAnimationFrame(loop);
}

/* =================== Redibujado seguro =================== */
let ro;
function requestRedraw() {
  // Siempre escalar; solo animar si el usuario ya inició
  scaleCanvasToDPR();
  if (hasStarted) {
    animarRamoRamillete(getConfigMedidasFijas());
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

/* =================== Inicio por botón =================== */
async function onReceive() {
  if (hasStarted) return;         // evita doble inicio
  hasStarted = true;
  await startMusic();             // audio arranca aquí
  loveText.style.display = 'block';
  requestRedraw();                // escalar + iniciar animación
}

/* =================== Listeners =================== */
// Unificar para evitar doble disparo (click + touchstart)
B1.addEventListener('pointerdown', onReceive, { passive: true, once: true });

// Observa cambios reales de tamaño
ro = new ResizeObserver(requestRedraw);
ro.observe(canvas);

// Cambios de DPR (zoom, pantallas externas, etc.)
let lastDPR = window.devicePixelRatio;
setInterval(() => {
  if (window.devicePixelRatio !== lastDPR) {
    lastDPR = window.devicePixelRatio;
    requestRedraw();
  }
}, 500);

// Primer escalado al cargar/volver (sin animar)
window.addEventListener('DOMContentLoaded', () => {
  scaleCanvasToDPR();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}, { passive: true });

window.addEventListener('pageshow', () => {
  scaleCanvasToDPR();
  if (!hasStarted) ctx.clearRect(0, 0, canvas.width, canvas.height);
}, { passive: true });
