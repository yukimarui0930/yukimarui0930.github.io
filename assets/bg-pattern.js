// assets/bg-pattern.js
// Canvas pattern layer: glow(z=0) -> pattern(z=1) -> content(z=2)
// Requirements:
// - Lines are drawn as pure white (#fff) and fully opaque (no alpha).
// - Canvas never participates in layout (fixed + display:block + pointer-events:none).
// - Layering is enforced via z-index.

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // 1) Ensure canvas exists
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // 2) Force canvas layer styles INLINE (prevents layout break + guarantees z=1)
      var st = canvas.style;
      st.position = "fixed";
      st.inset = "0";
      st.width = "100vw";
      st.height = "100vh";
      st.pointerEvents = "none";
      st.zIndex = "1";
      st.opacity = "1";          // IMPORTANT: fully visible layer
      st.display = "block";      // IMPORTANT: never inline
      st.mixBlendMode = "normal"; // deterministic. Change to "overlay" later if desired.

      // 3) Force content layers to z=2 inline (optional but guarantees your required order)
      //    If you prefer CSS-only, you can remove this section, but this makes the stack bulletproof.
      try {
        var contentSelectors = [".site-header", ".page-content", ".site-footer"];
        for (var i = 0; i < contentSelectors.length; i++) {
          var el = document.querySelector(contentSelectors[i]);
          if (el) {
            el.style.position = el.style.position || "relative";
            el.style.zIndex = "2";
          }
        }
      } catch (_) {}

      // 4) Setup 2D context
      var ctx = canvas.getContext("2d", { alpha: true });

      // HiDPI resize
      function resize() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();

      // ===== Pattern tuning =====
      // Increase density by lowering tile. Increase visibility by raising lineWidth.
      var tile = 240;         // 200〜320
      var lineWidth = 2.0;    // 1.2〜2.4
      var inset = 24;         // tile内の余白
      var rails = 4;          // 平行線の本数
      var railGap = 8;        // 平行線の間隔

      // Drift (optional subtle movement)
      var speed = 0.004;
      var drift = 14;

      // optional parallax
      var mx = 0, my = 0;
      window.addEventListener(
        "mousemove",
        function (e) {
          mx = (e.clientX / window.innerWidth - 0.5) * 2;
          my = (e.clientY / window.innerHeight - 0.5) * 2;
        },
        { passive: true }
      );

      function drawRibbon(x0, y0, offsetY) {
        var x1 = x0 + inset;
        var x2 = x0 + tile - inset;

        // Curvy band line (single “ribbon”)
        ctx.beginPath();
        ctx.moveTo(x1, y0 + tile * 0.30 + offsetY);
        ctx.quadraticCurveTo(
          x0 + tile * 0.35,
          y0 + tile * 0.05 + offsetY,
          x0 + tile * 0.55,
          y0 + tile * 0.22 + offsetY
        );
        ctx.quadraticCurveTo(
          x0 + tile * 0.72,
          y0 + tile * 0.36 + offsetY,
          x0 + tile * 0.70,
          y0 + tile * 0.50 + offsetY
        );
        ctx.quadraticCurveTo(
          x0 + tile * 0.67,
          y0 + tile * 0.66 + offsetY,
          x0 + tile * 0.84,
          y0 + tile * 0.78 + offsetY
        );
        ctx.quadraticCurveTo(
          x0 + tile * 0.98,
          y0 + tile * 0.88 + offsetY,
          x2,
          y0 + tile * 0.65 + offsetY
        );
        ctx.stroke();
      }

      function drawTile(x0, y0) {
        // main ribbon rails
        for (var i = 0; i < rails; i++) {
          var o = (i - (rails - 1) / 2) * railGap;
          drawRibbon(x0, y0, o);
        }

        // divider verticals (geometric rhythm)
        var y1 = y0 + inset;
        var y2 = y0 + tile - inset;

        ctx.beginPath();
        ctx.moveTo(x0 + tile * 0.20, y1);
        ctx.lineTo(x0 + tile * 0.20, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x0 + tile * 0.50, y1);
        ctx.lineTo(x0 + tile * 0.50, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x0 + tile * 0.80, y1);
        ctx.lineTo(x0 + tile * 0.80, y2);
        ctx.stroke();
      }

      function render(t) {
        requestAnimationFrame(render);

        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        // REQUIRED: pure white, fully opaque
        ctx.strokeStyle = "#fff";  // <-- requirement
        ctx.globalAlpha = 1;       // <-- requirement (no transparency)
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 0;        // keep “pure lines”

        // slow drift so it feels alive (you can set drift=0 for static)
        var s = t * speed;
        var ox = Math.sin(s) * drift + mx * 6;
        var oy = Math.cos(s * 0.9) * drift + my * 6;

        // cover screen with tiles (margin avoids gaps during drift)
        var startX = -tile * 2;
        var startY = -tile * 2;
        var endX = w + tile * 2;
        var endY = h + tile * 2;

        for (var y = startY; y < endY; y += tile) {
          for (var x = startX; x < endX; x += tile) {
            drawTile(x + ox, y + oy);
          }
        }
      }

      // Resize handling
      var rto = 0;
      window.addEventListener(
        "resize",
        function () {
          clearTimeout(rto);
          rto = setTimeout(resize, 80);
        },
        { passive: true }
      );

      requestAnimationFrame(render);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run, { once: true });
    } else {
      run();
    }
  } catch (e) {
    console.error("[bg-pattern] error", e);
  }
})();
