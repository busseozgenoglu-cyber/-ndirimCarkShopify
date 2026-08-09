import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function AppYerlesimi() {
  const { apiKey } = useLoaderData();
  return (
    <AppProvider embedded apiKey={apiKey}>
      <ui-nav-menu>
        <a href="/app" rel="home">Çark ayarları</a>
        <a href="/app/katilimcilar">Katılımcılar</a>
        <a href="/app/yardim">Kurulum ve yardım</a>
        <a href="/app/baglanti">Bağlantı durumu</a>
      </ui-nav-menu>
      <Outlet />
    </AppProvider>
  );
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
