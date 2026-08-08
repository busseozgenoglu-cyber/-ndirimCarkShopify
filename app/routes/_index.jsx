import { redirect } from "react-router";
import { login } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  // Shopify admin'den mağaza parametresiyle geldiyse doğrudan gömülü uygulamaya yönlendir
  // (token exchange /app üzerinde çalışır; iframe içinde /auth/login'e gitmek X-Frame-Options engeline takılır).
  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }
  return { girisVar: Boolean(login) };
};

export default function Karsilama() {
  return (
    <main style={sayfa}>
      <section style={kart}>
        <div style={rozet}>Shopify uygulaması</div>
        <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>İndirim Çarkı</h1>
        <p style={{ color: "#4a4a4a", lineHeight: 1.6, margin: "0 0 22px" }}>
          Ziyaretçilerinizi e-posta karşılığında çark çevirmeye davet edin,
          kazananlara otomatik olarak tek kullanımlık indirim kodu gönderin.
        </p>
        <a href="/auth/login" style={buton}>
          Mağazama kur
        </a>
      </section>
    </main>
  );
}

const sayfa = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(160deg,#faf7ff,#eef2ff)",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  padding: 20,
};
const kart = {
  background: "#fff",
  padding: 36,
  borderRadius: 18,
  maxWidth: 460,
  boxShadow: "0 10px 40px rgba(80,60,160,.10)",
};
const rozet = {
  display: "inline-block",
  fontSize: 11,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: "#7c3aed",
  background: "#f3ecff",
  padding: "5px 10px",
  borderRadius: 999,
  marginBottom: 16,
};
const buton = {
  display: "inline-block",
  background: "#7c3aed",
  color: "#fff",
  padding: "11px 22px",
  borderRadius: 10,
  textDecoration: "none",
  fontWeight: 600,
  fontSize: 15,
};
