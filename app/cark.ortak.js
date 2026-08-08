
/**
 * Hem tarayıcıda (admin arayüzü) hem sunucuda kullanılan saf mantık.
 * Bu dosya hiçbir sunucu modülüne (veritabanı vb.) bağımlı olmamalıdır.
 *
 * Çarkın tüm ayarları tek bir JSON içinde tutulur. Yeni bir özellik eklemek
 * için VARSAYILAN_AYAR'a alan eklemeniz yeterlidir — veritabanı göçü gerekmez,
 * eski kayıtlar okunurken varsayılanla birleştirilir.
 */

export const DILIM_TIPLERI = ["yok", "yuzde", "tutar", "kargo", "manuel"];
export const SAYFA_TIPLERI = [
  "index",
  "product",
  "collection",
  "cart",
  "page",
  "blog",
  "article",
  "search",
];

export const VARSAYILAN_AYAR = {
  surum: 1,
  aktif: false,

  metinler: {
    baslik: "Şansını dene!",
    altBaslik: "E-posta adresini yaz, çarkı çevir, indirimini hemen kap.",
    epostaEtiketi: "E-posta adresiniz",
    epostaYerTutucu: "ornek@eposta.com",
    cevirButonu: "Çarkı çevir",
    gobekMetni: "ÇEVİR",
    yuzenButonMetni: "İndirim kazan",
    kapatMetni: "Kapat",
    kvkkMetni: "Katılarak kampanya koşullarını kabul etmiş olursunuz.",
    kvkkLinkMetni: "Gizlilik politikası",
    kvkkLinkUrl: "/policies/privacy-policy",
    pazarlamaOnayiMetni: "Kampanya e-postaları almak istiyorum.",
    kazandiBaslik: "Tebrikler!",
    kazandiAciklama: "{odul} kazandınız. Kodunuz aşağıda:",
    kodNotu: "Kodu ödeme adımında girin.",
    kopyalaButonu: "Kodu kopyala",
    kopyalandiMetni: "Kopyalandı",
    alisveriseDevamButonu: "Alışverişe başla",
    kaybettiBaslik: "Bu sefer olmadı",
    kaybettiAciklama: "Şansınızı yakında tekrar deneyebilirsiniz.",
    tekrarMesaji: "Bu e-posta ile zaten katıldınız.",
    hataMesaji: "Bir sorun oluştu, lütfen tekrar deneyin.",
    epostaHatasi: "Geçerli bir e-posta adresi girin.",
    sonKullanmaNotu: "Kod {gun} gün geçerlidir.",
    cevriliyorMetni: "Çevriliyor…",
  },

  gorunum: {
    birincilRenk: "#7c3aed",
    zeminRenk: "#ffffff",
    metinRenk: "#111827",
    butonMetinRenk: "#ffffff",
    ibreRenk: "#111827",
    cerceveRenk: "#7c3aed",
    kaplamaKoyulugu: 60,
    kenarYuvarlakligi: 20,
    boyut: "orta",
    konum: "sag-alt",
    yuzenButonGoster: true,
    konfetiGoster: true,
    logoUrl: "",
    yaziTipi: "tema",
  },

  davranis: {
    epostaZorunlu: true,
    pazarlamaOnayiGoster: true,
    pazarlamaOnayiVarsayilan: false,
    musteriyeEkle: false,
    otomatikAc: true,
    gecikmeSn: 5,
    cikisNiyeti: true,
    kaydirmaYuzdesi: 0,
    tekrarGun: 7,
    mobildeGoster: true,
    masaustundeGoster: true,
    sayfalar: [],
    baslangicTarihi: "",
    bitisTarihi: "",
    kodGecerlilikGun: 7,
    kodOneki: "CARK",
    animasyonSn: 5,
    turSayisi: 6,
  },

  dilimler: [
    { id: "d1", etiket: "%10 indirim", renk: "#7c3aed", agirlik: 25, tip: "yuzde", deger: 10, kod: "", minTutar: 0 },
    { id: "d2", etiket: "Tekrar dene", renk: "#e5e7eb", agirlik: 20, tip: "yok", deger: 0, kod: "", minTutar: 0 },
    { id: "d3", etiket: "%20 indirim", renk: "#ec4899", agirlik: 8, tip: "yuzde", deger: 20, kod: "", minTutar: 0 },
    { id: "d4", etiket: "Ücretsiz kargo", renk: "#10b981", agirlik: 15, tip: "kargo", deger: 0, kod: "", minTutar: 0 },
    { id: "d5", etiket: "%5 indirim", renk: "#3b82f6", agirlik: 22, tip: "yuzde", deger: 5, kod: "", minTutar: 0 },
    { id: "d6", etiket: "Bugün değil", renk: "#e5e7eb", agirlik: 10, tip: "yok", deger: 0, kod: "", minTutar: 0 },
  ],
};

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;

function metin(deger, varsayilan, uzunluk = 200) {
  const s = deger === undefined || deger === null ? varsayilan : String(deger);
  return s.slice(0, uzunluk);
}

function sayi(deger, varsayilan, min, max) {
  const n = Number(deger);
  if (!Number.isFinite(n)) return varsayilan;
  return Math.min(max, Math.max(min, n));
}

function mantik(deger, varsayilan) {
  return typeof deger === "boolean" ? deger : varsayilan;
}

function renk(deger, varsayilan) {
  return HEX.test(String(deger || "")) ? String(deger) : varsayilan;
}

function tarih(deger) {
  const s = String(deger || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

/** Kullanıcıdan gelen ham veriyi güvenli, tam ve tutarlı bir ayara dönüştürür. */
export function normalizeAyar(girdi) {
  const v = VARSAYILAN_AYAR;
  const g = girdi && typeof girdi === "object" ? girdi : {};
  const gm = g.metinler || {};
  const gg = g.gorunum || {};
  const gd = g.davranis || {};

  const metinler = {};
  for (const anahtar of Object.keys(v.metinler)) {
    const uzun = anahtar === "altBaslik" || anahtar === "kvkkMetni" ? 300 : 120;
    metinler[anahtar] = metin(gm[anahtar], v.metinler[anahtar], uzun);
  }

  const gorunum = {
    birincilRenk: renk(gg.birincilRenk, v.gorunum.birincilRenk),
    zeminRenk: renk(gg.zeminRenk, v.gorunum.zeminRenk),
    metinRenk: renk(gg.metinRenk, v.gorunum.metinRenk),
    butonMetinRenk: renk(gg.butonMetinRenk, v.gorunum.butonMetinRenk),
    ibreRenk: renk(gg.ibreRenk, v.gorunum.ibreRenk),
    cerceveRenk: renk(gg.cerceveRenk, v.gorunum.cerceveRenk),
    kaplamaKoyulugu: sayi(gg.kaplamaKoyulugu, v.gorunum.kaplamaKoyulugu, 0, 95),
    kenarYuvarlakligi: sayi(gg.kenarYuvarlakligi, v.gorunum.kenarYuvarlakligi, 0, 40),
    boyut: ["kucuk", "orta", "buyuk"].includes(gg.boyut) ? gg.boyut : v.gorunum.boyut,
    konum: ["sag-alt", "sol-alt", "sag-orta", "sol-orta"].includes(gg.konum)
      ? gg.konum
      : v.gorunum.konum,
    yuzenButonGoster: mantik(gg.yuzenButonGoster, v.gorunum.yuzenButonGoster),
    konfetiGoster: mantik(gg.konfetiGoster, v.gorunum.konfetiGoster),
    logoUrl: guvenliUrl(gg.logoUrl),
    yaziTipi: ["tema", "sistem"].includes(gg.yaziTipi) ? gg.yaziTipi : v.gorunum.yaziTipi,
  };

  const davranis = {
    epostaZorunlu: mantik(gd.epostaZorunlu, v.davranis.epostaZorunlu),
    pazarlamaOnayiGoster: mantik(gd.pazarlamaOnayiGoster, v.davranis.pazarlamaOnayiGoster),
    pazarlamaOnayiVarsayilan: mantik(gd.pazarlamaOnayiVarsayilan, v.davranis.pazarlamaOnayiVarsayilan),
    musteriyeEkle: mantik(gd.musteriyeEkle, v.davranis.musteriyeEkle),
    otomatikAc: mantik(gd.otomatikAc, v.davranis.otomatikAc),
    gecikmeSn: sayi(gd.gecikmeSn, v.davranis.gecikmeSn, 0, 120),
    cikisNiyeti: mantik(gd.cikisNiyeti, v.davranis.cikisNiyeti),
    kaydirmaYuzdesi: sayi(gd.kaydirmaYuzdesi, v.davranis.kaydirmaYuzdesi, 0, 100),
    tekrarGun: sayi(gd.tekrarGun, v.davranis.tekrarGun, 0, 365),
    mobildeGoster: mantik(gd.mobildeGoster, v.davranis.mobildeGoster),
    masaustundeGoster: mantik(gd.masaustundeGoster, v.davranis.masaustundeGoster),
    sayfalar: Array.isArray(gd.sayfalar)
      ? gd.sayfalar.filter((s) => SAYFA_TIPLERI.includes(s))
      : [],
    baslangicTarihi: tarih(gd.baslangicTarihi),
    bitisTarihi: tarih(gd.bitisTarihi),
    kodGecerlilikGun: sayi(gd.kodGecerlilikGun, v.davranis.kodGecerlilikGun, 0, 365),
    kodOneki: metin(gd.kodOneki, v.davranis.kodOneki, 12)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "") || "CARK",
    animasyonSn: sayi(gd.animasyonSn, v.davranis.animasyonSn, 2, 12),
    turSayisi: sayi(gd.turSayisi, v.davranis.turSayisi, 2, 15),
  };

  const hamDilimler = Array.isArray(g.dilimler) && g.dilimler.length
    ? g.dilimler
    : v.dilimler;

  const dilimler = hamDilimler
    .slice(0, 20)
    .map((d, i) => {
      const tip = DILIM_TIPLERI.includes(d?.tip) ? d.tip : "yok";
      return {
        id: metin(d?.id, `d${i + 1}`, 24).replace(/[^a-zA-Z0-9_-]/g, "") || `d${i + 1}`,
        etiket: metin(d?.etiket, `Dilim ${i + 1}`, 28).trim() || `Dilim ${i + 1}`,
        renk: renk(d?.renk, v.dilimler[i % v.dilimler.length].renk),
        agirlik: sayi(d?.agirlik, 10, 0, 1000),
        tip,
        deger: tip === "yuzde" ? sayi(d?.deger, 10, 1, 100) : sayi(d?.deger, 0, 0, 1e6),
        kod: metin(d?.kod, "", 40).trim().toUpperCase().replace(/\s+/g, ""),
        minTutar: sayi(d?.minTutar, 0, 0, 1e6),
      };
    });

  // Kimlikler benzersiz olmalı — çakışırsa yeniden numaralandır.
  const gorulen = new Set();
  for (let i = 0; i < dilimler.length; i++) {
    if (gorulen.has(dilimler[i].id)) dilimler[i].id = `d${i + 1}_${Date.now().toString(36)}`;
    gorulen.add(dilimler[i].id);
  }

  const sonuc = {
    surum: 1,
    aktif: mantik(g.aktif, v.aktif),
    metinler,
    gorunum,
    davranis,
    dilimler: dilimler.length >= 2 ? dilimler : JSON.parse(JSON.stringify(v.dilimler)),
  };

  return sonuc;
}

function guvenliUrl(deger) {
  const s = String(deger || "").trim().slice(0, 500);
  if (!s) return "";
  if (/^https:\/\//i.test(s) || s.startsWith("/")) return s;
  return "";
}

// ---------------------------------------------------------------------------
// Vitrin için güvenli ayar (indirim kodları ASLA gönderilmez)
// ---------------------------------------------------------------------------

export function vitrinAyari(ayar) {
  return {
    aktif: ayar.aktif,
    metinler: ayar.metinler,
    gorunum: ayar.gorunum,
    davranis: {
      epostaZorunlu: ayar.davranis.epostaZorunlu,
      pazarlamaOnayiGoster: ayar.davranis.pazarlamaOnayiGoster,
      pazarlamaOnayiVarsayilan: ayar.davranis.pazarlamaOnayiVarsayilan,
      otomatikAc: ayar.davranis.otomatikAc,
      gecikmeSn: ayar.davranis.gecikmeSn,
      cikisNiyeti: ayar.davranis.cikisNiyeti,
      kaydirmaYuzdesi: ayar.davranis.kaydirmaYuzdesi,
      tekrarGun: ayar.davranis.tekrarGun,
      mobildeGoster: ayar.davranis.mobildeGoster,
      masaustundeGoster: ayar.davranis.masaustundeGoster,
      sayfalar: ayar.davranis.sayfalar,
      animasyonSn: ayar.davranis.animasyonSn,
      turSayisi: ayar.davranis.turSayisi,
      kodGecerlilikGun: ayar.davranis.kodGecerlilikGun,
    },
    // Etiket ve renk vitrinde görünür; ağırlık ile ödül bilgisi gönderilmez ki
    // ziyaretçi kazanma olasılığını okuyup sistemi manipüle etmeye çalışamasın.
    dilimler: ayar.dilimler.map((d) => ({ etiket: d.etiket, renk: d.renk })),
  };
}

/** Kampanya bugün yayında mı? */
export function kampanyaYayindaMi(ayar, simdi = new Date()) {
  const { baslangicTarihi, bitisTarihi } = ayar.davranis;
  const bugun = simdi.toISOString().slice(0, 10);
  if (baslangicTarihi && bugun < baslangicTarihi) return false;
  if (bitisTarihi && bugun > bitisTarihi) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Ağırlıklı rastgele seçim — yalnızca sunucuda çağrılır (hile koruması)
// ---------------------------------------------------------------------------

export function dilimSec(dilimler, rastgele = Math.random) {
  const agirliklar = dilimler.map((d) => Math.max(0, Number(d.agirlik) || 0));
  const toplam = agirliklar.reduce((t, a) => t + a, 0);

  // Tüm ağırlıklar sıfırsa eşit olasılık uygula.
  if (toplam <= 0) {
    return Math.min(dilimler.length - 1, Math.floor(rastgele() * dilimler.length));
  }

  let sayac = rastgele() * toplam;
  for (let i = 0; i < dilimler.length; i++) {
    sayac -= agirliklar[i];
    if (sayac < 0) return i;
  }
  return dilimler.length - 1;
}
