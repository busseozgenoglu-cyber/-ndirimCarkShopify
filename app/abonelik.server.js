import { unauthenticated } from "./shopify.server";

/**
 * Vitrin uçları admin oturumu taşımadığı için abonelik durumunu offline token
 * ile sorguluyoruz. Her çark isteğinde Shopify'a gitmemek adına sonucu kısa
 * süre önbellekte tutuyoruz.
 */

const ONBELLEK = new Map();
const ONBELLEK_SURESI_MS = 5 * 60 * 1000;

const SORGU = `#graphql
  query AktifAbonelik {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
      }
    }
  }
`;

/**
 * Mağazanın ücretli plana erişimi var mı?
 *
 * Shopify'a ulaşamadığımızda `true` dönüyoruz: geçici bir API hatası yüzünden
 * çalışan mağazaların çarkını kapatmak, ücretsiz kullanıma izin vermekten çok
 * daha kötü bir sonuç. Kalıcı bir sorun olsaydı zaten admin tarafında görünür.
 */
export async function abonelikVarMi(shop) {
  const kayit = ONBELLEK.get(shop);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_SURESI_MS) {
    return kayit.deger;
  }

  let aktif = true;
  try {
    const { admin } = await unauthenticated.admin(shop);
    const yanit = await admin.graphql(SORGU);
    const govde = await yanit.json();
    const abonelikler =
      govde?.data?.currentAppInstallation?.activeSubscriptions ?? [];
    aktif = abonelikler.some((a) => a?.status === "ACTIVE");
  } catch (hata) {
    console.error(`Abonelik sorgulanamadi (${shop}):`, hata?.message || hata);
    ONBELLEK.delete(shop);
    return true;
  }

  ONBELLEK.set(shop, { deger: aktif, zaman: Date.now() });
  return aktif;
}

/** Abonelik değiştiğinde (veya uygulama kaldırıldığında) önbelleği düşür. */
export function abonelikOnbelleginiTemizle(shop) {
  ONBELLEK.delete(shop);
}
