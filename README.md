# BTMEDYA — btmedya.com.tr

Haber, prodüksiyon ve yapay zekâ ajansı BTMEDYA'nın web sitesi. Cloudflare Workers + D1 + R2 üzerinde çalışan statik site + "Media Vault" arşiv/admin paneli mimarisi.

## Yapı

```
public/
  index.html      Anasayfa (V10.2 sinematik tema)
  styles.css      Site stilleri
  admin/
    index.html    Media Vault yönetim paneli (/admin/)
  robots.txt
  sitemap.xml
  rss.xml         Haber arşivi RSS akışı
docs/
  CANLIYA-ALMA.md Yayına alma kılavuzu (deploy, secrets, kontrol listesi)
  MEDIA-VAULT.md  Media Vault modülü teknik özeti
```

## Durum

Aşağıdakiler henüz depoya eklenmedi, geldikçe entegre edilecek:

- `wrangler.toml` (D1 database ID: `94a980cd-62c5-4c29-b7fc-40f96ab665e4`, R2 bucket: `btmedya-media`)
- `script.js` (hero scroll / GSAP animasyonları)
- Worker backend kaynak kodu (`/api/health`, `/api/media`, `/api/login`, `/api/upload/*`, `/api/admin/news`, `/api/export`, `/api/public/media`)
- `/haberler/` liste ve makale sayfaları (27 haber, bkz. `public/sitemap.xml`)
- `public/assets/` görsel ve video dosyaları
- `site.webmanifest`, favicon

Deploy adımları için `docs/CANLIYA-ALMA.md` dosyasına bakın.
