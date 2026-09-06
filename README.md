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

Hesapta **5 Worker** var; bu proje `btmedya` Worker'ında yayınlanıyor:

| Worker | Rol |
|---|---|
| `btmedya` | **Canlı site** — `www.btmedya.com.tr` buna bağlı, bu depo buraya deploy eder |
| `btmedya-db` | Eski deneme; artık kullanılmıyor |
| `btmedya-ajans`, `btmedya-medya`, `btmedya-agent-visibility` | Boş kurulum şablonları, kullanılmıyor |

GitHub entegrasyonu `btmedya-db` servisine bağlı olsa da `wrangler.toml`
içindeki `name = "btmedya"` sayesinde deploy canlı Worker'a gider.

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
