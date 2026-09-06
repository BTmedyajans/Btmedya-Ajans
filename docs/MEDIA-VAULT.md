# BTMedya Media Vault

BTMedya V10/V12 yayın paketine eklenmek üzere hazırlanmış Cloudflare Worker + R2 + D1 medya arşivi.

## Özellikler
- Yönetim paneli: `/admin/`
- Toplu fotoğraf/video/ses yükleme
- 10 MB parçalı, devam edebilir multipart upload; 100 MB Workers Free request limitine takılmadan büyük dosyaları parçalara böler
- Orijinal medya R2'de, metadata D1'de
- Siteye ekle/çıkar ve kalıcı silme
- Kategori, etiket ve açıklama alanları için D1 modeli hazır
- `/api/export` yayınlanmış medyaları AI kanallarında kullanılabilecek JSON katalog olarak verir
- `/media/...?...` süreli imzalı medya URL'leri üretir; üçüncü taraf AI araçları URL kabul ediyorsa merkezi arşivden medya çekebilir

## Kurulum
1. Cloudflare'da `btmedya-media` adlı R2 bucket oluştur.
2. `btmedya-media` adlı D1 database oluştur ve ID'yi `wrangler.toml` içindeki `REPLACE_WITH_D1_DATABASE_ID` alanına yaz.
3. Migration çalıştır: `npx wrangler d1 migrations apply btmedya-media --remote`
4. Secrets ekle:
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `MEDIA_SIGNING_SECRET`
5. Deploy: `npx wrangler deploy`
6. `btmedya.com.tr/admin/` yolunu aç.

## Not
Cloudflare Workers Free günlük 100.000 request ve 100 MB request-body sınırına sahiptir. Uygulama her büyük dosyayı 10 MB parçalara bölerek R2 multipart API'ye gönderir. R2 tek objede 5 TiB'e kadar multipart upload destekler. Ücretsiz R2 katmanı 10 GB-month depolama, 1 milyon Class A ve 10 milyon Class B işlem içerir; egress ücretsizdir. Limitler aşıldığında Cloudflare ücretlendirmesi başlar.
