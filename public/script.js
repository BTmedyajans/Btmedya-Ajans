document.addEventListener('DOMContentLoaded',()=>{
  const pre=document.getElementById('preloader');
  setTimeout(()=>pre&&pre.classList.add('done'),450);

  // SAYFA ILERLEME CUBUGU: yalnizca deger degistiginde DOM'a yazar.
  const progressBar=document.querySelector('.page-progress i');
  if(progressBar){
    let lastPct=-1, ticking=false;
    const draw=()=>{
      ticking=false;
      const max=document.documentElement.scrollHeight-window.innerHeight;
      const pct=max>0?Math.round((window.scrollY/max)*1000)/10:0;
      if(pct===lastPct) return;
      lastPct=pct;
      progressBar.style.width=pct+'%';
    };
    addEventListener('scroll',()=>{
      if(ticking) return;
      ticking=true;
      requestAnimationFrame(draw);
    },{passive:true});
    draw();
  }

  // AGIR MEDYA KAPISI: telefon, dikey tablet, yan yatan telefon ve azaltilmis
  // hareket tercihinde hero videosu hic indirilmez, poster gorseli devralir.
  const HEAVY_MEDIA_GATES=[
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  const heavyMediaBlocked=()=>HEAVY_MEDIA_GATES.some(q=>window.matchMedia(q).matches);

  // Bir video etiketini yalnizca gercekten gerektiginde indirir.
  function loadVideo(v){
    if(!v || v.dataset.loaded) return false;
    const src=v.dataset.src;
    if(!src) return false;
    v.dataset.loaded='1';
    v.preload='auto';
    v.src=src;
    v.load();
    return true;
  }

  // INTRO VIDEO ONIZLEME: sayfa girisinde kisa video, sonra hero'ya gecis.
  const intro=document.getElementById('introOverlay');
  if(intro){
    const dismiss=()=>intro.classList.add('done');
    const introVideo=intro.querySelector('video');
    if(heavyMediaBlocked()){
      dismiss();
    }else{
      const t=setTimeout(dismiss,3200);
      if(introVideo){
        introVideo.addEventListener('ended',()=>{clearTimeout(t);dismiss();});
        introVideo.addEventListener('error',()=>{clearTimeout(t);dismiss();},{once:true});
        if(loadVideo(introVideo)) introVideo.play().catch(()=>{});
      }
      intro.addEventListener('click',()=>{clearTimeout(t);dismiss();});
    }
  }

  // HERO ARKA PLAN VIDEOSU: ayni kapidan gecer, poster her kosulda ayakta kalir.
  const heroBg=document.querySelector('.hero-bg-video');
  function applyHeroBgGate(){
    if(!heroBg) return;
    if(heavyMediaBlocked()){ heroBg.pause(); return; }
    loadVideo(heroBg);
    heroBg.play().catch(()=>{});
  }
  if(heroBg){
    heroBg.addEventListener('error',()=>{heroBg.style.display='none';},{once:true});
    HEAVY_MEDIA_GATES.map(q=>window.matchMedia(q))
      .forEach(m=>m.addEventListener('change',applyHeroBgGate));
    applyHeroBgGate();
  }

  // ALT BOLUM VIDEOLARI: gorunur olunca iner ve oynar, ekrandan cikinca durur.
  const lazyVideos=[...document.querySelectorAll('video.lazy-video')];
  if(lazyVideos.length){
    if(!('IntersectionObserver' in window)){
      lazyVideos.forEach(v=>{ if(loadVideo(v)) v.play().catch(()=>{}); });
    }else{
      const lazyIO=new IntersectionObserver(entries=>{
        entries.forEach(en=>{
          const v=en.target;
          if(en.isIntersecting){
            loadVideo(v);
            if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(()=>{});
          }else if(!v.paused){
            v.pause();
          }
        });
      },{rootMargin:'250px 0px'});
      lazyVideos.forEach(v=>lazyIO.observe(v));
    }
  }

  // CURSOR LOGO — fare ile sayfa başlıkları arasında gezinen BT amblemi
  const reduced0=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasHover=window.matchMedia('(hover:hover)').matches;
  if(!reduced0 && hasHover && window.innerWidth>900){
    const logo=document.createElement('div');
    logo.className='cursor-logo';
    logo.textContent='BT';
    document.body.appendChild(logo);
    let mx=window.innerWidth/2, my=window.innerHeight/2, lx=mx, ly=my;
    document.addEventListener('mousemove',e=>{
      mx=e.clientX; my=e.clientY;
      logo.classList.add('show');
    });
    document.addEventListener('mouseleave',()=>logo.classList.remove('show'));
    (function loop(){
      lx+=(mx-lx)*0.16; ly+=(my-ly)*0.16;
      logo.style.left=lx+'px'; logo.style.top=ly+'px';
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('h1,h2,.hero-card,.service-card,.archive-card,.category-cover,.showreel-card').forEach(el=>{
      el.addEventListener('mouseenter',()=>logo.classList.add('magnet'));
      el.addEventListener('mouseleave',()=>logo.classList.remove('magnet'));
    });
  }

  const menu=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.topbar nav');
  if(menu&&nav){
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      menu.setAttribute('aria-expanded',open?'true':'false');
      menu.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
  }

  const cards=[...document.querySelectorAll('.hero-card')];
  const stateVideo=document.getElementById('heroStateVideo');
  const sources={
    haber:'assets/media/web/state-haber.mp4',
    medya:'assets/media/web/state-medya.mp4',
    produksiyon:'assets/media/web/state-produksiyon.mp4'
  };
  let active='medya';
  let stateRequest=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setCategory(cat,play=true){
    if(!sources[cat]) return;
    active=cat;
    cards.forEach(c=>c.classList.toggle('active',c.dataset.category===cat));
    document.documentElement.dataset.heroCategory=cat;
    if(!stateVideo || reduced) return;
    const request=++stateRequest;
    stateVideo.classList.remove('ready');
    stateVideo.style.opacity='0';
    stateVideo.src=sources[cat];
    stateVideo.load();
    const reveal=()=>{
      if(request!==stateRequest) return;
      stateVideo.classList.add('ready');
      stateVideo.style.opacity='1';
      if(play) stateVideo.play().catch(()=>{});
    };
    stateVideo.addEventListener('loadeddata',reveal,{once:true});
    stateVideo.addEventListener('error',()=>{
      if(request!==stateRequest) return;
      stateVideo.style.opacity='0';
      stateVideo.removeAttribute('src');
    },{once:true});
  }

  cards.forEach((card,i)=>{
    const cat=card.dataset.category;
    card.addEventListener('mouseenter',()=>setCategory(cat));
    card.addEventListener('focus',()=>setCategory(cat,false));
    card.addEventListener('click',()=>{
      setCategory(cat);
      const target=document.querySelector(card.dataset.target||'#services');
      if(target) target.scrollIntoView({behavior:reduced?'auto':'smooth'});
    });
    card.addEventListener('touchstart',()=>setCategory(cat,false),{passive:true});
    card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click();}});
  });
  // Acilista yalnizca aktif kart isaretlenir, kategori videosu ilk etkilesimde iner.
  cards.forEach(c=>c.classList.toggle('active',c.dataset.category==='medya'));
  document.documentElement.dataset.heroCategory='medya';

  const hero=document.querySelector('.hero-scroll');
  const sceneStart=document.querySelector('.scene-still-start');
  const sceneEnd=document.querySelector('.scene-still-end');
  const line=document.querySelector('.scene-line i');
  const label=document.querySelector('.scene-label');
  const rail=document.querySelector('.service-rail');

  if(!reduced && typeof gsap!=='undefined' && typeof ScrollTrigger!=='undefined'){
    gsap.registerPlugin(ScrollTrigger);
    if(hero){
      ScrollTrigger.create({
        trigger:hero,start:'top top',end:'bottom bottom',scrub:true,
        onUpdate:self=>{
          const p=self.progress;
          if(sceneStart) gsap.set(sceneStart,{opacity:Math.max(0,1-p*1.7)});
          if(sceneEnd) gsap.set(sceneEnd,{opacity:Math.max(0,(p-.45)*1.9)});
          gsap.set('.character-wrap',{y:p*-90,scale:1+p*.1});
          gsap.set('.hero-copy',{y:p*-80,opacity:1-Math.min(1,p*1.8)});
          gsap.set('.focus-ring',{rotation:p*180,scale:1+p*.5});
          if(line) line.style.width=(p*100)+'%';
          if(label) label.textContent=p<.33?'01 / GİRİŞ':p<.66?'02 / ODAK':'03 / ÇIKIŞ';
        }
      });
    }
    if(rail && window.innerWidth>900){
      gsap.to(rail,{x:()=>-(rail.scrollWidth-window.innerWidth*.58),ease:'none',scrollTrigger:{trigger:'.services-pin',start:'top top',end:'bottom bottom',scrub:1,invalidateOnRefresh:true}});
    }
    gsap.from('.service-card',{y:50,opacity:0,stagger:.08,duration:.8,scrollTrigger:{trigger:'.services-stage',start:'top 75%'}});
    gsap.from('.about-copy',{x:-50,opacity:0,duration:1,scrollTrigger:{trigger:'.about',start:'top 70%'}});
  }

  const newsGrid=document.getElementById('newsGrid');
  if(newsGrid){
    function catClass(cat){
      const c=(cat||'').toLowerCase();
      if(c.includes('ekonomi')||c.includes('emlak')||c.includes('tarim')) return 'cat-ekonomi';
      if(c.includes('spor')||c.includes('muay')) return 'cat-spor';
      if(c.includes('kültür')||c.includes('kultur')||c.includes('zanaat')||c.includes('moda')) return 'cat-kultur';
      if(c.includes('sağlık')||c.includes('saglik')||c.includes('beslenme')||c.includes('bakim')) return 'cat-saglik';
      if(c.includes('yerel')||c.includes('pazar')||c.includes('haber')||c.includes('güncel')) return 'cat-haber';
      return 'cat-default';
    }
    function formatDate(d){if(!d)return '';try{return new Date(d).toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric'});}catch(e){return '';}}
    fetch('/api/news?limit=6').then(r=>{if(!r.ok) throw new Error('news');return r.json();}).then(data=>{
      const items=data.items||[];
      if(!items.length){newsGrid.innerHTML='<p style="color:#657788">Henüz yayınlanmış haber yok.</p>';return;}
      newsGrid.innerHTML=items.map(n=>`
        <article class="news-card">
          ${n.cover_url
            ?`<img class="news-card-img" src="${escapeHtml(n.cover_url)}" alt="${escapeHtml(n.title)}" loading="lazy">`
            :`<div class="news-card-placeholder ${catClass(n.category)}">BT</div>`}
          <div class="news-card-body">
            <small>${escapeHtml((n.category||'HABER').toUpperCase())}</small>
            <h3>${escapeHtml(n.title||'Başlıksız haber')}</h3>
            <p>${escapeHtml(n.excerpt||'').substring(0,120)}${(n.excerpt||'').length>120?'…':''}</p>
            <span class="news-card-date">${escapeHtml(n.author||'')}${n.author&&n.published_at?' · ':''}${formatDate(n.published_at)}</span>
            <a class="section-link" href="/haberler/${encodeURIComponent(n.slug)}.html">HABERİ AÇ ↗</a>
          </div>
        </article>`).join('');
    }).catch(()=>{
      fetch('data/haberler.json').then(r=>{if(!r.ok) throw new Error('fallback');return r.json();}).then(items=>{
        newsGrid.innerHTML=items.slice(0,6).map(n=>`
          <article class="news-card">
            <div class="news-card-placeholder ${catClass(n.category)}">BT</div>
            <div class="news-card-body">
              <small>${escapeHtml((n.category||'HABER').toUpperCase())}</small>
              <h3>${escapeHtml(n.title||'Başlıksız haber')}</h3>
              <p>${escapeHtml(n.excerpt||'').substring(0,120)}</p>
              <a class="section-link" href="/haberler/${encodeURIComponent(n.slug)}.html">HABERİ AÇ ↗</a>
            </div>
          </article>`).join('');
      }).catch(()=>{});
    });
  }

  const checks=[...document.querySelectorAll('.package-options input')];
  const count=document.getElementById('packageCount');
  const text=document.getElementById('packageText');
  const wa=document.getElementById('packageWhatsapp');
  function updatePackage(){
    const selected=checks.filter(c=>c.checked).map(c=>c.dataset.package);
    if(count) count.textContent=selected.length;
    if(text) text.textContent=selected.length?selected.join(' • '):'Henüz seçim yapılmadı.';
    if(wa){
      const msg=selected.length?`Merhaba BTMEDYA, kendi paketimi oluşturmak istiyorum. Seçimlerim: ${selected.join(', ')}.`:'Merhaba BTMEDYA, kendi paketimi oluşturmak istiyorum.';
      wa.href='https://wa.me/905416401029?text='+encodeURIComponent(msg);
    }
  }
  checks.forEach(c=>c.addEventListener('change',updatePackage));
  updatePackage();

  // PII-free intent event. No phone, name, email or message content is sent to analytics.
  document.querySelectorAll('a[href*="wa.me"]').forEach(a=>a.addEventListener('click',()=>{
    try{window.dispatchEvent(new CustomEvent('btmedya:whatsapp_intent',{detail:{category:active}}));}catch(e){}
  }));

  // ETKILESIMLI AN: basili tut, hikaye canlansin.
  // Ilerleme basili tutarken artar, birakinca geri soner, aniden sifirlanmaz.
  // Tamamlaninca alttaki icerik acilir. Azaltilmis harekette beklemeden
  // dogrudan son hal gosterilir.
  (function(){
    const sec=document.getElementById('canlandir');
    if(!sec) return;
    const stage=sec.querySelector('.revive-stage');
    const head=sec.querySelector('.revive-headline');
    const btn=sec.querySelector('.revive-btn');
    const label=sec.querySelector('.revive-label');
    const text=sec.querySelector('.revive-sr').textContent.trim();
    const reducedQ=window.matchMedia('(prefers-reduced-motion: reduce)');

    // Tohumlu rastgelelik: dagilma her acilista ayni, yani tasarim tekrarlanabilir.
    let seed=20260911>>>0;
    const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;

    // Harfler kelime kutularinin icine giriyor, yoksa satir sonu kelimeyi ortadan boler.
    head.innerHTML='';
    const words=text.split(' ');
    let idx=0;
    const total=text.length;
    words.forEach((word,wi)=>{
      const w=document.createElement('span');
      w.className='w';
      [...word].forEach(ch=>{
        const sp=document.createElement('span');
        sp.className='c';
        sp.textContent=ch;
        sp.style.setProperty('--th', (idx/total*0.55 + rnd()*0.12).toFixed(3));
        sp.style.setProperty('--jx', ((rnd()-0.5)*140).toFixed(1)+'px');
        sp.style.setProperty('--jy', ((rnd()-0.5)*90).toFixed(1)+'px');
        sp.style.setProperty('--jr', ((rnd()-0.5)*44).toFixed(1)+'deg');
        w.appendChild(sp);
        idx++;
      });
      head.appendChild(w);
      if(wi<words.length-1){ head.appendChild(document.createTextNode(' ')); idx++; }
    });
    const spans=[...head.querySelectorAll('.c')];

    let p=0, target=0, raf=null, last=0, done=false;
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

    function paint(){
      stage.style.setProperty('--p', p.toFixed(4));
      spans.forEach(sp=>{
        const th=parseFloat(sp.style.getPropertyValue('--th'))||0;
        sp.style.setProperty('--kc', clamp((p-th)*2.6,0,1).toFixed(3));
      });
      stage.style.setProperty('--after', clamp((p-0.82)*5.5,0,1).toFixed(3));
      if(p>=1 && !done){
        done=true;
        sec.classList.add('done');
        label.textContent='CANLANDI';
      }else if(p<1 && done){
        done=false;
        sec.classList.remove('done');
        label.textContent='BASILI TUTUN';
      }
    }

    function tick(now){
      const dt=Math.min(100, now-(last||now));
      last=now;
      // Dolus yaklasik 1,6 saniye, geri sonme biraz daha yavas.
      const rate = target>p ? dt/1600 : -dt/2200;
      p=clamp(p+rate,0,1);
      paint();
      if((target>p && p<1)||(target<p && p>0)){
        raf=requestAnimationFrame(tick);
      }else{
        raf=null; last=0;
      }
    }
    function drive(t){
      target=t;
      if(raf===null){ last=0; raf=requestAnimationFrame(tick); }
    }

    const hold=e=>{ if(e && e.cancelable) e.preventDefault(); drive(1); };
    const release=()=>drive(0);

    btn.addEventListener('mousedown',hold);
    btn.addEventListener('touchstart',hold,{passive:false});
    addEventListener('mouseup',release);
    addEventListener('touchend',release);
    addEventListener('touchcancel',release);
    btn.addEventListener('mouseleave',release);
    btn.addEventListener('blur',release);
    btn.addEventListener('keydown',e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); hold(); }});
    btn.addEventListener('keyup',e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); release(); }});

    function applyReduced(){
      if(reducedQ.matches){
        if(raf!==null){ cancelAnimationFrame(raf); raf=null; }
        p=1; paint();
        btn.setAttribute('disabled','');
        btn.style.display='none';
      }else{
        btn.removeAttribute('disabled');
        btn.style.display='';
      }
    }
    reducedQ.addEventListener('change',applyReduced);
    applyReduced();
    if(!reducedQ.matches) paint();
  })();

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  // SEKME GIZLIYKEN DURAKLAT.
  // main dalindan gelen surum video[autoplay] seciyordu; bu dalda hicbir video
  // artik autoplay tasimiyor (hepsi kapiya ve gorunurluge bagli indiriliyor),
  // yani secim bos donuyor ve body.paused hic kurulmuyordu. Ekran disinda
  // duraklatmayi zaten yukaridaki lazy gozlemcisi yapiyor, burada yalnizca
  // sekme gizlenince duraklatma kaliyor. body.paused sinifi CSS tarafinda
  // butun animasyonlari (::before ve ::after dahil) donduruyor.
  (function(){
    const inView=el=>{
      const r=el.getBoundingClientRect();
      return r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
    };
    const playable=()=>[...document.querySelectorAll('video')]
      .filter(v=>v.dataset.loaded && !v.closest('.intro-overlay'));
    document.addEventListener('visibilitychange',()=>{
      const hidden=document.hidden;
      document.body.classList.toggle('paused',hidden);
      playable().forEach(v=>{
        if(hidden){ v.pause(); return; }
        if(v.classList.contains('hero-bg-video')){
          if(!heavyMediaBlocked()) v.play().catch(()=>{});
          return;
        }
        if(inView(v) && !matchMedia('(prefers-reduced-motion: reduce)').matches) v.play().catch(()=>{});
      });
    });
  })();
});
