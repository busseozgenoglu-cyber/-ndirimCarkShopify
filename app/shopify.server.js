import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const API_SURUMU = ApiVersion.July26;

function temizleUrl(deger) {
  if (!deger) return "";
  let url = String(deger).trim();
  url = url.replace(/^(https?:\/\/)+/, (_, p) => p);
  url = url.replace(/\/+$/, "");
  return url;
}

const APP_URL = temizleUrl(process.env.SHOPIFY_APP_URL);

/**
 * shopify.app.toml ile AYNI izinler. SCOPES ortam değişkeni Railway'de
 * unutulursa veya eski değeri taşırsa uygulama sessizce yanlış izinlerle
 * kurulur ve indirim kodu üretimi "Access denied" ile patlar. Bu yüzden
 * ortam değişkeni yoksa buradaki listeye düşüyoruz.
 *
 * ÖNEMLİ: shopify.app.toml içindeki access_scopes değişirse burayı da güncelle.
 */
const VARSAYILAN_SCOPES = "write_discounts,write_customers";

const SCOPE_LISTESI = (process.env.SCOPES || VARSAYILAN_SCOPES)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!process.env.SCOPES) {
  console.warn(
    `SCOPES ortam degiskeni yok — varsayilan kullaniliyor: ${SCOPE_LISTESI.join(",")}`,
  );
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: API_SURUMU,
  scopes: SCOPE_LISTESI,
  appUrl: APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  useOnlineTokens: false,
  isEmbeddedApp: true,
  future: {
    // Planlar Partner panelinde tanımlı (Managed Pricing). Bu bayrak kapalıyken
    // billing.check() yerel bir billingConfig bekliyor ve abonelik durumunu hiç
    // göremiyorduk; uygulama içinde plan seçimi olmadığı için de App Store
    // incelemesi 1.2.2'den geri döndü.
    unstable_managedPricingSupport: true,
    // Kapalıysa (varsayılan) kütüphane token exchange'de hâlâ "non-expiring"
    // offline token istiyor — Shopify artık bunları TAMAMEN reddediyor
    // ("[API] Non-expiring access tokens are no longer accepted"). Bu yüzden
    // her admin.graphql çağrısı, oturumu sıfırlasak bile 403 ile patlıyordu.
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = API_SURUMU;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
