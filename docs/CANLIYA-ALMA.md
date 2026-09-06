# BTMEDYA — Canlıya Alma Kılavuzu

**R2, D1 ve veritabanı tabloları hesabınızda ZATEN OLUŞTURULDU.**
Geriye sadece 2 iş kaldı: deploy ve şifreler. Yaklaşık 5 dakika.

---

## Sizin adınıza yapılanlar

| İş | Durum |
|---|---|
| R2 medya deposu `btmedya-media` | Oluşturuldu (ENAM) |
| D1 veritabanı `btmedya-media` | Oluşturuldu (Batı Avrupa) |
| `news` tablosu + indeks | Oluşturuldu |
| `media` tablosu + 4 indeks | Oluşturuldu |
| Migration kaydı | İşlendi |
| `wrangler.toml` içine veritabanı ID'si | Yazıldı |

Veritabanı ID'niz: `94a980cd-62c5-4c29-b7fc-40f96ab665e4`

**Migration komutu çalıştırmanıza gerek yok** — tablolar hazır.

---

## Kalan 2 iş

Deploy ve şifre tanımlama, hesabınıza kod yükleme yetkisi gerektirir. Bende bu
yetki yok. Aşağıdakileri kendi bilgisayarınızda çalıştırın.

### Hazırlık

Node.js kurulu olmalı:

```bash
node -v
```

Sürüm görünmüyorsa https://nodejs.org adresinden kurun.

Bu paketin klasörüne girin (içinde `wrangler.toml` olan klasör):

```bash
cd /BU-PAKETIN/KLASORU
npm install -D wrangler@latest
npx wrangler login
npx wrangler whoami
```

`login` tarayıcı açar, **Allow** deyin. `whoami` çıktısında **busetuncuy74**
hesabını görmelisiniz. Başka hesap çıkarsa `npx wrangler logout` yapıp tekrar girin.

---

### İş 1 — Deploy

```bash
npx wrangler deploy
```

Siteyi `www.btmedya.com.tr` adresine yükler.

> Worker'daki mevcut dosyaların üzerine yazar. Alan adı/DNS ayarlarına dokunmaz —
> `wrangler.toml` içindeki routes bloğu bilerek kapalı bırakıldı.

---

### İş 2 — Şifreler

Her komut şifreyi gizli sorar; yazıp Enter'a basın. Her biri otomatik yeni bir
deploy tetikler, bu normaldir.

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET
npx wrangler secret put MEDIA_SIGNING_SECRET
```

| Secret | Ne olmalı |
|---|---|
| `ADMIN_PASSWORD` | `/admin/` paneline gireceğiniz şifre. Aklınızda kalsın ama güçlü olsun. |
| `ADMIN_SESSION_SECRET` | Rastgele uzun dizi. Hatırlamanız gerekmez. |
| `MEDIA_SIGNING_SECRET` | Rastgele uzun dizi. Hatırlamanız gerekmez. |

Rastgele değer üretmek — macOS/Linux:

```bash
openssl rand -base64 32
```

Windows PowerShell:

```powershell
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
```

Opsiyonel, başka bir AI aracına salt-okunur arşiv erişimi için:

```bash
npx wrangler secret put AI_READ_TOKEN
```

---

## Kontrol listesi

Deploy sonrası sırayla açın:

- [ ] `https://www.btmedya.com.tr` — giriş videosu ve hero açılıyor mu?
- [ ] `https://www.btmedya.com.tr/haberler/` — 27 haber listeleniyor mu?
- [ ] Bir habere tıklayın — yazı açılıyor mu?
- [ ] `https://www.btmedya.com.tr/api/health` — şunu döndürmeli:
      `{"ok":true,"service":"btmedya","cms":true,"r2":true}`
      `cms` veya `r2` **false** ise bağlantılar oturmamış, haber verin.
- [ ] `https://www.btmedya.com.tr/admin/` — şifrenizle giriş yapabiliyor musunuz?
- [ ] `https://www.btmedya.com.tr/wrangler.toml` — **404 vermeli.**
      İçerik görünüyorsa `.assetsignore` çalışmamış demektir; **hemen haber verin**,
      bu backend kodunuzun herkese açık olması anlamına gelir.

---

## Sorun giderme

**`/admin/` "Yetkisiz" diyor**
`ADMIN_PASSWORD` tanımlanmamış. İş 2'yi yapın.

**`/api/health` içinde `cms: false` veya `r2: false`**
`wrangler.toml` içindeki `database_id` satırının
`94a980cd-62c5-4c29-b7fc-40f96ab665e4` olduğunu doğrulayın.

**Deploy "worker not found" diyor**
Yanlış Cloudflare hesabındasınız. `npx wrangler whoami` ile kontrol edin.

---

## Hesabınızdaki bir durum

Eski denemelerden kalma **iki boş D1 veritabanı** var:

- `btmedya-d` (3 Eylül, 0 tablo)
- `btmedya-db` (2 Eylül, 0 tablo)

İkisi de tamamen boş ve kullanılmıyor. Silmedim — veri kaybı riski olan işlemleri
onayınız olmadan yapmam. Panelden silebilirsiniz (Storage & Databases > D1) ya da
bana söyleyin sileyim. Boş oldukları için ücret yaratmıyorlar.

---

## Ücretsiz plan sınırları

| Kaynak | Sınır | Sizin için ne demek |
|---|---|---|
| Worker istek | 100.000/gün | Normal trafik için fazlasıyla yeterli |
| R2 depolama | 10 GB | Video yüklerken en önce buraya takılırsınız |
| R2 dış trafik | Ücretsiz | Video izlenmesi ek ücret getirmez |
| D1 satır yazma | 100.000/gün | 1 Eylül 2026'dan beri **katı sınır** |
| D1 depolama | 5 GB | Sadece metin/metadata, bol bol yeter |
| Tek dosya yükleme | 100 MB | Panel 10 MB parçalara böldüğü için sorun olmaz |

Sınırlara yaklaşırsanız Workers Paid ($5/ay) günlük istek sınırını kaldırır.

---

## Sonraki adım: arşivi doldurma

Deploy bitince `/admin/` panelinden:

1. Ham videoları (`btmedya-ham-video-arsivi.zip`) yükleyin.
2. Kategori atayın (Haber, Siyah Oda, AI LAB, Portre, Sosyal).
3. Sitede görünmesini istediklerinize **"Siteye ekle"** deyin.

Yayınladıklarınız `/api/public/media` üzerinden süreli ve imzalı bağlantılarla
sunulur; R2 klasörünüz herkese açık olmaz.
