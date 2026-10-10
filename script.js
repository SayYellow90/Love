(() => {
  const canvas = document.getElementById("loveCanvas");
  const ctx = canvas.getContext("2d");
  const BG = "#060208";
  const PHRASES = [
    "I love you", "Seni seviyorum", "Te amo", "Je t'aime",
    "Ich liebe dich", "Ti amo", "Eu te amo", "Я тебя люблю",
    "사랑해", "愛してる", "我爱你", "मैं तुमसे प्यार करता हूँ",
    "Σ' αγαπώ", "Ik hou van jou", "Jag älskar dig", "Kocham cię",
    "ฉันรักเธอ", "Anh yêu em", "Aku cinta kamu", "Я тебе кохаю"
  ];
  const SIZES = [9, 10, 11, 12];
  const DURATION = 10000;
  const ANIM = 42;
  const TICK = 16;
  const GAP = 7;
  let width = 800, height = 800, scale = 1;
  let particles = [];
  let startedAt = null;
  let submitted = false;
  let lastTime = 0;
  let animationDone = false;
  let shimmerAt = 0;
  let seed = 11;

  function random() {
    // Deterministic pseudo-random generator, similar to the original Python version.
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function choice(arr) { return arr[Math.floor(random() * arr.length)]; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function heart(a) {
    return {
      x: 16 * Math.pow(Math.sin(a), 3) * 21,
      y: (13 * Math.cos(a) - 5 * Math.cos(2*a) - 2 * Math.cos(3*a) - Math.cos(4*a)) * 21 + 20
    };
  }
  const poly = Array.from({length: 720}, (_, i) => heart(2 * Math.PI * i / 720));
  const yValues = poly.map(p => p.y);
  const YMAX = Math.max(...yValues), YMIN = Math.min(...yValues);
  const CY = (YMAX + YMIN) / 2;

  function spans(y) {
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a.y <= y && y < b.y) || (b.y <= y && y < a.y)) {
        xs.push(a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y));
      }
    }
    xs.sort((a, b) => a - b);
    const result = [];
    for (let i = 0; i + 1 < xs.length; i += 2) result.push([xs[i], xs[i + 1]]);
    return result;
  }
  function intersect(a, b) {
    const out = [];
    for (const aa of a) for (const bb of b) {
      const lo = Math.max(aa[0], bb[0]), hi = Math.min(aa[1], bb[1]);
      if (hi - lo > 14) out.push([lo, hi]);
    }
    return out;
  }
  function measure(text, size) {
    ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    return ctx.measureText(text).width;
  }
  function mix(a, b, k) { return a.map((v, i) => v + (b[i] - v) * k); }
  function rgb(hex) {
    return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  }
  function hex(c) {
    return "#" + c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("");
  }
  function dim(c, k) { return c.map(v => v * k); }
  function distance(x, y) { return Math.hypot(x / (16 * 21), (y - CY) / (14.5 * 21)); }
  const BGC = rgb(BG), FLASH = [1, .78, .78];

  function build() {
    const placed = [];
    const rowH = 17;
    let y = YMAX - rowH / 2;
    let phraseOrder = [];
    let phraseIndex = 0;
    function nextPhrase() {
      if (phraseIndex >= phraseOrder.length) {
        phraseOrder = shuffle(PHRASES.slice());
        phraseIndex = 0;
      }
      return phraseOrder[phraseIndex++];
    }
    while (y > YMIN + rowH / 2) {
      const row = intersect(spans(y + rowH / 2), spans(y - rowH / 2));
      for (const span of row) {
        const lo = span[0] + 4, hi = span[1] - 4;
        let cur = lo + random() * 8;
        const line = [];
        while (true) {
          let fit = null;
          for (let tries = 0; tries < 10; tries++) {
            const text = nextPhrase(), size = choice(SIZES), w = measure(text, size);
            if (cur + w <= hi) { fit = {text, size, w}; break; }
          }
          if (!fit) break;
          line.push({x: cur + fit.w / 2, y, text: fit.text, size: fit.size, w: fit.w});
          cur += fit.w + GAP;
        }
        if (!line.length) continue;
        if (line.length > 1) {
          const left = hi - (line[line.length - 1].x + line[line.length - 1].w / 2);
          line.forEach((p, i) => p.x += left * i / (line.length - 1));
        } else {
          line[0].x = (lo + hi) / 2;
        }
        line.forEach((p, i) => {
          p.edge = i === 0 || i === line.length - 1;
          const rad = Math.min(1, distance(p.x, p.y));
          let base = mix([.58, 0, .09], [.90, .05, .14], .25 + .75 * rad);
          base = mix(base, [.98, .10, .16], random() * .35 + (p.edge ? .3 : 0));
          p.color = base.map(v => Math.min(1, v));
          p.rad = rad;
          p.f = 0;
          p.dx = random() * 20 - 10;
          p.done = false;
          placed.push(p);
        });
      }
      y -= rowH;
    }
    const edges = placed.filter(p => p.edge).sort((a, b) =>
      (Math.atan2(a.x, a.y - CY) % (2 * Math.PI)) - (Math.atan2(b.x, b.y - CY) % (2 * Math.PI)));
    const inner = placed.filter(p => !p.edge).sort((a, b) => -a.rad + random() * .08 - (-b.rad + random() * .08));
    return edges.concat(inner);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.min(window.innerWidth, window.innerHeight, 800);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr * size / 800, 0, 0, dpr * size / 800, 0, 0);
    width = height = 800;
    scale = size / 800;
    // Frame berikutnya akan menggambar ulang canvas setelah ukuran berubah.
  }

  function drawText(p, now) {
    const u = Math.min(1, p.f / ANIM);
    const e = 1 - Math.pow(1 - u, 3);
    const c = p.color;
    const x = 400 + p.x + p.dx * (1 - e);
    const y = 400 - (p.y - CY) - (1 - e) * 34;
    const shadowColor = hex(mix(BGC, dim(c, .30), e));
    const haloColor = hex(mix(BGC, dim(c, .20), e * e));
    const flash = .75 * Math.sin(Math.PI * Math.max(0, Math.min(1, (u - .55) / .45)));
    const color = hex(mix(mix(BGC, c, Math.pow(e, 1.5)), FLASH, flash));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${p.size}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = shadowColor;
    ctx.fillText(p.text, x + 2, y + 3);
    ctx.font = `700 ${p.size + 1}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = haloColor;
    ctx.fillText(p.text, x, y);
    ctx.font = `700 ${p.size}px Arial, Helvetica, sans-serif`;
    ctx.fillStyle = p.f >= ANIM ? hex(c) : color;
    ctx.fillText(p.text, p.f >= ANIM ? 400 + p.x : x, p.f >= ANIM ? 400 - (p.y - CY) : y);
  }

  function frame(now) {
    ctx.clearRect(0, 0, 800, 800);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, 800, 800);
    if (!submitted) {
      requestAnimationFrame(frame);
      return;
    }
    if (startedAt === null) startedAt = now;
    const elapsed = now - startedAt;
    const total = particles.length;
    const spawnCount = Math.min(total, Math.floor((elapsed / DURATION) * total));
    particles.forEach((p, i) => {
      if (i < spawnCount && p.f < ANIM) p.f++;
      if (i < spawnCount) drawText(p, now);
    });
    if (spawnCount >= total) {
      animationDone = true;
      if (now - shimmerAt > 140) {
        shimmerAt = now;
        const p = choice(particles);
        p.shimmer = now;
      }
      for (const p of particles) {
        if (p.shimmer && now - p.shimmer < 260) {
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `700 ${p.size}px Arial, Helvetica, sans-serif`;
          ctx.fillStyle = hex(mix(p.color, FLASH, .6));
          ctx.fillText(p.text, 400 + p.x, 400 - (p.y - CY));
        }
      }
    }
    requestAnimationFrame(frame);
  }

  particles = build();
  const nameForm = document.getElementById("nameForm");
  const nameInput = document.getElementById("nameInput");
  const centerName = document.getElementById("centerName");
  nameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    centerName.textContent = name;
    centerName.classList.remove("show");
    // Restart the pop-in animation after each valid submission.
    void centerName.offsetWidth;
    centerName.classList.add("show");
    submitted = true;
    startedAt = null;
    particles.forEach((p) => { p.f = 0; p.shimmer = 0; });
    nameForm.classList.add("hidden");
  });
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();
