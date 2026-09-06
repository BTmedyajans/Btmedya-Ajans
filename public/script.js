(() => {
  'use strict';

  const $ = (s, ctx) => (ctx || document).querySelector(s);
  const $$ = (s, ctx) => Array.from((ctx || document).querySelectorAll(s));

  /* ---------- Kırık medyayı sessizce gizle ---------- */
  function guardMedia() {
    $$('img, video').forEach((el) => {
      const hide = () => { el.style.opacity = '0'; el.style.pointerEvents = 'none'; };
      el.addEventListener('error', hide, { once: true });
      if (el.tagName === 'VIDEO') {
        el.addEventListener('stalled', () => {}, { once: true });
      }
    });
  }

  /* ---------- Preloader ---------- */
  function initPreloader() {
    const el = $('#preloader');
    if (!el) return;
    const done = () => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 600);
    };
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done, { once: true });
    setTimeout(done, 3500); // güvenlik ağı
  }

  /* ---------- Giriş video overlay ---------- */
  function initIntroOverlay() {
    const overlay = $('#introOverlay');
    if (!overlay) return;
    const finish = () => overlay.classList.add('done');
    const video = $('video', overlay);
    if (video) {
      video.addEventListener('ended', finish, { once: true });
      video.addEventListener('error', finish, { once: true });
    }
    overlay.addEventListener('click', finish);
    setTimeout(finish, 4000);
  }

  /* ---------- Mobil menü ---------- */
  function initMenu() {
    const toggle = $('.menu-toggle');
    const nav = $('.topbar nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('nav a', nav).forEach((a) => a.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- Sayfa kaydırma çubuğu ---------- */
  function initScrollProgress() {
    const bar = $('.page-progress > i');
    if (!bar) return;
    const update = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop || document.body.scrollTop;
      const max = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
      bar.style.width = max > 0 ? `${Math.min(100, (scrolled / max) * 100)}%` : '0%';
    };
    document.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Özel imleç (BT amblemi) ---------- */
  function initCursor() {
    if (window.matchMedia('(hover: none), (max-width: 900px)').matches) return;
    const cursor = document.createElement('div');
    cursor.className = 'cursor-logo';
    cursor.textContent = 'BT';
    document.body.appendChild(cursor);
    let shown = false;
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      if (!shown) { cursor.classList.add('show'); shown = true; }
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('show'));
    $$('a, button, input, textarea, select').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('magnet'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('magnet'));
    });
  }

  /* ---------- Hero kartları / kategori kapakları: hedefe kaydır ---------- */
  function initSectionNav() {
    const scrollToTarget = (selector) => {
      const target = selector && $(selector);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    $$('.hero-card').forEach((card) => {
      card.addEventListener('click', () => {
        $$('.hero-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        scrollToTarget(card.dataset.target);

        const category = card.dataset.category;
        const stateWrap = $('.hero-video-state');
        const stateVideo = $('#heroStateVideo');
        if (stateWrap && stateVideo && category) {
          const src = `/assets/media/web/state-${category}.mp4`;
          if (stateVideo.getAttribute('src') !== src) stateVideo.setAttribute('src', src);
          stateVideo.play().then(() => stateWrap.classList.add('ready')).catch(() => {});
        }
      });
    });

    $$('.category-cover').forEach((cover) => {
      cover.addEventListener('click', (e) => {
        e.preventDefault();
        scrollToTarget(cover.dataset.target);
      });
    });
  }

  /* ---------- Paket hesaplayıcı ---------- */
  function initPackages() {
    const inputs = $$('.package-options input[type="checkbox"]');
    const count = $('#packageCount');
    const text = $('#packageText');
    const wa = $('#packageWhatsapp');
    if (!inputs.length || !count || !text || !wa) return;

    const update = () => {
      const selected = inputs.filter((i) => i.checked).map((i) => i.dataset.package);
      count.textContent = String(selected.length);
      text.textContent = selected.length
        ? selected.join(', ')
        : 'Henüz seçim yapılmadı.';
      const base = 'Merhaba BTMEDYA, aşağıdaki hizmetler için teklif almak istiyorum: ';
      const msg = selected.length ? base + selected.join(', ') : 'Merhaba BTMEDYA, kendi paketimi oluşturmak istiyorum.';
      wa.href = `https://wa.me/905416401029?text=${encodeURIComponent(msg)}`;
    };

    inputs.forEach((i) => i.addEventListener('change', update));
    update();
  }

  /* ---------- Anasayfa haber kartları (statik arşivden) ---------- */
  async function initNewsPreview() {
    const grid = $('#newsGrid');
    if (!grid) return;
    try {
      const res = await fetch('/data/haberler.json');
      if (!res.ok) throw new Error('haberler.json alınamadı');
      const items = (await res.json())
        .filter((n) => !n.placeholder)
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .slice(0, 3);
      if (!items.length) return;
      grid.innerHTML = items.map((n) => `
        <article class="news-card">
          <small>${escapeHtml(n.category || 'BTMEDYA')}</small>
          <h3>${escapeHtml(n.title)}</h3>
          <p>${escapeHtml((n.excerpt || '').slice(0, 140))}</p>
        </article>`).join('');
      $$('.news-card', grid).forEach((card, idx) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          window.location.href = `/haberler/${items[idx].slug}.html`;
        });
      });
    } catch (err) {
      /* sessizce vazgeç: yer tutucu metin kalır */
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* ---------- Slot bazlı medya hidrasyonu (Media Vault) ---------- */
  async function hydrateSlot(selector, slot, attr = 'src') {
    const el = $(selector);
    if (!el) return;
    try {
      const res = await fetch(`/api/public/media?slot=${encodeURIComponent(slot)}&limit=1`);
      if (!res.ok) return;
      const { items } = await res.json();
      if (items && items[0]) el.setAttribute(attr, items[0].url);
    } catch {
      /* medya henüz yüklenmemiş olabilir, sessizce geç */
    }
  }

  function initMediaHydration() {
    hydrateSlot('.hero-bg-video source', 'hero', 'src');
    hydrateSlot('#characterVideo', 'karakter', 'src');
  }

  /* ---------- GSAP scrollytelling ---------- */
  function initScrollytelling() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heroScroll = $('.hero-scroll');
    if (heroScroll) {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: heroScroll, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      });
      tl.to('.scene-still-start', { opacity: 0, ease: 'none' }, 0)
        .to('.scene-still-end', { opacity: 1, ease: 'none' }, 0)
        .to('.hero-copy', { opacity: 0, y: -60, ease: 'none' }, 0.15)
        .to('.character-wrap', { scale: 1.08, ease: 'none' }, 0)
        .to('.scene-line > i', { width: '100%', ease: 'none' }, 0)
        .to('.focus-ring', { rotate: 45, ease: 'none' }, 0);
    }

    const rail = $('.service-rail');
    const pin = $('.services-pin');
    if (rail && pin && window.innerWidth > 900) {
      const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth + 100);
      gsap.to(rail, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    guardMedia();
    initPreloader();
    initIntroOverlay();
    initMenu();
    initScrollProgress();
    initCursor();
    initSectionNav();
    initPackages();
    initNewsPreview();
    initMediaHydration();
    initScrollytelling();
  });
})();
