document.addEventListener('DOMContentLoaded',()=>{
  const pre=document.getElementById('preloader');
  setTimeout(()=>pre&&pre.classList.add('done'),450);

  // INTRO VIDEO ÖNİZLEME — sayfa girişinde kısa video, sonra hero'ya geçiş
  const intro=document.getElementById('introOverlay');
  if(intro){
    const dismiss=()=>intro.classList.add('done');
    const introVideo=intro.querySelector('video');
    const t=setTimeout(dismiss,3200);
    if(introVideo){
      introVideo.addEventListener('ended',()=>{clearTimeout(t);dismiss();});
    }
    intro.addEventListener('click',()=>{clearTimeout(t);dismiss();});
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
  setCategory('medya',false);

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

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  // PERF: döngüsel videoları ekran dışındayken ve sekme gizliyken duraklat.
  // Sürekli oynayan arka plan/kategori/showreel videoları kaynak yakar; sadece
  // görünür olanlar oynar. (10k-websites mühendislik tabanı)
  (function(){
    const vids=[...document.querySelectorAll('video[autoplay]')].filter(v=>!v.closest('.intro-overlay'));
    if(!vids.length)return;
    const visible=new WeakSet();
    const io=('IntersectionObserver' in window)?new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){visible.add(e.target);if(!document.hidden)e.target.play().catch(()=>{});}
        else{visible.delete(e.target);e.target.pause();}
      });
    },{rootMargin:'200px'}):null;
    if(io){vids.forEach(v=>io.observe(v));}else{vids.forEach(v=>visible.add(v));}
    document.addEventListener('visibilitychange',()=>{
      const hidden=document.hidden;
      document.body.classList.toggle('paused',hidden);
      vids.forEach(v=>{
        if(hidden)v.pause();
        else if(!io||visible.has(v))v.play().catch(()=>{});
      });
    });
  })();
});
