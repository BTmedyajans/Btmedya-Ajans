/* =====================================================================
 * DINAMIK HABER SAYFASI
 * Panelden girilen haberler depoda dosya olusturmadigi icin adresleri
 * 404 donuyordu. Bu modul D1'deki kaydi ayni tasarimla sayfaya cevirir.
 * Statik dosyasi olan 27 haber degismez: onceligi her zaman dosya alir.
 *
 * AGIRLIK ILKESI
 * - YouTube videosu gomulu oynaticiyla degil, kapak karesi + dugme ile
 *   gosterilir. Ziyaretci tiklayana kadar YouTube'dan tek bayt inmez.
 *   (Gomulu oynatici ~900 KB betik yukler; kapak karesi ~15-40 KB.)
 * - Kapak gorseli lazy yuklenir ve olculeri pesinen yazilir, boylece
 *   sayfa akarken zipla olusmaz.
 * ===================================================================== */

const esc = s => String(s ?? '')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

/* YouTube kimligini her bicimden cikarir: tam adres, kisa adres, gomme
   adresi, shorts ya da dogrudan kimligin kendisi. */
export function youtubeId(v){
  const s=String(v||'').trim();
  if(!s) return '';
  if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m=s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?m[1]:'';
}

const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
function trTarih(iso){
  if(!iso) return '';
  const d=new Date(iso);
  if(isNaN(d)) return String(iso);
  return `${String(d.getUTCDate()).padStart(2,'0')} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
function isoTarih(iso){
  if(!iso) return '';
  const d=new Date(iso);
  return isNaN(d)?String(iso):d.toISOString().slice(0,10);
}

/* Govde: bos satirla ayrilmis paragraflar. HTML girilmisse oldugu gibi
   birakilmaz; panelden gelen metin her zaman kacisli yazilir. */
function govde(body){
  const t=String(body||'').trim();
  if(!t) return '';
  return t.split(/\n{2,}/).map(p=>`<p>${esc(p.trim()).replace(/\n/g,'<br>')}</p>`).join('');
}

export function renderNewsPage(n, origin, vlib){
  const url=`${origin}/haberler/${encodeURIComponent(n.slug)}`;
  // Kutuphane kaydi varsa etkin kimlik oradan gelir: video kendi kanalimiza
  // tasindiginda haber kaydina dokunmadan yonlendirme degisir.
  const kaynakVid=youtubeId(n.video_url);
  const vid=(vlib&&(vlib.own_youtube_id||vlib.youtube_id))||kaynakVid;
  const kanal=vlib?(vlib.own_youtube_id?'BTMEDYA':(vlib.source_channel||'')):'';
  const kapak=n.cover_url||'';
  const tarihTr=trTarih(n.published_at);
  const tarihIso=isoTarih(n.published_at);
  const ozet=(n.excerpt||'').trim()||String(n.body||'').slice(0,155);
  // maxresdefault her videoda bulunmaz (kaynak dusuk cozunurlukse 404 doner);
  // hqdefault her zaman vardir, paylasim kapagi bos kalmasin.
  const ogImg = kapak || (vid?`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`:`${origin}/assets/btmedya-social-profile.png`);

  const ld={
    "@context":"https://schema.org","@type":"NewsArticle",
    headline:n.title, description:ozet, url,
    ...(tarihIso?{datePublished:tarihIso,dateModified:isoTarih(n.updated_at)||tarihIso}:{}),
    author:{"@type":"Person",name:n.author||'BTMEDYA'},
    publisher:{"@type":"Organization",name:"BTMEDYA",
      logo:{"@type":"ImageObject",url:`${origin}/assets/btmedya-emblem-derived.png`}},
    ...(n.category?{articleSection:n.category}:{}),
    ...(ogImg?{image:ogImg}:{}),
    mainEntityOfPage:{"@type":"WebPage","@id":url},
    inLanguage:"tr-TR"
  };

  /* Kapak karesi YouTube'un kendi CDN'inden gelir; oynatici yuklenmez. */
  const videoBlok = vid ? `
<div class="yt-lite" data-yt="${esc(vid)}">
  <img src="https://i.ytimg.com/vi/${esc(vid)}/hqdefault.jpg" alt="${esc(n.title)} — video kapağı" loading="lazy" width="480" height="360">
  <button type="button" class="yt-play" aria-label="Videoyu oynat">▶</button>
  <noscript><a href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">Videoyu YouTube'da izleyin ↗</a></noscript>
</div>
${kanal?`<p class="video-credit">Video ${esc(kanal)} kanalında yayında. <a href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">YouTube'da aç ↗</a></p>`:''}` : '';

  const kapakBlok = (kapak && !vid) ? `
<img class="article-cover" src="${esc(kapak)}" alt="${esc(n.title)}" loading="lazy" decoding="async">` : '';

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#02070d"/>
<title>${esc(n.title)} — BTMEDYA Haber</title>
<meta name="description" content="${esc(ozet)}"/>
<link rel="canonical" href="${esc(url)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(n.title)}"/>
<meta property="og:description" content="${esc(ozet)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta property="og:image" content="${esc(ogImg)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="icon" href="/assets/favicon.png" type="image/png"/>
<link rel="manifest" href="/site.webmanifest"/>
<link rel="stylesheet" href="/styles.css"/>
<script type="application/ld+json">
${JSON.stringify(ld,null,0)}
</script>
</head>
<body>
<a class="skip-link" href="#main">İçeriğe geç</a>
<div class="noise" aria-hidden="true"></div>
<header class="topbar">
  <a class="brand" href="/" aria-label="BTMEDYA ana sayfa">
    <img src="/assets/btmedya-emblem-derived.png" alt="BTMEDYA" class="brand-emblem">
    <span class="brand-mark">BT</span><span class="brand-word">MEDYA</span>
  </a>
  <a class="quote" href="/haberler/">HABER ARŞİVİ ↗</a>
</header>
<main id="main" tabindex="-1">
<article class="article-page">
<a class="article-back" href="/haberler/">← HABER ARŞİVİ</a>
${n.category?`<p class="article-eyebrow">${esc(n.category)}</p>`:''}
<h1>${esc(n.title)}</h1>
<div class="article-meta">
  <span>${esc(n.author||'BTMEDYA')}</span>
  ${tarihTr?`<time datetime="${esc(tarihIso)}">${esc(tarihTr)}</time>`:''}
</div>
${videoBlok}${kapakBlok}
<div class="article-body">
${govde(n.body)}
</div>
</article>
</main>
<footer class="final-footer">
  <div class="footer-brand">
    <img src="/assets/btmedya-emblem-derived.png" alt="">
    <div><strong>BTMEDYA</strong><span>Balıkesir · Haber, prodüksiyon, yapay zekâ</span></div>
  </div>
  <div class="footer-contact"><a href="/iletisim/">İletişim</a><a href="/hakkimizda/">Hakkımızda</a></div>
  <div class="footer-legal">© ${new Date().getUTCFullYear()} BTMEDYA</div>
</footer>
<script>
/* Kapak karesine dokununca gercek oynatici gelir; oncesinde YouTube'dan
   hicbir sey inmez. autoplay=1 yalnizca kullanici tikladigi icin verilir. */
document.querySelectorAll('.yt-lite').forEach(function(el){
  el.addEventListener('click',function(){
    var id=el.dataset.yt; if(!id||el.dataset.on)return; el.dataset.on='1';
    var f=document.createElement('iframe');
    f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
    f.title='Haber videosu';
    f.allow='accelerometer; autoplay; encrypted-media; picture-in-picture';
    f.allowFullscreen=true; f.loading='lazy';
    el.replaceChildren(f);
  });
});
</script>
</body>
</html>`;
}
