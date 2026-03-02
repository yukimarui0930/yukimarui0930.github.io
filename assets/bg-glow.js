// assets/bg-glow.js
// Fast mouse-follow + "afterglow" floaty tail (chromeyellow glow)
// - Always inserts #bg-glow
// - Reduced motion: still moves, but much more subtle
//
// Concept:
// 1) Pointer -> fast target (txFast/tyFast) : snappy
// 2) fast target -> tail target (txTail/tyTail) : creates lingering afterglow
// 3) tail target -> blob center (x/y) with spring dynamics
// 4) add small organic drift + velocity-based wobble for "余韻のふわふわ"

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

      var root = document.documentElement.style;

      // Initial values (so it doesn't flash weirdly before the first RAF)
      root.setProperty("--bgx1", "55%");
      root.setProperty("--bgy1", "18%");
      root.setProperty("--bgx2", "70%");
      root.setProperty("--bgy2", "28%");
      root.setProperty("--bgx3", "42%");
      root.setProperty("--bgy3", "30%");

      var isReduced = reduceMotionEnabled();
      document.documentElement.setAttribute(
        "data-bg-glow",
        isReduced ? "animating-reduced" : "animating"
      );

      // ============
      // Pointer targets (0..1 normalized)
      // ============
      var rawTx = 0.55,
        rawTy = 0.18;

      // fast-smoothed target (snappy)
      var txFast = rawTx,
        tyFast = rawTy;

      // tail target (lingering afterglow)
      var txTail = rawTx,
        tyTail = rawTy;

      // blob center (spring toward tail target)
      var x = rawTx,
        y = rawTy;
      var vx = 0,
        vy = 0;

      // ============
      // Tuning
      // ============
      // Fast follow: increase these
      var fastSmooth = 0.18; // ↑ makes cursor response quick (0.12..0.28)
      var tailSmooth = 0.045; // ↓ slower than fast; creates lingering tail (0.03..0.07)

      // Spring: speed + controlled overshoot
      var k = 0.095; // spring strength (↑ faster)
      var damp = 0.93; // damping (close to 1 => lingering; too high => mushy)

      // Organic drift (base)
      var driftAmt = 0.045;

      // Velocity-based "afterglow wobble"
      var wobbleAmt = 0.035; // how much wobble is injected from motion
      var wobbleSmooth = 0.085; // smoothing of wobble
      var wobX = 0,
        wobY = 0;

      // Reduced motion: keep it subtle and slower
      if (isReduced) {
        fastSmooth = 0.08;
        tailSmooth = 0.02;
        k = 0.04;
        damp = 0.9;
        driftAmt = 0.01;
        wobbleAmt = 0.01;
        wobbleSmooth = 0.06;
      }

      function clamp01(v) {
        return v < 0 ? 0 : v > 1 ? 1 : v;
      }

      function setTarget(cx, cy) {
        rawTx = clamp01(cx / Math.max(1, window.innerWidth));
        rawTy = clamp01(cy / Math.max(1, window.innerHeight));
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
        // 1) raw -> fast target (snappy)
        txFast += (rawTx - txFast) * fastSmooth;
        tyFast += (rawTy - tyFast) * fastSmooth;

        // 2) fast -> tail target (lingering)
        txTail += (txFast - txTail) * tailSmooth;
        tyTail += (tyFast - tyTail) * tailSmooth;

        // 3) spring follow toward tail target (gives body + slight overshoot)
        var ax = (txTail - x) * k;
        var ay = (tyTail - y) * k;
        vx = (vx + ax) * damp;
        vy = (vy + ay) * damp;
        x += vx;
        y += vy;

        // 4) organic drift + afterglow wobble tied to motion
        var s = now * 0.001;

        // base drift (slow, elegant)
        var driftX =
          (Math.sin(s * 0.7) + Math.sin(s * 1.35 + 1.2)) * driftAmt;
        var driftY =
          (Math.cos(s * 0.75) + Math.cos(s * 1.4 + 0.6)) * driftAmt;

        // wobble from velocity (余韻): when you move fast, it "rings" a bit
        // use perpendicular component to feel like a fluid tail
        var vlen = Math.min(1.0, Math.sqrt(vx * vx + vy * vy) * 6.5);
        var px = -vy; // perpendicular
        var py = vx;

        // normalize perpendicular (avoid divide by zero)
        var plen = Math.sqrt(px * px + py * py) || 1;
        px /= plen;
        py /= plen;

        // target wobble oscillates and decays with speed
        var wobTargetX = px * vlen * wobbleAmt * (0.6 + 0.4 * Math.sin(s * 2.2));
        var wobTargetY = py * vlen * wobbleAmt * (0.6 + 0.4 * Math.cos(s * 2.0));

        wobX += (wobTargetX - wobX) * wobbleSmooth;
        wobY += (wobTargetY - wobY) * wobbleSmooth;

        // 3 blob centers (phase shifted)
        var x1 = x + driftX + wobX;
        var y1 = y + driftY + wobY;

        var x2 =
          x +
          Math.sin(s * 1.15 + 2.0) * (isReduced ? 0.05 : 0.095) +
          driftX * 0.6 -
          wobX * 0.5;
        var y2 =
          y +
          Math.cos(s * 1.05 + 2.4) * (isReduced ? 0.05 : 0.095) +
          driftY * 0.6 -
          wobY * 0.5;

        var x3 =
          x +
          Math.sin(s * 0.62 + 0.4) * (isReduced ? 0.08 : 0.15) -
          driftX * 0.35 +
          wobX * 0.8;
        var y3 =
          y +
          Math.cos(s * 0.58 + 0.9) * (isReduced ? 0.08 : 0.15) -
          driftY * 0.35 +
          wobY * 0.8;

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
