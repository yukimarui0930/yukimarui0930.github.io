// assets/bg-pattern.js
// Pattern canvas: glow(z0) < pattern(z1) < content(z2)
// Lines are drawn with strokeStyle = "#fff" (opacity via globalAlpha)

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // Create/reuse canvas
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");

        // Put it near the top; z-index will control the actual stacking
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // Force fixed-layer styles INLINE (prevents layout participation)
      var st = canvas.style;
      st.position = "fixed";
      st.left = "0";
      st.top = "0";
      st.right = "0";
      st.bottom = "0";
      st.width = "100vw";
      st.height = "100vh";
      st.pointerEvents = "none";
      st.zIndex = "1";
      st.display = "block";

      var ctx = canvas.getContext("2d", { alpha: true });

      function resize() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // ===== tuning =====
      var tile = 240;
      var lineW = 1.15;

      // REQUIRED: line color is pure #fff
      var lineColor = "#fff";
      // opacity handled here (still #fff)
      var lineAlpha = 0.28;

      var speed = 0.0045;
      var drift = 14;
      var inset = 26;

      // small mouse parallax (optional)
      var mx = 0, my = 0;
      window.addEventListener("mousemove", function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });

      function drawTile(x0, y0) {
        var x1 = x0 + inset;
        var y1 = y0 + inset;
        var x2 = x0 + tile - inset;
        var y2 = y0 + tile - inset;

        // main “ribbon-ish” path
        ctx.beginPath();
        ctx.moveTo(x1, y0 + tile * 0.30);
        ctx.quadraticCurveTo(x0 + tile * 0.35, y0 + tile * 0.05, x0 + tile * 0.55, y0 + tile * 0.22);
        ctx.quadraticCurveTo(x0 + tile * 0.72, y0 + tile * 0.36, x0 + tile * 0.70, y0 + tile * 0.50);
        ctx.quadraticCurveTo(x0 + tile * 0.67, y0 + tile * 0.66, x0 + tile * 0.84, y0 + tile * 0.78);
        ctx.quadraticCurveTo(x0 + tile * 0.98, y0 + tile * 0.88, x2, y0 + tile * 0.65);
        ctx.stroke();

        // parallel rails
        var offsets = [8, -8, 18, -18];
        for (var i = 0; i < offsets.length; i++) {
          var o = offsets[i];
          ctx.beginPath();
          ctx.moveTo(x1, y0 + tile * 0.30 + o);
          ctx.quadraticCurveTo(x0 + tile * 0.35, y0 + tile * 0.05 + o, x0 + tile * 0.55, y0 + tile * 0.22 + o);
          ctx.quadraticCurveTo(x0 + tile * 0.72, y0 + tile * 0.36 + o, x0 + tile * 0.70, y0 + tile * 0.50 + o);
          ctx.quadraticCurveTo(x0 + tile * 0.67, y0 + tile * 0.66 + o, x0 + tile * 0.84, y0 + tile * 0.78 + o);
          ctx.quadraticCurveTo(x0 + tile * 0.98, y0 + tile * 0.88 + o, x2, y0 + tile * 0.65 + o);
          ctx.stroke();
        }

        // divider lines
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

        // REQUIRED: pure white
        ctx.strokeStyle = lineColor;   // "#fff"
        ctx.globalAlpha = lineAlpha;   // opacity
        ctx.lineWidth = lineW;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        var s = t * speed;
        var ox = Math.sin(s) * drift + mx * 6;
        var oy = Math.cos(s * 0.9) * drift + my * 6;

        var startX = -tile * 2;
        var startY = -tile * 2;
        var endX = w + tile * 2;
        var endY = h + tile * 2;

        for (var y = startY; y < endY; y += tile) {
          for (var x = startX; x < endX; x += tile) {
            drawTile(x + ox, y + oy);
          }
        }

        // restore for safety
        ctx.globalAlpha = 1;
      }

      // resize
      var rto = 0;
      window.addEventListener("resize", function () {
        clearTimeout(rto);
        rto = setTimeout(function () {
          resize();
        }, 80);
      }, { passive: true });

      resize();
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
