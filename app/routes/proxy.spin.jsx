import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { ayarlariOku, dilimSec, kampanyaYayindaMi } from "../cark.server";
import { odulKoduOlustur, musteriEkle } from "../indirim.server";
import {
  ozetle,
  epostaGecerliMi,
  istemciIp,
  hizSiniriAsildiMi,
} from "../guvenlik.server";

/**
 * POST /apps/indirim-carki/spin
 *
 * Kazanan dilime SUNUCU karar verir. Tarayıcı yalnızca sonucu animasyonla
 * gösterir; istemci tarafında sonuç değiştirilemez.
 */
export const action = async ({ request }) => {
  const { session, admin } = await authenticate.public.appProxy(request);

  if (!session || !admin) {
    return hata("Uygulama bu mağazada kurulu değil.", 403);
  }

  const shop = session.shop;
  const ayar = await ayarlariOku(shop);

  if (!ayar.aktif || !kampanyaYayindaMi(ayar)) {
    return hata("Çark şu anda kapalı.", 400);
  }

  let govde = {};
  try {
    govde = await request.json();
  } catch {
    /* gövdesiz istek de kabul edilir */
  }

  const eposta = String(govde.eposta || "").trim().toLowerCase();
  const pazarlamaIzni = govde.pazarlamaIzni === true;

  if (ayar.davranis.epostaZorunlu && !epostaGecerliMi(eposta)) {
    return hata(ayar.metinler.epostaHatasi, 400);
  }
  if (eposta && !epostaGecerliMi(eposta)) {
    return hata(ayar.metinler.epostaHatasi, 400);
  }

  // --- Kötüye kullanım koruması --------------------------------------------
  const ipOzeti = ozetle(istemciIp(request) || "bilinmiyor");

  if (await hizSiniriAsildiMi(shop, `ip:${ipOzeti}`, 10, 60)) {
    return hata("Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.", 429);
  }

  const epostaOzeti = eposta ? ozetle(eposta) : null;
  const tekrarGun = Number(ayar.davranis.tekrarGun) || 0;

  if (epostaOzeti && tekrarGun > 0) {
    const esik = new Date(Date.now() - tekrarGun * 24 * 60 * 60 * 1000);
    const oncekiKatilim = await prisma.katilimci.findFirst({
      where: { shop, epostaHash: epostaOzeti, olusturuldu: { gt: esik } },
      select: { id: true },
    });
    if (oncekiKatilim) {
      return hata(ayar.metinler.tekrarMesaji, 429);
    }
  }

  // --- Sonuç ----------------------------------------------------------------
  const index = dilimSec(ayar.dilimler);
  const dilim = ayar.dilimler[index];

  let kodBilgisi = null;
  if (dilim.tip !== "yok") {
    try {
      kodBilgisi = await odulKoduOlustur(admin, dilim, ayar.davranis);
    } catch (e) {
      console.error(`[${shop}] İndirim kodu üretilemedi:`, e?.message || e);
      // Kod üretilemezse ziyaretçiyi boşta bırakmayalım: kaybetme ekranı yerine
      // dürüst bir hata mesajı gösterip kaydı kazanılmamış olarak işaretleriz.
      return hata(ayar.metinler.hataMesaji, 502);
    }
  }

  const kazandi = Boolean(kodBilgisi);

  // --- İsteğe bağlı: Shopify müşteri listesine ekle -------------------------
  let musteriId = null;
  if (ayar.davranis.musteriyeEkle && eposta) {
    musteriId = await musteriEkle(admin, eposta, pazarlamaIzni);
  }

  // --- Kayıt ----------------------------------------------------------------
  try {
    await prisma.katilimci.create({
      data: {
        shop,
        eposta: eposta || "",
        epostaHash: epostaOzeti || ozetle(`anonim:${ipOzeti}`),
        ipHash: ipOzeti,
        dilimId: dilim.id,
        dilimAdi: dilim.etiket,
        kazandi,
        kod: kodBilgisi?.kod || null,
        kodTipi: kodBilgisi?.kodTipi || null,
        kodDegeri: kodBilgisi?.kodDegeri || null,
        sonKullanma: kodBilgisi?.sonKullanma ? new Date(kodBilgisi.sonKullanma) : null,
        pazarlamaIzni,
        musteriId,
      },
    });
  } catch (e) {
    console.error(`[${shop}] Katılımcı kaydedilemedi:`, e?.message || e);
  }

  return Response.json(
    {
      index,
      etiket: dilim.etiket,
      kazandi,
      kod: kodBilgisi?.kod || null,
      sonKullanma: kodBilgisi?.sonKullanma || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
};

/** POST dışındaki yöntemlere kapalı. */
export const loader = () =>
  Response.json({ hata: "Yalnızca POST desteklenir." }, { status: 405 });

// Shopify app proxy 4xx/5xx yanıtları HTML'e dönüştürdüğü için
// tüm hatalar 200 döner; hata bilgisi JSON gövdesinde taşınır.
function hata(mesaj, _durum) {
  return Response.json(
    { hata: mesaj },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
