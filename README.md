# BTMEDYA — btmedya.com.tr

Haber, prodüksiyon ve yapay zekâ ajansı BTMEDYA'nın web sitesi. Cloudflare Workers + D1 + R2 üzerinde çalışan site + "Media Vault" arşiv/admin paneli mimarisi.

## Yapı

```
wrangler.toml       Worker config (D1/R2/Assets binding'leri)
migrations/          D1 şema tanımı (news, media, social_posts) — prod'da zaten uygulanmış
src/
  worker.js          İstek yönlendirme (routing)
  lib/
    auth.js          Admin oturum (cookie) doğrulama
    crypto.js        HMAC imzalama / sabit-zamanlı karşılaştırma
    http.js          JSON/HTML response yardımcıları
    media.js         Medya imzalı URL üretimi, R2 key oluşturma
    news.js          Statik + D1 haber birleştirme, sayfa render
    layout.js         Ortak sayfa iskeleti (nav/footer)
public/
  index.html         Anasayfa (V10.2 sinematik tema)
  styles.css         Site stilleri
  script.js          Ön yüz etkileşimleri (menü, scroll, GSAP, paket hesaplayıcı, medya hidrasyonu)
  site.webmanifest, assets/favicon.svg
  admin/index.html   Media Vault yönetim paneli (/admin/)
  social-studio/index.html  İçerik→sosyal video üretim sayfası
  data/haberler.json Statik haber arşivi (RSS'ten doğrulanmış 10 haber + 17 yer tutucu)
  robots.txt, sitemap.xml, rss.xml
docs/
  CANLIYA-ALMA.md    Yayına alma kılavuzu (secrets, kontrol listesi)
  MEDIA-VAULT.md     Media Vault modülü teknik özeti
```

## Backend uçları

| Uç | Açıklama |
|---|---|
| `GET /api/health` | D1/R2 bağlantı kontrolü |
| `POST /api/login`, `GET /api/logout` | Admin oturumu (imzalı cookie) |
| `GET/POST /api/media`, `PATCH/DELETE /api/media/:id` | Medya kaydı CRUD (admin) |
| `PUT /api/upload/:key/part`, `POST /api/upload/:key/complete` | R2 çok parçalı yükleme (admin) |
| `GET /api/export` | Yayınlanmış medya kataloğu (AI_READ_TOKEN varsa gerekli) |
| `GET /api/public/media?slot=&category=` | Anasayfa için yayınlanmış medya (slot bazlı) |
| `GET /media/:key?exp=&sig=` | Süreli imzalı medya servis |
| `POST /api/admin/news` | D1 üzerinden canlı haber yayınlama (admin) |
| `GET /haberler/`, `/haberler/:slug.html` | Statik JSON + D1 yayınlanmış haberlerin birleşik render'ı |

## Bilinen eksikler / dürüstlük notu

- **17 haber** (`public/sitemap.xml`'de listelenen ama RSS akışında gerçek metni bulunmayanlar) `public/data/haberler.json` içinde `"placeholder": true` olarak işaretli ve "İçerik güncelleniyor" yazan dürüst bir bekleme sayfası gösteriyor. Uydurma haber metni **yazılmadı**. Bu haberlerin gerçek başlık/metnini paylaşırsanız hemen JSON'a işlerim.
- `public/assets/` altında gerçek fotoğraf/video (hero görselleri, portfolyo, podcast kapağı vb.) yok — bunlar başkasının/kurucunun gerçek görselleri olduğu için tarafımca **üretilmedi**. `script.js` bu görselleri Media Vault'tan (`slot` alanına göre) canlı çekmeye çalışır; siz `/admin/` panelinden yükleyip "Siteye ekle" dediğinizde otomatik görünür. Elinizdeki gerçek dosyaları paylaşırsanız doğrudan `public/assets/` altına yerleştiririm.
- `favicon.svg` geçici bir "BT" monogramı; gerçek logo geldiğinde değiştirilecek.

## Deploy

Bu repo, Cloudflare'da `btmedya-db` adlı Worker'a git entegrasyonu ile bağlı — bu branch'e her push otomatik build/deploy tetikler. Secrets (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `MEDIA_SIGNING_SECRET`, opsiyonel `AI_READ_TOKEN`) Cloudflare panelinden/`wrangler secret put` ile ayrıca tanımlanmalı — repoya yazılmaz. Detaylar için `docs/CANLIYA-ALMA.md`.
