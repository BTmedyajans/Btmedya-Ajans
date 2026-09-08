/* BTMEDYA yeni anasayfa
   Mühendislik standardı: .claude/skills/10k-websites/references/scrub-pipeline.md
   Saf JavaScript. Kütüphane yok. */
(function () {
  'use strict';

  /* ---------------- Yapılandırma ---------------- */
  var POSTER_URL  = 'assets/hero-poster.jpg';
  // Poster gerçek videonun ilk karesi. Yedek, poster hiç yüklenmezse devreye girer.
  var POSTER_FALLBACK = 'assets/btmedya-ai-network_e70bec13_b99f79b3.webp';

  /* Hero iki formatta yayınlanır. Tarayıcı hangisini gerçekten çözebiliyorsa
     yalnızca onu indirir; iki dosya birden hiçbir zaman inmez.
     WebM/VP9 daha küçük, H.264 evrensel yedek. */
  var KAYNAKLAR = [
    { url: 'assets/hero-scrub.webm', tip: 'video/webm; codecs="vp9"', bayt: 6936563 },
    { url: 'assets/hero-scrub.mp4',  tip: 'video/mp4; codecs="avc1.42E01E"', bayt: 8695277 }
  ];

  function kaynakSec() {
    var test = document.createElement('video');
    for (var i = 0; i < KAYNAKLAR.length; i++) {
      if (test.canPlayType(KAYNAKLAR[i].tip)) return KAYNAKLAR[i];
    }
    return KAYNAKLAR[KAYNAKLAR.length - 1];   // hiçbiri raporlamıyorsa mp4 dene
  }

  var SECILEN = kaynakSec();
  var VIDEO_URL   = SECILEN.url;
  var VIDEO_BYTES = SECILEN.bayt;

  /* Beş sabit hero kapısı. Bu dizeler style.css içindeki media sorgularıyla
     BİREBİR aynı olmak zorunda. */
  var GATES = [
    '(max-width:720px)',
    '(orientation:portrait) and (max-width:1024px)',
    '(orientation:portrait) and (pointer:coarse)',
    '(orientation:landscape) and (pointer:coarse) and (max-height:560px)',
    '(prefers-reduced-motion:reduce)'
  ];

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var stage  = $('#stage');
  var video  = $('#hero-video');
  var poster = $('#poster');
  var ring   = $('#ring');
  var heroEl = $('#hero');

  /* ---------------- Yardımcılar ---------------- */
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function smoothstep(p, e0, e1) {
    var t = clamp((p - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  /* Tohumlu üreteç: "rastgele" kaymalar her yüklemede aynı olsun */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { return (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  }

  /* ---------------- Metin bölme (yüklemede bir kez) ---------------- */
  function splitLines() {
    $$('#bands .line').forEach(function (el, bandIndex) {
      var text = el.textContent.trim();
      var mode = el.getAttribute('data-split') || 'word';
      var em   = el.getAttribute('data-em');
      var spread = parseFloat(el.getAttribute('data-spread') || '0.45');
      var rand = rng(9137 + bandIndex * 613);

      var sr = document.createElement('span');
      sr.className = 'sr';
      sr.textContent = text;

      var vis = document.createElement('span');
      vis.setAttribute('aria-hidden', 'true');

      var words = text.split(' ');
      var totalChars = text.replace(/\s/g, '').length;
      var charSeen = 0;

      words.forEach(function (word, wi) {
        var w = document.createElement('span');
        w.className = 'w';
        if (em && word.toLowerCase().indexOf(em.toLowerCase()) === 0) w.classList.add('em');
        w.style.setProperty('--th', (wi / Math.max(1, words.length) * spread + rand() * 0.05).toFixed(4));

        if (mode === 'char') {
          word.split('').forEach(function (ch) {
            var c = document.createElement('span');
            c.className = 'c';
            c.textContent = ch;
            c.style.setProperty('--th', (charSeen / Math.max(1, totalChars) * spread + rand() * 0.06).toFixed(4));
            c.style.setProperty('--jx', (10 + rand() * 16).toFixed(1) + 'px');
            charSeen++;
            w.appendChild(c);
          });
        } else {
          w.textContent = word;
        }
        vis.appendChild(w);
        if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
      });

      el.textContent = '';
      el.appendChild(sr);
      el.appendChild(vis);
    });
  }

  /* ---------------- Bantlar ---------------- */
  var bands = $$('#bands .band').map(function (el) {
    return {
      el: el,
      a: parseFloat(el.getAttribute('data-a')),
      b: parseFloat(el.getAttribute('data-b')),
      ramp: parseFloat(el.getAttribute('data-ramp') || '0') || 0,
      op: -1,
      k: -1
    };
  });

  var loadK = 0;              // bant 1'in tek seferlik yükleme rampası
  var loadStart = 0;

  function heroProgress() {
    if (!heroEl) return 0;
    var r = heroEl.getBoundingClientRect();
    var range = heroEl.offsetHeight - window.innerHeight;
    if (range <= 0) return 0;
    return clamp(-r.top / range, 0, 1);
  }

  function updateBands(p) {
    for (var i = 0; i < bands.length; i++) {
      var bd = bands[i];
      var f = Math.min(0.02, (bd.b - bd.a) / 3);
      var inFade  = (i === 0) ? 1 : smoothstep(p, bd.a, bd.a + f);
      var outFade = (i === bands.length - 1) ? 1 : (1 - smoothstep(p, bd.b - f, bd.b));
      var op = inFade * outFade;

      var ramp = bd.ramp || Math.min(0.025, (bd.b - bd.a) * 0.35);
      var k = clamp((p - bd.a) / ramp, 0, 1);
      if (i === 0) k = Math.max(k, loadK);

      /* DOM'a sadece değişimde yaz */
      if (Math.abs(op - bd.op) > 0.004) { bd.op = op; bd.el.style.opacity = op.toFixed(3); }
      if (Math.abs(k - bd.k) > 0.008)   { bd.k = k;  bd.el.style.setProperty('--k', k.toFixed(3)); }
    }
  }

  /* ---------------- Kapılı seek ---------------- */
  var seekBusy = false, pendingTime = null;
  function requestSeek(t) {
    if (!video || !video.duration) return;
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true;
    try { video.currentTime = t; } catch (e) { seekBusy = false; }
  }
  if (video) {
    video.addEventListener('seeked', function () {
      seekBusy = false;
      if (pendingTime !== null) { var t = pendingTime; pendingTime = null; requestSeek(t); }
    });
    video.addEventListener('error', function () { seekBusy = false; pendingTime = null; failVideo(); });
  }

  /* ---------------- Sürücü döngüsü ---------------- */
  var target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;

  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;

    if (loadStart && loadK < 1) {
      loadK = clamp((now - loadStart) / 900, 0, 1);
    }

    var k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));

    var settled = Math.abs(target - shown) < 0.0005;
    if (settled) { shown = target; }

    if (video && video.duration) requestSeek(shown * video.duration);
    updateBands(shown);

    if (settled && loadK >= 1) { rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
  }

  function kick() {
    if (rafId === null && heroOnScreen && scrubOn) rafId = requestAnimationFrame(tick);
  }
  function onScroll() { target = heroProgress(); kick(); }

  if (heroEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      heroOnScreen = es[0].isIntersecting;
      if (heroOnScreen) kick();
    }, { rootMargin: '120px' }).observe(heroEl);
  }

  /* ---------------- Blob yükleyici ---------------- */
  var heroInit = false;
  function initHeroOnce() {
    if (heroInit) return;
    heroInit = true;

    loadStart = performance.now();

    var img = new Image();
    var started = false;
    function startBlob() {
      if (started) return;
      started = true;
      loadHeroBlob().catch(failVideo);
    }
    img.onload = function () {
      poster.style.backgroundImage = "url('" + POSTER_URL + "')";
      startBlob();
    };
    img.onerror = function () {
      /* Gerçek poster henüz yok: geçici marka görselini kullan, sonra denemeye devam et */
      poster.style.backgroundImage = "url('" + POSTER_FALLBACK + "')";
      startBlob();
    };
    img.src = POSTER_URL;
    setTimeout(startBlob, 4000);
  }

  function loadHeroBlob() {
    if (!('fetch' in window) || !window.ReadableStream) return Promise.reject(new Error('desteklenmiyor'));
    var ctrl = new AbortController();
    var watchdog = setTimeout(function () { ctrl.abort(); }, 20000);

    var opts = { signal: ctrl.signal };
    try { opts.priority = 'low'; } catch (e) {}

    return fetch(VIDEO_URL, opts).then(function (res) {
      if (!res.ok || !res.body) throw new Error('HTTP ' + res.status);
      var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
      var reader = res.body.getReader();
      var chunks = [], got = 0, lastRing = 0;

      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          clearTimeout(watchdog);
          watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
          chunks.push(r.value);
          got += r.value.length;
          var frac = Math.min(1, got / total);
          var now = performance.now();
          if (now - lastRing > 100 || frac === 1) {
            lastRing = now;
            ring.style.setProperty('--ld', Math.round(126 * (1 - frac)));
          }
          return pump();
        });
      }

      return pump().then(function () {
        clearTimeout(watchdog);
        ring.style.setProperty('--ld', 0);
        video.src = URL.createObjectURL(new Blob(chunks, { type: SECILEN.tip.split(';')[0] }));
        video.load();
        video.addEventListener('canplay', function () {
          requestSeek(heroProgress() * video.duration);
          stage.classList.add('video-ready');
          onScroll();
        }, { once: true });
      });
    });
  }

  var failed = false;
  function failVideo() {
    if (failed) return;
    failed = true;
    if (ring && ring.parentNode) {
      var cue = document.createElement('div');
      cue.className = 'chev';
      cue.setAttribute('aria-hidden', 'true');
      cue.innerHTML = '<span>KAYDIR</span><i></i>';
      ring.parentNode.replaceChild(cue, ring);
    }
    stage.classList.add('video-failed');
  }

  /* ---------------- Beş kapı, canlı ---------------- */
  var scrubOn = false;
  var MQLS = GATES.map(function (q) { return window.matchMedia(q); });

  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    initHeroOnce();
    window.addEventListener('scroll', onScroll, { passive: true });
    bands.forEach(function (b) { b.op = -1; b.k = -1; });
    unpinFinalStates();
    updateBands(heroProgress());
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    window.removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    var gated = MQLS.some(function (m) { return m.matches; });
    if (gated) disableScrub(); else enableScrub();
  }
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else if (m.addListener) m.addListener(applyHeroMode);
  });

  /* ---------------- Azaltılmış hareket, iki yönlü ---------------- */
  var rmq = window.matchMedia('(prefers-reduced-motion:reduce)');
  function pinToFinalStates() {
    document.body.classList.add('rm');
    $$('.sec').forEach(function (s) { s.classList.add('in', 'done'); });
    $$('.scan i').forEach(function (i) { i.style.width = '100%'; });
    viewerFinalState();
    parallaxKapat();
    disableScrub();
  }
  function unpinFinalStates() {
    document.body.classList.remove('rm');
    $$('.scan i').forEach(function (i) { i.style.width = ''; });
  }
  function onRM(e) {
    if (e.matches) pinToFinalStates();
    else { unpinFinalStates(); applyHeroMode(); parallaxAc(); }
  }
  if (rmq.addEventListener) rmq.addEventListener('change', onRM);
  else if (rmq.addListener) rmq.addListener(onRM);

  /* ---------------- Giriş koreografisi ---------------- */
  var newsObserver = null;
  function setupEntrances() {
    if (!('IntersectionObserver' in window)) {
      $$('.sec').forEach(function (s) { s.classList.add('in', 'done'); });
      return;
    }
    var io = newsObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var s = en.target;
        s.classList.add('in');
        io.unobserve(s);
        /* Giriş bitince kademe gecikmelerini emekliye ayır,
           yoksa sonraki hover'lar sonsuza kadar gecikir. */
        setTimeout(function () { s.classList.add('done'); }, 1400);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    $$('.sec').forEach(function (s) { io.observe(s); });
  }

  /* ---------------- Kadraj köşeleri (imza öğesi) ---------------- */
  function drawKadraj() {
    $$('.kadraj').forEach(function (el) {
      if ($('svg', el)) return;
      var ns = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      ['M0 12 V0 H12', 'M88 0 H100 V12', 'M100 88 V100 H88', 'M12 100 H0 V88'].forEach(function (d) {
        var p = document.createElementNS(ns, 'path');
        p.setAttribute('d', d);
        p.setAttribute('vector-effect', 'non-scaling-stroke');
        p.style.setProperty('--len', '30');
        svg.appendChild(p);
      });
      el.insertBefore(svg, el.firstChild);
    });
  }

  /* ---------------- Etkileşimli an: kadrajı sürükle ---------------- */
  var viewer = $('#viewer'), frame = $('#frame'),
      readout = $('#readout'), meter = $('#meter'), hint = $('#hint');
  var figures = viewer ? $$('figure', viewer) : [];
  var visited = {}, lastIdx = -1;

  function setFramePos(pct) {
    if (!frame) return;
    pct = clamp(pct, 0.5, 68.5);
    frame.style.left = pct + '%';

    var idx = clamp(Math.round(pct / 34), 0, figures.length - 1);
    if (idx === lastIdx) return;
    lastIdx = idx;

    figures.forEach(function (f, i) { f.classList.toggle('active', i === idx); });

    var kaynak = figures[idx] ? figures[idx].getAttribute('data-kaynak') : 'ai';
    if (kaynak === 'gercek') {
      readout.textContent = 'GERÇEK ÇEKİM';
      readout.className = 'val real';
    } else if (kaynak === 'bos') {
      readout.textContent = 'GERÇEK ÇEKİM YUVASI';
      readout.className = 'val real';
    } else {
      readout.textContent = 'AI ÜRETİMİ';
      readout.className = 'val ai';
    }

    visited[idx] = true;
    var seen = Object.keys(visited).length;
    meter.style.width = (seen / figures.length * 100) + '%';
    if (seen >= figures.length && hint) {
      hint.textContent = 'HER KARENİN ETİKETİ VAR. SİTEDE DE, SİZİN İŞİNİZDE DE.';
    }
  }

  function viewerFinalState() {
    if (!viewer) return;
    figures.forEach(function (f, i) { visited[i] = true; });
    setFramePos(34);
    if (meter) meter.style.width = '100%';
    if (hint) hint.textContent = 'HER KARENİN ETİKETİ VAR. SİTEDE DE, SİZİN İŞİNİZDE DE.';
  }

  function setupViewer() {
    if (!viewer || !frame) return;
    var dragging = false;

    function pctFromEvent(e) {
      var r = viewer.getBoundingClientRect();
      var x = (e.clientX !== undefined ? e.clientX : 0) - r.left;
      return (x / r.width) * 100 - 15.5;   // kadrajı imlecin ortasına al
    }
    function down(e) {
      dragging = true;
      viewer.classList.add('dragging');
      viewer.setPointerCapture && e.pointerId !== undefined && viewer.setPointerCapture(e.pointerId);
      setFramePos(pctFromEvent(e));
    }
    function move(e) { if (dragging) setFramePos(pctFromEvent(e)); }
    function up() { dragging = false; viewer.classList.remove('dragging'); }

    viewer.addEventListener('pointerdown', down);
    viewer.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    viewer.addEventListener('pointercancel', up);

    /* Klavye erişimi */
    viewer.setAttribute('tabindex', '0');
    viewer.setAttribute('role', 'slider');
    viewer.setAttribute('aria-label', 'Kadrajı kaydırarak karenin kaynağını görün');
    viewer.addEventListener('keydown', function (e) {
      var cur = parseFloat(frame.style.left) || 0;
      if (e.key === 'ArrowRight') { setFramePos(cur + 17); e.preventDefault(); }
      if (e.key === 'ArrowLeft')  { setFramePos(cur - 17); e.preventDefault(); }
    });

    setFramePos(0.5);
  }

  /* ---------------- Medya kasası: portföy bölümünü besler ----------------
     /admin/ panelinden yüklenen, yayınlanan ve "portfoy" yuvasına atanan
     medya buraya düşer. Kasa boşsa sayfadaki mevcut kareler kalır, yani
     bölüm hiçbir koşulda boşalmaz. */
  function kasaEtiketi(x) {
    var t = (x.tags || []).map(function (v) { return String(v).toLowerCase(); });
    var gercek = t.indexOf('gercek') !== -1 || t.indexOf('gerçek') !== -1 ||
                 t.indexOf('gercek-cekim') !== -1 || (x.category || '') === 'gercek';
    return gercek ? { sinif: 'real', metin: 'GERÇEK ÇEKİM' } : { sinif: 'ai', metin: 'AI ÜRETİMİ' };
  }

  function kasaKarti(x) {
    var e = kasaEtiketi(x);
    var video = /^video\//.test(x.mime || '');
    var baslik = esc(x.title || x.original_name || '');
    var ust = esc((x.category || 'PORTFÖY').toUpperCase());
    var gorsel = video
      ? '<video src="' + esc(x.url) + '" muted loop playsinline preload="metadata"></video>'
      : '<img src="' + esc(x.url) + '" alt="' + esc(x.alt_text || x.title || '') + '" loading="lazy">';
    return '<figure class="work rise" data-parallax="0.05">' + gorsel +
           '<span class="tag ' + e.sinif + '">' + e.metin + '</span>' +
           '<figcaption class="work-cap"><small>' + ust + '</small><h4>' + baslik + '</h4></figcaption>' +
           '</figure>';
  }

  function setupKasa() {
    var grid = $('#isler .works');
    if (!grid) return;

    fetch('/api/public/media')
      .then(function (r) { if (!r.ok) throw new Error('kasa'); return r.json(); })
      .then(function (j) {
        var hepsi = (j && j.items) ? j.items : [];
        var yuva = hepsi.filter(function (x) { return (x.slot || '') === 'portfoy'; });
        if (!yuva.length) return;                 /* yuvada bir şey yoksa mevcut kareler kalır */
        yuva.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
        grid.innerHTML = yuva.slice(0, 6).map(kasaKarti).join('');
        collectParallax();
        var sec = $('#isler');
        if (sec.classList.contains('in')) {
          $$('.rise', sec).forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
        }
      })
      .catch(function () { /* kasa yoksa sayfa mevcut karelerle eksiksiz kalır */ });
  }

  /* ---------------- Showreel oynatıcı ----------------
     Otomatik oynatma yok. Ziyaretçi bastığında başlar, tekrar bastığında durur.
     Bir video başlayınca diğerleri durur; ekran dışına çıkan da durur. */
  function setupReels() {
    var reels = $$('.reel');
    if (!reels.length) return;

    function durdur(fig) {
      var v = $('video', fig);
      if (!v) return;
      v.pause();
      fig.classList.remove('playing');
      var b = $('.reel-btn', fig);
      if (b) b.setAttribute('aria-label', b.getAttribute('aria-label').replace('durdur', 'oynat'));
    }

    reels.forEach(function (fig) {
      var v = $('video', fig), btn = $('.reel-btn', fig);
      if (!v || !btn) return;
      btn.addEventListener('click', function () {
        if (fig.classList.contains('playing')) { durdur(fig); return; }
        reels.forEach(function (o) { if (o !== fig) durdur(o); });
        v.play().then(function () {
          fig.classList.add('playing');
          btn.setAttribute('aria-label', btn.getAttribute('aria-label').replace('oynat', 'durdur'));
        }).catch(function () { /* oynatma engellendi: kart sessizce durur */ });
      });
    });

    /* Ekran dışına çıkan video durur, boşuna kod çözülmez */
    if ('IntersectionObserver' in window) {
      var io2 = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (!e.isIntersecting) durdur(e.target); });
      }, { threshold: 0.15 });
      reels.forEach(function (f) { io2.observe(f); });
    }
    /* Sekme gizlenince hepsi durur */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) reels.forEach(durdur);
    });
  }

  /* ---------------- Form ---------------- */
  function setupForm() {
    var form = $('#lead-form'), msg = $('#form-msg'), btn = $('#submit-btn');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var body = {
        name: (fd.get('name') || '').toString().trim(),
        email: (fd.get('email') || '').toString().trim(),
        phone: (fd.get('phone') || '').toString().trim(),
        subject: (fd.get('subject') || '').toString().trim(),
        message: (fd.get('message') || '').toString().trim(),
        _honey: (fd.get('_honey') || '').toString()
      };

      if (!body.name || !body.email || !body.message) {
        msg.className = 'form-msg err';
        msg.textContent = 'Ad, e-posta ve mesaj zorunludur.';
        return;
      }

      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = 'GÖNDERİLİYOR...';

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.ok) {
          msg.className = 'form-msg ok';
          msg.textContent = 'Mesajınız bize ulaştı. Aynı gün dönüş yapacağız.';
          form.reset();
        } else {
          msg.className = 'form-msg err';
          /* Ucun kendi Türkçe hatasını göster, uydurma */
          msg.textContent = (res.j && res.j.error) ? res.j.error : "Mesaj gönderilemedi. WhatsApp'tan yazabilirsiniz.";
        }
      })
      .catch(function () {
        msg.className = 'form-msg err';
        msg.textContent = "Bağlantı kurulamadı. WhatsApp'tan yazabilirsiniz.";
      })
      .then(function () { btn.disabled = false; btn.textContent = original; });
    });
  }

  /* ---------------- Parallax: kıvrım altı derinlik ----------------
     Sadece transform kullanır, tek bir rAF içinde toplanır, ekran dışındaki
     öğelere dokunmaz. Azaltılmış hareket tercihinde tamamen kapanır. */
  var pxItems = [], pxRaf = null, pxOn = false;

  function collectParallax() {
    pxItems = $$('[data-parallax]').map(function (el) {
      return { el: el, hiz: parseFloat(el.getAttribute('data-parallax')) || 0.12, son: null };
    });
  }

  function pxDraw() {
    pxRaf = null;
    var vh = window.innerHeight;
    for (var i = 0; i < pxItems.length; i++) {
      var it = pxItems[i];
      var r = it.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;      /* ekran dışı: atla */
      var merkez = r.top + r.height / 2;
      var kayma = (merkez - vh / 2) * -it.hiz;
      var yuvarlak = Math.round(kayma * 10) / 10;
      if (yuvarlak === it.son) continue;                       /* değişmediyse yazma */
      it.son = yuvarlak;
      it.el.style.transform = 'translate3d(0,' + yuvarlak + 'px,0)';
    }
  }

  function pxTick() { if (pxRaf === null && pxOn) pxRaf = requestAnimationFrame(pxDraw); }

  function parallaxAc() {
    if (pxOn) return;
    pxOn = true;
    collectParallax();
    window.addEventListener('scroll', pxTick, { passive: true });
    window.addEventListener('resize', pxTick, { passive: true });
    pxDraw();
  }
  function parallaxKapat() {
    if (!pxOn) return;
    pxOn = false;
    window.removeEventListener('scroll', pxTick);
    window.removeEventListener('resize', pxTick);
    if (pxRaf !== null) { cancelAnimationFrame(pxRaf); pxRaf = null; }
    pxItems.forEach(function (it) { it.el.style.transform = ''; it.son = null; });
  }

  /* ---------------- Sahadan: canlı haber akışı ---------------- */
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  var AYLAR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
               'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  /* İki kaynak iki biçim veriyor: /api/news ISO tarih, data/haberler.json
     ise zaten "04 Ekim 2024" gibi hazır metin. İkisini de doğru okur. */
  function tarih(v) {
    if (!v) return '';
    var t = String(v).trim();
    for (var i = 0; i < AYLAR.length; i++) {
      if (t.indexOf(AYLAR[i]) !== -1) return t;   /* zaten Türkçe biçimde */
    }
    var d = new Date(t.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.getDate() + ' ' + AYLAR[d.getMonth()] + ' ' + d.getFullYear();
  }

  function altSatir(n) {
    var yazar = n.author ? esc(n.author) : '';
    var t = esc(tarih(n.published_at || n.original_date || n.created_at));
    return yazar && t ? yazar + ' · ' + t : (yazar || t);
  }

  function haberKarti(n) {
    var slug = n.slug ? '/haberler/' + encodeURIComponent(n.slug) + '.html' : '/haberler/';
    var kapak = n.cover_url
      ? '<img class="news-cover" src="' + esc(n.cover_url) + '" alt="" aria-hidden="true" loading="lazy">'
      : '';
    return '<a class="news-item' + (kapak ? ' has-cover' : '') + ' rise" href="' + slug + '">' +
           kapak +
           '<span class="kat">' + esc(n.category || 'HABER').toUpperCase() + '</span>' +
           '<h3>' + esc(n.title || 'Başlıksız haber') + '</h3>' +
           (n.excerpt ? '<p>' + esc(n.excerpt) + '</p>' : '') +
           '<time>' + altSatir(n) + '</time>' +
           '</a>';
  }

  function haberleriGoster(items, sec, grid) {
    if (!items || !items.length) return;         /* haber yoksa bölüm gizli kalır */
    grid.innerHTML = items.slice(0, 6).map(haberKarti).join('');
    sec.hidden = false;
    /* Bölüm sonradan geldi: giriş koreografisi onu da görsün */
    if (newsObserver) newsObserver.observe(sec);
    else { sec.classList.add('in'); setTimeout(function () { sec.classList.add('done'); }, 1400); }
    if (document.body.classList.contains('rm')) sec.classList.add('in', 'done');
  }

  function setupNews() {
    var sec = $('#haber'), grid = $('#news-grid');
    if (!sec || !grid) return;

    fetch('/api/news?limit=6')
      .then(function (r) { if (!r.ok) throw new Error('news'); return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !j.items || !j.items.length) throw new Error('bos');
        haberleriGoster(j.items, sec, grid);
      })
      .catch(function () {
        /* API ulaşılamadı ya da boş: statik arşiv dosyasına düş */
        fetch('data/haberler.json')
          .then(function (r) { if (!r.ok) throw new Error('yedek'); return r.json(); })
          .then(function (items) { haberleriGoster(items, sec, grid); })
          .catch(function () { /* ikisi de yok: bölüm gizli kalır, sayfa eksiksiz */ });
      });
  }

  /* ---------------- Menü ---------------- */
  function setupMenu() {
    var btn = $('.menu-btn'), nav = $('#ana-menu');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Sekme gizliyken durdur ---------------- */
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('paused', document.hidden);
    if (!document.hidden) kick();
  });

  /* ---------------- Başlat ---------------- */
  splitLines();
  drawKadraj();
  setupEntrances();
  setupViewer();
  setupReels();
  setupKasa();
  setupNews();
  setupForm();
  if (!rmq.matches) parallaxAc();
  setupMenu();
  applyHeroMode();
  if (rmq.matches) pinToFinalStates();
})();
