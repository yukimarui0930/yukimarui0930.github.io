// assets/bg-pattern.js
// Woven 45° ribbon pattern (white, opaque) on canvas.
// Stack: glow(z0) < pattern(z1) < content(z2)
// Static: draw once + on resize
// Lines: #fff, fully opaque

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // Canvas
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // Force fixed layer styles (guarantee stack + no layout participation)
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

      // Force content to z=2
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

      // ==========================
      // TUNING (ここだけで見た目を追い込める)
      // ==========================
      var TILE = 360;      // 模様の大きさ（300〜420）
      var ANG = Math.PI/4; // 45°
      var R = 54;          // 角の丸み（48〜70）
      var RAILS = 4;       // 平行線本数（3〜5）
      var GAP = 9.5;       // 平行線間隔（8〜12）
      var LINE = 1.25;     // 線幅（1.1〜1.6）

      // 編み込みの「欠け」サイズ（下側を切る）
      var CUT_LEN = 26;    // 欠け長
      var CUT_W   = 10;    // 欠け太さ（LINEより太く）

      // 補助の縦罫（壁紙の細い縦線っぽい）
      var UPRIGHT = true;
      var UPRIGHT_X = [0.28, 0.72]; // タイル内の縦線位置

      function resizeCanvas() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }

      // ---- core ribbon stroke in rotated coordinates ----
      // This produces the “folded ribbon” feel: straight, straight, straight with rounded corners.
      function strokeRibbonPath(phaseY) {
        // Coordinates in rotated space (tile-local).
        // This path continues beyond tile bounds so tiling looks continuous.
        var W = TILE;
        var x0 = -W * 0.40;
        var x1 =  W * 0.20;
        var x2 =  W * 0.55;
        var x3 =  W * 0.90;
        var x4 =  W * 1.30;

        var y0 =  W * (0.18 + phaseY);
        var y1 =  W * (0.18 + phaseY);
        var y2 =  W * (0.52 + phaseY);
        var y3 =  W * (0.52 + phaseY);
        var y4 =  W * (0.86 + phaseY);

        ctx.beginPath();
        ctx.moveTo(x0, y0);

        ctx.lineTo(x2 - R, y1);
        ctx.arcTo(x2, y1, x2, y2, R);

        ctx.lineTo(x2, y3 - R);
        ctx.arcTo(x2, y3, x3, y3, R);

        ctx.lineTo(x3 + (x4 - x3), y4); // out
        ctx.stroke();
      }

      // For weave: define “knot centers” in rotated coords where crossings visually happen.
      // These are tuned to the path above and look like wallpaper knots.
      function getKnots() {
        return [
          // around the first corner block
          { x: TILE * 0.55, y: TILE * 0.52, dir: "v" },
          // around the second block (slightly lower)
          { x: TILE * 0.72, y: TILE * 0.86, dir: "h" },
          // helper knots for stronger weave impression
          { x: TILE * 0.38, y: TILE * 0.18, dir: "h" },
          { x: TILE * 0.22, y: TILE * 0.70, dir: "v" }
        ];
      }

      function drawFamily(phaseBase) {
        // multiple parallel rails
        for (var i = 0; i < RAILS; i++) {
          var o = (i - (RAILS - 1) / 2) * GAP;
          // convert px offset to rotated-space fraction of tile
          strokeRibbonPath(phaseBase + (o / TILE));
        }
      }

      function cutUnderAtKnots() {
        var knots = getKnots();

        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "#000"; // irrelevant
        ctx.globalAlpha = 1;
        ctx.lineWidth = CUT_W;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        for (var i = 0; i < knots.length; i++) {
          var p = knots[i];
          ctx.beginPath();
          if (p.dir === "v") {
            ctx.moveTo(p.x, p.y - CUT_LEN * 0.5);
            ctx.lineTo(p.x, p.y + CUT_LEN * 0.5);
          } else {
            ctx.moveTo(p.x - CUT_LEN * 0.5, p.y);
            ctx.lineTo(p.x + CUT_LEN * 0.5, p.y);
          }
          ctx.stroke();
        }

        ctx.restore();
      }

      // Draw one tile: rotate -> weave (under cut) -> rotate back
      function drawTileWeave(tx, ty, tileX, tileY) {
        ctx.save();
        ctx.translate(tx + TILE * 0.5, ty + TILE * 0.5);
        ctx.rotate(ANG);
        ctx.translate(-TILE * 0.5, -TILE * 0.5);

        // Checkerboard: alternate which family is OVER
        var overIsA = ((tileX + tileY) % 2 === 0);

        // Families are phase-shifted versions of the same ribbon.
        // This gives the “interlock” rhythm.
        var phaseA = 0.00;
        var phaseB = -0.34;

        // UNDER first
        drawFamily(overIsA ? phaseB : phaseA);

        // Cut gaps in UNDER near knots
        cutUnderAtKnots();

        // OVER last
        drawFamily(overIsA ? phaseA : phaseB);

        // Optional uprights (thin vertical lines) in rotated coords
        if (UPRIGHT) {
          ctx.beginPath();
          ctx.moveTo(TILE * UPRIGHT_X[0], -TILE);
          ctx.lineTo(TILE * UPRIGHT_X[0], TILE * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(TILE * UPRIGHT_X[1], -TILE);
          ctx.lineTo(TILE * UPRIGHT_X[1], TILE * 2);
          ctx.stroke();
        }

        ctx.restore();
      }

      function draw() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);

        // REQUIRED: pure white & opaque
        ctx.strokeStyle = "#fff";
        ctx.globalAlpha = 1;
        ctx.lineWidth = LINE;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 0;

        // Tiling with stagger (wallpaper flow)
        var startX = -TILE * 2;
        var startY = -TILE * 2;
        var endX = w + TILE * 2;
        var endY = h + TILE * 2;

        var row = 0;
        for (var y = startY; y < endY; y += TILE) {
          var xOffset = (row % 2) * (TILE * 0.5);
          var col = 0;
          for (var x = startX; x < endX; x += TILE) {
            drawTileWeave(x + xOffset, y, col, row);
            col++;
          }
          row++;
        }

        ctx.globalAlpha = 1;
      }

      resizeCanvas();
      var rto = 0;
      window.addEventListener("resize", function () {
        clearTimeout(rto);
        rto = setTimeout(resizeCanvas, 120);
      }, { passive: true });
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
