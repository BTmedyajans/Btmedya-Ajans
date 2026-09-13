# BTMedya Media Vault

BTMedya V10/V12 yayın paketine eklenmek üzere hazırlanmış Cloudflare Worker + R2 + D1 medya arşivi.

## 🎯 Özellikler

- **Yönetim Paneli**: `/admin/` - Tam kontrol ve monitoring
- **Toplu Medya Yükleme**: Fotoğraf, video, ses dosyaları
- **Parçalı Upload (Chunked)**: 10 MB parçalara bölme, devam edebilir multipart upload
- **Büyük Dosya Desteği**: 100 MB Workers Free limitini aşmadan 1 GB+ dosyalar yüklenebilir
- **Merkezi Depolama**: Orijinal medya R2'de, metadata D1'de (ayrılmış yapı)
- **Medya Yönetimi**: Siteye ekle/çıkar, kalıcı silme, recovery
- **Metadata Modeli**: Kategori, etiket, açıklama, görünürlük (public/private)
- **JSON Katalog Exportu**: `/api/export` - AI kanalları için yayınlanmış medya listesi
- **Süreli İmzalı URL'ler**: `/media/...?token=...&expires=...` - 3. taraf uygulamalardan merkezi arşiv erişimi
- **Hız & CDN**: Cloudflare CDN entegrasyonu ile küresel dağıtım

## 🔧 Teknik Gereksinimler

### Ön Koşullar
- Cloudflare hesabı (Free veya üzeri)
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Git

### Limitler & Kota (Free Plan)
| Metrik | Limit | Not |
|--------|-------|-----|
| Daily Requests | 100.000 | Çoğu işlem 1-2 request |
| Request Body | 100 MB | Parçalı upload ile çözülür |
| R2 Storage | İlk 10 GB ücretsiz | Ödenen plan daha ucuz |
| D1 Database | Sınırsız (tahminî 5 GB) | Metadata için yeterli |
| URL Signing | Sınırsız | CPU limitine dahil |

## 📋 Kurulum Adım Adım

### 1. R2 Bucket Oluştur
```bash
# Cloudflare dashboard: Storage > R2
# - Name: btmedya-media
# - Region: Otomatik (önerilir)
# - Bucket versioning: Enable (backup için)
```

### 2. D1 Database Oluştur
```bash
# Cloudflare dashboard: Databases > D1
# - Name: btmedya-media
# - Database ID'yi kopyala (REPLACE_WITH_D1_DATABASE_ID yerine yaz)
```

### 3. Wrangler Konfigürasyonu
```bash
# Repository'yi clone et
git clone https://github.com/BTmedyajans/Btmedya-Ajans
cd Btmedya-Ajans

# wrangler.toml dosyasını düzenle
# database_id = "your-database-id-here"
```

### 4. Database Migration'ları Çalıştır
```bash
# Local test
npx wrangler d1 migrations apply btmedya-media --local

# Production'a deploy
npx wrangler d1 migrations apply btmedya-media --remote
```

### 5. Environment Secrets Ekle
```bash
# Cloudflare Dashboard: Workers > btmedya-media > Settings > Secrets

# Admin paneli password (minimum 12 karakter, güçlü)
wrangler secret put ADMIN_PASSWORD

# Session yönetimi (minimum 32 karakter, random)
wrangler secret put ADMIN_SESSION_SECRET

# URL imzalama için secret (minimum 32 karakter, random)
wrangler secret put MEDIA_SIGNING_SECRET

# (Opsiyonal) Slack webhook - hata bildirimler için
wrangler secret put SLACK_WEBHOOK_URL
```

Güçlü secret oluştur:
```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {[byte](Get-Random -Max 256)}))
```

### 6. Yükleme Kısıtlamaları Yapılandır
`.env` veya `wrangler.toml` içinde ayarla:
```toml
[env.production]
vars = { MAX_FILE_SIZE = "500000000", MAX_CHUNK_SIZE = "10485760", CHUNK_TIMEOUT = "3600" }
# MAX_FILE_SIZE: 500 MB (byte cinsinden)
# MAX_CHUNK_SIZE: 10 MB (byte cinsinden)
# CHUNK_TIMEOUT: 1 saat (saniye cinsinden) - yükleme devam edebilir
```

### 7. Deploy Et
```bash
# Production deploy
npx wrangler deploy

# Veya staging ortamına
npx wrangler deploy --env staging
```

### 8. Admin Paneline Erişim
```
https://btmedya.com.tr/admin/
# veya
https://worker-subdomain.workers.dev/admin/
```

## 📡 API Endpoints

### Admin Paneli
- `GET /admin/` - Yönetim dashboard
- `GET /admin/login` - Login sayfası
- `POST /admin/login` - Login işlemi
- `GET /admin/logout` - Çıkış

### Medya Yönetimi
```bash
# Tüm medyaları listele (admin only)
GET /api/media

# Belirli medyayı getir
GET /api/media/:id

# Medya ekle (admin only)
POST /api/media
Content-Type: multipart/form-data
- file: (binary)
- title: string
- description: string (optional)
- category: string (optional)
- tags: string (comma-separated, optional)
- visibility: "public" | "private"

# Medya güncelle (admin only)
PUT /api/media/:id
Content-Type: application/json
- title, description, category, tags, visibility

# Medya sil (soft delete, admin only)
DELETE /api/media/:id

# Kalıcı olarak sil (hard delete, admin only)
DELETE /api/media/:id?force=true

# Medya recover (soft delete'ten geri al, admin only)
POST /api/media/:id/restore
```

### Yayınlanan Medya
```bash
# Yayınlanan medya JSON katalog (public)
GET /api/export
Query params:
  - category: string (filter)
  - format: "json" | "csv" | "xml"
  - limit: number (default: 1000)

# Medyayı indir (süreli imzalı URL)
GET /media/:id
Query params:
  - token: signed token (otomatik)
  - expires: timestamp
  - format: "original" | "thumbnail" | "preview"
```

### Parçalı Upload
```bash
# Upload session başlat
POST /api/upload/init
Content-Type: application/json
{
  "filename": "large-video.mp4",
  "filesize": 524288000,
  "mimetype": "video/mp4"
}
Response: { uploadId, chunkSize, totalChunks }

# Chunk yükle
POST /api/upload/chunk/:uploadId/:chunkNumber
Content-Type: application/octet-stream
[binary chunk data]

# Upload tamamla
POST /api/upload/complete/:uploadId
Content-Type: application/json
{
  "title": "Video Başlığı",
  "description": "Açıklama",
  "category": "Reklamlar",
  "tags": "tag1,tag2",
  "visibility": "public"
}
```

## 🛡️ Güvenlik

### Authentication
- Admin paneli: Basic Auth + Session Cookies
- API: Bearer Token (future)
- Rate limiting: 100 req/min per IP

### Encryption
- Secrets: Cloudflare managed (encrypted at rest)
- URL Signing: HMAC-SHA256
- Data in Transit: TLS 1.3+

### Best Practices
```bash
# 1. Secrets'ı hiçbir zaman commit etme
echo "ADMIN_PASSWORD=****" >> .gitignore

# 2. Düzenli backups
npx wrangler d1 backup btmedya-media

# 3. Access logs monitoring
# Cloudflare Analytics > Workers > btmedya-media

# 4. CORS yapılandır (ai-tools için)
# wrangler.toml içinde:
# routes = [
#   { pattern = "btmedya.com.tr/media/*", zone_name = "btmedya.com.tr", custom_domain = true }
# ]
```

## 🚀 Performance İpuçları

### Optimization
- **Resim Thumbnail'ı**: Cloudflare Image Resizing kullan
- **Video Streaming**: MP4 progressive download destekli
- **Cache Headers**: 30 gün cache (immutable content için)
- **Compression**: Gzip/Brotli otomatik

### Monitoring
```bash
# Request count
curl https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/analytics/workers/queues

# Error logs
wrangler tail

# Performance metrics
wrangler metrics
```

## 🐛 Troubleshooting

### Problem: "413 Payload Too Large"
**Çözüm**: Chunk size'ı 10 MB'ın altında tutun veya parçalı upload kullan
```javascript
const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB
```

### Problem: "Database quota exceeded"
**Çözüm**: Eski medya log'ları arşivle veya Pro plana yükselt
```bash
# Soft delete'leri temizle
DELETE FROM media WHERE deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Problem: "R2 multipart upload timeout"
**Çözüm**: Timeout süresi ve retry logic'i arttır
```javascript
const UPLOAD_TIMEOUT = 3600000; // 1 saat
const MAX_RETRIES = 3;
```

### Problem: "/admin/ sayfası boş/yüklemiyor"
**Çözüm**: 
- Browser console'da hata kontrol et
- Cookies enabled mi kontrol et
- ADMIN_SESSION_SECRET'ün set olduğunu kontrol et

## 📊 Database Şeması

```sql
-- Media tablosu
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mimetype TEXT,
  filesize INTEGER,
  title TEXT,
  description TEXT,
  category TEXT,
  tags TEXT, -- JSON array string
  visibility TEXT DEFAULT 'private', -- 'public' | 'private'
  r2_key TEXT NOT NULL UNIQUE,
  r2_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME, -- Soft delete
  created_by TEXT,
  metadata JSON -- Extra fields (width, height, duration, etc.)
);

-- Upload sessions (chunks tracking)
CREATE TABLE upload_sessions (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  filesize INTEGER,
  chunk_size INTEGER,
  total_chunks INTEGER,
  completed_chunks INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'failed'
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Access logs
CREATE TABLE access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (media_id) REFERENCES media(id)
);
```

## 📦 Deployment Ortamları

### Development (Local)
```bash
wrangler dev
# http://localhost:8787
```

### Staging
```bash
wrangler deploy --env staging
# https://btmedya-staging.workers.dev
```

### Production
```bash
wrangler deploy --env production
# https://btmedya.com.tr (custom domain ile)
```

## 🔗 Entegrasyon Örnekleri

### WordPress Eklentisi
```php
<?php
$api_url = 'https://btmedya.com.tr/api/media';
$export_url = 'https://btmedya.com.tr/api/export';

// Medya import
$media_list = json_decode(file_get_contents($export_url), true);
foreach ($media_list as $item) {
    // WordPress media library'ye ekle
}
?>
```

### AI Tools Integration (Make.com, Zapier, etc.)
```json
{
  "webhook": "https://btmedya.com.tr/api/media",
  "method": "GET",
  "params": {
    "category": "Reklamlar",
    "format": "json",
    "token": "signed_token_here"
  }
}
```

## 📝 Lisans & Destek

- **Lisans**: Proprietary (BTMedya)
- **Support**: issues@btmedya.com.tr
- **Dokümantasyon**: [GitHub Wiki](https://github.com/BTmedyajans/Btmedya-Ajans/wiki)
- **Status**: https://status.btmedya.com.tr

## ⚠️ Bilinen Sınırlamalar & Kısıtlamalar

| Sınırlama | Limit | Çözüm |
|-----------|-------|-------|
| Tek dosya boyutu | 5 TB (R2) | Parçalı upload kullan |
| Daily requests | 100.000 | Pro plana yükselt |
| Request body | 100 MB | Chunks: 10 MB |
| Session timeout | 1 saat | Re-login gerekli |
| Concurrent uploads | 10/IP | Sırayla yükle |
| Database backups | Manuel | Cloudflare backup tools |

## 🎓 Sonraki Adımlar

1. ✅ Kurulumu tamamla
2. ✅ Test medya yükle
3. ✅ Admin paneline giriş yap
4. ✅ Categories ve Tags ekle
5. ✅ Siteye medya entegre et
6. ✅ Backup schedule kur
7. ✅ Monitoring alerts ayarla
