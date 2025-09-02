const canvas = document.getElementById('Flor');
const ctx = canvas.getContext('2d');
const B1 = document.getElementById('B1');
const loveText = document.getElementById('loveText');
const titleH1 = document.getElementById('Titulo');
const sub = document.getElementById('Sub');
const bgm = document.getElementById('bgm');
const vol = document.getElementById('vol');

// ===== Música =====
vol.addEventListener('input', () => {
  bgm.volume = parseFloat(vol.value || '0.7');
});

async function startMusic() {
  try {
    bgm.volume = parseFloat(vol.value || '0.7');
    await bgm.play();
  } catch (e) {
    console.warn("El navegador requiere más interacción para iniciar música.");
  }
}

// ===== Utilidades de dibujo =====
function dibujarPetalo(x, y, radioX, escalaY, rot, color, prog) {
  const pasos = 100;
  const hasta = Math.floor(pasos * prog);
  const dAng = (Math.PI / pasos) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1, escalaY);
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
  ctx.restore();
}

function dibujarTalloAnim(x, y, alto, t) {
  const hastaY = y + alto * t;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, hastaY);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#113b11';
  ctx.stroke();

  // hojitas cuando ya creció suficiente
  if (t > 0.6) {
    const hojaT = (t - 0.6) / 0.4;
    dibujarPetalo(x + 25 * hojaT, y + alto * 0.4, 14, 2, Math.PI * 1.05, '#2ecc71', hojaT);
    dibujarPetalo(x - 25 * hojaT, y + alto * 0.6, 14, 2, Math.PI * 0.05, '#2ecc71', hojaT);
  }
}

function dibujarCentro(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#fff8d5';
  ctx.fill();
  ctx.strokeStyle = '#ffe27a';
  ctx.stroke();
}

function animarFlor({ x, y, petalos = 8, radio = 34, alto = 160, color = '#ffd000', conTallo = true }) {
  const inicio = performance.now();
  const durTallo = conTallo ? 1600 : 0;
  const durPet = 900;

  function frame(now) {
    const t = now - inicio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (conTallo) {
      const k = Math.min(1, t / durTallo);
      dibujarTalloAnim(x, y, alto, k);
    }

    const angStep = (Math.PI * 2) / petalos;
    for (let i = 0; i < petalos; i++) {
      const start = durTallo + i * durPet;
      if (t >= start) {
        const prog = Math.min(1, (t - start) / durPet);
        dibujarPetalo(x, y, radio, 2, angStep * i, color, prog);
      }
    }

    dibujarCentro(x, y);

    if (t < durTallo + petalos * durPet + 200) {
      requestAnimationFrame(frame);
    }
  }
  requestAnimationFrame(frame);
}

// ===== Evento principal: Recibir flor =====
B1.addEventListener('click', () => {
  startMusic();
  titleH1.textContent = 'Para ti';
  sub.textContent = 'Una flor amarilla para iluminar tu día';
  loveText.style.display = 'block';

  animarFlor({
    x: canvas.width * 0.4,   // 🌼 centro horizontal
    y: canvas.height * 0.4,  // 🌼 centrada verticalmente dentro del cuadro
    petalos: 8,
    radio: 40,
    alto: canvas.height * 0.25, // tallo corto → no toca los botones ni texto
    color: '#ffdb27',
    conTallo: true
  });
});

// ===== Escalado HiDPI =====
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
const ro = new ResizeObserver(resizeCanvas);
ro.observe(canvas);
