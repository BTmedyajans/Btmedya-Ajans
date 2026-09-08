/* BTMEDYA yeni anasayfa
   Mühendislik standardı: .claude/skills/10k-websites/references/scrub-pipeline.md
   Saf JavaScript. Kütüphane yok. */
(function () {
  'use strict';

  /* ---------------- Yapılandırma ---------------- */
  var VIDEO_URL   = 'assets/hero-scrub.mp4';
  var POSTER_URL  = 'assets/hero-poster.jpg';
  // Video henüz üretilmedi. Üretilene kadar hero mevcut bir marka görselini
  // poster olarak kullanır, böylece sayfa şimdi de eksiksiz görünür.
  var POSTER_FALLBACK = '../assets/btmedya-ai-network_e70bec13_b99f79b3.webp';
  var VIDEO_BYTES = 5200000;   // gerçek bayt boyutu video geldiğinde yazılacak

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
        video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
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
    disableScrub();
  }
  function unpinFinalStates() {
    document.body.classList.remove('rm');
    $$('.scan i').forEach(function (i) { i.style.width = ''; });
  }
  function onRM(e) {
    if (e.matches) pinToFinalStates();
    else { unpinFinalStates(); applyHeroMode(); }
  }
  if (rmq.addEventListener) rmq.addEventListener('change', onRM);
  else if (rmq.addListener) rmq.addListener(onRM);

  /* ---------------- Giriş koreografisi ---------------- */
  function setupEntrances() {
    if (!('IntersectionObserver' in window)) {
      $$('.sec').forEach(function (s) { s.classList.add('in', 'done'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
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
  setupForm();
  setupMenu();
  applyHeroMode();
  if (rmq.matches) pinToFinalStates();
})();
