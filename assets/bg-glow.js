// assets/bg-glow.js
// Fast mouse-follow + lingering "afterglow" tail for 3 blob centers
// Exposes CSS vars:
//   --bgx1/--bgy1, --bgx2/--bgy2, --bgx3/--bgy3
// These are used both by #bg-glow gradients and by the pattern mask.
//
// Goals:
// - Cursor response: fast
// - Afterglow: floaty, with a soft wobble tail
// - Stable: no jitter, no runaway, no blur dependence

(function () {
  try {
    function reduceMotionEnabled() {
      try {
        return !!(
          window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
      } catch (_) {
        return false;
      }
    }

    function clamp01(v) {
      return v < 0 ? 0 : v > 1 ? 1 : v;
    }

    function run() {
      if (!document.body) {
        setTimeout(run, 0);
        return;
      }

      // Insert #bg-glow (z-index should be 0 in CSS)
      var glow = document.getElementById("bg-glow");
      if (!glow) {
        glow = document.createElement("div");
        glow.id = "bg-glow";
        glow.setAttribute("aria-hidden", "true");
        document.body.insertBefore(glow, document.body.firstChild);
      }

      var rootStyle = document.documentElement.style;

      // Initial placement (avoid flash)
      rootStyle.setProperty("--bgx1", "55%");
      rootStyle.setProperty("--bgy1", "18%");
      rootStyle.setProperty("--bgx2", "70%");
      rootStyle.setProperty("--bgy2", "28%");
      rootStyle.setProperty("--bgx3", "42%");
      rootStyle.setProperty("--bgy3", "30%");

      var isReduced = reduceMotionEnabled();
      document.documentElement.setAttribute(
        "data-bg-glow",
        isReduced ? "animating-reduced" : "animating"
      );

      // ============
      // Pointer input (0..1)
      // ============
      var rawTx = 0.55,
        rawTy = 0.18;

      function setTarget(cx, cy) {
        var w = Math.max(1, window.innerWidth);
        var h = Math.max(1, window.innerHeight);
        rawTx = clamp01(cx / w);
        rawTy = clamp01(cy / h);
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

      // ============
      // Two-stage target smoothing:
      //  raw -> fast (snappy) -> tail (afterglow)
      // ============
      var txFast = rawTx,
        tyFast = rawTy;
      var txTail = rawTx,
        tyTail = rawTy;

      // ============
      // Main body follows tail via spring dynamics
      // ============
      var x = rawTx,
        y = rawTy;
      var vx = 0,
        vy = 0;

      // ============
      // Tuning (default = "もっと速い + 余韻ふわふわ")
      // ============
      // Cursor response speed
      var fastSmooth = 0.28; // ↑ fast (0.18..0.35)
      // Afterglow length (smaller = longer tail)
      var tailSmooth = 0.030; // ↓ more lingering (0.02..0.06)

      // Spring body speed/feel
      var k = 0.135; // ↑ faster body catch-up (0.09..0.18)
      var damp = 0.955; // ↑ more lingering glide (0.93..0.975)

      // Organic drift (low-frequency elegance)
      var driftAmt = 0.040;

      // Motion-induced wobble (the "余韻" part)
      var wobbleAmt = 0.050; // ↑ stronger tail ring (0.02..0.07)
      var wobbleSmooth = 0.090; // smoothing of wobble
      var wobX = 0,
        wobY = 0;

      // Safety clamp on velocity influence (prevents wild swings on huge screens)
      var vInfluence = 7.2;

      // Reduced motion: subtle and slower
      if (isReduced) {
        fastSmooth = 0.10;
        tailSmooth = 0.025;
        k = 0.050;
        damp = 0.92;
        driftAmt = 0.010;
        wobbleAmt = 0.012;
        wobbleSmooth = 0.070;
        vInfluence = 5.0;
      }

      function tick(now) {
        // 1) raw -> fast (snappy)
        txFast += (rawTx - txFast) * fastSmooth;
        tyFast += (rawTy - tyFast) * fastSmooth;

        // 2) fast -> tail (afterglow)
        txTail += (txFast - txTail) * tailSmooth;
        tyTail += (tyFast - tyTail) * tailSmooth;

        // 3) spring follow toward tail target
        var ax = (txTail - x) * k;
        var ay = (tyTail - y) * k;
        vx = (vx + ax) * damp;
        vy = (vy + ay) * damp;
        x += vx;
        y += vy;

        // 4) drift + wobble
        var s = now * 0.001;

        // base drift: 2 sines each axis
        var driftX =
          (Math.sin(s * 0.65) + Math.sin(s * 1.25 + 1.2)) * driftAmt;
        var driftY =
          (Math.cos(s * 0.70) + Math.cos(s * 1.30 + 0.6)) * driftAmt;

        // wobble from velocity (perpendicular "fluid tail")
        var vlen = Math.sqrt(vx * vx + vy * vy);
        var v = Math.min(1.0, vlen * vInfluence);

        var px = -vy;
        var py = vx;
        var plen = Math.sqrt(px * px + py * py) || 1;
        px /= plen;
        py /= plen;

        var wobTargetX =
          px * v * wobbleAmt * (0.62 + 0.38 * Math.sin(s * 2.4));
        var wobTargetY =
          py * v * wobbleAmt * (0.62 + 0.38 * Math.cos(s * 2.2));

        wobX += (wobTargetX - wobX) * wobbleSmooth;
        wobY += (wobTargetY - wobY) * wobbleSmooth;

        // 3 blob centers (phase shifted, and wobble distributed)
        var x1 = x + driftX + wobX;
        var y1 = y + driftY + wobY;

        var x2 =
          x +
          Math.sin(s * 1.08 + 2.0) * (isReduced ? 0.05 : 0.095) +
          driftX * 0.55 -
          wobX * 0.55;
        var y2 =
          y +
          Math.cos(s * 0.98 + 2.4) * (isReduced ? 0.05 : 0.095) +
          driftY * 0.55 -
          wobY * 0.55;

        var x3 =
          x +
          Math.sin(s * 0.58 + 0.4) * (isReduced ? 0.08 : 0.150) -
          driftX * 0.35 +
          wobX * 0.85;
        var y3 =
          y +
          Math.cos(s * 0.54 + 0.9) * (isReduced ? 0.08 : 0.150) -
          driftY * 0.35 +
          wobY * 0.85;

        // Write CSS vars
        rootStyle.setProperty("--bgx1", (x1 * 100).toFixed(2) + "%");
        rootStyle.setProperty("--bgy1", (y1 * 100).toFixed(2) + "%");
        rootStyle.setProperty("--bgx2", (x2 * 100).toFixed(2) + "%");
        rootStyle.setProperty("--bgy2", (y2 * 100).toFixed(2) + "%");
        rootStyle.setProperty("--bgx3", (x3 * 100).toFixed(2) + "%");
        rootStyle.setProperty("--bgy3", (y3 * 100).toFixed(2) + "%");

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
