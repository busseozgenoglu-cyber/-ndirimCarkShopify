import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ozetle } from "../guvenlik.server";

/**
 * Shopify App Store için ZORUNLU gizlilik webhook'ları.
 * İmza doğrulaması `authenticate.webhook` tarafından yapılır; geçersiz imzada
 * otomatik olarak 401 döner.
 */
export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Gizlilik webhook'u: ${topic} — ${shop}`);

  switch (topic) {
    // Müşteri, kendisi hakkında sakladığımız veriyi talep etti.
    case "CUSTOMERS_DATA_REQUEST": {
      const epostalar = toplaEpostalar(payload);
      const kayitlar = await kayitlariBul(shop, epostalar);

      // Mağaza sahibinin bu veriyi müşteriye iletebilmesi için kaydı loglarız.
      // Üretimde: mağaza sahibine e-posta gönderin veya destek kaydı açın.
      console.log(
        `[GDPR] Veri talebi — ${shop} · ${kayitlar.length} çark kaydı bulundu.`,
        JSON.stringify(
          kayitlar.map((k) => ({
            eposta: k.eposta,
            odul: k.dilimAdi,
            kod: k.kod,
            tarih: k.olusturuldu,
          })),
        ),
      );
      break;
    }

    // Müşterinin verisi silinmeli.
    case "CUSTOMERS_REDACT": {
      const epostalar = toplaEpostalar(payload);
      if (epostalar.length) {
        const silinen = await prisma.katilimci.deleteMany({
          where: { shop, epostaHash: { in: epostalar.map(ozetle) } },
        });
        console.log(`[GDPR] ${silinen.count} katılımcı kaydı silindi — ${shop}`);
      }
      break;
    }

    // Mağaza uygulamayı kaldırdı ve 48 saat geçti: tüm veri silinir.
    case "SHOP_REDACT": {
      await prisma.$transaction([
        prisma.katilimci.deleteMany({ where: { shop } }),
        prisma.hizSayaci.deleteMany({ where: { shop } }),
        prisma.carkAyar.deleteMany({ where: { shop } }),
        prisma.session.deleteMany({ where: { shop } }),
      ]);
      console.log(`[GDPR] Mağazaya ait tüm veri silindi — ${shop}`);
      break;
    }

    default:
      console.warn(`Beklenmeyen gizlilik konusu: ${topic}`);
  }

  // Shopify 200 bekler; aksi halde tekrar dener ve uyumluluk uyarısı verir.
  return new Response();
};

function toplaEpostalar(payload) {
  const liste = [];
  if (payload?.customer?.email) liste.push(String(payload.customer.email));
  for (const e of payload?.customer?.emails || []) if (e) liste.push(String(e));
  return [...new Set(liste.map((e) => e.toLowerCase().trim()).filter(Boolean))];
}

async function kayitlariBul(shop, epostalar) {
  if (!epostalar.length) return [];
  return prisma.katilimci.findMany({
    where: { shop, epostaHash: { in: epostalar.map(ozetle) } },
  });
}
