import { useEffect, useRef, useState } from "react";

/** Zemin rengine göre okunabilir yazı rengi seçer. */
function kontrastRengi(hex) {
  const s = String(hex || "#000000").replace("#", "");
  const r = parseInt(s.slice(0, 2), 16) || 0;
  const g = parseInt(s.slice(2, 4), 16) || 0;
  const b = parseInt(s.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? "#1f2937" : "#ffffff";
}

/**
 * Mağaza sahibinin ayarları değiştirdikçe sonucu anında gördüğü önizleme.
 * Vitrindeki çizim mantığıyla aynı geometriyi kullanır.
 */
export default function CarkOnizleme({ ayar, boyut = 300 }) {
  const canvasRef = useRef(null);
  const [aci, setAci] = useState(0);
  const [donuyor, setDonuyor] = useState(false);
  const animRef = useRef(0);

  const dilimler = ayar.dilimler || [];
  const n = Math.max(dilimler.length, 1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = boyut * dpr;
    canvas.height = boyut * dpr;
    canvas.style.width = `${boyut}px`;
    canvas.style.height = `${boyut}px`;

    const ctx = canvas.getContext("2d");
    const yari = boyut / 2;
    const dilimAcisi = (Math.PI * 2) / n;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, boyut, boyut);
    ctx.save();
    ctx.translate(yari, yari);
    ctx.rotate(aci);

    for (let i = 0; i < n; i++) {
      const d = dilimler[i] || { etiket: "", renk: "#cccccc" };
      const bas = i * dilimAcisi - Math.PI / 2 - dilimAcisi / 2;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, yari - 8, bas, bas + dilimAcisi);
      ctx.closePath();
      ctx.fillStyle = d.renk || "#cccccc";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(bas + dilimAcisi / 2);
      const mutlak = ((bas + dilimAcisi / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const ters = mutlak > Math.PI / 2 && mutlak < (Math.PI * 3) / 2;
      if (ters) ctx.rotate(Math.PI);
      ctx.textAlign = ters ? "left" : "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = kontrastRengi(d.renk);
      const punto = Math.max(9, Math.min(14, 190 / n));
      ctx.font = `700 ${punto}px -apple-system, "Segoe UI", Roboto, sans-serif`;
      const etiket = String(d.etiket || "").slice(0, 20);
      ctx.fillText(etiket, ters ? -(yari - 20) : yari - 20, 0);
      ctx.restore();
    }
    ctx.restore();

    // Dış çerçeve
    ctx.beginPath();
    ctx.arc(yari, yari, yari - 4, 0, Math.PI * 2);
    ctx.lineWidth = 7;
    ctx.strokeStyle = ayar.gorunum?.cerceveRenk || "#7c3aed";
    ctx.stroke();
  }, [aci, boyut, dilimler, n, ayar.gorunum]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  function denemeCevir() {
    if (donuyor) return;
    setDonuyor(true);
    const baslangic = aci;
    const hedef = baslangic + Math.PI * 2 * 4 + Math.random() * Math.PI * 2;
    const sure = 2600;
    const t0 = performance.now();

    const adim = (t) => {
      const p = Math.min(1, (t - t0) / sure);
      const yumusak = 1 - Math.pow(1 - p, 4);
      setAci(baslangic + (hedef - baslangic) * yumusak);
      if (p < 1) animRef.current = requestAnimationFrame(adim);
      else setDonuyor(false);
    };
    animRef.current = requestAnimationFrame(adim);
  }

  const g = ayar.gorunum || {};

  return (
    <div
      style={{
        background: g.zeminRenk || "#ffffff",
        borderRadius: `${g.kenarYuvarlakligi ?? 20}px`,
        padding: "22px 18px",
        textAlign: "center",
        border: "1px solid rgba(0,0,0,.08)",
        color: g.metinRenk || "#111827",
        maxWidth: boyut + 60,
      }}
    >
      <h3 style={{ margin: "0 0 6px", fontSize: 19, fontWeight: 800 }}>
        {ayar.metinler?.baslik}
      </h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.75, lineHeight: 1.5 }}>
        {ayar.metinler?.altBaslik}
      </p>

      <div style={{ position: "relative", width: boyut, margin: "0 auto" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: `20px solid ${g.ibreRenk || "#111827"}`,
            zIndex: 2,
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "block" }} />
        <button
          type="button"
          onClick={denemeCevir}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 62,
            height: 62,
            borderRadius: "50%",
            border: `3px solid ${g.zeminRenk || "#fff"}`,
            background: g.birincilRenk || "#7c3aed",
            color: g.butonMetinRenk || "#fff",
            fontWeight: 800,
            fontSize: 11,
            cursor: "pointer",
            letterSpacing: ".02em",
          }}
        >
          {ayar.metinler?.gobekMetni}
        </button>
      </div>

      <div
        style={{
          marginTop: 16,
          border: "1px solid rgba(0,0,0,.15)",
          borderRadius: 10,
          padding: "9px 12px",
          fontSize: 13,
          textAlign: "left",
          opacity: 0.55,
        }}
      >
        {ayar.metinler?.epostaYerTutucu}
      </div>
      <div
        style={{
          marginTop: 8,
          background: g.birincilRenk || "#7c3aed",
          color: g.butonMetinRenk || "#fff",
          borderRadius: 10,
          padding: "11px 12px",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {ayar.metinler?.cevirButonu}
      </div>
      <p style={{ fontSize: 11, opacity: 0.6, marginTop: 10, marginBottom: 0 }}>
        {ayar.metinler?.kvkkMetni}
      </p>
    </div>
  );
}
