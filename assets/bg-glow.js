// assets/bg-glow.js
(() => {
  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  // body が確実にあるタイミングで実行
  const run = () => {
    // 二重挿入防止
    if (document.getElementById("bg-glow")) return;

    const el = document.createElement("div");
    el.id = "bg-glow";
    el.setAttribute("aria-hidden", "true");
    document.body.prepend(el);

    // Reduce motion でも「静的に」見えるように初期値をセット
    const root = document.documentElement.style;
    root.setProperty("--bgx1", "55%");
    root.setProperty("--bgy1", "18%");
    root.setProperty("--bgx2", "70%");
    root.setProperty("--bgy2", "28%");
    root.setProperty("--bgx3", "42%");
    root.setProperty("--bgy3", "30%");

    // 動きを減らす設定ならここで終了（表示は残る）
    if (reduceMotion) return;

    // 0..1 の正規化座標
    let tx = 0.55, ty = 0.18;
    let x = tx, y = ty;
    let vx = 0, vy = 0;

    const k = 0.10;     // 追従の強さ
    const damp = 0.82;  // 減衰

    const setTarget = (clientX, clientY) => {
      tx = Math.min(1, Math.max(0, clientX / window.innerWidth));
      ty = Math.min(1, Math.max(0, clientY / window.innerHeight));
    };

    window.addEventListener(
      "mousemove",
      (e) => setTarget(e.clientX, e.clientY),
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches?.[0];
        if (t) setTarget(t.clientX, t.clientY);
      },
      { passive: true }
    );

    function tick(now) {
      vx += (tx - x) * k;
      vy += (ty - y) * k;
      vx *= damp;
      vy *= damp;
      x += vx;
      y += vy;

      const s = now * 0.001;
      const driftX = (Math.sin(s * 0.8) + Math.sin(s * 1.7 + 1.2)) * 0.03;
      const driftY = (Math.cos(s * 0.9) + Math.cos(s * 1.9 + 0.6)) * 0.03;

      const x1 = x + driftX;
      const y1 = y + driftY;

      const x2 = x + Math.sin(s * 1.3 + 2.0) * 0.10;
      const y2 = y + Math.cos(s * 1.1 + 2.4) * 0.10;

      const x3 = x + Math.sin(s * 0.7 + 0.4) * 0.16;
      const y3 = y + Math.cos(s * 0.6 + 0.9) * 0.16;

      root.setProperty("--bgx1", `${(x1 * 100).toFixed(2)}%`);
      root.setProperty("--bgy1", `${(y1 * 100).toFixed(2)}%`);
      root.setProperty("--bgx2", `${(x2 * 100).toFixed(2)}%`);
      root.setProperty("--bgy2", `${(y2 * 100).toFixed(2)}%`);
      root.setProperty("--bgx3", `${(x3 * 100).toFixed(2)}%`);
      root.setProperty("--bgy3", `${(y3 * 100).toFixed(2)}%`);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
