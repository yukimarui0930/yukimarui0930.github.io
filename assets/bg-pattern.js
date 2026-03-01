// assets/bg-pattern.js
// Draw geometric white-line pattern on a fixed canvas layer
// Layer order: glow (z0) < pattern canvas (z1) < content (z2)

(function () {
  try {
    function run() {
      if (!document.body) {
        setTimeout(run, 0);
        return;
      }

      // Insert canvas (once)
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");

        // Place above #bg-glow if exists, else at body start
        var glow = document.getElementById("bg-glow");
        if (glow && glow.nextSibling) {
          document.body.insertBefore(canvas, glow.nextSibling);
        } else if (glow) {
          document.body.insertBefore(canvas, glow);
          document.body.insertBefore(glow, canvas.nextSibling);
        } else {
          document.body.insertBefore(canvas, document.body.firstChild);
        }
      }

      var ctx = canvas.getContext("2d", { alpha: true });

      // HiDPI
      function resize() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      resize();

      var raf = 0;
      var last = 0;

      // --- Tuning ---
      var tile = 220;          // 模様の大きさ（大きいほど粗い）
      var lineW = 1.6;         // 線幅
      var alpha = 0.42;        // 線の濃さ（canvas自体のopacityとは別）
      var speed = 0.006;       // ドリフト速度（小さいほどゆっくり）
      var drift = 18;          // ドリフト量（px）
      var radius = 42;         // 曲線の丸み
      var inset = 26;          // タイル内の余白

      // Optional: subtle mouse parallax (keep tiny so it feels weightless)
      var mx = 0.0, my = 0.0;
      window.addEventListener(
        "mousemove",
        function (e) {
          mx = (e.clientX / window.innerWidth - 0.5) * 2;
          my = (e.clientY / window.innerHeight - 0.5) * 2;
        },
        { passive: true }
      );

      function drawTile(x0, y0) {
        // 画像のイメージに寄せた「S字の帯＋内側ライン」っぽい幾何学
        // タイル境界で継ぎ目が目立たないよう、シンプルな反復形にしている

        var x1 = x0 + inset;
        var y1 = y0 + inset;
        var x2 = x0 + tile - inset;
        var y2 = y0 + tile - inset;

        // main band centerline (two segments with rounded corners)
        ctx.beginPath();
        ctx.moveTo(x1, y0 + tile * 0.30);
        ctx.quadraticCurveTo(x0 + tile * 0.35, y0 + tile * 0.05, x0 + tile * 0.55, y0 + tile * 0.22);
        ctx.quadraticCurveTo(x0 + tile * 0.72, y0 + tile * 0.36, x0 + tile * 0.70, y0 + tile * 0.50);
        ctx.quadraticCurveTo(x0 + tile * 0.67, y0 + tile * 0.66, x0 + tile * 0.84, y0 + tile * 0.78);
        ctx.quadraticCurveTo(x0 + tile * 0.98, y0 + tile * 0.88, x2, y0 + tile * 0.65);
        ctx.stroke();

        // parallel inner lines (gives the "multiple rails" look)
        var offsets = [10, -10, 22, -22];
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

        // some vertical "divider" lines to give geometric rhythm
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
        raf = requestAnimationFrame(render);
        if (!last) last = t;
        var dt = t - last;
        last = t;

        var w = window.innerWidth;
        var h = window.innerHeight;

        ctx.clearRect(0, 0, w, h);

        // Style
        ctx.lineWidth = lineW;
        ctx.strokeStyle = "rgba(255,255,255," + alpha + ")";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Drift offset (slow “zero-gravity” movement)
        var s = t * speed;
        var ox = Math.sin(s) * drift + mx * 6; // mouse parallax tiny
        var oy = Math.cos(s * 0.9) * drift + my * 6;

        // cover screen with tiles (+2 margin so drift doesn't reveal gaps)
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
          rto = setTimeout(function () {
            resize();
          }, 80);
        },
        { passive: true }
      );

      raf = requestAnimationFrame(render);
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
