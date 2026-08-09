import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/**
 * Bu route'un iki görevi var:
 * 1. GET: Admin'in Shopify GraphQL token'ını test eder.
 * 2. POST action=yenile: Oturumu siler → OAuth'u yeniden başlatır.
 */

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  let durum = "ok";
  let magazaAdi = null;
  let hata = null;

  try {
    const cevap = await admin.graphql(`{ shop { name } }`);
    const json = await cevap.json();
    magazaAdi = json?.data?.shop?.name ?? null;
    if (!magazaAdi) {
      durum = "hata";
      hata = JSON.stringify(json?.errors ?? json);
    }
  } catch (e) {
    durum = "hata";
    hata = e?.message || String(e);
  }

  return { durum, magazaAdi, hata, shop: session.shop };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Tüm oturumları sil — bir sonraki admin ziyaretinde OAuth yeniden çalışır.
  try {
    await prisma.session.deleteMany({ where: { shop } });
  } catch (e) {
    console.error("Oturumlar silinemedi:", e?.message || e);
  }

  // OAuth yeniden başlatmak için ana sayfaya yönlendir.
  return redirect(`/auth?shop=${shop}`);
};

export default function BaglantiTest({ loaderData }) {
  const { durum, magazaAdi, hata, shop } = loaderData;

  function yenile() {
    fetch("/app/baglanti", { method: "POST" }).then(() => {
      window.location.href = `/auth?shop=${shop}`;
    });
  }

  return (
    <s-page heading="Shopify Bağlantı Durumu">
      {durum === "ok" ? (
        <s-banner tone="success" heading="Bağlantı başarılı">
          <s-paragraph>
            Mağaza adı: <strong>{magazaAdi}</strong>. Shopify GraphQL API
            bağlantısı çalışıyor; indirim kodu oluşturulabilir.
          </s-paragraph>
        </s-banner>
      ) : (
        <s-banner tone="critical" heading="Shopify bağlantısı başarısız">
          <s-paragraph>
            GraphQL API ile bağlantı kurulamadı. Hata: <code>{hata}</code>
          </s-paragraph>
          <s-paragraph>
            "Oturumu Yenile" düğmesine basın. Shopify sizi tekrar giriş
            ekranına yönlendirecek; izinleri onaylayınca yeni bir token
            alınır ve sorun çözülür.
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="Oturumu Yenile">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Eğer çarkı çevirince <em>"İndirim kodu oluşturulamadı"</em> hatası
            alıyorsanız, aşağıdaki düğmeye basarak Shopify iznini yenileyin.
            Bu işlem oturumu sıfırlar ve Shopify sizden tekrar izin onayı
            ister — kaç saniye sürer, ardından her şey normal çalışmaya devam
            eder.
          </s-paragraph>
          <s-button variant="primary" tone="critical" onClick={yenile}>
            Oturumu Sil ve Yeniden Bağlan
          </s-button>
        </s-stack>
      </s-section>
    </s-page>
  );
}
