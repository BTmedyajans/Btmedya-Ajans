# BTMEDYA — btmedya.com.tr

Haber, prodüksiyon ve yapay zekâ ajansı BTMEDYA'nın web sitesi. Cloudflare Workers + D1 + R2 üzerinde çalışan site + "Media Vault" medya arşivi ve admin paneli.

## Yapı

```
wrangler.toml        Worker config (D1 / R2 / Assets binding'leri)
src/worker.js        Birleşik API: haber CMS + medya kasası + statik servis
migrations/          D1 şeması (news, media, social_posts)
public/              Yayınlanan her şey (assets binding bu klasörü servis eder)
  index.html         Anasayfa (V10.2 sinematik tema)
  styles.css, script.js
  assets/            Görseller + videolar (logo, hero, showreel, portfolyo)
  haberler/          27 haberin statik HTML sayfası + arşiv listesi
  data/haberler.json Haber arşivi verisi (tam metin, kaynak, yazar)
  admin/             Media Vault yönetim paneli (/admin/)
  social-studio/     İçerik → sosyal video üretim sayfası
  robots.txt, sitemap.xml, rss.xml, site.webmanifest
docs/                Yayına alma ve Media Vault kılavuzları
```

Backend dosyaları `public/` dışında tutulur; bu yüzden `wrangler.toml`, `src/` ve
`migrations/` hiçbir koşulda herkese açık servis edilmez.

## API uçları

| Uç | Açıklama |
|---|---|
| `GET /api/health` | D1/R2 bağlantı kontrolü |
| `GET /api/news` | D1'de yayınlanmış canlı haberler |
| `POST /api/admin/news` | Haber yayınla/güncelle (admin) |
| `POST /api/login`, `/api/logout` | Admin oturumu (imzalı çerez, 7 gün) |
| `GET/POST /api/media`, `PATCH/DELETE /api/media/:id` | Medya kayıtları (admin) |
| `PUT /api/upload/:key/part`, `POST /api/upload/:key/complete` | R2 çok parçalı yükleme |
| `GET /api/public/media` | Yayınlanmış medya (herkese açık, imzalı URL'ler) |
| `GET /api/export` | AI araçları için medya kataloğu (`AI_READ_TOKEN`) |
| `GET /media/:key?exp=&sig=` | Süreli imzalı medya servisi |

## Cloudflare durumu

Hesapta **5 Worker** var:

| Worker | Rol |
|---|---|
| `btmedya` | `www.btmedya.com.tr` şu an buna bağlı — eski sürümü servis ediyor |
| `btmedya-db` | **Bu depo buraya deploy eder** — güncel site burada, alan adı bekleniyor |
| `btmedya-ajans`, `btmedya-medya`, `btmedya-agent-visibility` | Boş kurulum şablonları, kullanılmıyor |

Cloudflare Workers Builds, `wrangler.toml` içindeki `name` alanını yok sayar ve
daima bağlı olduğu servise (`btmedya-db`) deploy eder. Sitenin bu depodan canlı
yayına girmesi için `www.btmedya.com.tr` alan adının `btmedya-db` Worker'ına
taşınması gerekir:
Workers & Pages > btmedya-db > Settings > Domains & Routes > Add > Custom Domain

`btmedya.com.tr` (www'suz hali) şu an DNS'te tanımlı değil — sadece
`www.btmedya.com.tr` çalışıyor.

## Yayına almadan önce

`/admin/` panelinin ve imzalı medya bağlantılarının çalışması için üç secret
tanımlanmalı (Cloudflare paneli > Worker > Settings > Variables and Secrets,
ya da `wrangler secret put`):

- `ADMIN_PASSWORD` — panel giriş şifresi
- `ADMIN_SESSION_SECRET` — oturum imzalama anahtarı (rastgele uzun dizi)
- `MEDIA_SIGNING_SECRET` — medya bağlantısı imzalama anahtarı (rastgele uzun dizi)

Detaylı adımlar: `docs/CANLIYA-ALMA.md`
