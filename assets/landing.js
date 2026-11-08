(() => {
  const LAST = 6;
  const C = 2 * Math.PI * 340;
  const NS = 'http://www.w3.org/2000/svg';
  const PALETTE = ['#8FCB9B', '#F2A65A', '#F6D86B', '#F0A897', '#7CC6CC'];

  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const pt = (deg, r) => {
    const a = (deg - 90) * Math.PI / 180;
    return [500 + r * Math.cos(a), 500 + r * Math.sin(a)];
  };

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const stage = $('.stage');
  const ringSvg = $('.ring > svg');
  const parallax = $('#parallax');
  const arcEl = $('#arc');
  const pastEl = $('#past');
  const headEl = $('#head');
  const pulseEl = $('#pulse');
  const nodes = [...document.querySelectorAll('.node')];
  const chapters = [...document.querySelectorAll('.ch')];
  const notes = [...document.querySelectorAll('.note')];
  const nextLabel = $('#next-label');
  const hintText = $('#hint-text');

  const dots = [];
  const dotLayer = $('#dots');
  for (let k = 0; k < 40; k++) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', (7 + (k % 5) * 2.8).toFixed(1));
    c.setAttribute('fill', PALETTE[k % 5]);
    c.setAttribute('opacity', '0');
    dotLayer.appendChild(c);
    dots.push(c);
  }

  const unit = () => document.querySelector('.sec').offsetHeight || innerHeight;
  const read = () => {
    const h = unit();
    return h ? clamp(scrollY / h, 0, LAST) : target;
  };

  let target = 0;
  target = read();
  let t = target;
  let mx = 0, my = 0, clock = 0, raf = 0, lastCur = -1;

  function render() {
    const seg = (a, b) => clamp((t - a) / (b - a), 0, 1);
    const fill = seg(0, 4) * 360;
    const lap2 = seg(5, 6);
    const arc = t <= 5 ? fill : lerp(0, 38, lap2);
    const full = t >= 3.98 && t <= 5.4;
    const glow = clamp(1 - Math.abs(t - 4.6) / 0.8, 0, 1);

    root.style.setProperty('--fill', (fill / 360).toFixed(3));
    root.style.setProperty('--glow', glow.toFixed(3));
    parallax.setAttribute('transform', `translate(${(mx * 12).toFixed(1)} ${(my * 12).toFixed(1)})`);
    pastEl.style.opacity = t <= 5 ? 0 : (lap2 * 0.22).toFixed(3);
    arcEl.setAttribute('stroke-dasharray', `${(C * arc / 360).toFixed(1)} ${C.toFixed(1)}`);
    arcEl.style.opacity = arc > 0.5 ? 1 : 0;
    arcEl.style.filter = full ? `drop-shadow(0 0 ${(34 * glow).toFixed(1)}px rgba(246,216,107,0.7))` : '';

    // When the circle is full, the things you lived float around it, then settle into five colour bands.
    const appear = seg(3.55, 4.25);
    const leave = seg(5.45, 6);
    let settle = seg(4.3, 4.95) * (1 - leave);
    settle = settle < 0.5 ? 2 * settle * settle : 1 - Math.pow(-2 * settle + 2, 2) / 2;
    for (let k = 0; k < 40; k++) {
      let p = clamp(appear * 1.6 - k * 0.015, 0, 1);
      p = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const o = p * (1 - leave) * 0.9;
      dots[k].setAttribute('opacity', o.toFixed(3));
      if (o === 0) continue;
      const spin = clock * (0.05 + (k % 7) * 0.007) * (k % 2 ? 1 : -1) * 57.3;
      const bob = Math.sin(clock * 0.9 + k) * 10;
      let xy = pt(k * 137.508 + spin, lerp(980, 430 + (k % 6) * 24 + bob, p) + 260 * leave);
      if (settle > 0) {
        const ci = k % 5, j = Math.floor(k / 5);
        const g = pt(ci * 72 + 36 + ((j % 4) - 1.5) * 6.5, 448 + Math.floor(j / 4) * 40 + bob * 0.3);
        xy = [lerp(xy[0], g[0], settle), lerp(xy[1], g[1], settle)];
      }
      dots[k].setAttribute('cx', xy[0].toFixed(1));
      dots[k].setAttribute('cy', xy[1].toFixed(1));
    }

    nodes.forEach((n, i) => {
      const deg = i * 90;
      const reached = t <= 5 ? fill >= deg - 0.5 && t > 0.02 : i === 0 && lap2 > 0.02;
      n.classList.toggle('on', reached);
      n.setAttribute('r', reached ? 20 : 14);
    });

    const showHead = arc > 0.5 && arc < 359.5;
    headEl.style.display = showHead ? '' : 'none';
    if (showHead) {
      const h = pt(arc, 340);
      headEl.setAttribute('cx', h[0].toFixed(1));
      headEl.setAttribute('cy', h[1].toFixed(1));
    }
    pulseEl.style.display = t < 0.15 ? '' : 'none';

    chapters.forEach((el, i) => {
      const v = clamp(1 - Math.abs(t - i) * 1.8, 0, 1);
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translateY(${((t - i) * -5).toFixed(2)}cqw) scale(${(0.94 + 0.06 * v).toFixed(3)})`;
      el.style.visibility = v < 0.02 ? 'hidden' : 'visible';
      el.style.pointerEvents = v > 0.6 ? 'auto' : 'none';
    });
    notes.forEach((el, i) => {
      const v = clamp(1 - Math.abs(t - i) * 1.8, 0, 1);
      el.style.opacity = v.toFixed(3);
      el.style.transform = `translateY(${((t - i) * -28).toFixed(1)}px)`;
      el.style.visibility = v < 0.02 ? 'hidden' : 'visible';
    });

    const cur = Math.round(t);
    if (cur !== lastCur) {
      lastCur = cur;
      nextLabel.textContent = cur === 0 ? 'Start' : 'Next';
      hintText.textContent = cur === 0 ? 'or scroll, and the circle fills' : `${cur + 1} / 7`;
      stage.classList.toggle('at-end', cur >= LAST);
    }
    ringSvg.setAttribute('aria-label', `A circle that is ${Math.round(fill / 3.6)} percent full`);
  }

  function tick(now) {
    raf = 0;
    const d = target - t;
    const floating = !calm && t > 3.4 && t < 6.2;
    if (d !== 0) t = calm || Math.abs(d) < 0.002 ? target : t + d * 0.09;
    if (floating) clock = now / 1000;
    render();
    if (t !== target || floating) raf = requestAnimationFrame(tick);
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function go(v) {
    scrollTo({ top: clamp(v, 0, LAST) * unit(), behavior: calm ? 'auto' : 'smooth' });
  }

  function restart() {
    scrollTo({ top: 0, behavior: 'instant' });
    t = target = 0;
    render();
    if (!calm) stage.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
  }

  addEventListener('scroll', () => { target = read(); wake(); }, { passive: true });
  addEventListener('resize', () => { target = read(); wake(); });
  addEventListener('pointermove', (e) => {
    if (calm || e.pointerType !== 'mouse') return;
    mx = (e.clientX / innerWidth - 0.5) * 2;
    my = (e.clientY / innerHeight - 0.5) * 2;
    wake();
  }, { passive: true });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-go]');
    if (!b) return;
    if (b.dataset.go === 'next') go(Math.round(target) + 1);
    else restart();
  });

  const player = $('.player');
  const video = player.querySelector('video');
  document.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => {
    if (!video.poster) video.poster = video.dataset.poster;
    player.showModal();
    video.currentTime = 0;
    video.play().catch(() => {});
  }));
  player.querySelector('.player-close').addEventListener('click', () => player.close());
  player.addEventListener('click', (e) => { if (e.target === player) player.close(); });
  player.addEventListener('close', () => video.pause());

  render();
  wake();
})();
