/*!
 * İndirim Çarkı — vitrin betiği
 *
 * Ayarları uygulama proxy'sinden alır. Kazanan dilime sunucu karar verir;
 * bu dosya yalnızca sonucu animasyonla gösterir.
 */
(function () {
  "use strict";

  var kok = document.getElementById("indirim-carki-kok");
  if (!kok) return;

  var PROXY = kok.getAttribute("data-proxy") || "/apps/indirim-carki";
  var SAYFA_TIPI = kok.getAttribute("data-sayfa-tipi") || "";
  var TASARIM_MODU = kok.getAttribute("data-tasarim-modu") === "1";
  var DEPO_ANAHTARI = "ic_son_gosterim_v1";

  var azHareket =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Tema düzenleyicisinin içinde çalıştırmayız: hem gereksiz istek atar hem de
  // mağaza sahibinin düzenleme deneyimini bozar.
  if (TASARIM_MODU) return;

  fetch(PROXY + "/config", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then(function (cevap) {
      if (!cevap.ok) throw new Error("yapılandırma alınamadı");
      return cevap.json();
    })
    .then(function (ayar) {
      if (!ayar || ayar.aktif === false) return;
      if (!Array.isArray(ayar.dilimler) || ayar.dilimler.length < 2) return;
      if (!hedeflemeUygunMu(ayar.davranis)) return;
      if (yakindaGosterildiMi(ayar.davranis)) return;
      kur(ayar);
    })
    .catch(function () {
      /* Çark yüklenemezse mağaza normal şekilde çalışmaya devam eder. */
    });

  // -------------------------------------------------------------------------
  // Hedefleme
  // -------------------------------------------------------------------------
  function hedeflemeUygunMu(d) {
    var mobil = window.matchMedia("(max-width: 767px)").matches;
    if (mobil && d.mobildeGoster === false) return false;
    if (!mobil && d.masaustundeGoster === false) return false;

    if (Array.isArray(d.sayfalar) && d.sayfalar.length) {
      if (d.sayfalar.indexOf(SAYFA_TIPI) === -1) return false;
    }
    return true;
  }

  function yakindaGosterildiMi(d) {
    var gun = Number(d.tekrarGun) || 0;
    if (gun <= 0) return false;
    try {
      var son = Number(localStorage.getItem(DEPO_ANAHTARI) || 0);
      return son > 0 && Date.now() - son < gun * 86400000;
    } catch (e) {
      return false;
    }
  }

  function gosterildiIsaretle() {
    try {
      localStorage.setItem(DEPO_ANAHTARI, String(Date.now()));
    } catch (e) {
      /* gizli mod */
    }
  }

  // -------------------------------------------------------------------------
  // Kurulum
  // -------------------------------------------------------------------------
  function kur(ayar) {
    var m = ayar.metinler;
    var g = ayar.gorunum;
    var d = ayar.davranis;
    var dilimler = ayar.dilimler;
    var adet = dilimler.length;
    var dilimAcisi = (Math.PI * 2) / adet;

    var kap = document.createElement("div");
    kap.className =
      "ic-kap ic-konum-" + (g.konum || "sag-alt") + " ic-boyut-" + (g.boyut || "orta");
    if (g.yaziTipi === "sistem") kap.classList.add("ic-sistem-yazi");

    kap.style.setProperty("--ic-ana", g.birincilRenk);
    kap.style.setProperty("--ic-zemin", g.zeminRenk);
    kap.style.setProperty("--ic-metin", g.metinRenk);
    kap.style.setProperty("--ic-buton-metin", g.butonMetinRenk);
    kap.style.setProperty("--ic-ibre", g.ibreRenk);
    kap.style.setProperty("--ic-yuvarlak", (g.kenarYuvarlakligi || 0) + "px");
    kap.style.setProperty("--ic-kaplama", (g.kaplamaKoyulugu || 0) / 100);

    kap.innerHTML = kalip(m, g, d);
    document.body.appendChild(kap);

    var yuzenBtn = kap.querySelector(".ic-yuzen");
    var ortu = kap.querySelector(".ic-ortu");
    var pencere = kap.querySelector(".ic-pencere");
    var kapatBtn = kap.querySelector(".ic-kapat");
    var form = kap.querySelector(".ic-form");
    var epostaEl = kap.querySelector(".ic-eposta");
    var izinEl = kap.querySelector(".ic-izin-kutu");
    var cevirBtn = kap.querySelector(".ic-cevir");
    var gobekBtn = kap.querySelector(".ic-gobek");
    var uyariEl = kap.querySelector(".ic-uyari");
    var sonucEl = kap.querySelector(".ic-sonuc");
    var canvas = kap.querySelector(".ic-canvas");

    if (!g.yuzenButonGoster && yuzenBtn) yuzenBtn.remove();

    // ---- Çark çizimi -------------------------------------------------------
    var ctx = canvas.getContext("2d");
    var boyut = 0;
    var aci = 0;

    function olcuAyarla() {
      var enBuyuk = g.boyut === "kucuk" ? 260 : g.boyut === "buyuk" ? 380 : 320;
      boyut = Math.min(enBuyuk, Math.floor(Math.min(window.innerWidth * 0.78, window.innerHeight * 0.5)));
      var dpr = window.devicePixelRatio || 1;
      canvas.width = boyut * dpr;
      canvas.height = boyut * dpr;
      canvas.style.width = boyut + "px";
      canvas.style.height = boyut + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ciz();
    }

    function kontrast(hex) {
      var s = String(hex || "#000000").replace("#", "");
      var r = parseInt(s.slice(0, 2), 16) || 0;
      var y = parseInt(s.slice(2, 4), 16) || 0;
      var b = parseInt(s.slice(4, 6), 16) || 0;
      return (0.299 * r + 0.587 * y + 0.114 * b) / 255 > 0.62 ? "#1f2937" : "#ffffff";
    }

    function ciz() {
      var yari = boyut / 2;
      ctx.clearRect(0, 0, boyut, boyut);
      ctx.save();
      ctx.translate(yari, yari);
      ctx.rotate(aci);

      for (var i = 0; i < adet; i++) {
        var bas = i * dilimAcisi - Math.PI / 2 - dilimAcisi / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, yari - 8, bas, bas + dilimAcisi);
        ctx.closePath();
        ctx.fillStyle = dilimler[i].renk || "#cccccc";
        ctx.fill();
        ctx.strokeStyle = "rgba(212,175,55,0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.rotate(bas + dilimAcisi / 2);
        var mutlak = (((bas + dilimAcisi / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var ters = mutlak > Math.PI / 2 && mutlak < (Math.PI * 3) / 2;
        if (ters) ctx.rotate(Math.PI);
        ctx.textAlign = ters ? "left" : "right";
        ctx.textBaseline = "middle";
        ctx.fillStyle = kontrast(dilimler[i].renk);
        var punto = Math.max(10, Math.min(16, (boyut * 0.62) / adet));
        ctx.font = "700 " + punto + 'px ui-sans-serif, -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(String(dilimler[i].etiket || "").slice(0, 22), ters ? -(yari - 22) : yari - 22, 0);
        ctx.restore();
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(boyut / 2, boyut / 2, boyut / 2 - 4, 0, Math.PI * 2);
      ctx.lineWidth = 7;
      ctx.strokeStyle = g.cerceveRenk || g.birincilRenk;
      ctx.stroke();

      // İnce altın iç halka
      ctx.beginPath();
      ctx.arc(boyut / 2, boyut / 2, boyut / 2 - 13, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,55,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Merkez dekoratif halka
      ctx.beginPath();
      ctx.arc(boyut / 2, boyut / 2, 42, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212,175,55,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Merkez altın noktalar
      ctx.fillStyle = "rgba(212,175,55,0.7)";
      for (var ni = 0; ni < 8; ni++) {
        var naci = (ni / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(
          boyut / 2 + Math.cos(naci) * 36,
          boyut / 2 + Math.sin(naci) * 36,
          2.5, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }

    olcuAyarla();

    // --- Kıvılcım sistemi ---
    var kivKap = document.createElement("canvas");
    kivKap.className = "ic-kivılcım";
    kap.querySelector(".ic-cark").appendChild(kivKap);
    var kivCtx = kivKap.getContext("2d");
    var kivler = [];
    var kivAktif = false;
    var kivRaf;

    function kivBoyutAyarla() {
      var dpr2 = window.devicePixelRatio || 1;
      kivKap.width = boyut * dpr2;
      kivKap.height = boyut * dpr2;
      kivKap.style.width = boyut + "px";
      kivKap.style.height = boyut + "px";
    }
    kivBoyutAyarla();

    function kivCiz() {
      var dpr2 = window.devicePixelRatio || 1;
      kivCtx.clearRect(0, 0, kivKap.width, kivKap.height);
      kivCtx.save();
      kivCtx.scale(dpr2, dpr2);
      for (var ki = kivler.length - 1; ki >= 0; ki--) {
        var kp = kivler[ki];
        kp.x += kp.vx;
        kp.y += kp.vy;
        kp.vy += 0.09;
        kp.can -= 0.038;
        if (kp.can <= 0) { kivler.splice(ki, 1); continue; }
        kivCtx.globalAlpha = kp.can;
        kivCtx.fillStyle = kp.renk;
        kivCtx.beginPath();
        kivCtx.arc(kp.x, kp.y, kp.r, 0, Math.PI * 2);
        kivCtx.fill();
      }
      kivCtx.restore();
      if (kivAktif && Math.random() > 0.3) {
        var rac = Math.random() * Math.PI * 2;
        var rr = boyut / 2 - 14;
        kivler.push({
          x: boyut / 2 + Math.cos(rac) * rr,
          y: boyut / 2 + Math.sin(rac) * rr,
          vx: Math.cos(rac) * (Math.random() * 1.8 + 0.3),
          vy: Math.sin(rac) * (Math.random() * 1.8 + 0.3) - 0.9,
          can: 1,
          r: Math.random() * 2.5 + 0.5,
          renk: Math.random() > 0.5 ? "#D4AF37" : "#FFE97F",
        });
      }
      if (kivler.length > 0 || kivAktif) {
        kivRaf = requestAnimationFrame(kivCiz);
      }
    }

    function kivBaslat() {
      if (azHareket) return;
      kivAktif = true;
      cancelAnimationFrame(kivRaf);
      kivCiz();
    }

    function kivDurdur() {
      kivAktif = false;
    }

    var olcuZaman;
    window.addEventListener("resize", function () {
      clearTimeout(olcuZaman);
      olcuZaman = setTimeout(function () { olcuAyarla(); kivBoyutAyarla(); }, 150);
    });

    // ---- Aç / kapat --------------------------------------------------------
    var acik = false;
    var acildiBirKez = false;
    var oncekiOdak = null;

    function ac() {
      if (acik) return;
      acik = true;
      acildiBirKez = true;
      oncekiOdak = document.activeElement;
      ortu.hidden = false;
      document.documentElement.classList.add("ic-kilit");
      gosterildiIsaretle();
      window.setTimeout(function () {
        var ilk = epostaEl && !epostaEl.disabled ? epostaEl : cevirBtn;
        if (ilk) ilk.focus();
      }, 60);
    }

    function kapat() {
      if (!acik) return;
      acik = false;
      ortu.hidden = true;
      document.documentElement.classList.remove("ic-kilit");
      if (oncekiOdak && oncekiOdak.focus) oncekiOdak.focus();
    }

    if (yuzenBtn) yuzenBtn.addEventListener("click", ac);
    kapatBtn.addEventListener("click", kapat);
    ortu.addEventListener("mousedown", function (olay) {
      if (olay.target === ortu) kapat();
    });

    document.addEventListener("keydown", function (olay) {
      if (!acik) return;
      if (olay.key === "Escape") {
        kapat();
        return;
      }
      if (olay.key === "Tab") odakTuzagi(olay);
    });

    function odakTuzagi(olay) {
      var odaklanabilir = pencere.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!odaklanabilir.length) return;
      var ilk = odaklanabilir[0];
      var son = odaklanabilir[odaklanabilir.length - 1];
      if (olay.shiftKey && document.activeElement === ilk) {
        olay.preventDefault();
        son.focus();
      } else if (!olay.shiftKey && document.activeElement === son) {
        olay.preventDefault();
        ilk.focus();
      }
    }

    // ---- Açılma tetikleyicileri -------------------------------------------
    if (d.otomatikAc) {
      window.setTimeout(function () {
        if (!acildiBirKez) ac();
      }, Math.max(0, Number(d.gecikmeSn) || 0) * 1000);
    }

    if (d.cikisNiyeti) {
      document.addEventListener("mouseout", function cikis(olay) {
        if (acildiBirKez) {
          document.removeEventListener("mouseout", cikis);
          return;
        }
        if (!olay.relatedTarget && olay.clientY <= 0) {
          document.removeEventListener("mouseout", cikis);
          ac();
        }
      });
    }

    var kaydirmaHedefi = Number(d.kaydirmaYuzdesi) || 0;
    if (kaydirmaHedefi > 0) {
      window.addEventListener(
        "scroll",
        function kaydir() {
          if (acildiBirKez) {
            window.removeEventListener("scroll", kaydir);
            return;
          }
          var toplam = document.documentElement.scrollHeight - window.innerHeight;
          if (toplam <= 0) return;
          if ((window.scrollY / toplam) * 100 >= kaydirmaHedefi) {
            window.removeEventListener("scroll", kaydir);
            ac();
          }
        },
        { passive: true }
      );
    }

    // ---- Çevirme -----------------------------------------------------------
    var donuyor = false;

    function cevir(olay) {
      if (olay) olay.preventDefault();
      if (donuyor) return;

      var eposta = epostaEl ? epostaEl.value.trim() : "";
      if (d.epostaZorunlu && !epostaGecerli(eposta)) {
        uyar(m.epostaHatasi);
        if (epostaEl) epostaEl.focus();
        return;
      }

      donuyor = true;
      kivBaslat();
      var ibreEl = kap.querySelector(".ic-ibre");
      if (ibreEl && !azHareket) {
        ibreEl.classList.add("ic-ibre-sarsilma");
        setTimeout(function () { ibreEl.classList.remove("ic-ibre-sarsilma"); }, 650);
      }
      uyariEl.hidden = true;
      cevirBtn.disabled = true;
      gobekBtn.disabled = true;
      var eskiYazi = cevirBtn.textContent;
      cevirBtn.textContent = m.cevriliyorMetni;

      fetch(PROXY + "/spin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          eposta: eposta,
          pazarlamaIzni: Boolean(izinEl && izinEl.checked),
        }),
      })
        .then(function (cevap) {
          return cevap
            .text()
            .then(function (ham) {
              try {
                return JSON.parse(ham);
              } catch (e) {
                throw new Error(
                  "Sunucu JSON döndürmedi (HTTP " + cevap.status + ")",
                );
              }
            })
            .then(function (govde) {
              if (govde && govde.teknik && window.console) {
                console.error("[indirim-carki] " + govde.teknik);
              }
              if (!cevap.ok || (govde && govde.hata)) {
                throw new Error((govde && govde.hata) || m.hataMesaji);
              }
              return govde;
            });
        })
        .then(function (sonuc) {
          dondur(sonuc);
        })
        .catch(function (hata) {
          uyar(hata.message || m.hataMesaji);
          donuyor = false;
          cevirBtn.disabled = false;
          gobekBtn.disabled = false;
          cevirBtn.textContent = eskiYazi;
        });
    }

    form.addEventListener("submit", cevir);
    gobekBtn.addEventListener("click", cevir);

    function uyar(mesaj) {
      uyariEl.textContent = mesaj;
      uyariEl.hidden = false;
    }

    function epostaGecerli(deger) {
      return /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/.test(deger) && deger.length <= 254;
    }

    function dondur(sonuc) {
      var index = Math.max(0, Math.min(adet - 1, Number(sonuc.index) || 0));
      // Dilim i'nin (döndürülmemiş) merkez açısı ciz()'de "i*dilimAcisi - PI/2"
      // olarak çizilir; ibre ekranda sabit -PI/2'de (üstte) durur. Ekrandaki
      // açı = yerel açı + aci olduğundan, dilim merkezinin ibreyle çakışması
      // için aci = -index*dilimAcisi olmalı. Eskiden buraya fazladan
      // "-PI/2 - dilimAcisi/2" eklenmişti; 6 dilimde bu tam 2 dilim kaymaya
      // (120°) denk geliyordu — çark görsel olarak yanlış dilimde duruyordu.
      var hedefMod =
        (((-index * dilimAcisi) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var mevcutMod = ((aci % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      var fark = hedefMod - mevcutMod;
      if (fark < 0) fark += Math.PI * 2;

      var turlar = Math.max(2, Number(d.turSayisi) || 6);
      var hedef = aci + fark + Math.PI * 2 * turlar;
      var sure = azHareket ? 400 : Math.max(2, Number(d.animasyonSn) || 5) * 1000;
      var baslangic = aci;
      var t0 = performance.now();

      function adim(t) {
        var p = Math.min(1, (t - t0) / sure);
        var yumusak = 1 - Math.pow(1 - p, 5);
        aci = baslangic + (hedef - baslangic) * yumusak;
        ciz();
        if (p < 1) requestAnimationFrame(adim);
        else sonucGoster(sonuc);
      }
      requestAnimationFrame(adim);
    }

    function sonucGoster(sonuc) {
      kivDurdur();
      if (!azHareket && sonuc.kazandi) {
        canvas.classList.add("ic-canvas-flas");
        setTimeout(function () { canvas.classList.remove("ic-canvas-flas"); }, 900);
      }
      form.hidden = true;
      uyariEl.hidden = true;
      sonucEl.hidden = false;

      var baslikEl = sonucEl.querySelector(".ic-sonuc-baslik");
      var aciklamaEl = sonucEl.querySelector(".ic-sonuc-aciklama");
      var kodKutu = sonucEl.querySelector(".ic-kod-kutu");
      var kodEl = sonucEl.querySelector(".ic-kod");
      var notEl = sonucEl.querySelector(".ic-kod-not");
      var kopyalaBtn = sonucEl.querySelector(".ic-kopyala");

      if (sonuc.kazandi && sonuc.kod) {
        baslikEl.textContent = m.kazandiBaslik;
        aciklamaEl.textContent = String(m.kazandiAciklama).replace("{odul}", sonuc.etiket);
        kodEl.textContent = sonuc.kod;

        var notlar = [m.kodNotu];
        if (d.kodGecerlilikGun > 0) {
          notlar.push(String(m.sonKullanmaNotu).replace("{gun}", d.kodGecerlilikGun));
        }
        notEl.textContent = notlar.join(" ");

        kopyalaBtn.addEventListener("click", function () {
          kopyala(sonuc.kod, kopyalaBtn);
        });

        if (g.konfetiGoster && !azHareket) konfeti(pencere);
      } else {
        baslikEl.textContent = m.kaybettiBaslik;
        aciklamaEl.textContent = m.kaybettiAciklama;
        kodKutu.hidden = true;
        notEl.hidden = true;
      }

      sonucEl.setAttribute("tabindex", "-1");
      sonucEl.focus();
    }

    function kopyala(kod, buton) {
      var eskiYazi = buton.textContent;
      var bitir = function () {
        buton.textContent = m.kopyalandiMetni;
        window.setTimeout(function () {
          buton.textContent = eskiYazi;
        }, 1800);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(kod).then(bitir, yedekKopyala);
      } else {
        yedekKopyala();
      }

      function yedekKopyala() {
        var alan = document.createElement("textarea");
        alan.value = kod;
        alan.setAttribute("readonly", "");
        alan.style.position = "fixed";
        alan.style.opacity = "0";
        document.body.appendChild(alan);
        alan.select();
        try {
          document.execCommand("copy");
          bitir();
        } catch (e) {
          /* kullanıcı elle kopyalayabilir */
        }
        document.body.removeChild(alan);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Kalıp
  // -------------------------------------------------------------------------
  function kalip(m, g, d) {
    var logo = g.logoUrl
      ? '<img class="ic-logo" src="' + kacis(g.logoUrl) + '" alt="" />'
      : "";

    var epostaAlani =
      '<label class="ic-etiket" for="ic-eposta">' + kacis(m.epostaEtiketi) + "</label>" +
      '<input class="ic-eposta" id="ic-eposta" type="email" name="eposta" ' +
      'autocomplete="email" inputmode="email" placeholder="' + kacis(m.epostaYerTutucu) + '"' +
      (d.epostaZorunlu ? " required" : "") + " />";

    var izin = d.pazarlamaOnayiGoster
      ? '<label class="ic-izin"><input class="ic-izin-kutu" type="checkbox"' +
        (d.pazarlamaOnayiVarsayilan ? " checked" : "") +
        " /><span>" + kacis(m.pazarlamaOnayiMetni) + "</span></label>"
      : "";

    var kvkk =
      '<p class="ic-kvkk">' + kacis(m.kvkkMetni) +
      (m.kvkkLinkUrl
        ? ' <a href="' + kacis(m.kvkkLinkUrl) + '" target="_blank" rel="noopener">' +
          kacis(m.kvkkLinkMetni) + "</a>"
        : "") +
      "</p>";

    return (
      '<button class="ic-yuzen" type="button">' +
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">' +
          '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>' +
        "</svg>" +
        "<span>" + kacis(m.yuzenButonMetni) + "</span>" +
      "</button>" +

      '<div class="ic-ortu" hidden>' +
        '<div class="ic-pencere" role="dialog" aria-modal="true" aria-labelledby="ic-baslik">' +
          '<button class="ic-kapat" type="button" aria-label="' + kacis(m.kapatMetni) + '">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">' +
              '<path d="M5 5l14 14M19 5L5 19"/></svg>' +
          "</button>" +

          logo +
          '<h2 class="ic-baslik" id="ic-baslik">' + kacis(m.baslik) + "</h2>" +
          '<p class="ic-altbaslik">' + kacis(m.altBaslik) + "</p>" +

          '<div class="ic-cark">' +
            '<span class="ic-ibre" aria-hidden="true"></span>' +
            '<canvas class="ic-canvas" role="img" aria-label="' + kacis(m.baslik) + '"></canvas>' +
            '<div class="ic-rim-isik" aria-hidden="true"></div>' +
            '<button class="ic-gobek" type="button">' + kacis(m.gobekMetni) + "</button>" +
          "</div>" +

          '<form class="ic-form" novalidate>' +
            epostaAlani +
            izin +
            '<button class="ic-cevir" type="submit">' + kacis(m.cevirButonu) + "</button>" +
            kvkk +
          "</form>" +

          '<p class="ic-uyari" role="alert" hidden></p>' +

          '<div class="ic-sonuc" hidden>' +
            '<h3 class="ic-sonuc-baslik"></h3>' +
            '<p class="ic-sonuc-aciklama"></p>' +
            '<div class="ic-kod-kutu">' +
              '<code class="ic-kod"></code>' +
              '<button class="ic-kopyala" type="button">' + kacis(m.kopyalaButonu) + "</button>" +
            "</div>" +
            '<p class="ic-kod-not"></p>' +
            '<button class="ic-devam" type="button" onclick="this.closest(\'.ic-ortu\').hidden=true;document.documentElement.classList.remove(\'ic-kilit\')">' +
              kacis(m.alisveriseDevamButonu) +
            "</button>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  // -------------------------------------------------------------------------
  function konfeti(pencere) {
    var tuval = document.createElement("canvas");
    tuval.className = "ic-konfeti";
    document.body.appendChild(tuval);
    var ctx = tuval.getContext("2d");
    tuval.width = window.innerWidth;
    tuval.height = window.innerHeight;

    var renkler = ["#D4AF37", "#C5A028", "#FFE97F", "#1a1a1a", "#B8943F", "#F0D060", "#8B6914", "#FAE27C"];
    var kutu = pencere.getBoundingClientRect();
    var mx = kutu.left + kutu.width / 2;
    var my = kutu.top + kutu.height / 3;
    var parcalar = [];

    for (var i = 0; i < 120; i++) {
      parcalar.push({
        x: mx,
        y: my,
        vx: (Math.random() - 0.5) * 13,
        vy: Math.random() * -11 - 3,
        boyut: Math.random() * 7 + 3,
        renk: renkler[i % renkler.length],
        donme: Math.random() * Math.PI * 2,
        vdonme: (Math.random() - 0.5) * 0.28,
      });
    }

    var bas = performance.now();
    (function adim(t) {
      var gecen = (t - bas) / 1000;
      ctx.clearRect(0, 0, tuval.width, tuval.height);
      for (var i = 0; i < parcalar.length; i++) {
        var p = parcalar[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.donme += p.vdonme;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.donme);
        ctx.globalAlpha = Math.max(0, 1 - gecen / 2.6);
        ctx.fillStyle = p.renk;
        ctx.fillRect(-p.boyut / 2, -p.boyut / 2, p.boyut, p.boyut * 0.6);
        ctx.restore();
      }
      if (gecen < 2.6) requestAnimationFrame(adim);
      else tuval.remove();
    })(bas);
  }

  function kacis(metin) {
    return String(metin == null ? "" : metin).replace(/[&<>"']/g, function (karakter) {
      return "&#" + karakter.charCodeAt(0) + ";";
    });
  }
})();
