import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);
  console.log(`Webhook: ${topic} — ${shop}`);

  // Webhook, uygulama zaten kaldırıldıktan sonra tekrar tetiklenebilir;
  // bu yüzden oturum yoksa da temizliği güvenle çalıştırıyoruz.
  try {
    await prisma.session.deleteMany({ where: { shop } });
  } catch (e) {
    console.error("Oturumlar silinemedi:", e?.message || e);
  }
  void session;

  return new Response();
};
