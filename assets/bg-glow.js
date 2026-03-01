// assets/bg-glow.js
(function () {
  try {
    // 「JSが読み込まれた」印
    document.documentElement.setAttribute("data-bg-glow", "loaded");

    function reduceMotionEnabled() {
      try {
        return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      } catch (e) {
        return false;
      }
    }

    function run() {
      // 「runが呼ばれた」印
      document.documentElement.setAttribute("data-bg-glow", "run");

      if (!document.body) {
        // bodyが無いなら次のtickへ
        setTimeout(run, 0);
        return;
      }

      if (!document.getElementById("bg-glow")) {
        var el = document.createElement("div");
        el.id = "bg-glow";
        el.setAttribute("aria-hidden", "true");
        document.body.insertBefore(el, document.body.firstChild);
      }

      // 「挿入できた」印
      document.documentElement.setAttribute("data-bg-glow", "inserted");

      // 初期位置（静的表示にも使う）
      var root = document.documentElement.style;
      root.setProperty("--bgx1", "55%");
      root.setProperty("--bgy1", "18%");
      root.setProperty("--bgx2", "70%");
      root.setProperty("--bgy2", "28%");
      root.setProperty("--bgx3", "42%");
      root.setProperty("--bgy3", "30%");

      // 動きを減らす設定なら「静的表示」で終了（要素は残る）
      if (reduceMotionEnabled()) {
        document.documentElement.setAttribute("data-bg-glow", "static");
        return;
      }

      var tx = 0.55, ty = 0.18;
      var x = tx, y = ty;
      var vx = 0, vy = 0;
      var k = 0.10;
      var damp = 0.82;

      function setTarget(cx, cy) {
        tx = Math.min(1, Math.max(0, cx / window.innerWidth));
        ty = Math.min(1, Math.max(0, cy / window.innerHeight));
      }

      window.addEventListener("mousemove", function (e) {
        setTarget(e.clientX, e.clientY);
      }, { passive: true });

      window.addEventListener("touchmove", function (e) {
        var t = e.touches && e.touches[0];
        if (t) setTarget(t.clientX, t.clientY);
      }, { passive: true });

      function tick(now) {
        vx += (tx - x) * k;
        vy += (ty - y) * k;
        vx *= damp;
        vy *= damp;
        x += vx;
        y += vy;

        var s = now * 0.001;
        var driftX = (Math.sin(s * 0.8) + Math.sin(s * 1.7 + 1.2)) * 0.03;
        var driftY = (Math.cos(s * 0.9) + Math.cos(s * 1.9 + 0.6)) * 0.03;

        var x1 = x + driftX;
        var y1 = y + driftY;

        var x2 = x + Math.sin(s * 1.3 + 2.0) * 0.10;
        var y2 = y + Math.cos(s * 1.1 + 2.4) * 0.10;

        var x3 = x + Math.sin(s * 0.7 + 0.4) * 0.16;
        var y3 = y + Math.cos(s * 0.6 + 0.9) * 0.16;

        root.setProperty("--bgx1", (x1 * 100).toFixed(2) + "%");
        root.setProperty("--bgy1", (y1 * 100).toFixed(2) + "%");
        root.setProperty("--bgx2", (x2 * 100).toFixed(2) + "%");
        root.setProperty("--bgy2", (y2 * 100).toFixed(2) + "%");
        root.setProperty("--bgx3", (x3 * 100).toFixed(2) + "%");
        root.setProperty("--bgy3", (y3 * 100).toFixed(2) + "%");

        requestAnimationFrame(tick);
      }

      document.documentElement.setAttribute("data-bg-glow", "animating");
      requestAnimationFrame(tick);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  } catch (e) {
    document.documentElement.setAttribute("data-bg-glow", "error");
    console.error("[bg-glow] error", e);
  }
})();
