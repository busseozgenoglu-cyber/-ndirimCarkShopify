import { useCallback, useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { VARSAYILAN_AYAR, SAYFA_TIPLERI } from "../cark.ortak";
import { ayarlariOku, ayarlariKaydet } from "../cark.server";
import {
  MetinAlani,
  CokSatirAlani,
  SayiAlani,
  Anahtar,
  OnayKutusu,
  SecimAlani,
  RenkAlani,
} from "../components/alanlar";
import CarkOnizleme from "../components/CarkOnizleme";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return {
    ayar: await ayarlariOku(session.shop),
    shop: session.shop,
  };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  let girdi;
  try {
    girdi = JSON.parse(String(formData.get("ayar") || "{}"));
  } catch {
    return { hata: "Ayarlar okunamadı. Sayfayı yenileyip tekrar deneyin." };
  }

  try {
    const ayar = await ayarlariKaydet(session.shop, girdi);
    return { ayar, kaydedildi: true };
  } catch (e) {
    console.error("Ayarlar kaydedilemedi:", e);
    return { hata: "Ayarlar kaydedilemedi. Lütfen tekrar deneyin." };
  }
};

const TIP_SECENEKLERI = [
  { deger: "yok", etiket: "Ödül yok" },
  { deger: "yuzde", etiket: "Yüzde indirim (%)" },
  { deger: "tutar", etiket: "Tutar indirimi" },
  { deger: "kargo", etiket: "Ücretsiz kargo" },
  { deger: "manuel", etiket: "Kendi kodum" },
];

const SAYFA_ADLARI = {
  index: "Ana sayfa",
  product: "Ürün sayfaları",
  collection: "Koleksiyon sayfaları",
  cart: "Sepet",
  page: "Sabit sayfalar",
  blog: "Blog",
  article: "Blog yazısı",
  search: "Arama",
};

const HAZIR_PALETLER = [
  { ad: "Mor", renkler: ["#7c3aed", "#a78bfa", "#ec4899", "#f472b6", "#c4b5fd", "#e9d5ff"] },
  { ad: "Okyanus", renkler: ["#0ea5e9", "#0284c7", "#14b8a6", "#22d3ee", "#38bdf8", "#a5f3fc"] },
  { ad: "Gün batımı", renkler: ["#f97316", "#fb923c", "#ef4444", "#f59e0b", "#fbbf24", "#fed7aa"] },
  { ad: "Orman", renkler: ["#059669", "#10b981", "#65a30d", "#84cc16", "#34d399", "#d9f99d"] },
  { ad: "Gece", renkler: ["#1e293b", "#334155", "#475569", "#0f172a", "#64748b", "#94a3b8"] },
];

function yeniDilimKimligi() {
  return `d${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

export default function CarkAyarlari({ loaderData }) {
  const shopify = useAppBridge();
  const fetcher = useFetcher();

  const [ayar, setAyar] = useState(loaderData.ayar);
  const [kirli, setKirli] = useState(false);
  const kaydediliyor = fetcher.state !== "idle";

  useEffect(() => {
    if (!fetcher.data) return;
    if (fetcher.data.hata) {
      shopify.toast.show(fetcher.data.hata, { isError: true });
      return;
    }
    if (fetcher.data.ayar) {
      setAyar(fetcher.data.ayar);
      setKirli(false);
      shopify.toast.show("Ayarlar kaydedildi");
    }
  }, [fetcher.data, shopify]);

  // --- Güncelleme yardımcıları ---------------------------------------------
  const yaz = useCallback((degistir) => {
    setKirli(true);
    setAyar((onceki) => degistir(structuredClone(onceki)));
  }, []);

  const metinYaz = useCallback(
    (alan) => (deger) => yaz((a) => { a.metinler[alan] = deger; return a; }),
    [yaz],
  );
  const gorunumYaz = useCallback(
    (alan) => (deger) => yaz((a) => { a.gorunum[alan] = deger; return a; }),
    [yaz],
  );
  const davranisYaz = useCallback(
    (alan) => (deger) => yaz((a) => { a.davranis[alan] = deger; return a; }),
    [yaz],
  );
  const dilimYaz = useCallback(
    (index, alan) => (deger) =>
      yaz((a) => { a.dilimler[index][alan] = deger; return a; }),
    [yaz],
  );

  function dilimEkle() {
    if (ayar.dilimler.length >= 20) {
      shopify.toast.show("En fazla 20 dilim ekleyebilirsiniz", { isError: true });
      return;
    }
    yaz((a) => {
      const palet = HAZIR_PALETLER[0].renkler;
      a.dilimler.push({
        id: yeniDilimKimligi(),
        etiket: "Yeni ödül",
        renk: palet[a.dilimler.length % palet.length],
        agirlik: 10,
        tip: "yok",
        deger: 0,
        kod: "",
        minTutar: 0,
      });
      return a;
    });
  }

  function dilimSil(index) {
    if (ayar.dilimler.length <= 2) {
      shopify.toast.show("Çarkta en az 2 dilim olmalı", { isError: true });
      return;
    }
    yaz((a) => { a.dilimler.splice(index, 1); return a; });
  }

  function dilimTasi(index, yon) {
    const yeni = index + yon;
    if (yeni < 0 || yeni >= ayar.dilimler.length) return;
    yaz((a) => {
      const [tasinan] = a.dilimler.splice(index, 1);
      a.dilimler.splice(yeni, 0, tasinan);
      return a;
    });
  }

  function paletUygula(palet) {
    yaz((a) => {
      a.dilimler.forEach((d, i) => { d.renk = palet.renkler[i % palet.renkler.length]; });
      a.gorunum.birincilRenk = palet.renkler[0];
      a.gorunum.cerceveRenk = palet.renkler[0];
      return a;
    });
  }

  function sayfaDegistir(sayfa, secili) {
    yaz((a) => {
      const kume = new Set(a.davranis.sayfalar);
      if (secili) kume.add(sayfa); else kume.delete(sayfa);
      a.davranis.sayfalar = [...kume];
      return a;
    });
  }

  function varsayilanaDon() {
    yaz(() => structuredClone(VARSAYILAN_AYAR));
    shopify.toast.show("Varsayılan ayarlar yüklendi — kaydetmeyi unutmayın");
  }

  function kaydet() {
    fetcher.submit({ ayar: JSON.stringify(ayar) }, { method: "post" });
  }

  const toplamAgirlik = useMemo(
    () => ayar.dilimler.reduce((t, d) => t + (Number(d.agirlik) || 0), 0),
    [ayar.dilimler],
  );

  const kazanmaOrani = useMemo(() => {
    if (!toplamAgirlik) return 0;
    const kazandiran = ayar.dilimler
      .filter((d) => d.tip !== "yok")
      .reduce((t, d) => t + (Number(d.agirlik) || 0), 0);
    return Math.round((kazandiran / toplamAgirlik) * 100);
  }, [ayar.dilimler, toplamAgirlik]);

  const eksikManuelKod = ayar.dilimler.some((d) => d.tip === "manuel" && !d.kod);

  return (
    <s-page heading="İndirim Çarkı">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={kaydet}
        disabled={kaydediliyor || undefined}
      >
        {kaydediliyor ? "Kaydediliyor…" : "Kaydet"}
      </s-button>
      <s-button slot="secondary-actions" onClick={varsayilanaDon}>
        Varsayılana dön
      </s-button>

      {!ayar.aktif && (
        <s-banner tone="warning" heading="Çark şu anda kapalı">
          <s-paragraph>
            Vitrinde görünmesi için aşağıdaki “Çarkı yayına al” anahtarını açın ve
            temanızda uygulama yerleştirmesini etkinleştirin.
          </s-paragraph>
        </s-banner>
      )}

      {eksikManuelKod && (
        <s-banner tone="critical" heading="Eksik indirim kodu">
          <s-paragraph>
            “Kendi kodum” seçili bir dilimde kod boş bırakılmış. Kod girmezseniz o
            dilimi kazanan ziyaretçilere hata gösterilir.
          </s-paragraph>
        </s-banner>
      )}

      {kirli && (
        <s-banner tone="info" heading="Kaydedilmemiş değişiklikler var">
          <s-paragraph>Değişiklikleriniz henüz vitrine yansımadı.</s-paragraph>
        </s-banner>
      )}

      {/* ------------------------------------------------------------------ */}
      <s-section heading="Durum">
        <s-stack direction="block" gap="base">
          <Anahtar
            etiket="Çarkı yayına al"
            deger={ayar.aktif}
            onDegisim={(v) => yaz((a) => { a.aktif = v; return a; })}
          />
          <s-paragraph>
            Ziyaretçilerin <strong>%{kazanmaOrani}</strong> kadarı ödül kazanır.
            Toplam ağırlık: {toplamAgirlik}. Kazananlara tek kullanımlık, kişiye
            özel indirim kodu otomatik üretilir.
          </s-paragraph>
        </s-stack>
      </s-section>

      {/* ------------------------------------------------------------------ */}
      <s-section heading="Önizleme">
        <s-paragraph>
          Ayarları değiştirdikçe çark burada güncellenir. Ortadaki düğmeye
          basarak dönüş animasyonunu deneyebilirsiniz.
        </s-paragraph>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <CarkOnizleme ayar={ayar} boyut={300} />
        </div>
      </s-section>

      {/* ------------------------------------------------------------------ */}
      <s-section heading="Çark dilimleri">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Ağırlık, dilimin seçilme olasılığını belirler. Örneğin ağırlığı 25 olan
            bir dilim, ağırlığı 5 olandan beş kat sık çıkar. Sonuç her zaman
            sunucuda belirlenir; ziyaretçi tarayıcıdan sonucu değiştiremez.
          </s-paragraph>

          <s-stack direction="inline" gap="small-100" alignItems="center">
            <s-text>Hazır renk paleti:</s-text>
            {HAZIR_PALETLER.map((p) => (
              <s-button key={p.ad} variant="tertiary" onClick={() => paletUygula(p)}>
                {p.ad}
              </s-button>
            ))}
          </s-stack>

          {ayar.dilimler.map((d, i) => {
            const olasilik = toplamAgirlik
              ? Math.round(((Number(d.agirlik) || 0) / toplamAgirlik) * 100)
              : 0;
            return (
              <s-box
                key={d.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                borderColor="subdued"
              >
                <s-stack direction="block" gap="small">
                  <s-stack direction="inline" gap="small" alignItems="center">
                    <s-badge>{i + 1}. dilim</s-badge>
                    <s-badge tone={d.tip === "yok" ? "neutral" : "success"}>
                      %{olasilik} olasılık
                    </s-badge>
                    <s-button
                      variant="tertiary"
                      onClick={() => dilimTasi(i, -1)}
                      disabled={i === 0 || undefined}
                      accessibilityLabel="Yukarı taşı"
                    >
                      ↑
                    </s-button>
                    <s-button
                      variant="tertiary"
                      onClick={() => dilimTasi(i, 1)}
                      disabled={i === ayar.dilimler.length - 1 || undefined}
                      accessibilityLabel="Aşağı taşı"
                    >
                      ↓
                    </s-button>
                    <s-button
                      variant="tertiary"
                      tone="critical"
                      onClick={() => dilimSil(i)}
                    >
                      Sil
                    </s-button>
                  </s-stack>

                  <s-grid gridTemplateColumns="1fr 1fr" gap="small">
                    <MetinAlani
                      etiket="Dilim yazısı"
                      deger={d.etiket}
                      onDegisim={dilimYaz(i, "etiket")}
                      maxLength={28}
                      details="Çarkın üzerinde görünen metin"
                    />
                    <RenkAlani
                      etiket="Dilim rengi"
                      deger={d.renk}
                      onDegisim={dilimYaz(i, "renk")}
                    />
                    <SayiAlani
                      etiket="Ağırlık"
                      deger={d.agirlik}
                      onDegisim={dilimYaz(i, "agirlik")}
                      min={0}
                      max={1000}
                    />
                    <SecimAlani
                      etiket="Ödül tipi"
                      deger={d.tip}
                      onDegisim={dilimYaz(i, "tip")}
                      secenekler={TIP_SECENEKLERI}
                    />

                    {(d.tip === "yuzde" || d.tip === "tutar") && (
                      <SayiAlani
                        etiket={d.tip === "yuzde" ? "İndirim yüzdesi" : "İndirim tutarı"}
                        deger={d.deger}
                        onDegisim={dilimYaz(i, "deger")}
                        min={d.tip === "yuzde" ? 1 : 0}
                        max={d.tip === "yuzde" ? 100 : 1000000}
                      />
                    )}

                    {d.tip === "manuel" && (
                      <MetinAlani
                        etiket="İndirim kodu"
                        deger={d.kod}
                        onDegisim={(v) => dilimYaz(i, "kod")(String(v).toUpperCase())}
                        details="Shopify'da önceden oluşturduğunuz kod"
                      />
                    )}

                    {d.tip !== "yok" && d.tip !== "manuel" && (
                      <SayiAlani
                        etiket="Minimum sepet tutarı"
                        deger={d.minTutar}
                        onDegisim={dilimYaz(i, "minTutar")}
                        min={0}
                        details="0 = alt sınır yok"
                      />
                    )}
                  </s-grid>
                </s-stack>
              </s-box>
            );
          })}

          <s-button onClick={dilimEkle}>Dilim ekle</s-button>
        </s-stack>
      </s-section>

      {/* ------------------------------------------------------------------ */}
      <s-section heading="Yazılar">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Ziyaretçinin gördüğü her metni buradan değiştirebilirsiniz.
            <br />
            <s-text tone="subdued">
              İpucu: kazanma metninde <strong>{"{odul}"}</strong>, son kullanma
              notunda <strong>{"{gun}"}</strong> yazarsanız yerlerine gerçek
              değerler konur.
            </s-text>
          </s-paragraph>

          <s-heading>Açılış ekranı</s-heading>
          <MetinAlani etiket="Başlık" deger={ayar.metinler.baslik} onDegisim={metinYaz("baslik")} />
          <CokSatirAlani etiket="Alt başlık" deger={ayar.metinler.altBaslik} onDegisim={metinYaz("altBaslik")} />
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <MetinAlani etiket="E-posta alanı etiketi" deger={ayar.metinler.epostaEtiketi} onDegisim={metinYaz("epostaEtiketi")} />
            <MetinAlani etiket="E-posta örnek metni" deger={ayar.metinler.epostaYerTutucu} onDegisim={metinYaz("epostaYerTutucu")} />
            <MetinAlani etiket="Çevir butonu" deger={ayar.metinler.cevirButonu} onDegisim={metinYaz("cevirButonu")} />
            <MetinAlani etiket="Çarkın ortasındaki yazı" deger={ayar.metinler.gobekMetni} onDegisim={metinYaz("gobekMetni")} />
            <MetinAlani etiket="Yüzen buton yazısı" deger={ayar.metinler.yuzenButonMetni} onDegisim={metinYaz("yuzenButonMetni")} />
            <MetinAlani etiket="Kapat butonu etiketi" deger={ayar.metinler.kapatMetni} onDegisim={metinYaz("kapatMetni")} />
            <MetinAlani etiket="Çevrilirken görünen yazı" deger={ayar.metinler.cevriliyorMetni} onDegisim={metinYaz("cevriliyorMetni")} />
          </s-grid>

          <s-heading>Onay ve gizlilik</s-heading>
          <CokSatirAlani etiket="Katılım koşulu metni" deger={ayar.metinler.kvkkMetni} onDegisim={metinYaz("kvkkMetni")} />
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <MetinAlani etiket="Gizlilik bağlantısı yazısı" deger={ayar.metinler.kvkkLinkMetni} onDegisim={metinYaz("kvkkLinkMetni")} />
            <MetinAlani etiket="Gizlilik bağlantısı adresi" deger={ayar.metinler.kvkkLinkUrl} onDegisim={metinYaz("kvkkLinkUrl")} />
          </s-grid>
          <MetinAlani etiket="Pazarlama onayı metni" deger={ayar.metinler.pazarlamaOnayiMetni} onDegisim={metinYaz("pazarlamaOnayiMetni")} />

          <s-heading>Kazanma ekranı</s-heading>
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <MetinAlani etiket="Kazandı başlığı" deger={ayar.metinler.kazandiBaslik} onDegisim={metinYaz("kazandiBaslik")} />
            <MetinAlani etiket="Kazandı açıklaması" deger={ayar.metinler.kazandiAciklama} onDegisim={metinYaz("kazandiAciklama")} />
            <MetinAlani etiket="Kod altı notu" deger={ayar.metinler.kodNotu} onDegisim={metinYaz("kodNotu")} />
            <MetinAlani etiket="Son kullanma notu" deger={ayar.metinler.sonKullanmaNotu} onDegisim={metinYaz("sonKullanmaNotu")} />
            <MetinAlani etiket="Kopyala butonu" deger={ayar.metinler.kopyalaButonu} onDegisim={metinYaz("kopyalaButonu")} />
            <MetinAlani etiket="Kopyalandı bildirimi" deger={ayar.metinler.kopyalandiMetni} onDegisim={metinYaz("kopyalandiMetni")} />
            <MetinAlani etiket="Alışverişe devam butonu" deger={ayar.metinler.alisveriseDevamButonu} onDegisim={metinYaz("alisveriseDevamButonu")} />
          </s-grid>

          <s-heading>Kaybetme ve hata ekranları</s-heading>
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <MetinAlani etiket="Kaybetti başlığı" deger={ayar.metinler.kaybettiBaslik} onDegisim={metinYaz("kaybettiBaslik")} />
            <MetinAlani etiket="Kaybetti açıklaması" deger={ayar.metinler.kaybettiAciklama} onDegisim={metinYaz("kaybettiAciklama")} />
            <MetinAlani etiket="Zaten katıldı mesajı" deger={ayar.metinler.tekrarMesaji} onDegisim={metinYaz("tekrarMesaji")} />
            <MetinAlani etiket="Genel hata mesajı" deger={ayar.metinler.hataMesaji} onDegisim={metinYaz("hataMesaji")} />
            <MetinAlani etiket="Geçersiz e-posta mesajı" deger={ayar.metinler.epostaHatasi} onDegisim={metinYaz("epostaHatasi")} />
          </s-grid>
        </s-stack>
      </s-section>

      {/* ------------------------------------------------------------------ */}
      <s-section heading="Görünüm">
        <s-stack direction="block" gap="base">
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <RenkAlani etiket="Ana renk (butonlar)" deger={ayar.gorunum.birincilRenk} onDegisim={gorunumYaz("birincilRenk")} />
            <RenkAlani etiket="Buton yazı rengi" deger={ayar.gorunum.butonMetinRenk} onDegisim={gorunumYaz("butonMetinRenk")} />
            <RenkAlani etiket="Pencere zemini" deger={ayar.gorunum.zeminRenk} onDegisim={gorunumYaz("zeminRenk")} />
            <RenkAlani etiket="Yazı rengi" deger={ayar.gorunum.metinRenk} onDegisim={gorunumYaz("metinRenk")} />
            <RenkAlani etiket="Çark çerçevesi" deger={ayar.gorunum.cerceveRenk} onDegisim={gorunumYaz("cerceveRenk")} />
            <RenkAlani etiket="İbre rengi" deger={ayar.gorunum.ibreRenk} onDegisim={gorunumYaz("ibreRenk")} />
          </s-grid>

          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <SecimAlani
              etiket="Çark boyutu"
              deger={ayar.gorunum.boyut}
              onDegisim={gorunumYaz("boyut")}
              secenekler={[
                { deger: "kucuk", etiket: "Küçük" },
                { deger: "orta", etiket: "Orta" },
                { deger: "buyuk", etiket: "Büyük" },
              ]}
            />
            <SecimAlani
              etiket="Yüzen buton konumu"
              deger={ayar.gorunum.konum}
              onDegisim={gorunumYaz("konum")}
              secenekler={[
                { deger: "sag-alt", etiket: "Sağ alt" },
                { deger: "sol-alt", etiket: "Sol alt" },
                { deger: "sag-orta", etiket: "Sağ orta" },
                { deger: "sol-orta", etiket: "Sol orta" },
              ]}
            />
            <SayiAlani
              etiket="Köşe yuvarlaklığı (px)"
              deger={ayar.gorunum.kenarYuvarlakligi}
              onDegisim={gorunumYaz("kenarYuvarlakligi")}
              min={0}
              max={40}
            />
            <SayiAlani
              etiket="Arka plan karartması (%)"
              deger={ayar.gorunum.kaplamaKoyulugu}
              onDegisim={gorunumYaz("kaplamaKoyulugu")}
              min={0}
              max={95}
            />
            <SecimAlani
              etiket="Yazı tipi"
              deger={ayar.gorunum.yaziTipi}
              onDegisim={gorunumYaz("yaziTipi")}
              secenekler={[
                { deger: "tema", etiket: "Temanın yazı tipi" },
                { deger: "sistem", etiket: "Sistem yazı tipi" },
              ]}
            />
            <MetinAlani
              etiket="Logo adresi (isteğe bağlı)"
              deger={ayar.gorunum.logoUrl}
              onDegisim={gorunumYaz("logoUrl")}
              details="https:// ile başlayan tam adres"
            />
          </s-grid>

          <Anahtar
            etiket="Sayfanın köşesinde yüzen buton göster"
            deger={ayar.gorunum.yuzenButonGoster}
            onDegisim={gorunumYaz("yuzenButonGoster")}
          />
          <Anahtar
            etiket="Kazanınca konfeti efekti oynat"
            deger={ayar.gorunum.konfetiGoster}
            onDegisim={gorunumYaz("konfetiGoster")}
          />
        </s-stack>
      </s-section>

      {/* ------------------------------------------------------------------ */}
      <s-section heading="Ne zaman görünsün?">
        <s-stack direction="block" gap="base">
          <Anahtar
            etiket="Sayfa açıldıktan bir süre sonra kendiliğinden aç"
            deger={ayar.davranis.otomatikAc}
            onDegisim={davranisYaz("otomatikAc")}
          />
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <SayiAlani
              etiket="Kaç saniye sonra açılsın?"
              deger={ayar.davranis.gecikmeSn}
              onDegisim={davranisYaz("gecikmeSn")}
              min={0}
              max={120}
            />
            <SayiAlani
              etiket="Sayfa şu kadar kaydırılınca aç (%)"
              deger={ayar.davranis.kaydirmaYuzdesi}
              onDegisim={davranisYaz("kaydirmaYuzdesi")}
              min={0}
              max={100}
              details="0 = kapalı"
            />
          </s-grid>
          <Anahtar
            etiket="Ziyaretçi sekmeyi kapatmaya yönelince aç (çıkış niyeti)"
            deger={ayar.davranis.cikisNiyeti}
            onDegisim={davranisYaz("cikisNiyeti")}
          />
          <SayiAlani
            etiket="Aynı kişiye kaç günde bir gösterilsin?"
            deger={ayar.davranis.tekrarGun}
            onDegisim={davranisYaz("tekrarGun")}
            min={0}
            max={365}
            details="Aynı e-posta bu süre dolmadan tekrar çeviremez"
          />

          <s-heading>Cihazlar</s-heading>
          <s-stack direction="inline" gap="base">
            <OnayKutusu
              etiket="Masaüstünde göster"
              deger={ayar.davranis.masaustundeGoster}
              onDegisim={davranisYaz("masaustundeGoster")}
            />
            <OnayKutusu
              etiket="Mobilde göster"
              deger={ayar.davranis.mobildeGoster}
              onDegisim={davranisYaz("mobildeGoster")}
            />
          </s-stack>

          <s-heading>Sayfalar</s-heading>
          <s-paragraph>
            Hiçbirini seçmezseniz çark tüm sayfalarda görünür.
          </s-paragraph>
          <s-stack direction="inline" gap="small">
            {SAYFA_TIPLERI.map((sayfa) => (
              <OnayKutusu
                key={sayfa}
                etiket={SAYFA_ADLARI[sayfa]}
                deger={ayar.davranis.sayfalar.includes(sayfa)}
                onDegisim={(v) => sayfaDegistir(sayfa, v)}
              />
            ))}
          </s-stack>

          <s-heading>Kampanya tarihleri</s-heading>
          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <MetinAlani
              etiket="Başlangıç tarihi"
              deger={ayar.davranis.baslangicTarihi}
              onDegisim={davranisYaz("baslangicTarihi")}
              type="date"
              details="Boş = hemen başlar"
            />
            <MetinAlani
              etiket="Bitiş tarihi"
              deger={ayar.davranis.bitisTarihi}
              onDegisim={davranisYaz("bitisTarihi")}
              type="date"
              details="Boş = süresiz"
            />
          </s-grid>
        </s-stack>
      </s-section>

      {/* ------------------------------------------------------------------ */}
      <s-section heading="E-posta ve indirim kodu">
        <s-stack direction="block" gap="base">
          <Anahtar
            etiket="Çevirmeden önce e-posta zorunlu olsun"
            deger={ayar.davranis.epostaZorunlu}
            onDegisim={davranisYaz("epostaZorunlu")}
          />
          <Anahtar
            etiket="Pazarlama izni onay kutusu göster"
            deger={ayar.davranis.pazarlamaOnayiGoster}
            onDegisim={davranisYaz("pazarlamaOnayiGoster")}
          />
          <Anahtar
            etiket="Onay kutusu baştan işaretli gelsin"
            deger={ayar.davranis.pazarlamaOnayiVarsayilan}
            onDegisim={davranisYaz("pazarlamaOnayiVarsayilan")}
          />
          <Anahtar
            etiket="Katılımcıları Shopify müşteri listesine ekle"
            deger={ayar.davranis.musteriyeEkle}
            onDegisim={davranisYaz("musteriyeEkle")}
          />

          <s-grid gridTemplateColumns="1fr 1fr" gap="small">
            <MetinAlani
              etiket="Kod öneki"
              deger={ayar.davranis.kodOneki}
              onDegisim={(v) =>
                davranisYaz("kodOneki")(String(v).toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              maxLength={12}
              details="Örnek: CARK → CARKX7M2QP9A"
            />
            <SayiAlani
              etiket="Kod kaç gün geçerli olsun?"
              deger={ayar.davranis.kodGecerlilikGun}
              onDegisim={davranisYaz("kodGecerlilikGun")}
              min={0}
              max={365}
              details="0 = süresiz"
            />
            <SayiAlani
              etiket="Dönüş süresi (saniye)"
              deger={ayar.davranis.animasyonSn}
              onDegisim={davranisYaz("animasyonSn")}
              min={2}
              max={12}
            />
            <SayiAlani
              etiket="Kaç tam tur atsın?"
              deger={ayar.davranis.turSayisi}
              onDegisim={davranisYaz("turSayisi")}
              min={2}
              max={15}
            />
          </s-grid>
        </s-stack>
      </s-section>

      <s-section>
        <s-stack direction="inline" gap="base">
          <s-button variant="primary" onClick={kaydet} disabled={kaydediliyor || undefined}>
            {kaydediliyor ? "Kaydediliyor…" : "Ayarları kaydet"}
          </s-button>
          <s-link href="/app/yardim">Kurulum adımlarını gör</s-link>
        </s-stack>
      </s-section>
    </s-page>
  );
}
