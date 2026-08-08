# App Store Gönderim Kontrol Listesi

Uygulamayı Shopify App Store'a göndermeden önce bu listeyi baştan sona geçin.
İşaretli maddeler kodda **zaten tamamlanmıştır**; boş kutular sizin yapmanız
gereken adımlardır.

---

## Kodda tamamlananlar

- [x] Geçerli ve güncel API sürümü (`2026-07`) — hem `shopify.app.toml` hem kod
- [x] Yalnızca gerekli yetkiler isteniyor (`write_discounts`, `write_customers`)
- [x] OAuth ve oturum yönetimi resmi kütüphaneyle
- [x] `entry.server.jsx` ile CSP `frame-ancestors` başlıkları — gömülü iframe çalışır
- [x] App Bridge yükleniyor, uygulama Shopify admin içinde açılıyor
- [x] Polaris web bileşenleriyle admin görünümü
- [x] `app/uninstalled` bildirimi — oturumlar temizleniyor
- [x] `app/scopes_update` bildirimi
- [x] Üç zorunlu gizlilik bildirimi **gerçek silme işlemi yapıyor**
- [x] App proxy imzası resmi `authenticate.public.appProxy` ile doğrulanıyor
- [x] Tema uygulama yerleştirmesi — merchant'ın tema koduna dokunması gerekmiyor
- [x] Çark yüklenemezse mağaza normal çalışmaya devam ediyor (hata yalıtımı)
- [x] Kişisel veriler tek yönlü özetleniyor, ham IP saklanmıyor
- [x] Hız sınırı ve tekrar sınırı
- [x] Erişilebilirlik: klavye ile kapatma (ESC), odak tuzağı, `aria` etiketleri,
      `prefers-reduced-motion` desteği
- [x] Mobil uyumlu vitrin arayüzü
- [x] Çok dilli tema uzantısı çevirileri (tr, en)

---

## Sizin yapmanız gerekenler

### 1. Barındırma
- [ ] Uygulamayı kalıcı bir sunucuya kurun (Fly.io, Render, Railway, VPS…)
- [ ] **PostgreSQL** kullanın — `prisma/schema.prisma` içindeki `provider`
      satırını `postgresql` yapın, sonra `npx prisma migrate dev` çalıştırın
- [ ] `SHOPIFY_APP_URL` değerini gerçek alan adınıza ayarlayın
- [ ] Uygulamanın 7/24 ayakta olduğundan emin olun (inceleme sırasında test edilir)

### 2. Partner panelinde uygulama listesi
- [ ] Uygulama adı, simgesi (1200×1200 px) ve kısa açıklaması
- [ ] En az 3 ekran görüntüsü (1600×900 px önerilir)
- [ ] Tanıtım videosu (isteğe bağlı ama dönüşümü artırır)
- [ ] Fiyatlandırma bilgisi
- [ ] **Gizlilik politikası bağlantısı** (zorunlu)
- [ ] Destek e-postası ve destek sayfası bağlantısı

### 3. Yasal metinler
- [ ] Gizlilik politikanızda şunları belirtin: toplanan e-posta adresleri, ne
      kadar süre saklandığı, kimlerle paylaşıldığı, silme talebi süreci
- [ ] Kampanya koşulları sayfası hazırlayın ve uygulama ayarlarındaki
      “Gizlilik bağlantısı adresi” alanına girin

### 4. Fiyatlandırma (ücretli yapacaksanız)
- [ ] Shopify Billing API entegrasyonu ekleyin — App Store, ödeme almak için
      **kendi ödeme sisteminizi kullanmanıza izin vermez**
- [ ] Ücretsiz deneme süresi tanımlayın

### 5. Test
- [ ] Temiz bir geliştirme mağazasına baştan kurun, akışı uçtan uca deneyin
- [ ] En az 2 farklı temada test edin (Dawn + ücretli bir tema)
- [ ] Mobilde test edin
- [ ] Uygulamayı kaldırıp yeniden kurun — hata vermemeli
- [ ] Kazanılan kodu gerçekten ödeme adımında deneyin
- [ ] Aynı kodu ikinci kez kullanmayı deneyin — reddedilmeli
- [ ] İnceleme ekibi için test hesabı ve adım adım talimat hazırlayın

### 6. Performans
- [ ] Vitrin betiği Lighthouse skorunu düşürmemeli — Shopify bunu ölçüyor
- [ ] Tema düzenleyicisinde çarkın açılmadığını doğrulayın (kodda engelli)

---

## Sık karşılaşılan ret sebepleri

| Sebep | Bu projedeki durum |
|---|---|
| Gizlilik bildirimleri yanıt vermiyor veya veri silmiyor | ✅ Çözüldü |
| Gereksiz yetki isteniyor | ✅ Yalnızca 2 yetki |
| Uygulama iframe içinde açılmıyor (CSP) | ✅ Çözüldü |
| Merchant'ın tema koduna elle kod eklemesi isteniyor | ✅ App embed kullanılıyor |
| Uygulama URL'si yanıt vermiyor | ⬜ Barındırma sizin sorumluluğunuzda |
| Gizlilik politikası bağlantısı yok | ⬜ Sizin eklemeniz gerekir |
| Kendi ödeme sistemi kullanılıyor | ⬜ Ücretliyse Billing API gerekir |
| Vitrin performansını düşürüyor | ✅ Tek küçük JS + CSS, `defer` ile |

---

## Bakım

Shopify her çeyrekte yeni API sürümü yayınlar ve her sürümü 12 ay destekler.
Üç ayda bir şu iki yeri güncelleyin:

1. `shopify.app.toml` → `[webhooks] api_version`
2. `app/shopify.server.js` → `API_SURUMU`
3. `extensions/indirim-carki/shopify.extension.toml` → `api_version`
