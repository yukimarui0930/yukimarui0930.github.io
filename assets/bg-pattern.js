// assets/bg-pattern.js
// Woven ribbon pattern (true over/under illusion) on canvas.
// Stack: glow(z0) < pattern(z1) < content(z2)
// - Static (draw once + resize)
// - Lines are pure white (#fff) and fully opaque
// - Weave is made by cutting "under" strokes at crossings, then drawing "over" on top.

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // Ensure canvas
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // Force fixed layer styles
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

      // Enforce content z=2 (guarantees stack)
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
      // TUNING (壁紙寄せ)
      // ==========================
      var TILE = 320;   // 280〜380
      var ANG = Math.PI / 4; // 45deg
      var LINE = 1.35;  // 線幅
      var RAILS = 4;    // 平行線本数
      var GAP = 10;     // 平行線間隔
      var R = 48;       // 角R（丸み）

      // “編み込みの欠け”のサイズ
      var CUT_LEN = 26;   // 交差点で欠ける長さ（20〜34）
      var CUT_W = 9;      // 欠ける太さ（LINEより太くする）

      // 参考画像のように、帯は「水平/垂直（回転座標）」の折れ線＋丸角で作る。
      // これを2系統（A/B）描き、交差点で上下を交互にする。

      function resizeCanvas() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.ceil(window.innerWidth);
        var h = Math.ceil(window.innerHeight);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      }

      // ---------- Geometry in rotated space ----------
      // One “lane” is built from axis-aligned segments in rotated coordinates:
      // (x0,y0)->(x1,y0)->(x1,y1)->(x2,y1)->(x2,y2)->(x3,y2)
      function strokeLane(offsetY, phase) {
        // phase shifts the lane so it interlocks like wallpaper
        var x0 = -TILE * 0.40;
        var x1 = TILE * (0.35 + phase);
        var x2 = TILE * (0.70 + phase);
        var x3 = TILE * 1.40;

        var y0 = TILE * (0.18 + offsetY);
        var y1 = TILE * (0.52 + offsetY);
        var y2 = TILE * (0.86 + offsetY);

        ctx.beginPath();
        ctx.moveTo(x0, y0);

        ctx.lineTo(x1 - R, y0);
        ctx.arcTo(x1, y0, x1, y0 + R, R);

        ctx.lineTo(x1, y1 - R);
        ctx.arcTo(x1, y1, x1 + R, y1, R);

        ctx.lineTo(x2 - R, y1);
        ctx.arcTo(x2, y1, x2, y1 + R, R);

        ctx.lineTo(x2, y2 - R);
        ctx.arcTo(x2, y2, x2 + R, y2, R);

        ctx.lineTo(x3, y2);
        ctx.stroke();

        // Return nominal crossing points (approx centers of the “vertical drops”)
        // We'll use these to cut under-strokes.
        return [
          { x: x1, y: y1, dir: "v" }, // around first vertical segment
          { x: x2, y: y2, dir: "v" }  // around second vertical segment
        ];
      }

      // helper: draw a tile in rotated space
      function drawTile(tx, ty, tileI, tileJ) {
        ctx.save();
        ctx.translate(tx + TILE * 0.5, ty + TILE * 0.5);
        ctx.rotate(ANG);
        ctx.translate(-TILE * 0.5, -TILE * 0.5);

        // Two families A/B.
        // A: phase 0.00, B: phase -0.18 (slight shift to create interlock)
        // We will weave by cutting UNDER at “crossings” and drawing OVER last.
        var crossings = [];

        // Collect crossings for each rail/each family.
        for (var k = 0; k < RAILS; k++) {
          var o = (k - (RAILS - 1) / 2) * (GAP / TILE); // normalize to tile fraction
          // family A
          crossings.push({ fam: "A", rail: k, pts: strokeLane(o, 0.00) });
          // family B
          crossings.push({ fam: "B", rail: k, pts: strokeLane(o - 0.34, -0.18) });
        }

        ctx.restore();
      }

      // We can't easily “intersect” analytically without heavy math,
      // so we create a convincing weave by cutting the UNDER family
      // at deterministic “knot positions” (near the vertical drops).
      //
      // Strategy per tile:
      // 1) Decide over/under by checkerboard: (tileX + tileY) parity
      // 2) Draw UNDER family fully
      // 3) Cut small gaps in UNDER at knot positions
      // 4) Draw OVER family fully

      function drawTileWeave(tx, ty, tileX, tileY) {
        ctx.save();
        ctx.translate(tx + TILE * 0.5, ty + TILE * 0.5);
        ctx.rotate(ANG);
        ctx.translate(-TILE * 0.5, -TILE * 0.5);

        var overIsA = ((tileX + tileY) % 2 === 0); // checkerboard

        function drawFamily(fam) {
          for (var k = 0; k < RAILS; k++) {
            var o = (k - (RAILS - 1) / 2) * (GAP / TILE);
            if (fam === "A") {
              strokeLane(o, 0.00);
            } else {
              strokeLane(o - 0.34, -0.18);
            }
          }
        }

        // 1) UNDER draw
        drawFamily(overIsA ? "B" : "A");

        // 2) Cut UNDER at knot positions (destination-out)
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "#000";  // irrelevant in destination-out
        ctx.globalAlpha = 1;
        ctx.lineWidth = CUT_W;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Cut positions: near the vertical drops where the weave reads strongest.
        // We place several “knot centers” in rotated-tile coords.
        // (These are tuned for the lane geometry above.)
        var knots = [
          { x: TILE * 0.35, y: TILE * 0.52, dir: "v" },
          { x: TILE * 0.70, y: TILE * 0.86, dir: "v" },
          { x: TILE * 0.52, y: TILE * 0.18, dir: "h" },
          { x: TILE * 0.18, y: TILE * 0.70, dir: "h" }
        ];

        for (var i = 0; i < knots.length; i++) {
          var p = knots[i];
          ctx.beginPath();
          if (p.dir === "v") {
            // erase along vertical direction
            ctx.moveTo(p.x, p.y - CUT_LEN * 0.5);
            ctx.lineTo(p.x, p.y + CUT_LEN * 0.5);
          } else {
            // erase along horizontal direction
            ctx.moveTo(p.x - CUT_LEN * 0.5, p.y);
            ctx.lineTo(p.x + CUT_LEN * 0.5, p.y);
          }
          ctx.stroke();
        }

        ctx.restore();

        // 3) OVER draw
        drawFamily(overIsA ? "A" : "B");

        ctx.restore();
      }

      function draw() {
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

        var startX = -TILE * 2;
        var startY = -TILE * 2;
        var endX = w + TILE * 2;
        var endY = h + TILE * 2;

        var tileY = 0;
        for (var y = startY; y < endY; y += TILE) {
          var tileX = 0;
          // stagger every row (helps continuity)
          var xOffset = (tileY % 2) * (TILE * 0.5);
          for (var x = startX; x < endX; x += TILE) {
            drawTileWeave(x + xOffset, y, tileX, tileY);
            tileX++;
          }
          tileY++;
        }

        ctx.globalAlpha = 1;
      }

      // Draw once + resize only
      resizeCanvas();
      var rto = 0;
      window.addEventListener(
        "resize",
        function () {
          clearTimeout(rto);
          rto = setTimeout(resizeCanvas, 120);
        },
        { passive: true }
      );
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
