import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Webhook: ${topic} — ${shop}`);

  const yeniYetkiler = payload?.current;
  if (Array.isArray(yeniYetkiler)) {
    try {
      await prisma.session.updateMany({
        where: { shop },
        data: { scope: yeniYetkiler.join(",") },
      });
    } catch (e) {
      console.error("Yetkiler güncellenemedi:", e?.message || e);
    }
  }

  return new Response();
};
