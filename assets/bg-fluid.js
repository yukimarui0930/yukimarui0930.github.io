/* assets/bg-fluid.js
   背景最下層(z-index:0)で fluid-three を動かすためのローダー。
   - fluid-three は実行時に <canvas> を document.body に prepend する
   - その canvas に id="bg-fluid-canvas" を付与して、既存CSSに乗せる
   - dat.GUI を出すので非表示にする（表示したいならCSS部分を消す）
*/

(() => {
  // 二重起動防止
  if (window.__bgFluidThreeBooted) return;
  window.__bgFluidThreeBooted = true;

  // ユーザーが「視差/アニメーション低減」をONにしている場合は起動しない
  const reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  // dat.GUI を非表示（fluid-three はデフォルトでGUIを生成します）
  const hideGuiStyle = document.createElement("style");
  hideGuiStyle.textContent = `
    .dg, .dg.ac { display: none !important; }
  `;
  document.head.appendChild(hideGuiStyle);

  // bg-fluid.js の場所から相対で「ローカル配置」を優先して読みに行く
  // 例: /assets/vendor/fluid-three/main.min.js
  const currentScript = document.currentScript;
  const localSrc = (() => {
    try {
      const base = (currentScript && currentScript.src) ? currentScript.src : location.href;
      return new URL("./vendor/fluid-three/main.min.js", base).toString();
    } catch {
      return null;
    }
  })();

  // ローカルが無い場合のフォールバック（CDN）
  const cdnSrc = "https://cdn.jsdelivr.net/gh/mnmxmx/fluid-three@master/dist/main.min.js";

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

  function applyCanvasIdAndStyle() {
    // fluid-three が生成する canvas を取得（通常は1枚）
    const canvases = Array.from(document.body.querySelectorAll("canvas"));
    if (!canvases.length) return false;

    // “それっぽい”フルスクリーンcanvasを優先（面積が最大のもの）
    canvases.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const canvas = canvases[0];

    // id付与（既に別idなら上書きしない）
    if (!canvas.id) canvas.id = "bg-fluid-canvas";

    // CSSが効くまでの保険（あなたの main.scss があればほぼ不要）
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.zIndex = "0";
    canvas.style.pointerEvents = "none";

    return true;
  }

  async function boot() {
    // head から読み込まれていて body がまだ無い場合に備える
    if (!document.body) {
      await new Promise((r) =>
        window.addEventListener("DOMContentLoaded", r, { once: true })
      );
    }

    // まずローカルを試し、無ければCDNへ
    try {
      if (localSrc) {
        await loadScript(localSrc);
      } else {
        await loadScript(cdnSrc);
      }
    } catch (e1) {
      console.warn("[bg-fluid] local load failed, fallback to CDN.", e1);
      try {
        await loadScript(cdnSrc);
      } catch (e2) {
        console.error("[bg-fluid] failed to load fluid-three bundle.", e2);
        return;
      }
    }

    // 読み込み直後に canvas がいるはずだが、念のため監視
    if (applyCanvasIdAndStyle()) return;

    const obs = new MutationObserver(() => {
      if (applyCanvasIdAndStyle()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // いつまでも監視しない
    setTimeout(() => obs.disconnect(), 5000);
  }

  boot();
})();
