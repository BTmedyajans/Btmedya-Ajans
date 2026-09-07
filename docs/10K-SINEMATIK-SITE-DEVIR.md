# Sinematik Scroll Sitesi — Devir Notu

Bu not, `10k-websites` becerisiyle yapılacak sinematik scroll sitesi çalışmasının
nereden devam edeceğini anlatır. Bulut oturumunda hazırlandı, masaüstü Claude Code
oturumunda devam edilecek.

Tarih: 2026-09-07
Dal: `claude/new-session-onanb3`

---

## 1. Neden masaüstüne taşındı

Beceri üç araca dayanıyor: Claude Code siteyi kurar, Higgsfield tüm görsel ve
videoyu üretir, Hostinger yayına alır.

Bulut oturumunda Higgsfield araçları yanıt vermedi. Hesaba bağlı tüm konektörler
listelendi; Higgsfield hesap seviyesinde kayıtlı değil. Konektör masaüstü
uygulamasına eklenmişse bulut konteynerine ulaşmaz. Bu yüzden iş masaüstüne alındı.

Ek sebep: bulut konteyneri geçici. Üretilen ham video ve görseller push edilmezse
oturum kapandığında kaybolur. Masaüstünde dosyalar kalıcı, önizleme sunucusu da
kendi tarayıcınızda açılıyor.

## 2. Kurulum durumu (Faz 1)

| Araç | Durum | Not |
|---|---|---|
| ffmpeg | Bulutta kuruldu, 6.1.1 | **Masaüstünde ayrıca doğrulanmalı.** Bu kurulum konteynere aitti, sizin makinenize değil. |
| Node.js | Bulutta v22.22.2 | Aynı şekilde masaüstünde doğrulanmalı. |
| Higgsfield | Doğrulanmadı | Masaüstü oturumunda ilk iş: araçların yanıt verdiğini ve kredi bakiyesini teyit etmek. |
| Hostinger | Bağlı değil | Faz 10'a kadar gündeme gelmez. Aşağıdaki 4. maddeye bakın. |

Masaüstünde Faz 1 taraması sıfırdan tekrar çalıştırılmalı. "Bulutta kurulmuştu"
bir doğrulama değildir.

## 3. Bu oturumda yapılanlar

- Beceri depoya kalıcı olarak kuruldu: `.claude/skills/10k-websites/`
  (SKILL.md + altı referans dosyası). Masaüstü oturumu bu klasörü otomatik yükler,
  yani beceriyi tekrar sohbete sürüklemeye gerek yok.
- Mevcut sitenin marka ve teknik envanteri çıkarıldı (aşağıda).
- Hiçbir kredi harcanmadı. Hiçbir görsel veya video üretilmedi.

## 4. Açık kalan iki karar

Bunlar yaratıcı işten önce netleşmeli. İkisi de kullanıcının kararı.

**a) Yayın yeri: Cloudflare mi, Hostinger mı?**

Beceri Hostinger üzerinden yayına almayı şart koşuyor. Ancak BTMEDYA sitesi şu an
Cloudflare Workers üzerinde canlı ve `btmedya.com.tr` alan adı `btmedya-db`
Worker'ına bağlı. İki gerçek seçenek var:

- Sinematik sayfa bu depoya `public/` altına girer ve mevcut Cloudflare akışıyla
  yayınlanır. Alan adı yerinde kalır, ek maliyet yok. Bu durumda becerinin Faz 10
  Hostinger adımı uygulanmaz ve bu sapma açıkça belirtilmelidir.
- Sinematik sayfa ayrı bir statik site olarak Hostinger'a çıkar. Bu, ayrı bir
  adres veya alan adı taşıması demek, ve aylık hosting ücreti demek.

Öneri: birincisi. Sebep tek cümle: alan adı ve altyapı zaten çalışıyor, ikinci bir
hosting katmanı yeni bir sorun kaynağı olur.

**b) Sinematik sayfa neyin sitesi olacak?**

Netleşmedi. Üç makul seçenek:
- Anasayfanın yerini alacak yeni bir BTMEDYA anasayfası
- BTMEDYA'nın bir hizmet dalı için ayrı iniş sayfası (ör. AI prodüksiyon)
- Bir müşteri işi, BTMEDYA'nın portfolyosuna girecek örnek çalışma

Bu cevap Faz 2'nin ilk sorusudur ve tüm görsel planı belirler.

## 5. Mevcut sitenin envanteri (Faz 2 ve 3 için girdi)

### Marka değerleri (public/styles.css içinden)

```
--bg:#02070d   --bg2:#07111c   --ink:#eaf2f8   --muted:#8da0b2
--cyan:#35d6ff  --blue:#2a7fff  --gold:#d6a84a  --champagne:#f2d27a
```

Yazı tipleri: Space Grotesk (başlık), Manrope (gövde), Inter (yüklü ama başlıkta
kullanılmıyor).

Beceri kuralı hatırlatması: Inter ve Roboto başlık yüzü olarak yasak. Space Grotesk
başlık olarak sorun değil. Ancak koyu lacivert zemin + camgöbeği vurgu kombinasyonu
teknoloji sitelerinde çok yaygın; beceri "yapay zekâ yapmış gibi duran" görünümlere
karşı uyarıyor. Yeni sayfanın paleti, üretilecek görüntünün kendi dünyasından
örneklenmeli. Mevcut palet bir başlangıç noktası, bağlayıcı bir kural değil.

### Mevcut hero yapısı

Anasayfada zaten scroll ile ilerleyen bir hero var: `.hero-scroll` 620vh yükseklik,
içinde `.hero-sticky` sabit sahne. Yani sayfa mimarisi tanıdık. Fark şu: mevcut
kurulum scroll ile videoyu **kare kare sarmıyor**, sadece katmanları hareket
ettiriyor ve durum videolarını değiştiriyor.

### Mevcut video varlıkları

`public/assets/media/web/` altında yedi mp4, toplam ~10.5 MB.
`hero-bg.mp4`: 1280x720, 13.4 saniye, 3.1 MB, h264.

**Önemli teknik tespit:** bu videoların anahtar kare aralığı ölçüldü, yaklaşık 30
karede bir. Scrub için gereken değer 8. Yani mevcut videolar scroll ile sarmalı
kullanılırsa takılır. Kullanılacaklarsa `ffmpeg-recipes.md` içindeki scrub
encode komutuyla `-g 8 -keyint_min 8` ile yeniden kodlanmalı. Bu kredi
gerektirmez, sadece ffmpeg işidir.

## 6. Masaüstünde ilk adımlar

1. Depoyu çekin, `claude/new-session-onanb3` dalına geçin.
2. Claude Code'u proje klasöründe açın. Beceri `.claude/skills/` altından
   otomatik yüklenir.
3. Faz 1 taramasını baştan çalıştırın: ffmpeg, Node.js, Higgsfield araçları,
   Higgsfield kredi bakiyesi. Her birini çalıştırarak doğrulayın.
4. Kredi bakiyesi görüldükten sonra dürüst maliyet konuşması yapılır.
5. Sonra Faz 2 başlar: 4b maddesindeki soru ile.

Yaratıcı işe kredi bakiyesi görülmeden başlanmaz.
