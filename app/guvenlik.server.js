import crypto from "node:crypto";
import prisma from "./db.server";

const TUZ = process.env.SHOPIFY_API_SECRET || "yerel-gelistirme-tuzu";

/** Kişisel veriyi doğrudan saklamadan eşleştirebilmek için tek yönlü özet. */
export function ozetle(deger) {
  return crypto
    .createHmac("sha256", TUZ)
    .update(String(deger || "").toLowerCase().trim())
    .digest("hex");
}

/** RFC 5322'nin pratik bir alt kümesi — aşırı katı olmadan hatalı girdiyi eler. */
const EPOSTA_DESENI = /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/;

export function epostaGecerliMi(eposta) {
  const s = String(eposta || "").trim();
  return s.length <= 254 && EPOSTA_DESENI.test(s);
}

/** Ters vekil sunucular arkasında gerçek ziyaretçi IP'sini bulur. */
export function istemciIp(request) {
  const basliklar = [
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "fly-client-ip",
  ];
  for (const b of basliklar) {
    const deger = request.headers.get(b);
    if (deger) return deger.split(",")[0].trim();
  }
  return "";
}

/**
 * Basit kayan pencere hız sınırı. Aynı anahtarın (ör. IP) belirtilen süre
 * içinde kaç kez işlem yaptığını sayar.
 */
export async function hizSiniriAsildiMi(shop, anahtar, limit = 8, pencereDk = 60) {
  if (!anahtar) return false;
  const esik = new Date(Date.now() - pencereDk * 60 * 1000);

  const adet = await prisma.hizSayaci.count({
    where: { shop, anahtar, olusturuldu: { gt: esik } },
  });
  if (adet >= limit) return true;

  await prisma.hizSayaci.create({ data: { shop, anahtar } });

  // Fırsat buldukça eski kayıtları temizle (ayrı bir zamanlayıcı gerekmez).
  if (Math.random() < 0.05) {
    await prisma.hizSayaci
      .deleteMany({ where: { olusturuldu: { lt: new Date(Date.now() - 864e5) } } })
      .catch(() => {});
  }
  return false;
}

/** Tahmin edilmesi zor, okunabilir indirim kodu üretir. */
export function kodUret(onek = "CARK", uzunluk = 8) {
  // Karıştırılabilecek karakterler (0/O, 1/I/L) alfabeden çıkarıldı.
  const alfabe = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bayt = crypto.randomBytes(uzunluk);
  let sonuc = "";
  for (let i = 0; i < uzunluk; i++) sonuc += alfabe[bayt[i] % alfabe.length];
  return `${onek}${sonuc}`;
}
