import { kodUret } from "./guvenlik.server";

/**
 * Kazanan her ziyaretçi için TEK KULLANIMLIK, kendine ait bir indirim kodu
 * üretir. Böylece kod sosyal medyada paylaşılsa bile ikinci kez kullanılamaz.
 */

function hatalariTopla(userErrors) {
  return (userErrors || [])
    .map((h) => h.message)
    .filter(Boolean)
    .join(" · ");
}

const TEMEL_KOD_MUTASYONU = `
  mutation TemelKod($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }`;

const KARGO_KOD_MUTASYONU = `
  mutation KargoKodu($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }`;

/**
 * @returns {Promise<{kod: string, sonKullanma: string|null, kodTipi: string, kodDegeri: string}>}
 */
export async function odulKoduOlustur(admin, dilim, davranis) {
  // Manuel kodda mağaza sahibinin Shopify'da elle tanımladığı kod kullanılır.
  if (dilim.tip === "manuel") {
    if (!dilim.kod) throw new Error("Bu dilim için manuel kod tanımlanmamış.");
    return {
      kod: dilim.kod,
      sonKullanma: null,
      kodTipi: "manuel",
      kodDegeri: dilim.etiket,
    };
  }

  const kod = kodUret(davranis.kodOneki || "CARK");
  const baslar = new Date();
  const gecerlilik = Number(davranis.kodGecerlilikGun) || 0;
  const biter =
    gecerlilik > 0
      ? new Date(baslar.getTime() + gecerlilik * 24 * 60 * 60 * 1000)
      : null;

  const ortak = {
    title: `İndirim Çarkı — ${dilim.etiket}`,
    code: kod,
    startsAt: baslar.toISOString(),
    ...(biter ? { endsAt: biter.toISOString() } : {}),
    customerSelection: { all: true },
    appliesOncePerCustomer: true,
    usageLimit: 1,
    ...(dilim.minTutar > 0
      ? {
          minimumRequirement: {
            subtotal: { greaterThanOrEqualToSubtotal: String(dilim.minTutar) },
          },
        }
      : {}),
  };

  let cevap;
  let kok;

  if (dilim.tip === "kargo") {
    cevap = await admin.graphql(KARGO_KOD_MUTASYONU, {
      variables: {
        freeShippingCodeDiscount: { ...ortak, destination: { all: true } },
      },
    });
    kok = "discountCodeFreeShippingCreate";
  } else {
    const value =
      dilim.tip === "yuzde"
        ? { percentage: Math.min(Math.max(Number(dilim.deger) / 100, 0.01), 1) }
        : {
            discountAmount: {
              amount: String(Number(dilim.deger) || 0),
              appliesOnEachItem: false,
            },
          };

    cevap = await admin.graphql(TEMEL_KOD_MUTASYONU, {
      variables: {
        basicCodeDiscount: {
          ...ortak,
          customerGets: { value, items: { all: true } },
        },
      },
    });
    kok = "discountCodeBasicCreate";
  }

  const json = await cevap.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(" · "));
  }
  const hatalar = hatalariTopla(json.data?.[kok]?.userErrors);
  if (hatalar) throw new Error(hatalar);
  if (!json.data?.[kok]?.codeDiscountNode?.id) {
    throw new Error("İndirim kodu oluşturulamadı.");
  }

  return {
    kod,
    sonKullanma: biter ? biter.toISOString() : null,
    kodTipi: dilim.tip,
    kodDegeri:
      dilim.tip === "yuzde"
        ? `%${dilim.deger}`
        : dilim.tip === "tutar"
          ? String(dilim.deger)
          : "kargo",
  };
}

/**
 * Ziyaretçiyi Shopify müşteri listesine ekler. Yalnızca mağaza sahibi bu
 * özelliği açtıysa ve ziyaretçi pazarlama onayı verdiyse çağrılır.
 * Hata durumunda çevirme akışını bozmaz.
 */
export async function musteriEkle(admin, eposta, izinVerdi) {
  const mutasyon = `
    mutation MusteriOlustur($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }`;

  try {
    const cevap = await admin.graphql(mutasyon, {
      variables: {
        input: {
          email: eposta,
          tags: ["indirim-carki"],
          emailMarketingConsent: {
            marketingState: izinVerdi ? "SUBSCRIBED" : "NOT_SUBSCRIBED",
            marketingOptInLevel: "SINGLE_OPT_IN",
            consentUpdatedAt: new Date().toISOString(),
          },
        },
      },
    });
    const json = await cevap.json();
    const id = json.data?.customerCreate?.customer?.id;
    if (id) return id;

    // "Email has already been taken" beklenen bir durumdur — sorun değil.
    return null;
  } catch (hata) {
    console.error("Müşteri eklenemedi:", hata?.message || hata);
    return null;
  }
}
