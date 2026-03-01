// assets/bg-pattern.js
// SAFE version: force fixed-layer styles inline so it never breaks layout.

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // Create or reuse
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // IMPORTANT: force layer styles INLINE (prevents layout break even if CSS not applied)
      var s = canvas.style;
      s.position = "fixed";
      s.left = "0";
      s.top = "0";
      s.right = "0";
      s.bottom = "0";
      s.width = "100vw";
      s.height = "100vh";
      s.pointerEvents = "none";
      s.zIndex = "1";
      s.opacity = "0.22";
      s.mixBlendMode = "soft-light"; // 合わなければ "normal" に
      s.display = "block";           // インライン化で崩れる事故を防ぐ

      var ctx = canvas.getContext("2d", { alpha: true });

      function resize() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      // ===== TUNING =====
      var tile = 240;
      var lineW = 1.1;
      var alpha = 0.30;
      var cornerR = 40;
      var railGap = 8;
      var rails = 4;

      var speed = 0.004;
      var drift = 14;

      // tiny mouse parallax
      var mx = 0, my = 0;
      window.addEventListener("mousemove", function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 2;
        my = (e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });

      function normalOffset(o) {
        var k = 0.70; // 45deg-ish
        return { dx: -o * k, dy: o * k };
      }

      function strokeRibbon(cx, cy, dx, dy) {
        var p0x = cx - tile * 0.58, p0y = cy - tile * 0.05;
        var p1x = cx - tile * 0.10, p1y = cy + tile * 0.42;
        var p2x = cx + tile * 0.12, p2y = cy + tile * 0.64;
        var p3x = cx + tile * 0.58, p3y = cy + tile * 0.18;

        ctx.beginPath();
        ctx.moveTo(p0x + dx, p0y + dy);
        ctx.lineTo(p1x + dx, p1y + dy);
        ctx.arcTo(p2x + dx, p2y + dy, p3x + dx, p3y + dy, cornerR);
        ctx.lineTo(p3x + dx, p3y + dy);
        ctx.stroke();
      }

      function strokeRibbon2(cx, cy, dx, dy) {
        var p0x = cx - tile * 0.58, p0y = cy + tile * 0.58;
        var p1x = cx - tile * 0.18, p1y = cy + tile * 0.20;
        var p2x = cx + tile * 0.18, p2y = cy - tile * 0.18;
        var p3x = cx + tile * 0.58, p3y = cy + tile * 0.18;

        ctx.beginPath();
        ctx.moveTo(p0x + dx, p0y + dy);
        ctx.lineTo(p1x + dx, p1y + dy);
        ctx.arcTo(p2x + dx, p2y + dy, p3x + dx, p3y + dy, cornerR);
        ctx.lineTo(p3x + dx, p3y + dy);
        ctx.stroke();
      }

      function drawTile(x0, y0) {
        var cx = x0 + tile * 0.5;
        var cy = y0 + tile * 0.5;

        for (var i = 0; i < rails; i++) {
          var o = (i - (rails - 1) / 2) * railGap;
          var n = normalOffset(o);
          strokeRibbon(cx, cy, n.dx, n.dy);
          strokeRibbon2(cx, cy, n.dx, n.dy);
        }

        // subtle uprights
        ctx.beginPath();
        ctx.moveTo(cx - tile * 0.18, cy - tile * 0.05);
        ctx.lineTo(cx - tile * 0.18, cy + tile * 0.70);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + tile * 0.18, cy - tile * 0.05);
        ctx.lineTo(cx + tile * 0.18, cy + tile * 0.70);
        ctx.stroke();
      }

      function render(t) {
        requestAnimationFrame(render);

        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        ctx.lineWidth = lineW;
        ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
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
      }

      // resize
      var rto = 0;
      window.addEventListener("resize", function () {
        clearTimeout(rto);
        rto = setTimeout(resize, 80);
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
