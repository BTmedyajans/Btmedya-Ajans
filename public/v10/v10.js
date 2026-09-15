const work=document.querySelector('#media-work');
const news=document.querySelector('#news-list');
const hero=document.querySelector('.hero');
const nav=document.querySelector('#nav');
const menu=document.querySelector('.menu');

function esc(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

menu?.addEventListener('click',()=>{nav.classList.toggle('open');if(nav.classList.contains('open')){nav.querySelector('nav').style.display='flex';nav.querySelector('nav').style.position='absolute';nav.querySelector('nav').style.top='68px';nav.querySelector('nav').style.left='0';nav.querySelector('nav').style.right='0';nav.querySelector('nav').style.padding='25px';nav.querySelector('nav').style.background='#080808';nav.querySelector('nav').style.flexDirection='column';nav.querySelector('nav').style.gap='18px';}else nav.querySelector('nav').removeAttribute('style');});

const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');reveal.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.statement,.services,.work,.editorial,.blackroom,.ailab,.founder,.contact').forEach(x=>reveal.observe(x));

async function loadMedia(){
  try{
    const r=await fetch('../api/public/media?category=');
    const data=await r.json();
    const items=(data.items||[]).filter(x=>x.published!==0).slice(0,8);
    if(!items.length){work.innerHTML='<div class="work-loading">MEDYA KASASI HAZIR. YAYINLANACAK GERÇEK İŞLER ADMİN PANELİNDEN GELİR.</div>';return;}
    work.innerHTML=items.map((m,i)=>{
      const isVideo=String(m.mime||'').startsWith('video/');
      const media=isVideo?`<video controls muted playsinline preload="metadata" src="${esc(m.url)}"></video>`:`<img loading="lazy" src="${esc(m.url)}" alt="${esc(m.alt_text||m.title||m.original_name||'BTMEDYA çalışması')}">`;
      return `<article class="media-item"><div>${media}</div><div class="media-meta"><span class="num">${String(i+1).padStart(2,'0')} / ${esc((m.category||'PORTFÖY').toUpperCase())}</span><div><h3>${esc(m.title||m.original_name||'BTMEDYA üretimi')}</h3><p>${esc(m.description||'Gerçek üretim arşivinden seçilmiş çalışma.')}</p></div><small>${esc(m.tags?.join(' · ')||'REAL MEDIA')}</small></div></article>`;
    }).join('');
  }catch(e){work.innerHTML='<div class="work-loading">MEDYA KASASI ŞU ANDA YANIT VERMİYOR. STATİK TASARIM DEVREDE.</div>';}
}

async function loadNews(){
  try{
    const r=await fetch('../api/news?limit=6');
    const data=await r.json();
    const items=data.items||[];
    if(!items.length){news.innerHTML='<div class="work-loading">HABER AKIŞI İÇİN YAYINLANMIŞ İÇERİK BEKLENİYOR.</div>';return;}
    news.innerHTML=items.map(n=>`<a class="news-row" href="../haberler/${encodeURIComponent(n.slug)}/"><time>${new Date(n.published_at||Date.now()).toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'})}</time><h3>${esc(n.title)}</h3><small>${esc(n.category||'HABER')}</small></a>`).join('');
  }catch(e){news.innerHTML='<div class="work-loading">HABER API YANIT VERMEDİ.</div>';}
}

loadMedia();loadNews();

window.addEventListener('scroll',()=>{nav.classList.toggle('scrolled',scrollY>40);},{passive:true});
