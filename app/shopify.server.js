import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const API_SURUMU = ApiVersion.July26;

// SHOPIFY_APP_URL'yi temizle:
// - sondaki slash(lar) kaldırılır   → "https://ornek.railway.app/" düzelir
// - çift protokol kaldırılır        → "https://https://..." düzelir
function temizleUrl(deger) {
  if (!deger) return "";
  let url = String(deger).trim();
  // çift https:// veya http:// varsa teke indir
  url = url.replace(/^(https?:\/\/)+/, (_, p) => p);
  // sondaki slash(lar)ı kaldır
  url = url.replace(/\/+$/, "");
  return url;
}

const APP_URL = temizleUrl(process.env.SHOPIFY_APP_URL);

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: API_SURUMU,
  scopes: process.env.SCOPES?.split(",").map((s) => s.trim()).filter(Boolean),
  appUrl: APP_URL,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  useOnlineTokens: false,
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
