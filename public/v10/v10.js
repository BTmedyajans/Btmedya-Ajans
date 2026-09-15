const work=document.querySelector('#media-work');
const news=document.querySelector('#news-list');
const sourceGrid=document.querySelector('#source-grid');
const hero=document.querySelector('.hero');
const nav=document.querySelector('#nav');
const menu=document.querySelector('.menu');

function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

menu?.addEventListener('click',()=>{nav.classList.toggle('open');if(nav.classList.contains('open')){nav.querySelector('nav').style.display='flex';nav.querySelector('nav').style.position='absolute';nav.querySelector('nav').style.top='68px';nav.querySelector('nav').style.left='0';nav.querySelector('nav').style.right='0';nav.querySelector('nav').style.padding='25px';nav.querySelector('nav').style.background='#080808';nav.querySelector('nav').style.flexDirection='column';nav.querySelector('nav').style.gap='18px';}else nav.querySelector('nav').removeAttribute('style');});

const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');reveal.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.statement,.services,.work,.editorial,.sources,.blackroom,.ailab,.founder,.contact').forEach(x=>reveal.observe(x));

const portfolioFallback=[
  {type:'image',url:'../assets/btmedya-production-lab_529e6715_f6731a13.webp',title:'Prodüksiyon Laboratuvarı',category:'PRODÜKSİYON',description:'Kamera, kurgu ve görsel üretim süreçlerinden seçilmiş BTMEDYA çalışma alanı.'},
  {type:'image',url:'../assets/btmedya-podcast_471e525f.jpg',title:'Siyah Oda',category:'RÖPORTAJ / PODCAST',description:'Röportaj, podcast ve kamera karşısı içerikler için BTMEDYA stüdyo formatı.'},
  {type:'image',url:'../assets/btmedya-hero-woman-desktop_3c8c8f08_9ad5a0f9.webp',title:'Media Experience',category:'MEDYA',description:'BTMEDYA görsel kimliği ve sinematik medya deneyiminden seçilmiş kapak.'},
  {type:'image',url:'../assets/buse-tuncay-media-cover_3a69cc91_73da5bee.webp',title:'Gazetecilik & Editoryal',category:'HABER',description:'Gazetecilik, saha üretimi ve editoryal anlatının BTMEDYA yüzü.'},
  {type:'image',url:'../assets/haber-kapak/balikesir-in-en-kalabalik-pazari.webp',title:'Balıkesir’in En Kalabalık Pazarı',category:'SAHA / HABER',description:'Sahadan gerçek görüntülerle hazırlanan yerel haber çalışması.'},
  {type:'image',url:'../assets/haber-kapak/balikesir-in-son-kalaycisi-ilyas-baykal.webp',title:'Balıkesir’in Son Kalaycısı',category:'SAHA / RÖPORTAJ',description:'Yerel zanaat ve insan hikâyesini merkeze alan saha içeriği.'},
  {type:'image',url:'../assets/haber-kapak/kadin-firincidan-30-yillik-basari-oykusu.webp',title:'30 Yıllık Başarı Öyküsü',category:'RÖPORTAJ',description:'Yerel girişimcilik ve emek hikâyesini görünür kılan editoryal içerik.'},
  {type:'image',url:'../assets/haber-kapak/beydonoglu-yaprak-satarken-festival-yonetiyor.webp',title:'Sahadan İnsan Hikâyeleri',category:'HABER / PORTRE',description:'Sahadaki insanları, işlerini ve hikâyelerini görsel anlatımla aktaran içerik.'}
];

function renderPortfolio(items){
  work.innerHTML=items.map((m,i)=>{
    const isVideo=m.type==='video'||String(m.mime||'').startsWith('video/');
    const media=isVideo?`<video controls muted playsinline preload="metadata" src="${esc(m.url)}"></video>`:`<img loading="lazy" src="${esc(m.url)}" alt="${esc(m.alt_text||m.title||'BTMEDYA portföy çalışması')}">`;
    return `<article class="media-item"><div class="media-visual">${media}<span class="media-badge">${isVideo?'VIDEO':'PHOTO'}</span></div><div class="media-meta"><span class="num">${String(i+1).padStart(2,'0')} / ${esc((m.category||'PORTFÖY').toUpperCase())}</span><div><h3>${esc(m.title||m.original_name||'BTMEDYA üretimi')}</h3><p>${esc(m.description||'BTMEDYA gerçek üretim arşivinden seçilmiş çalışma.')}</p></div><small>${esc(m.tags?.join(' · ')||'REAL MEDIA')}</small></div></article>`;
  }).join('');
}

async function loadMedia(){
  try{
    const r=await fetch('../api/public/media?category=');
    if(!r.ok) throw new Error('media api '+r.status);
    const data=await r.json();
    const items=(data.items||[]).filter(x=>x.published!==0).slice(0,12);
    if(items.length){renderPortfolio(items);return;}
  }catch(e){}
  renderPortfolio(portfolioFallback);
}

const newsFallback=[
  ['balikesir-in-en-kalabalik-pazari','Balıkesir’in En Kalabalık Pazarı','HABER'],
  ['balikesir-in-son-kalaycisi-ilyas-baykal','Balıkesir’in Son Kalaycısı İlyas Baykal','RÖPORTAJ'],
  ['kadin-firincidan-30-yillik-basari-oykusu','Kadın Fırıncıdan 30 Yıllık Başarı Öyküsü','SAHA'],
  ['beydonoglu-yaprak-satarken-festival-yonetiyor','Yaprak Satarken Festival Yönetiyor','PORTRE'],
  ['balikesir-esnafi-eleman-bulmakta-zorlaniyor','Balıkesir Esnafı Eleman Bulmakta Zorlanıyor','EKONOMİ'],
  ['balikesir-de-kira-fiyatlarinda-30-artis-bekleniyor','Balıkesir’de Kira Fiyatlarında Artış Bekleniyor','GÜNDEM']
];

function coverForSlug(slug){return `../assets/haber-kapak/${slug}.webp`;}

function renderNews(items){
  news.innerHTML=items.map(n=>{
    const slug=n.slug||n[0];
    const title=n.title||n[1];
    const category=n.category||n[2]||'HABER';
    const date=n.published_at?new Date(n.published_at).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
    const cover=n.cover_url||coverForSlug(slug);
    return `<a class="news-row" href="../haberler/${encodeURIComponent(slug)}/"><img loading="lazy" src="${esc(cover)}" alt="${esc(title)}"><span class="news-copy"><time>${esc(date)}</time><h3>${esc(title)}</h3><small>${esc(category)}</small></span><span class="news-arrow">↗</span></a>`;
  }).join('');
}

async function loadNews(){
  try{
    const r=await fetch('../api/news?limit=6');
    if(!r.ok) throw new Error('news api '+r.status);
    const data=await r.json();
    const items=data.items||[];
    if(items.length){renderNews(items);return;}
  }catch(e){}
  renderNews(newsFallback);
}

async function loadSources(){
  if(!sourceGrid) return;
  try{
    const r=await fetch('../data/portfolio-sources.json');
    if(!r.ok) throw new Error('source registry '+r.status);
    const data=await r.json();
    sourceGrid.innerHTML=(data.sources||[]).map(s=>`<a class="source-card" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span class="source-platform">${esc(s.platform)}</span><div><h3>${esc(s.label)}</h3><p>${esc(s.role)}</p></div><span class="source-link">KAYNAĞI AÇ ↗</span></a>`).join('');
  }catch(e){sourceGrid.innerHTML='<div class="work-loading">YAYIN KAYNAKLARI ŞU ANDA YÜKLENEMİYOR.</div>';}
}

loadMedia();loadNews();loadSources();

window.addEventListener('scroll',()=>{nav.classList.toggle('scrolled',scrollY>40);},{passive:true});