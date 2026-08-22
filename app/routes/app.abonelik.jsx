import { authenticate } from "../shopify.server";

/**
 * Planlar Partner panelinde tanımlı (Managed Pricing), ödeme akışını Shopify
 * yürütüyor. Uygulama içinde plan seçimine giden görünür bir yol bulunmadığı
 * için App Store incelemesi 1.2.2'den geri döndü — bu sayfa o yolu sağlıyor.
 */

// shopify.app.toml içindeki "handle" ile aynı olmalı.
const UYGULAMA_HANDLE = process.env.SHOPIFY_APP_HANDLE || "indirim-carki";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const magaza = session.shop.replace(".myshopify.com", "");

  let aktifMi = false;
  let abonelikler = [];
  let durumOkunabildi = true;

  try {
    const sonuc = await billing.check();
    aktifMi = Boolean(sonuc?.hasActivePayment);
    abonelikler = sonuc?.appSubscriptions ?? [];
  } catch (hata) {
    // Abonelik durumu okunamazsa sayfayı boş bırakmak yerine planlara giden
    // bağlantıyı yine gösteriyoruz; aksi halde merchant hiçbir şey yapamaz.
    console.error("Abonelik durumu okunamadi:", hata);
    durumOkunabildi = false;
  }

  return {
    aktifMi,
    abonelikler,
    durumOkunabildi,
    planlarLinki: `https://admin.shopify.com/store/${magaza}/charges/${UYGULAMA_HANDLE}/pricing_plans`,
  };
};

export default function Abonelik({ loaderData }) {
  const { aktifMi, abonelikler, durumOkunabildi, planlarLinki } = loaderData;
  const mevcutPlan = abonelikler[0];

  return (
    <s-page heading="Abonelik">
      <s-section heading="Planınız">
        {aktifMi && mevcutPlan ? (
          <>
            <s-paragraph>
              Şu anda <strong>{mevcutPlan.name}</strong> planındasınız. Çark ve
              indirim kodu üretimi dahil tüm özellikler açık.
            </s-paragraph>
            <s-paragraph>
              Planınızı değiştirmek veya aboneliğinizi iptal etmek için:
            </s-paragraph>
          </>
        ) : (
          <>
            <s-paragraph>
              Henüz aktif bir aboneliğiniz yok.{" "}
              <strong>Pro planı 15 gün ücretsiz</strong> deneyebilirsiniz, deneme
              bitmeden iptal ederseniz ücret alınmaz.
            </s-paragraph>
            {!durumOkunabildi && (
              <s-paragraph>
                Abonelik durumunuz şu anda okunamadı. Aşağıdaki bağlantıdan
                planlarınızı yine de görüntüleyebilirsiniz.
              </s-paragraph>
            )}
          </>
        )}

        <s-link href={planlarLinki} target="_top">
          {aktifMi ? "Planı yönet" : "Planları gör ve aboneliği başlat"}
        </s-link>
      </s-section>

      <s-section heading="Pro planına dahil olanlar">
        <s-unordered-list>
          <s-list-item>Sınırsız çark gösterimi</s-list-item>
          <s-list-item>Otomatik indirim kodu üretimi</s-list-item>
          <s-list-item>Katılımcı listesi ve CSV dışa aktarma</s-list-item>
          <s-list-item>Kampanya tarihi, sayfa ve cihaz hedefleme</s-list-item>
          <s-list-item>Çark tasarımı ve ödül ayarları</s-list-item>
        </s-unordered-list>
        <s-paragraph>
          Ücretlendirme Shopify üzerinden yapılır ve mağazanızın Shopify
          faturasına yansır.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
