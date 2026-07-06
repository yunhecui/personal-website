(function () {
  const canvas = document.getElementById('forest');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── Config ────────────────────────────────────────────────
  const NAME = 'Yunhe Cui';
  const N    = 3400;

  const RISE_DURATION     = 1.6;  // seconds of drifting fireflies before they gather
  const CONVERGE_DURATION = 2.8;  // seconds for the name to form

  const MOUSE_R = 90;
  const MOUSE_F = 5.0;
  const SPRING  = 0.07;

  // ── State ─────────────────────────────────────────────────
  let W, H, frame = 0, startTime = null;
  let particles = [], mist = [], treeLayers = [];
  let mouse = { x: -9999, y: -9999 };

  // ── Helpers ───────────────────────────────────────────────
  const rand  = (a, b) => Math.random() * (b - a) + a;
  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const ease  = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // ── Name sampler ──────────────────────────────────────────
  function sampleName() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const oc  = off.getContext('2d');
    const fs  = clamp((W * 0.6) / (NAME.length * 0.55), 46, H * 0.24);
    oc.font = `400 ${fs}px Georgia, serif`;
    oc.fillStyle = '#fff'; oc.textAlign = 'center'; oc.textBaseline = 'middle';
    oc.fillText(NAME, W / 2, H * 0.46);
    const d = oc.getImageData(0, 0, W, H).data;
    const pts = [];
    for (let y = 0; y < H; y += 4)
      for (let x = 0; x < W; x += 4)
        if (d[(y * W + x) * 4 + 3] > 120) pts.push({ x, y });
    for (let i = pts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    return pts;
  }

  // ── Tree silhouettes ──────────────────────────────────────
  function initTrees() {
    const specs = [
      { y: H * 0.98, color: 'rgba(13,23,18,0.35)', minH: H * 0.10, maxH: H * 0.22, minW: 40, maxW: 90,  sway: 2 },
      { y: H * 1.00, color: 'rgba(13,23,18,0.62)', minH: H * 0.14, maxH: H * 0.30, minW: 55, maxW: 120, sway: 3 },
      { y: H * 1.02, color: 'rgba(13,23,18,0.92)', minH: H * 0.20, maxH: H * 0.40, minW: 70, maxW: 150, sway: 4 },
    ];
    treeLayers = specs.map(layer => {
      const trees = [];
      let x = -40;
      while (x < W + 40) {
        const w = rand(layer.minW, layer.maxW);
        const h = rand(layer.minH, layer.maxH);
        trees.push({ x: x + w / 2, w, h, phase: rand(0, Math.PI * 2) });
        x += w * rand(0.55, 0.85);
      }
      return { ...layer, trees };
    });
  }

  function drawTree(x, y, w, h, color) {
    ctx.fillStyle = color;
    const tiers = 3;
    for (let i = 0; i < tiers; i++) {
      const tw = w * (1 - i * 0.22);
      const th = (h / tiers) * 1.15;
      const ty = y - h + i * (h / tiers) * 0.82;
      ctx.beginPath();
      ctx.moveTo(x, ty - th);
      ctx.lineTo(x - tw / 2, ty + th * 0.15);
      ctx.lineTo(x + tw / 2, ty + th * 0.15);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Drifting mist ─────────────────────────────────────────
  function initMist() {
    mist = Array.from({ length: 7 }, (_, i) => ({
      x: rand(0, W), y: rand(H * 0.35, H * 0.92),
      r: rand(W * 0.18, W * 0.4),
      speed: rand(0.06, 0.18) * (i % 2 === 0 ? 1 : -1),
      alpha: rand(0.05, 0.14),
    }));
  }

  // ── Fireflies (name particles) ────────────────────────────
  function initParticles() {
    const namePts = sampleName();
    particles = Array.from({ length: N }, (_, i) => {
      const sx = rand(0, W), sy = rand(H * 0.08, H * 1.05);
      const np = namePts.length ? namePts[i % namePts.length] : { x: W / 2, y: H / 2 };
      return {
        sx, sy,
        tx: np.x + (i >= namePts.length ? rand(-3, 3) : 0),
        ty: np.y + (i >= namePts.length ? rand(-3, 3) : 0),
        ox: 0, oy: 0,
        vx: rand(-0.08, 0.08), vy: rand(-0.35, -0.12),
        r: rand(0.9, 2.4),
        hue: rand(38, 54),
        alpha: rand(0.55, 1.0),
        ts: rand(0.006, 0.026),
        tp: rand(0, Math.PI * 2),
      };
    });
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initTrees();
    initMist();
    initParticles();
    startTime = performance.now();
    document.body.classList.remove('forest-ready');
  }

  // ── Mouse repulsion ───────────────────────────────────────
  function repulse(x, y) {
    const dx = x - mouse.x, dy = y - mouse.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < MOUSE_R && d > 0) {
      const f = (1 - d / MOUSE_R) * MOUSE_F;
      return [dx / d * f, dy / d * f];
    }
    return [0, 0];
  }

  // ── Draw ──────────────────────────────────────────────────
  function draw() {
    const now = performance.now();
    frame++;
    const t = (now - startTime) / 1000;

    // Misty forest-morning sky
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    '#0d1712');
    grad.addColorStop(0.45, '#233b32');
    grad.addColorStop(0.75, '#5c7c6c');
    grad.addColorStop(1,    '#d9e2d6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Drifting fog banks
    mist.forEach(m => {
      m.x += m.speed;
      if (m.x - m.r > W + 50) m.x = -m.r - 50;
      if (m.x + m.r < -50) m.x = W + m.r + 50;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(255,255,255,${m.alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Tree line, back to front
    treeLayers.forEach(layer => {
      layer.trees.forEach(tr => {
        const sway = Math.sin(frame * 0.004 + tr.phase) * layer.sway;
        drawTree(tr.x + sway, layer.y, tr.w, tr.h, layer.color);
      });
    });

    // Firefly stages: rise → converge into name → idle
    const convergeT = clamp((t - RISE_DURATION) / CONVERGE_DURATION, 0, 1);
    if (convergeT >= 1 && !document.body.classList.contains('forest-ready')) {
      document.body.classList.add('forest-ready');
    }

    particles.forEach(s => {
      const tw = 0.5 + 0.5 * Math.sin(frame * s.ts + s.tp);
      let x, y, r, alpha;

      if (t < RISE_DURATION) {
        const rt = ease(t / RISE_DURATION);
        s.sx += s.vx; s.sy += s.vy;
        x = s.sx; y = s.sy; r = s.r;
        alpha = s.alpha * (0.3 + 0.7 * tw) * rt;

      } else if (convergeT < 1) {
        const ct = ease(convergeT);
        x = lerp(s.sx, s.tx, ct);
        y = lerp(s.sy, s.ty, ct);
        r = lerp(s.r, 2.5, ct);
        alpha = s.alpha * (0.75 + 0.25 * tw);

      } else {
        const [fx, fy] = repulse(s.tx + s.ox, s.ty + s.oy);
        s.ox = (s.ox + fx) * (1 - SPRING);
        s.oy = (s.oy + fy) * (1 - SPRING);
        x = s.tx + s.ox; y = s.ty + s.oy;
        r = 2.5;
        alpha = s.alpha * (0.82 + 0.18 * tw);
      }

      if (alpha < 0.01) return;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${s.hue},80%,72%,${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  // ── Boot ──────────────────────────────────────────────────
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  resize();
  draw();
})();
