const canvas = document.getElementById('Flor');
const ctx = canvas.getContext('2d');
const B1 = document.getElementById('B1');
const loveText = document.getElementById('loveText');
const bgm = document.getElementById('bgm');
const vol = document.getElementById('vol');

/* =================== Música =================== */
vol.addEventListener('input', () => {
  bgm.volume = parseFloat(vol.value || '0.7');
});

async function startMusic() {
  try {
    bgm.volume = parseFloat(vol.value || '0.7');
    await bgm.play();
  } catch {}
}

/* =================== Parámetros visuales =================== */
const PETAL_OFFSET_MUL = 0.58;
const PETAL_SCALE_Y = 1.9;

/* =================== Utilidades de dibujo =================== */
function dibujarPetalo(x, y, radioX, escalaY, rot, color, prog, offset = 0) {
  const pasos = 100;
  const hasta = Math.floor(pasos * prog);
  const dAng = (Math.PI / pasos) * 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.translate(offset, 0);
  ctx.scale(1, escalaY);

  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  ctx.beginPath();
  for (let i = 0; i <= hasta; i++) {
    const ang = i * dAng;
    const r = Math.sin(ang) * radioX;
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r;
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
  const hx = x + (ex - x) * 0.4,
    hy = y + (ey - y) * 0.4;
  const hx2 = x + (ex - x) * 0.65,
    hy2 = y + (ey - y) * 0.65;
  dibujarPetalo(hx + 18 * hojaT, hy, 14, 2, Math.PI * 1.05, '#2ecc71', hojaT);
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

/* =================== Motor de animación =================== */
const DUR_TALLO = 1200;
const DUR_PET = 700;
const PALETA = ['#ffdb27', '#ffd000', '#ffe27a', '#f7c948', '#f4d35e'];

let hojasPairsRestantes = 0;

class Flor {
  constructor({ x, y, petalos, radio, color, baseX, baseY, start = 0, z = 0 }) {
    this.x = x;
    this.y = y;
    this.baseX = baseX;
    this.baseY = baseY;
    this.petalos = petalos;
    this.radio = radio;
    this.color = color;
    this.start = start;
    this.z = z;
    this.grosor = 2 + Math.random() * 2;
    this.petalOffset = this.radio * PETAL_OFFSET_MUL;
    this.rotJitter = Array.from({ length: this.petalos }, () => (Math.random() - 0.5) * 0.25);
    this.tieneHojas = false;
  }

  draw(now, t0) {
    const t = now - t0 - this.start;
    const kt = Math.max(0, Math.min(1, t / DUR_TALLO));

    let ex, ey;
    if (kt > 0) {
      const tip = dibujarTalloConvergente(this.x, this.y, this.baseX, this.baseY, kt, this.grosor, '#0f3b12');
      ex = tip.ex;
      ey = tip.ey;
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
      const local = t - startPet;
      if (local >= 0) {
        const prog = Math.min(1, local / DUR_PET);
        const rot = angStep * i + this.rotJitter[i];
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
  capas.forEach((capa, idx) => {
    const n = nums[idx];
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.random() * 2 - 1);
      const b = (Math.random() * 2 - 1);
      const r = Math.sqrt(Math.random());
      const x0 = centroX + (a * r) * spreadX;
      let y0 = centroY + (b * r) * spreadY;
      if (y0 > centroY) y0 = centroY + (y0 - centroY) * 0.6;

      const dx = baseX - x0, dy = baseY - y0;
      const mag = Math.hypot(dx, dy) || 1;
      const tilt = 0.03;
      const x = x0 + (dx / mag) * spreadX * tilt;
      const y = y0 + (dy / mag) * spreadY * tilt;

      pts.push({ x, y });
    }

    // relajación por repulsión
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
            p.x -= dx * push;
            p.y -= dy * push;
            q.x += dx * push;
            q.y += dy * push;
          }
        }
      }
      for (const p of pts) {
        p.x = centroX + Math.max(-spreadX, Math.min(spreadX, p.x - centroX));
        p.y = centroY + Math.max(-spreadY, Math.min(spreadY, p.y - centroY));
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

  // ===== Layout / Config =====
  function getConfigMedidasFijas(){
    const w=canvas.width, h=canvas.height, min=Math.min(w,h);
    const ar=w/Math.max(1,h);
    let centroX=w*0.40, centroY=h*0.32, baseX=w*0.40, baseY=h*0.60;
    let spreadX=min*0.25*1, spreadY=min*0.22*.80, tilt=0.03;

    if(w<=768){
      centroX=w*0.42; baseX=w*0.42;  // leve sesgo a la izquierda en móvil
      centroY=h*0.35; baseY=h*0.66;
      tilt=0.015;                     // menos empuje hacia la base
      if(ar<0.6) spreadX*=0.9;
    } else if (w>=1280){
      spreadX*=1.05; spreadY*=1.05;
    }
    return {count:12, centroX, centroY, spreadX, spreadY, baseX, baseY, tilt};
  }

/* =================== Animación del ramo =================== */
function animarRamoRamillete(config = getConfigMedidasFijas()) {
  hojasPairsRestantes = 4;
  const t0 = performance.now();

  const puntos = distribuirRamilleteSuave(
    config.count, config.centroX, config.centroY,
    config.spreadX, config.spreadY, config.baseX, config.baseY
  );

  const flores = puntos.map((p, i) => {
    const petalos = 6 + Math.floor(Math.random() * 5);
    const baseRadio = 16 + Math.random() * 10;
    const radio = baseRadio * p.radioMul;
    const color = PALETA[Math.floor(Math.random() * PALETA.length)];
    const start = Math.floor(i * 130 + Math.random() * 100);
    return new Flor({
      x: p.x, y: p.y, petalos, radio, color,
      baseX: config.baseX, baseY: config.baseY,
      start, z: p.z
    });
  });

  function loop(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dibujarSombraSuelo(config.baseX, config.baseY);
    dibujarLazo(config.baseX, config.baseY);
    let done = 0;
    for (const f of flores) if (f.draw(now, t0)) done++;
    if (done < flores.length) requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

/* =================== Sizing (HiDPI) =================== */
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function ensureSized() {
  resizeCanvas();
  if (canvas.width < 10 || canvas.height < 10) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = canvas.clientWidth || canvas.offsetWidth || 360;
    const cssH = canvas.clientHeight || canvas.offsetHeight || 240;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

let ramoIniciado = false;
let rafRedrawTimer = null;

function iniciarConMedidasFijas() {
  ensureSized();
  animarRamoRamillete(getConfigMedidasFijas());
  ramoIniciado = true;
}

function solicitarRedibujoMedidasFijas() {
  if (!ramoIniciado) return;
  if (rafRedrawTimer) cancelAnimationFrame(rafRedrawTimer);
  rafRedrawTimer = requestAnimationFrame(() =>
    animarRamoRamillete(getConfigMedidasFijas())
  );
}

/* Resize observer */
const ro = new ResizeObserver(() => {
  resizeCanvas();
  solicitarRedibujoMedidasFijas();
});
ro.observe(canvas);

/* Eventos de carga y DPR */
window.addEventListener('load', ensureSized);
window.addEventListener('pageshow', ensureSized);
let lastDPR = window.devicePixelRatio;
setInterval(() => {
  if (window.devicePixelRatio !== lastDPR) {
    lastDPR = window.devicePixelRatio;
    resizeCanvas();
    solicitarRedibujoMedidasFijas();
  }
}, 500);

/* =================== Interacción =================== */
function onReceive() {
  startMusic();
  loveText.style.display = 'block';
  iniciarConMedidasFijas();
}
B1.addEventListener('click', onReceive, { passive: true });
B1.addEventListener('touchstart', onReceive, { passive: true });



