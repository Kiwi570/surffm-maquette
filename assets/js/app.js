// SURF FM + — maquette « Houle hertzienne »
import { createHoule } from './houle.js';
import { createPlayer } from './player.js';
import { EMISSIONS, GRILLE, JOURS, AGENDA } from './data.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)').matches;
const isCalm = () => root.classList.contains('calm') || mqReduce.matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- Images ---------- */
const PORTRAIT = new Set(['capter-fm', 'capter-dab', 'capter-web', 'format-glisse', 'format-platines', 'format-rock', 'format-nuit', 'studio-console-nuit']);
const LANDSCAPE = new Set(['hero-houle-nuit', 'lineup-aube', 'agenda-plage-soir', 'emissions-hero', 'capter-hero', 'autoradio-dab']);
function imgSet(name) {
  if (PORTRAIT.has(name)) return { src: `assets/img/${name}-600.webp`, srcset: `assets/img/${name}-600.webp 600w, assets/img/${name}-1200.webp 1200w`, w: 1200, h: 1500 };
  if (LANDSCAPE.has(name)) return { src: `assets/img/${name}-800.webp`, srcset: `assets/img/${name}-800.webp 800w, assets/img/${name}-1600.webp 1600w`, w: 2400, h: 1350 };
  return { src: `assets/img/${name}.webp`, srcset: '', w: 800, h: 534 };
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Heure de Paris et grille ---------- */
function parisNow() {
  const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value || '';
  const day = JOURS.findIndex((j) => j.toLowerCase() === get('weekday').toLowerCase());
  const h = Number(get('hour')) % 24, m = Number(get('minute'));
  return { day: day < 0 ? 0 : day, h, m, hour: h + m / 60, label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` };
}
const hh = (h) => `${String(h % 24).padStart(2, '0')}:00`;
function currentSlot() {
  const now = parisNow(), slots = GRILLE[now.day];
  const i = slots.findIndex((s) => now.hour >= s.de && now.hour < s.a);
  const cur = slots[i] || slots[0];
  const next = slots[i + 1] || GRILLE[(now.day + 1) % 7][0];
  return { now, cur, next };
}
function updateNowPlaying() {
  const { cur, next } = currentSlot();
  $$('[data-now-show]').forEach((el) => (el.textContent = cur.nom));
  $$('[data-player-show]').forEach((el) => (el.textContent = cur.nom));
  $$('[data-now-time]').forEach((el) => (el.textContent = `${hh(cur.de)} – ${hh(cur.a)}`));
  $$('[data-next-show]').forEach((el) => (el.textContent = `${next.nom} à ${hh(next.de)}`));
  try { if ('mediaSession' in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: cur.nom, artist: 'SURF FM +', album: 'En direct', artwork: [{ src: new URL('assets/img/logo-surffm.png', document.baseURI).href, sizes: '480x480', type: 'image/png' }] }); } catch (e) {}
}

/* ---------- Lecteur ---------- */
const player = createPlayer();
let houle = null;
function syncPlayState(playing) {
  root.classList.toggle('is-playing', playing);
  $$('[data-play]').forEach((b) => { b.setAttribute('aria-pressed', String(playing)); b.setAttribute('aria-label', playing ? 'Mettre le direct en pause' : 'Écouter le direct'); });
}
player.onChange(syncPlayState);
try { if ('mediaSession' in navigator) { navigator.mediaSession.setActionHandler('play', () => player.play()); navigator.mediaSession.setActionHandler('pause', () => player.pause()); } } catch (e) {}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-play]'); if (b) { e.preventDefault(); player.toggle(); } });
$('[data-volume]')?.addEventListener('input', (e) => player.setVolume(Number(e.target.value)));

function drawBars(canvas, data, t, opts = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const n = opts.bars || 48, gap = opts.gap ?? 2, bw = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    let v;
    if (data) v = data[Math.floor(2 + i * (opts.spread || 1.4))] / 255;
    else v = 0.06 + 0.05 * Math.sin(t * 1.4 + i * 0.45) + 0.03 * Math.sin(t * 0.7 + i * 1.3);
    v = Math.max(0.03, Math.min(1, v));
    const bh = v * h * (opts.center ? 1 : 0.95);
    c.fillStyle = data && v > 0.55 ? '#d9cf14' : (i % 7 === 0 ? '#8bb6f2' : 'rgba(234,244,244,.82)');
    const y = opts.center ? (h - bh) / 2 : h - bh;
    c.fillRect(i * (bw + gap), y, bw, bh);
  }
}
gsap.ticker.add((time) => {
  const data = player.spectrum();
  const t = isCalm() ? 0 : time;
  const pv = $('[data-viz]'); if (pv) drawBars(pv, data, t, { bars: 36, center: true });
  const big = $('[data-viz-big]'); if (big) drawBars(big, data, t, { bars: 64, gap: 3, spread: 1.0 });
  if (houle) houle.setAudio(player.level.value);
});

/* ---------- Défilement fluide ---------- */
let lenis = null;
function startLenis() {
  if (lenis || isCalm() || typeof Lenis !== 'function') return;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
  lenis.on('scroll', ScrollTrigger.update);
}
function stopLenis() { if (lenis) { lenis.destroy(); lenis = null; } }
gsap.ticker.add((t) => lenis && lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
function scrollToTarget(target, immediate = false) {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  if (lenis && !immediate) lenis.scrollTo(el, { offset: -70, duration: 1.4 });
  else { const y = el.getBoundingClientRect().top + window.scrollY - 70; window.scrollTo({ top: y, behavior: 'auto' }); }
}

/* ---------- En-tête et menu ---------- */
const header = $('[data-header]');
let lastY = 0;
function onScrollHeader() {
  const y = window.scrollY;
  header.classList.toggle('is-solid', y > 40);
  const menuOpen = $('[data-menu-btn]')?.getAttribute('aria-expanded') === 'true';
  header.classList.toggle('is-hidden', !menuOpen && y > 240 && y > lastY + 4);
  if (y < lastY - 4 || y < 240) header.classList.remove('is-hidden');
  lastY = y;
}
window.addEventListener('scroll', onScrollHeader, { passive: true });

const menu = $('[data-menu]'), menuBtn = $('[data-menu-btn]');
function setMenu(open) {
  menuBtn.setAttribute('aria-expanded', String(open));
  ['#app', '[data-footer]', '[data-player]'].forEach((sel) => { const el = $(sel); if (el) el.inert = open; });
  if (open) {
    menu.hidden = false; lenis?.stop();
    if (!isCalm()) gsap.fromTo($$('nav a', menu), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.07, duration: 0.8, ease: 'expo.out' });
    $('nav a', menu)?.focus();
  } else { menu.hidden = true; lenis?.start(); }
}
menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); } });

/* ---------- Mode calme ---------- */
const calmBtn = $('[data-calm]');
function reflectCalm() { calmBtn?.setAttribute('aria-pressed', String(root.classList.contains('calm'))); }
reflectCalm();
calmBtn?.addEventListener('click', () => {
  const on = !root.classList.contains('calm');
  root.classList.toggle('calm', on);
  try { localStorage.setItem('surffm-calm', on ? '1' : '0'); } catch (e) {}
  reflectCalm();
  if (on) stopLenis(); else startLenis();
  destroyPage(); initPage(false);
});

/* ---------- Curseur ---------- */
const cursor = $('[data-cursor]');
if (finePointer && cursor) {
  root.classList.add('has-cursor');
  const dot = $('.cursor-dot', cursor), ring = $('.cursor-ring', cursor), label = $('[data-cursor-text]', cursor);
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 }), dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  window.addEventListener('pointermove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor-label]');
    const link = e.target.closest('a, button, input, select, textarea, label, summary, [data-tilt]');
    cursor.classList.toggle('is-text', !!t);
    cursor.classList.toggle('is-link', !t && !!link);
    label.textContent = t ? t.dataset.cursorLabel : '';
  });
  document.addEventListener('pointerleave', () => gsap.to(cursor, { opacity: 0, duration: 0.2 }));
  document.addEventListener('pointerenter', () => gsap.to(cursor, { opacity: 1, duration: 0.2 }));
}

/* ---------- Boutons magnétiques ---------- */
document.addEventListener('pointermove', (e) => {
  if (!finePointer || isCalm()) return;
  const m = e.target.closest('[data-magnetic]');
  $$('[data-magnetic].is-mag').forEach((el) => { if (el !== m) { el.classList.remove('is-mag'); gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' }); } });
  if (!m) return;
  const r = m.getBoundingClientRect();
  m.classList.add('is-mag');
  gsap.to(m, { x: (e.clientX - (r.left + r.width / 2)) * 0.28, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.4, ease: 'power3.out' });
}, { passive: true });

/* ---------- Parasite entre deux stations ---------- */
const staticCanvas = $('[data-static]');
let lastPulse = 0;
function staticPulse() {
  if (!staticCanvas || isCalm()) return;
  const now = performance.now(); if (now - lastPulse < 450) return; lastPulse = now;
  const w = 160, h = 90; staticCanvas.width = w; staticCanvas.height = h;
  const c = staticCanvas.getContext('2d'), img = c.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  c.putImageData(img, 0, 0);
  gsap.fromTo(staticCanvas, { opacity: 0.09 }, { opacity: 0, duration: 0.45, ease: 'power2.out', overwrite: true });
}

/* ---------- Voile de transition : la vague passe ---------- */
const veil = $('[data-veil]'), veilPath = $('[data-veil-path]'), veilFoam = $('[data-veil-foam]');
function edge(base, amp, phase) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const x = (i / 24) * 100; pts.push([x, base + amp * Math.sin((i / 24) * Math.PI * 3 + phase) + amp * 0.4 * Math.sin((i / 24) * Math.PI * 7 - phase)]); }
  return pts;
}
function setVeil(top, bottom) {
  const d = `M${top.map((p) => p.join(' ')).join(' L')} L${[...bottom].reverse().map((p) => p.join(' ')).join(' L')} Z`;
  veilPath.setAttribute('d', d);
  veilFoam.setAttribute('d', `M${top.map((p) => p.join(' ')).join(' L')}`);
}
function veilCover() {
  return new Promise((res) => {
    const o = { p: 0 };
    gsap.to(o, { p: 1, duration: 0.75, ease: 'power3.inOut', onUpdate: () => { const base = 108 - o.p * 140; setVeil(edge(base, 7 * Math.sin(o.p * Math.PI), o.p * 4), edge(110, 0, 0)); }, onComplete: res });
  });
}
function veilUncover() {
  return new Promise((res) => {
    const o = { p: 0 };
    gsap.to(o, { p: 1, duration: 0.8, ease: 'power3.inOut', onUpdate: () => { const base = 108 - o.p * 140; setVeil(edge(-34, 0, 0), edge(base, 7 * Math.sin(o.p * Math.PI), o.p * 4)); veilFoam.setAttribute('d', `M${edge(base, 7 * Math.sin(o.p * Math.PI), o.p * 4).map((p) => p.join(' ')).join(' L')}`); }, onComplete: () => { setVeil(edge(110, 0, 0), edge(110, 0, 0)); res(); } });
  });
}

/* ---------- Navigation sans rechargement (le son continue) ---------- */
const norm = (u) => { const p = new URL(u, location.href).pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, ''); return p.endsWith('/') ? p : p; };
function setActiveNav() {
  const page = $('#app')?.dataset.page;
  $$('[data-nav]').forEach((a) => { if (a.dataset.nav === page) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}
let navigating = false, shownUrl = location.href;
const CLEAN = /(vercel\.app|surffm\.fr)$/.test(location.hostname);
const pretty = (u) => { if (!CLEAN) return u.href; const p = u.pathname.replace(/index\.html$/, '').replace(/\.html$/, ''); return p + u.search + u.hash; };
async function navigate(href, push = true) {
  const url = new URL(href, location.href);
  if (norm(url.href) === norm(shownUrl)) {
    if (url.hash) scrollToTarget(url.hash);
    else if (lenis) lenis.scrollTo(0, { duration: 1.2 }); else window.scrollTo(0, 0);
    if (push) try { history.pushState({}, '', pretty(url)); } catch (e) {}
    shownUrl = url.href;
    return;
  }
  if (navigating) return;
  navigating = true;
  try {
    const fetching = fetch(url.href, { credentials: 'same-origin' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); });
    if (!isCalm()) { await veilCover(); staticPulse(); }
    const html = await fetching;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.querySelector('#app');
    if (!next) throw new Error('page');
    destroyPage();
    const cur = $('#app');
    cur.replaceWith(document.importNode(next, true));
    document.title = doc.title;
    const desc = doc.querySelector('meta[name="description"]')?.content;
    if (desc) $('meta[name="description"]')?.setAttribute('content', desc);
    if (push) try { history.pushState({}, '', pretty(url)); } catch (e) {}
    shownUrl = url.href;
    window.scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true });
    setMenu(false);
    initPage(true);
    $('#app').focus({ preventScroll: true });
    if (url.hash) setTimeout(() => scrollToTarget(url.hash, true), 60);
    if (!isCalm()) await veilUncover();
  } catch (e) {
    location.href = url.href;
  } finally { navigating = false; }
}
document.addEventListener('click', (e) => {
  const st = e.target.closest('[data-scroll-to]');
  if (st && $(st.dataset.scrollTo)) { e.preventDefault(); scrollToTarget(st.dataset.scrollTo); return; }
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target === '_blank' || a.hasAttribute('download')) return;
  const url = new URL(a.getAttribute('href'), location.href);
  if (url.origin !== location.origin || location.protocol === 'file:') return;
  if (!/\.html$|\/$|\/[^./]+$/.test(url.pathname)) return;
  e.preventDefault();
  navigate(url.href);
});
window.addEventListener('popstate', () => navigate(location.href, false));

/* ---------- Page : construction et nettoyage ---------- */
let ctx = null, mm = null, cleanups = [], pageAC = new AbortController();
const sig = () => ({ signal: pageAC.signal });
function destroyPage() {
  pageAC.abort(); pageAC = new AbortController();
  $$('[data-tide]').forEach((el) => { el.classList.remove('is-masked'); el.style.removeProperty('--tide'); });
  cleanups.forEach((fn) => { try { fn(); } catch (e) {} }); cleanups = [];
  if (houle) { houle.destroy(); houle = null; }
  mm?.revert(); mm = null;
  ctx?.revert(); ctx = null;
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
function initPage(fromNav) {
  const main = $('#app'), page = main.dataset.page, calm = isCalm();
  setActiveNav();
  updateNowPlaying();
  syncPlayState(player.playing);
  ctx = gsap.context(() => {
    renderDynamic(page);
    initHeroes(main, page, calm, fromNav);
    initReveals(main, calm);
    initCadran(main, calm);
    initTilt(main, calm);
    initForms(main);
    initCopy(main);
    if (page === 'home') { initHoule(main, calm); initShowsScroll(main, calm); initTimeline(main, calm); }
    if (page === 'emissions') { initGrille(main); initLoupe(main); }
    if (page === 'capter') { initMap(main, calm); initCompare(main, calm); }
    if (page === '404') initLost(main, calm);
  }, main);
  requestAnimationFrame(() => ScrollTrigger.refresh());
}

/* ---------- Contenus générés depuis data.js ---------- */
function showCard(e, i, tag = 'article') {
  const im = imgSet(e.img);
  const link = tag === 'a' ? ` href="emissions.html#emissions-2015" data-link data-cursor-label="Voir" aria-label="${esc(e.nom)}, avec ${esc(e.animateurs)} : voir les émissions"` : '';
  return `<${tag} class="show-card"${link}>${tag === 'a' ? '<span class="sc-more" aria-hidden="true">→</span>' : ''}
    <figure><img src="${im.src}" ${im.srcset ? `srcset="${im.srcset}" sizes="(max-width: 700px) 80vw, 380px"` : ''} alt="${esc(e.alt)}" width="${im.w}" height="${im.h}" loading="lazy"></figure>
    ${e.real ? `<span class="sc-credit mono">${esc(e.credit)}</span>` : ''}
    <div class="sc-body"><span class="sc-index mono">${String(i + 1).padStart(2, '0')} / ${String(EMISSIONS.length).padStart(2, '0')}</span><h3 class="sc-name">${esc(e.nom)}</h3><p class="sc-hosts">avec ${esc(e.animateurs)}</p></div>
  </${tag}>`;
}
function renderDynamic(page) {
  const track = $('[data-hscroll-track]');
  if (track) track.innerHTML = EMISSIONS.map((e, i) => showCard(e, i, 'a')).join('') + `<a class="show-card is-more" href="emissions.html" data-link data-cursor-label="Voir"><span class="mono">Grille &amp; émissions</span><h3 class="sc-name">Toute la semaine sur l'antenne →</h3></a>`;
  const grid = $('[data-show-grid]');
  if (grid) grid.innerHTML = EMISSIONS.map((e, i) => showCard(e, i)).join('');
  const ag = $('[data-agenda]');
  if (ag) {
    const today = new Date().toISOString().slice(0, 10);
    const items = [...AGENDA].sort((a, b) => a.date.localeCompare(b.date));
    const up = items.filter((x) => x.date >= today), past = items.filter((x) => x.date < today).reverse();
    const row = (x, isPast) => { const d = new Date(x.date + 'T12:00:00'); return `<div class="ag-item${isPast ? ' is-past' : ''}"><span class="ag-date">${d.getDate()}<small>${d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</small></span><div><strong>${esc(x.titre)}</strong><p class="mono">${esc(x.lieu || '')}${x.heure ? ' · ' + esc(x.heure) : ''}${isPast ? ' · passé' : ''}</p></div></div>`; };
    ag.innerHTML = (up.length ? up.map((x) => row(x, false)).join('') : `<div class="ag-empty"><strong>Aucun rendez-vous annoncé</strong><p>Pas d'événement prévu pour le moment. Les prochaines dates seront annoncées sur Instagram, @radiosurffm.</p></div>`) + past.map((x) => row(x, true)).join('');
  }
}

/* ---------- Ouvertures : titre qui surfe ---------- */
function surfTitle(el, delay = 0) {
  const targets = el.querySelector('.ht-main') ? [el.querySelector('.ht-main'), el.querySelector('.ht-plus')] : [el];
  const split = new SplitText(targets, { type: 'words,chars', wordsClass: 'w', charsClass: 'char' });
  const chars = split.chars;
  gsap.from(chars, {
    yPercent: (i) => 115 + 45 * Math.sin(i * 0.9), rotation: (i) => 9 * Math.sin(i * 0.9 + 1), opacity: 0,
    duration: 1.25, ease: 'expo.out', stagger: 0.05, delay,
  });
  if (finePointer) {
    const onMove = (e) => {
      chars.forEach((c) => {
        const r = c.getBoundingClientRect(), d = (e.clientX - (r.left + r.width / 2)) / 160;
        gsap.to(c, { y: -Math.exp(-d * d) * (r.height * 0.07), duration: 0.6, ease: 'power3.out' });
      });
    };
    const onLeave = () => gsap.to(chars, { y: 0, duration: 0.9, ease: 'elastic.out(1, 0.35)' });
    el.addEventListener('pointermove', onMove, sig()); el.addEventListener('pointerleave', onLeave, sig());
  }
  return split;
}
function initHeroes(main, page, calm, fromNav) {
  const title = $('[data-surf-title]', main), fades = $$('[data-hero-fade]', main);
  const heroImg = $('.hero-media img, .page-hero-media img', main);
  const hero = $('.hero, .page-hero', main);
  if (calm) return;
  const start = () => {
    const delay = fromNav ? 0.35 : 0.1;
    if (heroImg) gsap.fromTo(heroImg, { scale: 1.14 }, { scale: 1, duration: 2.6, ease: 'expo.out', delay: delay - 0.1 });
    if (title) surfTitle(title, delay);
    if (fades.length) gsap.from(fades, { y: 26, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: delay + 0.45 });
  };
  if (!fromNav && loaderPromise) loaderPromise.then(start); else start();
  if (hero) {
    const inner = $('.hero-inner, .page-hero-inner', hero);
    gsap.to(inner, { yPercent: -18, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    if (heroImg) gsap.to(heroImg.closest('picture'), { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }
}

/* ---------- Révélations ---------- */
function initReveals(main, calm) {
  if (calm) return;
  $$('[data-tide]', main).forEach((el) => {
    el.classList.add('is-masked');
    el.style.setProperty('--tide', '0%');
    const img = $('img', el);
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => {
        gsap.to(o, { v: 100, duration: 1.6, ease: 'power3.out', onUpdate: () => el.style.setProperty('--tide', o.v + '%'), onComplete: () => el.classList.remove('is-masked') });
        if (img) gsap.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 2, ease: 'expo.out' });
      },
    });
  });
  $$('[data-parallax]', main).forEach((img) => {
    gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-parallax-bg]', main).forEach((img) => {
    if (img.closest('.page-hero')) return;
    gsap.fromTo(img, { yPercent: -10 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('section'), start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-split-reveal]', main).forEach((h) => {
    const s = new SplitText(h, { type: 'lines', mask: 'lines', linesClass: 'line' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });
  $$('[data-words]', main).forEach((p) => {
    const s = new SplitText(p, { type: 'words', wordsClass: 'word' });
    gsap.fromTo(s.words, { opacity: 0.3 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: p, start: 'top 78%', end: 'bottom 45%', scrub: true } });
    gsap.fromTo(s.words, { color: '#d9cf14' }, { color: '#eaf4f4', ease: 'none', stagger: 0.1, scrollTrigger: { trigger: p, start: 'top 70%', end: 'bottom 35%', scrub: true } });
  });
  $$('[data-count]', main).forEach((el) => {
    const n = Number(el.dataset.count), suffix = el.dataset.suffix || '', o = { v: 0 };
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 2.2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('fr-FR') + suffix) }) });
  });
  const cards = $$('.tilt-card, .support-card, .steps li, .faq-item, .legal-block, .counter, .team-list li', main);
  cards.forEach((c) => gsap.from(c, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: c, start: 'top 92%', once: true } }));
  $$('[data-show-grid] .show-card', main).forEach((c, i) => gsap.from(c, { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out', delay: (i % 3) * 0.08, clearProps: 'transform,opacity', scrollTrigger: { trigger: c, start: 'top 94%', once: true } }));
}

/* ---------- Cadran d'accord ---------- */
function initCadran(main, calm) {
  const cad = $('[data-cadran]');
  if (!cad) return;
  const stations = $$('[data-station]', main);
  let html = '<div class="cadran-scale">';
  for (let f = 875; f <= 1080; f += 5) {
    const p = (f - 875) / 205, major = f % 40 === 0 || f === 1080;
    html += `<span class="cadran-tick${major ? ' major' : ''}" style="top:${(p * 100).toFixed(2)}%"></span>`;
    if (major) html += `<span class="cadran-num" style="top:${(p * 100).toFixed(2)}%">${(f / 10).toFixed(0)}</span>`;
  }
  html += '<span class="cadran-dab">DAB+</span>';
  html += '</div><div class="cadran-needle" data-needle><span class="cadran-label" data-cadran-label></span></div>';
  cad.innerHTML = html;
  const needle = $('[data-needle]', cad), label = $('[data-cadran-label]', cad);
  const scale = $('.cadran-scale', cad);
  const markers = stations.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'cadran-station'; b.type = 'button'; b.tabIndex = -1; b.title = s.dataset.station;
    b.addEventListener('click', () => scrollToTarget(s));
    scale.appendChild(b);
    return { s, b, i };
  });
  let current = -1, tops = [];
  const pageTop = (el) => { const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el; return box.getBoundingClientRect().top + window.scrollY; };
  const place = () => {
    tops = stations.map(pageTop);
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    markers.forEach((m, i) => { m.b.style.top = Math.min(100, (tops[i] / max) * 100) + '%'; });
  };
  place();
  const ch = $('[data-cadran-h]'), chNeedle = $('[data-ch-needle]'), chLabel = $('[data-ch-label]');
  let chProgress = 0;
  const placeChip = () => { if (!ch || !ch.offsetWidth) return; const W = ch.offsetWidth, lw = chLabel.offsetWidth; chLabel.style.transform = `translateX(${Math.min(W - lw - 8, Math.max(8, chProgress * W - lw / 2)).toFixed(1)}px)`; };
  const setStation = (i) => {
    if (i === current) return;
    const first = current === -1;
    current = i;
    const name = stations[i]?.dataset.station || '';
    label.textContent = name;
    if (chLabel) chLabel.textContent = name;
    if (!first) staticPulse();
    if (!calm && !first) gsap.fromTo(label, { x: 12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
    if (chLabel && ch.offsetWidth && !first) { placeChip(); gsap.killTweensOf(chLabel); gsap.timeline().fromTo(chLabel, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: calm ? 0 : 0.35, ease: 'power2.out' }).to(chLabel, { opacity: 0, duration: calm ? 0 : 0.5, delay: 1.4 }); }
  };
  setStation(0);
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const H = cad.clientHeight;
      needle.style.transform = `translateY(${(self.progress * H).toFixed(1)}px)`;
      chProgress = self.progress;
      if (chNeedle && ch.offsetWidth) chNeedle.style.transform = `translateX(${(self.progress * (ch.offsetWidth - 2)).toFixed(1)}px)`;
      const probe = window.scrollY + window.innerHeight * 0.42;
      let idx = 0; tops.forEach((t, i) => { if (t <= probe) idx = i; });
      setStation(idx);
    },
    onRefresh: place,
  });
}

/* ---------- Cartes inclinées ---------- */
function initTilt(main, calm) {
  if (calm || !finePointer) return;
  $$('[data-tilt]', main).forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add('is-tilting');
      card.style.setProperty('--ry', ((x - 0.5) * 12).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--gx', x * 100 + '%'); card.style.setProperty('--gy', y * 100 + '%');
    }, sig());
    card.addEventListener('pointerleave', () => { card.classList.remove('is-tilting'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); }, sig());
  });
}

/* ---------- Formulaires simulés ---------- */
function initForms(main) {
  $$('[data-form]', main).forEach((form) => {
    const msg = $('[data-form-msg]', form);
    if (form.dataset.form === 'don') {
      const libre = $('[data-libre]', form), out = $('[data-don-amount]', form), gauge = $('[data-gauge]', form);
      const update = () => {
        const v = form.querySelector('input[name="montant"]:checked')?.value;
        libre.hidden = v !== 'libre';
        const amount = v === 'libre' ? Number($('input', libre).value) || 0 : Number(v);
        out.textContent = amount ? amount + ' €' : '';
        gauge.style.width = Math.min(100, Math.max(6, amount * 1.6)) + '%';
      };
      form.addEventListener('change', update, sig()); form.addEventListener('input', update, sig()); update();
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.classList.remove('is-error');
      $$('.field', form).forEach((f) => f.classList.remove('is-error'));
      const bad = $$('input[required], textarea[required]', form).filter((i) => !i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value)));
      const type = form.dataset.form;
      if (type === 'don') {
        const v = form.querySelector('input[name="montant"]:checked')?.value;
        const amount = v === 'libre' ? Number($('[data-libre] input', form).value) : Number(v);
        if (!amount || amount < 1) { msg.textContent = 'Indiquez un montant d\'au moins 1 €.'; msg.classList.add('is-error'); return; }
        msg.textContent = `Merci ! Don de ${amount} € simulé : aucun paiement n'a été effectué.`;
        return;
      }
      if (bad.length) {
        bad.forEach((i) => i.closest('.field')?.classList.add('is-error'));
        msg.textContent = type === 'benevole' ? 'Indiquez une adresse e-mail valide pour qu\'on puisse vous répondre.' : 'Indiquez votre prénom et votre message.';
        msg.classList.add('is-error'); bad[0].focus(); return;
      }
      msg.textContent = type === 'benevole' ? 'Merci ! Proposition notée (démo : rien n\'a été envoyé).' : 'Dédicace prête pour l\'antenne (démo : rien n\'a été envoyé).';
      form.reset();
    }, sig());
  });
}
function initCopy(main) {
  $$('[data-copy]', main).forEach((btn) => {
    btn.addEventListener('click', () => {
      const txt = $('[data-copy-text]', btn.parentElement);
      const done = () => { btn.textContent = 'Copié'; setTimeout(() => (btn.textContent = 'Copier'), 1800); };
      const fallback = () => { const r = document.createRange(); r.selectNodeContents(txt); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Sélectionné'; setTimeout(() => (btn.textContent = 'Copier'), 1800); };
      try { navigator.clipboard.writeText(txt.textContent.trim()).then(done, fallback); } catch (e) { fallback(); }
    }, sig());
  });
}

/* ---------- Accueil : houle WebGL ---------- */
function initHoule(main, calm) {
  const canvas = $('[data-houle]', main), hero = $('[data-hero]', main);
  if (!canvas) return;
  houle = createHoule(canvas, { horizon: window.innerWidth < 700 ? 0.5 : 0.56, still: calm });
  if (calm) { houle.renderOnce(); return; }
  const io = new IntersectionObserver(([en]) => (en.isIntersecting ? houle?.start() : houle?.stop()));
  (loaderPromise || Promise.resolve()).then(() => { if (houle) io.observe(hero); });
  const onMove = (e) => { const r = hero.getBoundingClientRect(); houle?.setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, true); };
  const onLeave = () => houle?.setPointer(0.5, 0.5, false);
  hero.addEventListener('pointermove', onMove, sig()); hero.addEventListener('pointerleave', onLeave, sig());
  document.addEventListener('visibilitychange', () => (document.hidden ? houle?.stop() : houle?.start()), sig());
  cleanups.push(() => io.disconnect());
}

/* ---------- Accueil : émissions à l'horizontale ---------- */
function initShowsScroll(main, calm) {
  const section = $('[data-hscroll]', main), track = $('[data-hscroll-track]', main);
  if (!section || !track || calm) return;
  mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    track.classList.add('is-pinned');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 60);
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
    $$('.show-card img', track).forEach((img) => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: () => '+=' + dist(), scrub: true } }));
    return () => track.classList.remove('is-pinned');
  });
}

/* ---------- Accueil : frise qui se dessine ---------- */
function initTimeline(main, calm) {
  const ol = $('[data-timeline]', main), path = $('[data-timeline-path]', main);
  if (!ol || !path) return;
  const draw = () => { const h = ol.offsetHeight; path.setAttribute('d', `M2 0 L2 ${h}`); path.parentNode.setAttribute('viewBox', `0 0 4 ${h}`); path.style.strokeDasharray = h; return h; };
  const h = draw();
  if (calm) { path.style.strokeDashoffset = 0; return; }
  gsap.fromTo(path, { strokeDashoffset: h }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: ol, start: 'top 70%', end: 'bottom 70%', scrub: true, onRefresh: () => { const hh2 = draw(); gsap.set(path, { strokeDasharray: hh2 }); } } });
  $$('.tl-year', ol).forEach((y) => gsap.from(y, { xPercent: -20, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: y, start: 'top 85%', once: true } }));
}

/* ---------- Émissions : grille ---------- */
function initGrille(main) {
  const daysEl = $('[data-days]', main), slotsEl = $('[data-grille-slots]', main), hoursEl = $('[data-grille-hours]', main);
  const cursorEl = $('[data-grille-cursor]', main), nowEl = $('[data-grille-now]', main), scroller = $('[data-grille-scroll]', main);
  if (!daysEl) return;
  const PX = 100;
  hoursEl.innerHTML = Array.from({ length: 24 }, (_, h) => `<span style="left:${h * PX}px">${hh(h)}</span>`).join('');
  const now = parisNow();
  daysEl.innerHTML = JOURS.map((j, i) => `<button class="day-btn" type="button" role="tab" id="jour-${i}" aria-selected="${i === now.day}" data-day="${i}">${j.slice(0, 3)}${i === now.day ? ' <span class="today">· auj.</span>' : ''}</button>`).join('');
  const render = (d) => {
    const n = parisNow(), isToday = d === n.day;
    slotsEl.innerHTML = GRILLE[d].map((s) => {
      const im = imgSet(s.img), on = isToday && n.hour >= s.de && n.hour < s.a;
      return `<div class="slot${on ? ' is-now' : ''}${s.a - s.de <= 1 ? ' is-short' : ''}" style="left:${s.de * PX + 3}px;width:${(s.a - s.de) * PX - 6}px;--slot-img:url('${new URL(im.src, location.href).href}')"><span class="slot-time">${hh(s.de)} – ${hh(s.a)}</span><span class="slot-name">${esc(s.nom)}</span></div>`;
    }).join('');
    cursorEl.hidden = !isToday;
    cursorEl.style.left = n.hour * PX + 'px';
    const cur = GRILLE[d].find((s) => n.hour >= s.de && n.hour < s.a);
    nowEl.innerHTML = isToday ? `<span class="live-dot"></span> Maintenant, ${JOURS[d].toLowerCase()} ${n.label} : <b>${esc(cur.nom)}</b> jusqu'à ${hh(cur.a)}` : `Grille du ${JOURS[d].toLowerCase()}`;
    $$('[data-day]', daysEl).forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.day) === d)));
    if (isToday) scroller.scrollLeft = Math.max(0, n.hour * PX - scroller.clientWidth * 0.35);
    if (!isCalm() && animate) gsap.from($$('.slot', slotsEl), { y: 36, opacity: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity' });
  };
  let animate = false;
  daysEl.addEventListener('click', (e) => { const b = e.target.closest('[data-day]'); if (b) render(Number(b.dataset.day)); }, sig());
  daysEl.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const btns = $$('[data-day]', daysEl), i = btns.indexOf(document.activeElement);
    const j = (i + (e.key === 'ArrowRight' ? 1 : -1) + 7) % 7; btns[j].focus(); render(j);
  }, sig());
  render(now.day);
  animate = true;
  if (!isCalm()) ScrollTrigger.create({ trigger: scroller, start: 'top 85%', once: true, onEnter: () => { gsap.from($$('.slot', slotsEl), { y: 50, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' }); gsap.from(cursorEl, { scaleY: 0, transformOrigin: 'top', duration: 1, ease: 'expo.out', delay: 0.3 }); } });
  // Glisser pour faire défiler la frise
  let down = false, sx = 0, sl = 0;
  scroller.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = scroller.scrollLeft; scroller.classList.add('is-drag'); }, sig());
  window.addEventListener('pointerup', () => { down = false; scroller.classList.remove('is-drag'); }, sig());
  scroller.addEventListener('pointermove', (e) => { if (down) scroller.scrollLeft = sl - (e.clientX - sx); }, sig());
  scroller.dataset.cursorLabel = 'Glisser';
  const timer = setInterval(() => { const sel = $$('[data-day]', daysEl).findIndex((b) => b.getAttribute('aria-selected') === 'true'); render(sel); updateNowPlaying(); }, 60000);
  cleanups.push(() => clearInterval(timer));
}

/* ---------- Émissions : loupe sur le trombinoscope ---------- */
function initLoupe(main) {
  const fig = $('[data-loupe]', main);
  if (!fig || !finePointer) return;
  const img = $('img', fig), lens = $('[data-loupe-lens]', fig), Z = 2.4;
  fig.addEventListener('pointerenter', () => { fig.classList.add('is-on'); cursor?.style.setProperty('visibility', 'hidden'); lens.style.backgroundImage = `url('${img.currentSrc || img.src}')`; }, sig());
  fig.addEventListener('pointerleave', () => { fig.classList.remove('is-on'); cursor?.style.removeProperty('visibility'); }, sig());
  fig.addEventListener('pointermove', (e) => {
    const r = img.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    lens.style.left = x + 'px'; lens.style.top = y + 'px';
    lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
    lens.style.backgroundPosition = `${-(x * Z - 90)}px ${-(y * Z - 90)}px`;
  }, sig());
}

/* ---------- Nous capter : carte ---------- */
function initMap(main, calm) {
  const svg = $('[data-map-svg]', main);
  if (!svg) return;
  $$(':scope > :not(title):not(desc)', svg).forEach((n) => n.remove());
  const k = 1207.5, cosL = 0.725, ox = 28;
  const P = ([lat, lon]) => [ox + (lon + 1.92) * cosL * k, (43.8 - lat) * k];
  const pts = (arr) => arr.map((c) => P(c).map((v) => v.toFixed(1)).join(',')).join(' ');
  const coast = [[43.84, -1.402], [43.8, -1.412], [43.75, -1.425], [43.7, -1.44], [43.665, -1.446], [43.64, -1.452], [43.595, -1.466], [43.57, -1.478], [43.545, -1.492], [43.528, -1.52], [43.515, -1.533], [43.5, -1.54], [43.488, -1.552], [43.483, -1.562], [43.476, -1.568], [43.465, -1.574], [43.45, -1.584], [43.435, -1.6], [43.42, -1.616], [43.405, -1.64], [43.393, -1.662], [43.39, -1.68], [43.385, -1.7], [43.378, -1.735], [43.375, -1.765], [43.372, -1.783], [43.385, -1.792], [43.39, -1.8], [43.375, -1.84], [43.355, -1.89], [43.34, -1.99]];
  const land = [...coast, [43.24, -1.99], [43.24, -1.18], [43.84, -1.18]];
  const adour = [[43.528, -1.52], [43.515, -1.5], [43.495, -1.478], [43.5, -1.44], [43.52, -1.4], [43.53, -1.34]];
  const towns = [
    { n: 'Soorts-Hossegor · studio FM', c: [43.665, -1.41], key: true, side: 'l' },
    { n: 'Capbreton', c: [43.642, -1.43] },
    { n: 'Bayonne', c: [43.493, -1.475] },
    { n: 'Biarritz', c: [43.483, -1.558], side: 'l', dy: 6 },
    { n: 'Saint-Jean-de-Luz', c: [43.388, -1.663] },
    { n: 'Hendaye', c: [43.358, -1.774], dy: 4 },
    { n: 'La Rhune · DAB+', c: [43.309, -1.636], key: true, mast: true },
  ];
  const [hx, hy] = P([43.665, -1.41]), [rx, ry] = P([43.309, -1.636]);
  const [dx, dy] = P([43.45, -1.6]);
  let s = '';
  s += `<rect class="map-sea" x="-40" y="-20" width="680" height="680"/>`;
  for (let i = 0; i < 9; i++) { const y = 60 + i * 64; s += `<path class="map-swell" d="M-20 ${y} Q 40 ${y - 10} 100 ${y} T 220 ${y}" />`; }
  s += `<polygon class="map-land" points="${pts(land)}"/>`;
  s += `<polyline class="map-coast" points="${pts(coast)}" data-coast/>`;
  s += `<polyline class="map-river" points="${pts(adour)}"/>`;
  s += `<g data-cov-layer="dab"><ellipse class="map-zone-dab" cx="${dx}" cy="${dy}" rx="150" ry="250" transform="rotate(-24 ${dx} ${dy})"/>${[0, 1, 2].map((i) => `<circle class="map-ring dab" cx="${rx}" cy="${ry}" r="20" data-ring="${i}"/>`).join('')}</g>`;
  s += `<g data-cov-layer="fm"><circle class="map-zone-fm" cx="${hx}" cy="${hy}" r="96"/>${[0, 1, 2].map((i) => `<circle class="map-ring fm" cx="${hx}" cy="${hy}" r="14" data-ring="${i}"/>`).join('')}</g>`;
  towns.forEach((t) => {
    const [x, y] = P(t.c);
    s += `<g class="map-town${t.key ? ' is-key' : ''}" data-town>`;
    if (t.mast) s += `<g class="map-mast"><path d="M${x} ${y - 22} L${x - 7} ${y} M${x} ${y - 22} L${x + 7} ${y} M${x - 4} ${y - 10} L${x + 4} ${y - 10}"/></g>`;
    const left = t.side === 'l';
    s += `<circle cx="${x}" cy="${y}" r="${t.key ? 5 : 3.5}"/><text x="${left ? x - 12 : x + 12}" y="${y + 5 + (t.dy || 0)}" text-anchor="${left ? 'end' : 'start'}">${esc(t.n)}</text></g>`;
  });
  s += `<text class="map-label-sea" transform="translate(60 520) rotate(-90)">OCÉAN ATLANTIQUE</text>`;
  s += `<g transform="translate(556 40)"><path d="M0 18 L0 -8 M-6 0 L0 -10 L6 0" stroke="currentColor" fill="none" style="color:var(--mist)" stroke-width="1.5"/><text class="map-north" x="-4" y="34">N</text></g>`;
  svg.insertAdjacentHTML('beforeend', s);
  const coastEl = $('[data-coast]', svg);
  const L = coastEl.getTotalLength ? coastEl.getTotalLength() : 1200;
  if (!calm) {
    gsap.set(coastEl, { strokeDasharray: L, strokeDashoffset: L });
    const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 75%', once: true } });
    tl.to(coastEl, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' })
      .from($$('[data-town]', svg), { opacity: 0, y: 8, stagger: 0.08, duration: 0.6, ease: 'power2.out' }, 0.8)
      .from($$('.map-zone-fm, .map-zone-dab', svg), { scale: 0.6, opacity: 0, transformOrigin: '50% 50%', duration: 1.4, ease: 'expo.out', stagger: 0.2 }, 1.2);
    $$('[data-ring]', svg).forEach((r) => {
      const big = r.classList.contains('dab') ? 230 : 110;
      gsap.fromTo(r, { attr: { r: 8 }, opacity: 0.9 }, { attr: { r: big }, opacity: 0, duration: 4, ease: 'none', repeat: -1, delay: Number(r.dataset.ring) * 1.33 });
    });
  } else { $$('[data-ring]', svg).forEach((r) => r.remove()); }
  $$('[data-cov]', main).forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on);
    $(`[data-cov-layer="${b.dataset.cov}"]`, svg)?.classList.toggle('is-off', !on);
  }, sig()));
}

/* ---------- Nous capter : FM contre DAB+ ---------- */
function initCompare(main, calm) {
  const canvas = $('[data-compare-wave]', main), range = $('[data-compare-range]', main);
  if (!canvas) return;
  const lblF = $('[data-cmp-fm]', main), lblD = $('[data-cmp-dab]', main);
  let t = 0, raf = 0, visible = false;
  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    const v = Number(range.value) / 100, noise = Math.pow(1 - v, 1.4);
    lblF.classList.toggle('is-active', v < 0.5); lblD.classList.toggle('is-active', v >= 0.5);
    c.strokeStyle = 'rgba(234,244,244,.1)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
    // grésillement FM
    if (noise > 0.02) {
      c.fillStyle = `rgba(234,244,244,${0.22 * noise})`;
      const seed = Math.floor(t * 8);
      for (let i = 0; i < 180 * noise; i++) { const r1 = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453, r2 = Math.sin(i * 39.346 + seed * 11.135) * 24634.6345; c.fillRect((r1 - Math.floor(r1)) * w, (r2 - Math.floor(r2)) * h, 1.5, 1.5); }
    }
    c.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const p = x / w;
      let y = Math.sin(p * 18 + t * 2.2) * 0.38 + Math.sin(p * 41 - t * 3.1) * 0.18 + Math.sin(p * 7 + t) * 0.22;
      y += (Math.sin(p * 310 + t * 23) * 0.5 + Math.sin(p * 733 - t * 41) * 0.35) * 0.9 * noise;
      if (v > 0.6) y = Math.round(y * 14) / 14;
      const yy = h / 2 - y * h * 0.36;
      x === 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
    }
    c.strokeStyle = v >= 0.5 ? '#d9cf14' : '#eaf4f4'; c.lineWidth = 2; c.stroke();
  };
  const loop = () => { t += 0.016; draw(); if (visible && !calm) raf = requestAnimationFrame(loop); };
  range.addEventListener('input', () => { if (calm || !visible) draw(); }, sig());
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; cancelAnimationFrame(raf); if (visible && !calm) loop(); else draw(); });
  io.observe(canvas);
  draw();
  cleanups.push(() => { io.disconnect(); cancelAnimationFrame(raf); });
}

/* ---------- 404 : hors fréquence ---------- */
function initLost(main, calm) {
  const cv = $('[data-lost-static]', main);
  if (!cv) return;
  cv.width = 192; cv.height = 108;
  const c = cv.getContext('2d'), img = c.createImageData(192, 108);
  const paint = () => { for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } c.putImageData(img, 0, 0); };
  paint();
  if (calm) return;
  const timer = setInterval(paint, 160);
  cleanups.push(() => clearInterval(timer));
}

/* ---------- Ouverture orchestrée (premier chargement) ---------- */
let loaderPromise = null;
function runLoader() {
  const el = $('[data-loader]');
  if (!el) return Promise.resolve();
  if (isCalm()) { el.remove(); return Promise.resolve(); }
  let quick = false;
  try { quick = sessionStorage.getItem('surffm-seen') === '1'; sessionStorage.setItem('surffm-seen', '1'); } catch (e) {}
  const canvas = $('[data-loader-line]', el), freq = $('[data-loader-freq]', el), unit = $('[data-loader-unit]', el);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const o = { amp: 0, f: 87.5, t: 0 };
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const draw = () => {
    c.clearRect(0, 0, w, h);
    for (let k = 0; k < 3; k++) {
      c.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const p = x / w, env = Math.sin(p * Math.PI);
        const y = h / 2 + Math.sin(p * 14 - o.t * 5 + k) * o.amp * env * (1 - k * 0.3) * 50 + Math.sin(p * 37 + o.t * 3) * o.amp * env * 8;
        x === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
      }
      c.strokeStyle = k === 0 ? '#d9cf14' : `rgba(234,244,244,${0.5 - k * 0.15})`; c.lineWidth = k === 0 ? 2 : 1; c.stroke();
    }
  };
  return new Promise((res) => {
    const tl = gsap.timeline({ onUpdate: () => { o.t += 0.016; draw(); }, onComplete: () => el.remove() });
    const d = quick ? 0.5 : 1.2;
    tl.to(o, { amp: 1, duration: d * 0.6, ease: 'power2.out' }, 0)
      .to(o, { f: 108, duration: d, ease: 'power2.inOut', onUpdate: () => (freq.textContent = o.f.toFixed(1)) }, 0)
      .add(() => { freq.textContent = 'DAB+'; unit.textContent = 'Surf FM'; }, d)
      .add(res, d + (quick ? 0.05 : 0.25))
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 0.75, ease: 'expo.inOut' }, d + (quick ? 0.05 : 0.25));
    gsap.set(el, { clipPath: 'inset(0 0 0% 0)' });
  });
}

/* ---------- Démarrage ---------- */
loaderPromise = runLoader();
startLenis();
setVeil(edge(110, 0, 0), edge(110, 0, 0));
try { history.scrollRestoration = 'manual'; } catch (e) {}
initPage(false);
if (location.hash) setTimeout(() => scrollToTarget(location.hash, true), 200);
setInterval(updateNowPlaying, 30000);
window.addEventListener('load', () => ScrollTrigger.refresh());
