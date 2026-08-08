import { authenticate } from "../shopify.server";
import prisma from "../db.server";

/** GET /api/katilimcilar.csv — Excel ile uyumlu, noktalı virgül ayraçlı dosya. */
export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  const katilimcilar = await prisma.katilimci.findMany({
    where: { shop: session.shop },
    orderBy: { olusturuldu: "desc" },
    take: 10000,
  });

  const basliklar = [
    "E-posta",
    "Sonuc",
    "Kazandi",
    "Kod",
    "Kod tipi",
    "Son kullanma",
    "Pazarlama izni",
    "Tarih",
  ];

  const satirlar = katilimcilar.map((k) => [
    k.eposta,
    k.dilimAdi,
    k.kazandi ? "Evet" : "Hayir",
    k.kod || "",
    k.kodTipi || "",
    k.sonKullanma ? k.sonKullanma.toISOString() : "",
    k.pazarlamaIzni ? "Evet" : "Hayir",
    k.olusturuldu.toISOString(),
  ]);

  const csv = [basliklar, ...satirlar]
    .map((satir) => satir.map(hucre).join(";"))
    .join("\r\n");

  // BOM, Excel'in Türkçe karakterleri doğru okuması için gerekli.
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cark-katilimcilari.csv"',
      "Cache-Control": "no-store",
    },
  });
};

/** CSV enjeksiyonuna karşı formül karakterlerini etkisizleştirir. */
function hucre(deger) {
  let s = String(deger ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
