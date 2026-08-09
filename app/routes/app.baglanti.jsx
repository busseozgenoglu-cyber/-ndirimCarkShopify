import { redirect, Form, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { odulKoduOlustur } from "../indirim.server";

const GEREKLI_SCOPE = "write_discounts";

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

  try {
    const dbSession = await prisma.session.findFirst({
      where: { shop: session.shop },
      select: { scope: true },
    });
    scope = dbSession?.scope ?? "(boş)";
  } catch {
    scope = "(okunamadı)";
  }

  const scopeEksik = !String(scope || "").includes(GEREKLI_SCOPE);

  return { durum, magazaAdi, hata, shop: session.shop, scope, scopeEksik };
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const niyet = form.get("niyet");

  // --- Gerçek indirim kodu oluşturma testi ---------------------------------
  if (niyet === "indirim-testi") {
    const sahteDilim = {
      id: "tani",
      etiket: "Tanı testi %5",
      tip: "yuzde",
      deger: 5,
      kod: "",
      minTutar: 0,
    };
    const sahteDavranis = { kodOneki: "CARKTEST", kodGecerlilikGun: 1 };

    try {
      const sonuc = await odulKoduOlustur(admin, sahteDilim, sahteDavranis);
      return {
        test: { durum: "ok", kod: sonuc.kod, hataKodu: null, detay: null },
      };
    } catch (e) {
      const hataKodu = e?.kod || "bilinmiyor";
      const detay = e?.detay || e?.message || String(e);
      console.error(
        `CARK_HATA shop=${shop} adim=tani_testi kod=${hataKodu} detay=${detay}`,
      );
      return { test: { durum: "hata", kod: null, hataKodu, detay } };
    }
  }

  // --- Oturumu sıfırla -----------------------------------------------------
  try {
    await prisma.session.deleteMany({ where: { shop } });
  } catch (e) {
    console.error("Oturumlar silinemedi:", e?.message || e);
  }

  // /app'e yönlendir — authenticate.admin oturum olmadığını görünce OAuth başlatır.
  return redirect("/app");
};

const COZUM_ONERILERI = {
  yetki_yok:
    "Uygulamanın write_discounts izni yok ya da token eski. Aşağıdaki \"Oturumu Sil ve Yeniden Bağlan\" düğmesine basın; Shopify izinleri yeniden onaylatacak.",
  yapilandirma:
    "Bir dilim \"manuel\" tipinde ama kodu boş. Çark ayarlarından o dilime geçerli bir indirim kodu yazın veya tipini değiştirin.",
  hiz_siniri:
    "Shopify API hız sınırı aşıldı. Birkaç dakika bekleyip tekrar deneyin.",
  ag_hatasi:
    "Sunucu Shopify Admin API'ye ulaşamadı. Railway ortam değişkenlerini (SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_APP_URL, SCOPES) kontrol edin.",
  gecersiz_girdi:
    "Shopify indirim girdisini reddetti. Aşağıdaki teknik detay hangi alanın sorunlu olduğunu söylüyor.",
  api_hatasi:
    "Shopify beklenmedik bir yanıt döndürdü. Teknik detayı inceleyin.",
};

export default function BaglantiTest({ loaderData, actionData }) {
  const { durum, magazaAdi, hata, shop, scope, scopeEksik } = loaderData;
  const test = actionData?.test;
  const navigation = useNavigation();
  const gonderiliyor = navigation.state === "submitting";
  const calisanNiyet = navigation.formData?.get("niyet");

  return (
    <s-page heading="Shopify Bağlantı Durumu">
      {durum === "ok" ? (
        <s-banner tone="success" heading="Bağlantı başarılı">
          <s-paragraph>
            Mağaza: <strong>{magazaAdi}</strong>. GraphQL API bağlantısı çalışıyor.
          </s-paragraph>
          <s-paragraph>
            Mevcut scope: <code>{scope}</code>
          </s-paragraph>
        </s-banner>
      ) : (
        <s-banner tone="critical" heading="Shopify bağlantısı başarısız">
          <s-paragraph>
            Hata: <code>{hata}</code>
          </s-paragraph>
          <s-paragraph>
            Mevcut scope: <code>{scope}</code>
          </s-paragraph>
        </s-banner>
      )}

      {scopeEksik && (
        <s-banner tone="critical" heading="İndirim izni eksik">
          <s-paragraph>
            Oturumun scope listesinde <code>{GEREKLI_SCOPE}</code> yok. Bu izin
            olmadan çark indirim kodu üretemez ve ziyaretçi her çevirişte hata
            görür. Aşağıdan oturumu sıfırlayın.
          </s-paragraph>
        </s-banner>
      )}

      <s-section heading="İndirim Kodu Testi">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Çarkın çalışıp çalışmadığını buradan anlarsınız: bu düğme gerçek bir
            test indirim kodu (%5, 1 gün geçerli) oluşturmayı dener. Başarısız
            olursa Shopify'ın söylediği tam hatayı gösterir.
          </s-paragraph>

          <Form method="post">
            <input type="hidden" name="niyet" value="indirim-testi" />
            <s-button type="submit" disabled={gonderiliyor || undefined}>
              {gonderiliyor && calisanNiyet === "indirim-testi"
                ? "Test ediliyor…"
                : "Test indirim kodu oluştur"}
            </s-button>
          </Form>

          {test?.durum === "ok" && (
            <s-banner tone="success" heading="İndirim oluşturma çalışıyor">
              <s-paragraph>
                Test kodu üretildi: <code>{test.kod}</code>. Çarkta hata
                alıyorsanız sebebi indirim API'si değil. Bu kodu Shopify
                admin → İndirimler bölümünden silebilirsiniz.
              </s-paragraph>
            </s-banner>
          )}

          {test?.durum === "hata" && (
            <s-banner tone="critical" heading="İndirim oluşturulamadı">
              <s-paragraph>
                Hata sınıfı: <code>{test.hataKodu}</code>
              </s-paragraph>
              <s-paragraph>
                Shopify'ın yanıtı: <code>{test.detay}</code>
              </s-paragraph>
              <s-paragraph>
                {COZUM_ONERILERI[test.hataKodu] || COZUM_ONERILERI.api_hatasi}
              </s-paragraph>
            </s-banner>
          )}
        </s-stack>
      </s-section>

      <s-section heading="Oturumu Yenile (Token Sıfırla)">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Çarkı çevirince <em>"Bir sorun oluştu"</em> hatası alıyorsanız ve
            yukarıdaki test <code>yetki_yok</code> diyorsa, buradan token'ı
            sıfırlayın. Oturum silinir, Shopify yeni izin onayı ister;
            onaylayınca sorun geçer.
          </s-paragraph>
          <s-paragraph>
            Mağaza: <strong>{shop}</strong>
          </s-paragraph>
          <Form method="post">
            <input type="hidden" name="niyet" value="oturum-sifirla" />
            <s-button
              variant="primary"
              tone="critical"
              type="submit"
              disabled={gonderiliyor || undefined}
            >
              {gonderiliyor && calisanNiyet === "oturum-sifirla"
                ? "Oturum siliniyor…"
                : "Oturumu Sil ve Yeniden Bağlan"}
            </s-button>
          </Form>
        </s-stack>
      </s-section>
    </s-page>
  );
}
