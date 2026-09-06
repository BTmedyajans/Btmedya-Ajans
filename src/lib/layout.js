import { escapeHtml } from './http.js';

const HEAD_FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;

const NAV = `<header class="topbar">
    <a class="brand" href="/" aria-label="BTMEDYA ana sayfa">
      <img src="/assets/btmedya-emblem-derived.png" alt="BTMEDYA" class="brand-emblem" onerror="this.style.display='none'">
      <span class="brand-mark">BT</span><span class="brand-word">MEDYA</span>
    </a>
    <button class="menu-toggle" type="button" aria-label="Menüyü aç" aria-expanded="false">☰</button>
    <nav>
      <a href="/#hero">Ana Sayfa</a>
      <a href="/#services">Hizmetler</a>
      <a href="/#portfolio">Portföy</a>
      <a href="/#ai-lab">AI LAB</a>
      <a href="/#packages">Paketler</a>
      <a href="/haberler/">Haberler</a>
      <a href="/#about">Hakkımızda</a>
      <a href="/#cta">İletişim</a>
    </nav>
    <a class="quote" href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA%2C%20bir%20proje%20i%C3%A7in%20teklif%20almak%20istiyorum." target="_blank" rel="noopener">TEKLİF AL ↗</a>
  </header>`;

const FOOTER = `<footer class="final-footer">
      <div class="footer-brand">
        <img src="/assets/btmedya-emblem-derived.png" alt="BTMEDYA" onerror="this.style.display='none'">
        <div>
          <strong>BTMEDYA</strong>
          <span>Dijitalde Fikir Sizden, Gerisi Bizden.</span>
        </div>
      </div>
      <div class="footer-contact">
        <a href="tel:+905416401029">+90 541 640 10 29</a>
        <a href="https://www.btmedya.com.tr/">btmedya.com</a>
      </div>
      <div class="footer-social">
        <a href="https://www.instagram.com/btmedya10/" target="_blank" rel="noopener" aria-label="Instagram">Instagram</a>
        <a href="https://www.youtube.com/@BTmedyaAjans" target="_blank" rel="noopener" aria-label="YouTube">YouTube</a>
        <a href="https://www.tiktok.com/@btcraft10" target="_blank" rel="noopener" aria-label="TikTok">TikTok</a>
        <a href="https://wa.me/905416401029" target="_blank" rel="noopener" aria-label="WhatsApp">WhatsApp</a>
      </div>
      <div class="footer-legal">© 2026 BTMEDYA · Balıkesir, Türkiye</div>
    </footer>
    <a class="floating-whatsapp" href="https://wa.me/905416401029?text=Merhaba%20BTMEDYA" target="_blank" rel="noopener" aria-label="BTMEDYA WhatsApp">
      <span>WhatsApp</span><b>↗</b>
    </a>`;

export function layout({ title, description, canonical, bodyHtml, bodyClass = '' }) {
  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="theme-color" content="#02070d"/>
  <link rel="canonical" href="${escapeHtml(canonical)}"/>
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}"/>
  <meta property="og:title" content="${escapeHtml(title)}"/>
  <meta property="og:description" content="${escapeHtml(description)}"/>
  <meta property="og:url" content="${escapeHtml(canonical)}"/>
  <meta property="og:type" content="article"/>
  ${HEAD_FONTS}
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"/>
  <link rel="manifest" href="/site.webmanifest"/>
  <link rel="stylesheet" href="/styles.css"/>
</head>
<body class="${bodyClass}">
  <div class="page-progress" aria-hidden="true"><i></i></div>
  ${NAV}
  <main>
  ${bodyHtml}
  </main>
  ${FOOTER}
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
  <script src="/script.js"></script>
</body>
</html>`;
}
