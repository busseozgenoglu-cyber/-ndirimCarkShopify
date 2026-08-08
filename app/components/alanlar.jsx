import { useEffect, useRef } from "react";

/**
 * Polaris web bileşenleri (s-text-field, s-switch …) özel HTML elemanlarıdır.
 * React 18'in sentetik olay sistemi özel elemanlarda `onChange`'i tetiklemez;
 * bu yüzden olayları doğrudan DOM üzerinden dinler, değeri de nitelik yerine
 * özellik (property) olarak yazarız. Bu yaklaşım React 18 ve 19'da aynı şekilde
 * çalışır.
 */
function useAlan(deger, onDegisim, alan = "value") {
  const ref = useRef(null);
  const geriCagirma = useRef(onDegisim);
  geriCagirma.current = onDegisim;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const dinleyici = (olay) => {
      const hedef = olay.currentTarget;
      geriCagirma.current(alan === "checked" ? Boolean(hedef.checked) : hedef.value);
    };

    el.addEventListener("change", dinleyici);
    el.addEventListener("input", dinleyici);
    return () => {
      el.removeEventListener("change", dinleyici);
      el.removeEventListener("input", dinleyici);
    };
  }, [alan]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (alan === "checked") {
      if (Boolean(el.checked) !== Boolean(deger)) el.checked = Boolean(deger);
    } else if (String(el.value ?? "") !== String(deger ?? "")) {
      el.value = deger ?? "";
    }
  }, [deger, alan]);

  return ref;
}

export function MetinAlani({ etiket, deger, onDegisim, ...rest }) {
  const ref = useAlan(deger, onDegisim);
  return <s-text-field ref={ref} label={etiket} {...rest} />;
}

export function CokSatirAlani({ etiket, deger, onDegisim, satir = 3, ...rest }) {
  const ref = useAlan(deger, onDegisim);
  return <s-text-area ref={ref} label={etiket} rows={satir} {...rest} />;
}

export function SayiAlani({ etiket, deger, onDegisim, ...rest }) {
  const ref = useAlan(deger, (yeni) => onDegisim(yeni === "" ? 0 : Number(yeni)));
  return <s-number-field ref={ref} label={etiket} {...rest} />;
}

export function Anahtar({ etiket, deger, onDegisim, ...rest }) {
  const ref = useAlan(deger, onDegisim, "checked");
  return <s-switch ref={ref} label={etiket} {...rest} />;
}

export function OnayKutusu({ etiket, deger, onDegisim, ...rest }) {
  const ref = useAlan(deger, onDegisim, "checked");
  return <s-checkbox ref={ref} label={etiket} {...rest} />;
}

export function SecimAlani({ etiket, deger, onDegisim, secenekler, ...rest }) {
  const ref = useAlan(deger, onDegisim);
  return (
    <s-select ref={ref} label={etiket} {...rest}>
      {secenekler.map((s) => (
        <s-option key={s.deger} value={s.deger}>
          {s.etiket}
        </s-option>
      ))}
    </s-select>
  );
}

/** Bileşenin döndürdüğü rgb()/rgba() değerlerini de #rrggbb biçimine indirger. */
export function hexeCevir(deger, yedek = "#000000") {
  const s = String(deger || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  }
  const rgb = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) {
    const parca = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0");
    return `#${parca(rgb[1])}${parca(rgb[2])}${parca(rgb[3])}`;
  }
  return yedek;
}

export function RenkAlani({ etiket, deger, onDegisim }) {
  const ref = useAlan(deger, (yeni) => onDegisim(hexeCevir(yeni, deger)));
  return <s-color-field ref={ref} label={etiket} alpha={undefined} />;
}
