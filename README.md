# İndirim Çarkı — Shopify Uygulaması

Ziyaretçileri e-posta karşılığında çark çevirmeye davet eden, kazananlara
**tek kullanımlık ve kişiye özel** indirim kodu üreten Shopify uygulaması.

- **Uygulama tipi:** Gömülü (embedded) admin uygulaması + tema uygulama yerleştirmesi
- **Teknoloji:** React Router 7, Prisma, Shopify App React Router kütüphanesi
- **API sürümü:** 2026-07 (Ağustos 2026 itibarıyla en güncel kararlı sürüm)

---

## Öne çıkan özellikler

| Alan | Neler yapılabiliyor |
|---|---|
| **Ödüller** | 2–20 arası dilim; yüzde indirim, tutar indirimi, ücretsiz kargo, kendi kodunuz veya ödülsüz |
| **Yazılar** | Ziyaretçinin gördüğü **her metin** panelden düzenlenebilir (30'a yakın alan) |
| **Görünüm** | 6 ayrı renk, boyut, konum, köşe yuvarlaklığı, arka plan karartması, logo, yazı tipi |
| **Görünme kuralları** | Gecikmeli açılma, çıkış niyeti, kaydırma yüzdesi, sayfa hedefleme, cihaz hedefleme, kampanya tarih aralığı, kişi başı tekrar sınırı |
| **Kodlar** | Kişiye özel kod, `usageLimit: 1`, son kullanma tarihi, minimum sepet tutarı, özelleştirilebilir kod öneki |
| **Katılımcılar** | Sayfalı liste, özet istatistikler, CSV dışa aktarımı, pazarlama izni takibi |

### Adalet ve güvenlik

Kazanan dilime **her zaman sunucu** karar verir. Tarayıcıya gönderilen
yapılandırmada dilim ağırlıkları ve indirim kodları **hiç yer almaz**;
animasyon yalnızca sunucudan gelen sonucu gösterir. Ziyaretçi tarayıcı
araçlarıyla sonucu değiştiremez.

Ek korumalar: app proxy imza doğrulaması, IP başına saatlik hız sınırı,
e-posta başına tekrar sınırı, CSV enjeksiyonu koruması, kişisel verilerin
tek yönlü özet (HMAC-SHA256) ile eşleştirilmesi.

---

## Kurulum

### Gereksinimler

- Node.js 20.19+ (veya 22.12+) — `node -v` ile kontrol edin
- Bir [Shopify Partner](https://partners.shopify.com) hesabı
- Bir geliştirme mağazası

### Adımlar

```bash
npm install

# Projeyi Partner hesabınızdaki uygulamaya bağlar
# (yoksa yenisini oluşturmayı teklif eder)
npm run config:link

# Yerel geliştirme sunucusunu ve tüneli başlatır
npm run dev
```

`npm run dev` ilk çalıştığında `.env` dosyasını, tünel adresini ve
`shopify.app.toml` içindeki `client_id` alanını otomatik doldurur.

### Çarkı vitrinde görünür yapma

1. Uygulama panelinde **Çarkı yayına al** anahtarını açıp kaydedin
2. Shopify admin → **Görünüm → Özelleştir**
3. Sol menüde **Uygulama yerleştirmeleri** → “İndirim Çarkı” anahtarını açın
4. **Kaydet** deyin

---

## Üretime alma

```bash
# 1. Kalıcı bir veritabanı hazırlayın (PostgreSQL önerilir)
#    prisma/schema.prisma içindeki provider satırını da güncelleyin:
#      provider = "postgresql"

# 2. Sunucuda ortam değişkenlerini tanımlayın (.env.example dosyasına bakın)

# 3. Derleyip başlatın
npm run setup   # prisma generate && prisma migrate deploy
npm run build
npm start
```

Docker ile:

```bash
docker build -t indirim-carki .
docker run -p 3000:3000 --env-file .env indirim-carki
```

> **Önemli:** SQLite yalnızca geliştirme içindir. Fly.io, Render, Heroku gibi
> platformlarda dosya sistemi kalıcı olmadığından oturumlar kaybolur ve
> uygulama sürekli yeniden yetkilendirme ister.

Uzantıları yayınlamak için:

```bash
npm run deploy
```

---

## Proje yapısı

```
app/
  cark.ortak.js          Ayar şeması, doğrulama, ağırlıklı seçim (istemci+sunucu)
  cark.server.js         Ayarların veritabanına okunup yazılması
  indirim.server.js      Shopify indirim kodu ve müşteri kaydı işlemleri
  guvenlik.server.js     Hash'leme, hız sınırı, e-posta doğrulama, kod üretimi
  shopify.server.js      Shopify kütüphanesi yapılandırması
  entry.server.jsx       CSP başlıkları (gömülü iframe için zorunlu)
  components/
    alanlar.jsx          Polaris web bileşenleri için React sarmalayıcıları
    CarkOnizleme.jsx     Panel içi canlı çark önizlemesi
  routes/
    app._index.jsx       Ana ayar ekranı
    app.katilimcilar.jsx Katılımcı listesi ve istatistikler
    app.yardim.jsx       Kurulum rehberi
    proxy.config.jsx     Vitrine ayar servisi (GET)
    proxy.spin.jsx       Çevirme işlemi (POST) — sonucu sunucu belirler
    webhooks.*.jsx       Kaldırma, yetki güncelleme, GDPR bildirimleri
extensions/indirim-carki/
  blocks/                Tema uygulama yerleştirmesi (liquid)
  assets/                Vitrin JS ve CSS
  locales/               Tema düzenleyicisi çevirileri
prisma/                  Veritabanı şeması ve göçleri
```

---

## Yetkiler (scopes)

Yalnızca gerçekten kullanılan iki yetki istenir:

- `write_discounts` — kazananlar için indirim kodu üretmek
- `write_customers` — (isteğe bağlı özellik) katılımcıyı müşteri listesine eklemek

---

## Gizlilik ve GDPR

Shopify’ın zorunlu üç gizlilik bildirimi **gerçekten uygulanmıştır**
(`app/routes/webhooks.compliance.jsx`):

| Bildirim | Davranış |
|---|---|
| `customers/data_request` | İlgili kayıtlar toplanır ve mağaza sahibine iletilmek üzere kaydedilir |
| `customers/redact` | O e-postaya ait tüm katılım kayıtları silinir |
| `shop/redact` | Mağazaya ait ayarlar, katılımcılar, sayaçlar ve oturumlar silinir |

E-posta ve IP adresleri eşleştirme amacıyla HMAC-SHA256 ile özetlenerek ayrıca
saklanır; ham IP adresi hiçbir zaman kaydedilmez.

---

## Lisans

Özel kullanım. Tüm hakları saklıdır.
