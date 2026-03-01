// assets/bg-pattern.js
// Ribbon-like geometric pattern (white, opaque) on canvas.
// Stack: glow(z0) < pattern(z1) < content(z2)

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // --- ensure canvas ---
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // --- force layer styles (never break layout) ---
      var st = canvas.style;
      st.position = "fixed";
      st.inset = "0";
      st.width = "100vw";
      st.height = "100vh";
      st.pointerEvents = "none";
      st.zIndex = "1";
      st.opacity = "1";
      st.display = "block";
      st.mixBlendMode = "normal";

      // enforce content z=2 (optional but guarantees stack)
      try {
        [".site-header", ".page-content", ".site-footer"].forEach(function (sel) {
          var el = document.querySelector(sel);
          if (el) {
            if (!el.style.position) el.style.position = "relative";
            el.style.zIndex = "2";
          }
        });
      } catch (_) {}

      var ctx = canvas.getContext("2d", { alpha: true });

      function resize() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();

      // ==========================
      // TUNING (壁紙寄せの要)
      // ==========================
      var TILE = 320;          // 模様のスケール（260〜380）
      var R = 38;              // 折れの丸み（30〜52）
      var RAILS = 4;           // 平行線の本数（3〜5）
      var GAP = 10;            // 平行線の間隔（7〜12）
      var LINE = 1.6;          // 線幅（1.2〜2.0）
      var ANG = Math.PI / 4;   // 45deg（壁紙はこの系）
      var DRIFT = 0;           // 動かしたいなら 6〜16
      var SPEED = 0.004;       // driftの速度

      // optional tiny parallax (0なら無効)
      var PAR = 0;
      var mx = 0, my = 0;
      window.addEventListener(
        "mousemove",
        function (e) {
          mx = (e.clientX / window.innerWidth - 0.5) * 2;
          my = (e.clientY / window.innerHeight - 0.5) * 2;
        },
        { passive: true }
      );

      // Draw a rounded "stair/zigzag ribbon" path in local coords.
      // We draw in a rotated coordinate system so offsets are clean.
      function strokeZigzagPath(x, y, w, h, r) {
        // shape: ┐ then └ like a ribbon folding twice (rounded corners)
        // start at left-mid, go to right-top, down, to left-bottom, etc.
        ctx.beginPath();
        ctx.moveTo(x, y + h * 0.20);
        ctx.lineTo(x + w * 0.55 - r, y + h * 0.20);
        ctx.arcTo(x + w * 0.55, y + h * 0.20, x + w * 0.55, y + h * 0.20 + r, r);

        ctx.lineTo(x + w * 0.55, y + h * 0.55 - r);
        ctx.arcTo(x + w * 0.55, y + h * 0.55, x + w * 0.55 + r, y + h * 0.55, r);

        ctx.lineTo(x + w - r, y + h * 0.55);
        ctx.arcTo(x + w, y + h * 0.55, x + w, y + h * 0.55 + r, r);

        ctx.lineTo(x + w, y + h * 0.90);
        ctx.stroke();
      }

      // Each tile draws two interlocking stair paths, mirrored, like the wallpaper weave.
      function drawTile(tx, ty) {
        // Work in rotated space to make the motif look like the reference.
        ctx.save();
        ctx.translate(tx + TILE * 0.5, ty + TILE * 0.5);
        ctx.rotate(ANG);
        ctx.translate(-TILE * 0.5, -TILE * 0.5);

        // base motif box in rotated coordinates
        var bx = 20, by = 10;
        var bw = TILE - 40;
        var bh = TILE - 20;

        // Rails: multiple parallel strokes (offset perpendicular in rotated space = y offset)
        for (var i = 0; i < RAILS; i++) {
          var o = (i - (RAILS - 1) / 2) * GAP;

          // upper ribbon
          strokeZigzagPath(bx, by + o, bw, bh, R);

          // mirrored ribbon (shifted) to create interlocking look
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-TILE, 0);
          strokeZigzagPath(bx, by + (TILE * 0.35) + o, bw, bh, R);
          ctx.restore();
        }

        // subtle vertical separators like the reference’s thin uprights
        ctx.beginPath();
        ctx.moveTo(TILE * 0.18, TILE * 0.05);
        ctx.lineTo(TILE * 0.18, TILE * 0.95);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(TILE * 0.82, TILE * 0.05);
        ctx.lineTo(TILE * 0.82, TILE * 0.95);
        ctx.stroke();

        ctx.restore();
      }

      function render(t) {
        requestAnimationFrame(render);

        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        // REQUIRED: pure white, opaque
        ctx.strokeStyle = "#fff";
        ctx.globalAlpha = 1;
        ctx.lineWidth = LINE;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 0;

        var s = t * SPEED;
        var ox = Math.sin(s) * DRIFT + mx * PAR;
        var oy = Math.cos(s * 0.9) * DRIFT + my * PAR;

        // tile fill (extra margin to cover edges)
        var startX = -TILE * 2;
        var startY = -TILE * 2;
        var endX = w + TILE * 2;
        var endY = h + TILE * 2;

        // stagger pattern: offset every other row/col to mimic wallpaper flow
        var row = 0;
        for (var y = startY; y < endY; y += TILE) {
          var xOffset = (row % 2) * (TILE * 0.5);
          for (var x = startX; x < endX; x += TILE) {
            drawTile(x + xOffset + ox, y + oy);
          }
          row++;
        }

        ctx.globalAlpha = 1;
      }

      // resize handler
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
