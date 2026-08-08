import { Form, useLoaderData, useActionData } from "react-router";
import { login } from "../shopify.server";

export const loader = async ({ request }) => {
  const errors = (await login(request))?.errors;
  return { errors: errors || {} };
};

export const action = async ({ request }) => {
  const errors = (await login(request))?.errors;
  return { errors: errors || {} };
};

export default function GirisSayfasi() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const errors = actionData?.errors ?? loaderData?.errors ?? {};

  return (
    <main style={sayfa}>
      <Form method="post" style={kart}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>İndirim Çarkı</h1>
        <p style={{ margin: "0 0 20px", color: "#616161", fontSize: 14 }}>
          Devam etmek için mağaza adresinizi girin.
        </p>

        <label htmlFor="shop" style={etiket}>
          Mağaza adresi
        </label>
        <input
          id="shop"
          type="text"
          name="shop"
          placeholder="magazaniz.myshopify.com"
          autoComplete="on"
          style={girdi}
        />
        {errors.shop && (
          <p style={{ color: "#b91c1c", fontSize: 13, margin: "8px 0 0" }}>{errors.shop}</p>
        )}

        <button type="submit" style={buton}>
          Devam et
        </button>
      </Form>
    </main>
  );
}

const sayfa = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#f1f2f4",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: 20,
};
const kart = {
  background: "#fff",
  padding: 28,
  borderRadius: 14,
  boxShadow: "0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06)",
  width: "min(380px, 100%)",
};
const etiket = { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 };
const girdi = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #c9cccf",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};
const buton = {
  marginTop: 18,
  width: "100%",
  padding: "11px 16px",
  background: "#1a1a1a",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
