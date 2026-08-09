import { authenticate } from "../shopify.server";

/** GET /apps/indirim-carki/debug — Shopify token geçerliliğini ve
 *  indirim kodu oluşturmayı test eder. Yalnızca hata tespiti için. */
export const loader = async ({ request }) => {
  let oturum = null;
  let admin = null;

  try {
    const sonuc = await authenticate.public.appProxy(request);
    oturum = sonuc.session;
    admin = sonuc.admin;
  } catch (e) {
    return Response.json({ adim: "proxy_auth", hata: e?.message || String(e) });
  }

  if (!oturum || !admin) {
    return Response.json({ adim: "oturum_yok", hata: "Oturum bulunamadı" });
  }

  // Scope bilgisini hemen döndür
  const sessionBilgisi = {
    shop: oturum.shop,
    scope: oturum.scope,
    state: oturum.state,
    isOnline: oturum.isOnline,
    accessTokenVarMi: Boolean(oturum.accessToken),
  };

  // Temel shop sorgusu
  let magazaBilgisi = null;
  try {
    const c = await admin.graphql(`{ shop { name plan { displayName } } }`);
    magazaBilgisi = await c.json();
  } catch (e) {
    return Response.json({
      adim: "shop_query",
      shop: oturum.shop,
      hata: e?.message || String(e),
      hataTip: e?.constructor?.name,
    });
  }

  if (magazaBilgisi?.errors?.length) {
    return Response.json({
      adim: "shop_query_errors",
      shop: oturum.shop,
      hatalar: magazaBilgisi.errors,
    });
  }

  // Test indirim kodu oluşturma
  const testKod = `DEBUG-${Date.now()}`;
  let indirimSonuc = null;
  try {
    const c = await admin.graphql(
      `mutation ($d: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $d) {
          codeDiscountNode { id }
          userErrors { field code message }
        }
      }`,
      {
        variables: {
          d: {
            title: "DEBUG test",
            code: testKod,
            startsAt: new Date().toISOString(),
            customerSelection: { all: true },
            appliesOncePerCustomer: true,
            usageLimit: 1,
            customerGets: {
              value: { percentage: 0.05 },
              items: { all: true },
            },
          },
        },
      },
    );
    indirimSonuc = await c.json();
  } catch (e) {
    return Response.json({
      adim: "indirim_mutation",
      sessionBilgisi,
      shop: oturum.shop,
      magaza: magazaBilgisi?.data?.shop?.name,
      hata: e?.message || String(e),
      hataTip: e?.constructor?.name,
    });
  }

  return Response.json({
    adim: "tamam",
    sessionBilgisi,
    shop: oturum.shop,
    magaza: magazaBilgisi?.data?.shop?.name,
    plan: magazaBilgisi?.data?.shop?.plan?.displayName,
    indirimSonuc,
  });
};

export const action = () =>
  Response.json({ hata: "Yalnızca GET desteklenir." }, { status: 405 });
