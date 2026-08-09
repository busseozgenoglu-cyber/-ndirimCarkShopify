import { redirect } from "react-router";
import { Form, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  let durum = "ok";
  let magazaAdi = null;
  let hata = null;
  let scope = null;

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

  // Mevcut session scope'unu göster
  try {
    const dbSession = await prisma.session.findFirst({
      where: { shop: session.shop },
      select: { scope: true, accessToken: true },
    });
    scope = dbSession?.scope ?? "(boş)";
  } catch (_) {}

  return { durum, magazaAdi, hata, shop: session.shop, scope };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Tüm oturumları sil — bir sonraki yüklemede OAuth yeniden çalışır.
  try {
    await prisma.session.deleteMany({ where: { shop } });
  } catch (e) {
    console.error("Oturumlar silinemedi:", e?.message || e);
  }

  // /app'e yönlendir — authenticate.admin oturum olmadığını görünce OAuth başlatır.
  return redirect("/app");
};

export default function BaglantiTest({ loaderData }) {
  const { durum, magazaAdi, hata, shop, scope } = loaderData;
  const navigation = useNavigation();
  const gonderiliyor = navigation.state === "submitting";

  return (
    <s-page heading="Shopify Bağlantı Durumu">
      {durum === "ok" ? (
        <s-banner tone="success" heading="Bağlantı başarılı">
          <s-paragraph>
            Mağaza: <strong>{magazaAdi}</strong>. GraphQL API bağlantısı
            çalışıyor.
          </s-paragraph>
          <s-paragraph>Mevcut scope: <code>{scope}</code></s-paragraph>
        </s-banner>
      ) : (
        <s-banner tone="critical" heading="Shopify bağlantısı başarısız">
          <s-paragraph>
            Hata: <code>{hata}</code>
          </s-paragraph>
          <s-paragraph>Mevcut scope: <code>{scope}</code></s-paragraph>
          <s-paragraph>
            Kök neden: Token geçersiz veya eksik scope. Oturumu silip OAuth'u
            yeniden çalıştırmak gerekiyor.
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="Oturumu Yenile (Token Sıfırla)">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Çarkı çevirince <em>"İndirim kodu oluşturulamadı"</em> veya{" "}
            <em>"Bir sorun oluştu"</em> hatası alıyorsanız buradan token'ı
            sıfırlayın. Oturum silinir ve Shopify yeni izin onayı ister;
            onaylayınca her şey düzelir.
          </s-paragraph>
          <s-paragraph>
            Mağaza: <strong>{shop}</strong>
          </s-paragraph>
          <Form method="post">
            <s-button
              variant="primary"
              tone="critical"
              type="submit"
              disabled={gonderiliyor || undefined}
            >
              {gonderiliyor
                ? "Oturum siliniyor…"
                : "Oturumu Sil ve Yeniden Bağlan"}
            </s-button>
          </Form>
        </s-stack>
      </s-section>
    </s-page>
  );
}
