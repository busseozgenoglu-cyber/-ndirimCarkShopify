import { useSearchParams } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const SAYFA_BOYUTU = 50;

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const sayfa = Math.max(1, Number(url.searchParams.get("sayfa")) || 1);

  const [katilimcilar, toplam, kazanan, sonYediGun] = await Promise.all([
    prisma.katilimci.findMany({
      where: { shop: session.shop },
      orderBy: { olusturuldu: "desc" },
      skip: (sayfa - 1) * SAYFA_BOYUTU,
      take: SAYFA_BOYUTU,
    }),
    prisma.katilimci.count({ where: { shop: session.shop } }),
    prisma.katilimci.count({ where: { shop: session.shop, kazandi: true } }),
    prisma.katilimci.count({
      where: {
        shop: session.shop,
        olusturuldu: { gt: new Date(Date.now() - 7 * 86400000) },
      },
    }),
  ]);

  return {
    katilimcilar: katilimcilar.map((k) => ({
      id: k.id,
      eposta: k.eposta || "—",
      dilimAdi: k.dilimAdi,
      kazandi: k.kazandi,
      kod: k.kod,
      pazarlamaIzni: k.pazarlamaIzni,
      olusturuldu: k.olusturuldu.toISOString(),
      sonKullanma: k.sonKullanma ? k.sonKullanma.toISOString() : null,
    })),
    toplam,
    kazanan,
    sonYediGun,
    sayfa,
    sonSayfa: Math.max(1, Math.ceil(toplam / SAYFA_BOYUTU)),
  };
};

function tarihYaz(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Katilimcilar({ loaderData }) {
  const { katilimcilar, toplam, kazanan, sonYediGun, sayfa, sonSayfa } = loaderData;
  const [, setArama] = useSearchParams();

  const izinliSayisi = katilimcilar.filter((k) => k.pazarlamaIzni).length;

  return (
    <s-page heading="Katılımcılar">
      <s-button
        slot="primary-action"
        href="/api/katilimcilar.csv"
        download="cark-katilimcilari.csv"
      >
        CSV indir
      </s-button>

      <s-section heading="Özet">
        <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="subdued">Toplam katılım</s-text>
            <s-heading>{toplam}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="subdued">Ödül kazanan</s-text>
            <s-heading>{kazanan}</s-heading>
          </s-box>
          <s-box padding="base" borderWidth="base" borderRadius="base">
            <s-text tone="subdued">Son 7 gün</s-text>
            <s-heading>{sonYediGun}</s-heading>
          </s-box>
        </s-grid>
      </s-section>

      <s-section heading={`Kayıtlar (sayfa ${sayfa}/${sonSayfa})`}>
        {katilimcilar.length === 0 ? (
          <s-stack direction="block" gap="small">
            <s-paragraph>Henüz katılım yok.</s-paragraph>
            <s-paragraph>
              Çarkın vitrinde göründüğünden emin olun: uygulama ayarlarında
              “Çarkı yayına al” açık olmalı ve temanızda uygulama yerleştirmesi
              etkinleştirilmiş olmalı.
            </s-paragraph>
            <s-link href="/app/yardim">Kurulum adımları</s-link>
          </s-stack>
        ) : (
          <>
            <s-paragraph>
              Bu sayfadaki {katilimcilar.length} kayıttan {izinliSayisi} tanesi
              pazarlama e-postası almayı kabul etti.
            </s-paragraph>

            <s-table variant="auto">
              <s-table-header-row>
                <s-table-header>E-posta</s-table-header>
                <s-table-header>Sonuç</s-table-header>
                <s-table-header>Kod</s-table-header>
                <s-table-header>İzin</s-table-header>
                <s-table-header>Tarih</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {katilimcilar.map((k) => (
                  <s-table-row key={k.id}>
                    <s-table-cell>{k.eposta}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone={k.kazandi ? "success" : "neutral"}>
                        {k.dilimAdi}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>{k.kod || "—"}</s-table-cell>
                    <s-table-cell>{k.pazarlamaIzni ? "Evet" : "Hayır"}</s-table-cell>
                    <s-table-cell>{tarihYaz(k.olusturuldu)}</s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            {sonSayfa > 1 && (
              <s-stack direction="inline" gap="small">
                <s-button
                  disabled={sayfa <= 1 || undefined}
                  onClick={() => setArama({ sayfa: String(sayfa - 1) })}
                >
                  Önceki
                </s-button>
                <s-button
                  disabled={sayfa >= sonSayfa || undefined}
                  onClick={() => setArama({ sayfa: String(sayfa + 1) })}
                >
                  Sonraki
                </s-button>
              </s-stack>
            )}
          </>
        )}
      </s-section>

      <s-section heading="Veri ve gizlilik">
        <s-paragraph>
          E-posta adresleri yalnızca bu mağazaya ait olarak saklanır. Bir müşteri
          silinme talebinde bulunduğunda Shopify’ın gizlilik bildirimi ile kayıt
          otomatik silinir. Uygulamayı kaldırırsanız 48 saat içinde mağazanıza ait
          tüm veri silinir.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
