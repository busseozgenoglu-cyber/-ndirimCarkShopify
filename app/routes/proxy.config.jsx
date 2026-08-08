import { authenticate } from "../shopify.server";
import { ayarlariOku, vitrinAyari, kampanyaYayindaMi } from "../cark.server";

/**
 * GET /apps/indirim-carki/config
 * Vitrinin ihtiyaç duyduğu ayarları döner. İmza doğrulaması Shopify'ın resmi
 * `authenticate.public.appProxy` yardımcısıyla yapılır.
 */
export const loader = async ({ request }) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return Response.json({ aktif: false }, { status: 200 });
  }

  const ayar = await ayarlariOku(session.shop);

  if (!ayar.aktif || !kampanyaYayindaMi(ayar)) {
    return Response.json(
      { aktif: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(vitrinAyari(ayar), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
};
