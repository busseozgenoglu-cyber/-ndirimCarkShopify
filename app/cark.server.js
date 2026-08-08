import prisma from "./db.server";
import { normalizeAyar } from "./cark.ortak";

export {
  DILIM_TIPLERI,
  SAYFA_TIPLERI,
  VARSAYILAN_AYAR,
  normalizeAyar,
  vitrinAyari,
  kampanyaYayindaMi,
  dilimSec,
} from "./cark.ortak";

// ---------------------------------------------------------------------------
// Okuma / yazma
// ---------------------------------------------------------------------------

export async function ayarlariOku(shop) {
  const kayit = await prisma.carkAyar.findUnique({ where: { shop } });
  if (!kayit) return normalizeAyar(null);
  try {
    return normalizeAyar(JSON.parse(kayit.veri));
  } catch {
    return normalizeAyar(null);
  }
}

export async function ayarlariKaydet(shop, girdi) {
  const ayar = normalizeAyar(girdi);
  const veri = JSON.stringify(ayar);
  await prisma.carkAyar.upsert({
    where: { shop },
    create: { shop, veri },
    update: { veri },
  });
  return ayar;
}
