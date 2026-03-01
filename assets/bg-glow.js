// assets/bg-glow.js
// Mouse-follow + organic drift chromeyellow glow
// - Always inserts #bg-glow
// - If prefers-reduced-motion is ON, it still animates, but gently (animating-reduced)

(function () {
  try {
    document.documentElement.setAttribute("data-bg-glow", "loaded");

    function reduceMotionEnabled() {
      try {
        return !!(
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
      } catch (e) {
        return false;
      }
    }

    function run() {
      document.documentElement.setAttribute("data-bg-glow", "run");

      if (!document.body) {
        setTimeout(run, 0);
        return;
      }

      // Insert layer (once)
      var el = document.getElementById("bg-glow");
      if (!el) {
        el = document.createElement("div");
        el.id = "bg-glow";
        el.setAttribute("aria-hidden", "true");
        document.body.insertBefore(el, document.body.firstChild);
      }

      document.documentElement.setAttribute("data-bg-glow", "inserted");

      // Always set initial variables (so static render is OK even before first RAF)
      var root = document.documentElement.style;
      root.setProperty("--bgx1", "55%");
      root.setProperty("--bgy1", "18%");
      root.setProperty("--bgx2", "70%");
      root.setProperty("--bgy2", "28%");
      root.setProperty("--bgx3", "42%");
      root.setProperty("--bgy3", "30%");

      var isReduced = reduceMotionEnabled();

      // Target + state (0..1 normalized)
      var tx = 0.55,
        ty = 0.18;
      var x = tx,
        y = ty;
      var vx = 0,
        vy = 0;

      // Tuning
      // Normal: responsive + organic
      var k = 0.10; // spring strength
      var damp = 0.82; // damping (higher = smoother / slower)
      var driftAmt = 0.03;

      // Reduced motion: still animate but subtle
      if (isReduced) {
        k = 0.035;
        damp = 0.92;
        driftAmt = 0.012;
        document.documentElement.setAttribute("data-bg-glow", "animating-reduced");
      } else {
        document.documentElement.setAttribute("data-bg-glow", "animating");
      }

      function setTarget(cx, cy) {
        tx = Math.min(1, Math.max(0, cx / window.innerWidth));
        ty = Math.min(1, Math.max(0, cy / window.innerHeight));
      }

      window.addEventListener(
        "mousemove",
        function (e) {
          setTarget(e.clientX, e.clientY);
        },
        { passive: true }
      );

      window.addEventListener(
        "touchmove",
        function (e) {
          var t = e.touches && e.touches[0];
          if (t) setTarget(t.clientX, t.clientY);
        },
        { passive: true }
      );

      function tick(now) {
        // spring follow
        vx += (tx - x) * k;
        vy += (ty - y) * k;
        vx *= damp;
        vy *= damp;
        x += vx;
        y += vy;

        // organic drift (layered sines)
        var s = now * 0.001;

        var driftX =
          (Math.sin(s * 0.8) + Math.sin(s * 1.7 + 1.2)) * driftAmt;
        var driftY =
          (Math.cos(s * 0.9) + Math.cos(s * 1.9 + 0.6)) * driftAmt;

        // 3 blob centers (phase-shifted)
        var x1 = x + driftX;
        var y1 = y + driftY;

        var x2 = x + Math.sin(s * 1.3 + 2.0) * (isReduced ? 0.06 : 0.10);
        var y2 = y + Math.cos(s * 1.1 + 2.4) * (isReduced ? 0.06 : 0.10);

        var x3 = x + Math.sin(s * 0.7 + 0.4) * (isReduced ? 0.10 : 0.16);
        var y3 = y + Math.cos(s * 0.6 + 0.9) * (isReduced ? 0.10 : 0.16);

        root.setProperty("--bgx1", (x1 * 100).toFixed(2) + "%");
        root.setProperty("--bgy1", (y1 * 100).toFixed(2) + "%");
        root.setProperty("--bgx2", (x2 * 100).toFixed(2) + "%");
        root.setProperty("--bgy2", (y2 * 100).toFixed(2) + "%");
        root.setProperty("--bgx3", (x3 * 100).toFixed(2) + "%");
        root.setProperty("--bgy3", (y3 * 100).toFixed(2) + "%");

        requestAnimationFrame(tick);
      }

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
