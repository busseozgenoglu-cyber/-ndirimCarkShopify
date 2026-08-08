import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const magaza = session.shop.replace(".myshopify.com", "");
  return {
    temaLinki: `https://admin.shopify.com/store/${magaza}/themes/current/editor?context=apps`,
    indirimLinki: `https://admin.shopify.com/store/${magaza}/discounts`,
  };
};

export default function Yardim({ loaderData }) {
  const { temaLinki, indirimLinki } = loaderData;

  return (
    <s-page heading="Kurulum ve yardım">
      <s-section heading="Çarkı vitrinde yayına alma">
        <s-ordered-list>
          <s-list-item>
            <strong>Çark ayarları</strong> sayfasına gidin ve “Çarkı yayına al”
            anahtarını açın, ardından kaydedin.
          </s-list-item>
          <s-list-item>
            Tema düzenleyicisini açın:{" "}
            <s-link href={temaLinki} target="_blank">
              Tema düzenleyicisinde uygulama yerleştirmeleri
            </s-link>
          </s-list-item>
          <s-list-item>
            Sol taraftaki <strong>Uygulama yerleştirmeleri</strong> bölümünde
            “İndirim Çarkı” satırındaki anahtarı açın.
          </s-list-item>
          <s-list-item>
            <strong>Kaydet</strong> deyin ve mağazanızı yeni bir sekmede (veya gizli
            pencerede) açarak kontrol edin.
          </s-list-item>
        </s-ordered-list>
      </s-section>

      <s-section heading="Çark görünmüyorsa">
        <s-unordered-list>
          <s-list-item>
            Ayarlarda “Çarkı yayına al” açık mı? Kampanya tarihleri bugünü
            kapsıyor mu?
          </s-list-item>
          <s-list-item>
            Tema düzenleyicisinde uygulama yerleştirmesi etkin mi?
          </s-list-item>
          <s-list-item>
            Aynı tarayıcıda daha önce çarkı gördüyseniz “tekrar gösterim” süresi
            dolmamış olabilir. Gizli pencerede deneyin.
          </s-list-item>
          <s-list-item>
            Sayfa hedeflemesi seçtiyseniz, baktığınız sayfa listede olmayabilir.
          </s-list-item>
          <s-list-item>
            Cihaz ayarı: mobil veya masaüstü gösterimi kapalı olabilir.
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="İndirim kodları nasıl çalışır?">
        <s-paragraph>
          Bir ziyaretçi ödül kazandığında, o kişiye özel ve yalnızca <strong>bir
          kez</strong> kullanılabilen yeni bir indirim kodu Shopify’da otomatik
          oluşturulur. Kod paylaşılsa bile ikinci kez kullanılamaz.
        </s-paragraph>
        <s-paragraph>
          Oluşan kodların tamamını{" "}
          <s-link href={indirimLinki} target="_blank">
            İndirimler sayfasında
          </s-link>{" "}
          görebilir, dilerseniz elle silebilirsiniz.
        </s-paragraph>
        <s-paragraph>
          “Kendi kodum” tipini seçerseniz Shopify’da önceden oluşturduğunuz kod
          kullanılır; bu kod herkese aynı gider ve kullanım sınırını siz
          belirlersiniz.
        </s-paragraph>
      </s-section>

      <s-section heading="Sonuçlar gerçekten rastgele mi?">
        <s-paragraph>
          Evet. Kazanan dilim tarayıcıda değil, uygulamanın sunucusunda
          belirlenir; animasyon yalnızca sonucu gösterir. Ziyaretçi tarayıcı
          araçlarıyla sonucu değiştiremez. Her dilimin olasılığı, ağırlığının
          toplam ağırlığa oranıdır.
        </s-paragraph>
      </s-section>

      <s-section heading="Kişisel veriler">
        <s-paragraph>
          Toplanan e-posta adresleri yalnızca sizin mağazanıza ait olarak
          saklanır ve Katılımcılar sayfasından dışa aktarılabilir. Shopify’ın
          zorunlu gizlilik bildirimleri desteklenir: bir müşteri silinme talebinde
          bulunduğunda kaydı otomatik silinir, uygulamayı kaldırdığınızda ise
          mağazanıza ait tüm veriler kaldırılır.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
