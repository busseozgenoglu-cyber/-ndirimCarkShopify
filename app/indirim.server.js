import { kodUret } from "./guvenlik.server";

/**
 * Kazanan her ziyaretçi için TEK KULLANIMLIK, kendine ait bir indirim kodu
 * üretir. Böylece kod sosyal medyada paylaşılsa bile ikinci kez kullanılamaz.
 *
 * Bu sürümde her hata SINIFLANDIRILIR: çağıran taraf "neden" olduğunu bilir ve
 * ziyaretçiye anlamlı mesaj, geliştiriciye teknik detay gösterebilir.
 */

/** Tüm indirim hataları bu tiple fırlatılır. */
export class IndirimHatasi extends Error {
  constructor(mesaj, { kod = "bilinmiyor", detay = null } = {}) {
    super(mesaj);
    this.name = "IndirimHatasi";
    this.kod = kod; // yetki_yok | hiz_siniri | ag_hatasi | gecersiz_girdi | api_hatasi | yapilandirma
    this.detay = detay;
  }
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

// ---------------------------------------------------------------------------
// Hata sınıflandırma
// ---------------------------------------------------------------------------

const YETKI_IPUCLARI = [
  "access denied",
  "write_discounts",
  "required access",
  "not approved",
  "unauthorized",
  "invalid api key or access token",
];

function yetkiHatasiMi(metin) {
  const s = String(metin || "").toLowerCase();
  return YETKI_IPUCLARI.some((ipucu) => s.includes(ipucu));
}

/** Alan şemada yoksa (eski/yeni API sürümü farkı) diğer varyantı denemeliyiz. */
function alanUyusmazligiMi(metin) {
  const s = String(metin || "").toLowerCase();
  if (!s.includes("context") && !s.includes("customerselection")) return false;
  return (
    s.includes("is not defined") ||
    s.includes("undefined field") ||
    s.includes("unknown field") ||
    s.includes("unknown argument") ||
    s.includes("expected type") ||
    s.includes("required")
  );
}

function hataMetni(liste) {
  return (liste || [])
    .map((h) => {
      const alan = Array.isArray(h?.field) && h.field.length ? `${h.field.join(".")}: ` : "";
      return h?.message ? `${alan}${h.message}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// GraphQL çalıştırıcı
// ---------------------------------------------------------------------------

async function graphqlCalistir(admin, sorgu, degiskenler) {
  let cevap;

  try {
    cevap = await admin.graphql(sorgu, { variables: degiskenler });
  } catch (e) {
    // Kitaplık HTTP hatalarında Response ya da GraphqlQueryError fırlatabilir.
    const durum =
      e instanceof Response ? e.status : e?.response?.status ?? e?.status ?? null;

    if (durum === 401 || durum === 403) {
      throw new IndirimHatasi(
        "Uygulamanın bu mağazada indirim oluşturma izni yok.",
        { kod: "yetki_yok", detay: `HTTP ${durum}` },
      );
    }
    if (durum === 429) {
      throw new IndirimHatasi("Shopify hız sınırı aşıldı.", {
        kod: "hiz_siniri",
        detay: "HTTP 429",
      });
    }
    throw new IndirimHatasi("Shopify Admin API'ye ulaşılamadı.", {
      kod: "ag_hatasi",
      detay: `${durum ? `HTTP ${durum} — ` : ""}${e?.message || String(e)}`,
    });
  }

  try {
    return await cevap.json();
  } catch (e) {
    throw new IndirimHatasi("Shopify yanıtı okunamadı.", {
      kod: "ag_hatasi",
      detay: e?.message || String(e),
    });
  }
}

/**
 * Alıcı hedeflemesini iki biçimde dener:
 *   1) context: { all: ALL }        → 2026-07 ve sonrası (güncel yol)
 *   2) customerSelection: { all }   → eski sürümler (deprecate edildi)
 * Böylece API sürümü değişse de kod çalışmaya devam eder.
 */
async function kodOlustur(admin, mutasyon, kok, girdiAdi, temelGirdi) {
  const denemeler = [
    { ...temelGirdi, context: { all: "ALL" } },
    { ...temelGirdi, customerSelection: { all: true } },
  ];

  let sonDetay = null;

  for (const govde of denemeler) {
    const json = await graphqlCalistir(admin, mutasyon, { [girdiAdi]: govde });

    // --- Şema / yetki düzeyi hataları ---
    if (json.errors?.length) {
      const metin = json.errors.map((h) => h?.message).filter(Boolean).join(" · ");
      const erisimReddi = json.errors.some(
        (h) => h?.extensions?.code === "ACCESS_DENIED",
      );

      if (erisimReddi || yetkiHatasiMi(metin)) {
        throw new IndirimHatasi(
          "Uygulamanın indirim oluşturma izni (write_discounts) yok.",
          { kod: "yetki_yok", detay: metin || "ACCESS_DENIED" },
        );
      }
      if (alanUyusmazligiMi(metin)) {
        sonDetay = metin;
        continue; // diğer alıcı biçimini dene
      }
      throw new IndirimHatasi("Shopify indirim isteğini reddetti.", {
        kod: "api_hatasi",
        detay: metin,
      });
    }

    // --- İş kuralı hataları ---
    const dugum = json.data?.[kok];
    const kullaniciHatasi = hataMetni(dugum?.userErrors);

    if (kullaniciHatasi) {
      if (alanUyusmazligiMi(kullaniciHatasi)) {
        sonDetay = kullaniciHatasi;
        continue;
      }
      throw new IndirimHatasi("Shopify indirim kodunu kabul etmedi.", {
        kod: "gecersiz_girdi",
        detay: kullaniciHatasi,
      });
    }

    const id = dugum?.codeDiscountNode?.id;
    if (id) return id;

    sonDetay = "Shopify indirim kimliği döndürmedi.";
  }

  throw new IndirimHatasi("İndirim kodu oluşturulamadı.", {
    kod: "api_hatasi",
    detay: sonDetay,
  });
}

// ---------------------------------------------------------------------------
// Ödül kodu
// ---------------------------------------------------------------------------

/**
 * @returns {Promise<{kod: string, sonKullanma: string|null, kodTipi: string, kodDegeri: string}>}
 * @throws {IndirimHatasi}
 */
export async function odulKoduOlustur(admin, dilim, davranis) {
  // Manuel kodda mağaza sahibinin Shopify'da elle tanımladığı kod kullanılır.
  if (dilim.tip === "manuel") {
    if (!dilim.kod) {
      throw new IndirimHatasi("Bu dilim için manuel kod tanımlanmamış.", {
        kod: "yapilandirma",
        detay: `dilim=${dilim.id}`,
      });
    }
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

  if (dilim.tip === "kargo") {
    await kodOlustur(
      admin,
      KARGO_KOD_MUTASYONU,
      "discountCodeFreeShippingCreate",
      "freeShippingCodeDiscount",
      { ...ortak, destination: { all: true } },
    );
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

    await kodOlustur(
      admin,
      TEMEL_KOD_MUTASYONU,
      "discountCodeBasicCreate",
      "basicCodeDiscount",
      { ...ortak, customerGets: { value, items: { all: true } } },
    );
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

// ---------------------------------------------------------------------------
// Müşteri kaydı (hata durumunda akışı bozmaz)
// ---------------------------------------------------------------------------

export async function musteriEkle(admin, eposta, izinVerdi) {
  const mutasyon = `
    mutation MusteriOlustur($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }`;

  try {
    const json = await graphqlCalistir(admin, mutasyon, {
      input: {
        email: eposta,
        tags: ["indirim-carki"],
        emailMarketingConsent: {
          marketingState: izinVerdi ? "SUBSCRIBED" : "NOT_SUBSCRIBED",
          marketingOptInLevel: "SINGLE_OPT_IN",
          consentUpdatedAt: new Date().toISOString(),
        },
      },
    });

    // "Email has already been taken" beklenen bir durumdur — sorun değil.
    return json.data?.customerCreate?.customer?.id ?? null;
  } catch (hata) {
    console.error("Müşteri eklenemedi:", hata?.detay || hata?.message || hata);
    return null;
  }
}
