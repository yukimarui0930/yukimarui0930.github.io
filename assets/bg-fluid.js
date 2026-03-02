// assets/bg-pattern.js
// SVG mask-based pattern:
// - Background: 100% opaque #fff
// - Lines: fully transparent "cutouts" (holes)
// Strong smoothing is applied on the MASK (dilate + blur) to kill trace noise.
// Seam fix: draw 3x3 shifted copies inside <pattern> so tile edges connect perfectly.
// Stack: glow(z0) < pattern(z1) < content(z2)
// - NO requestAnimationFrame (static; redraw only on resize)

(function () {
  try {
    var SVG_NS = "http://www.w3.org/2000/svg";

    function createEl(tag, attrs, parent) {
      var el = document.createElementNS(SVG_NS, tag);
      if (attrs) {
        for (var k in attrs) {
          if (Object.prototype.hasOwnProperty.call(attrs, k)) el.setAttribute(k, String(attrs[k]));
        }
      }
      if (parent) parent.appendChild(el);
      return el;
    }
    function clearChildren(node) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }
    function cssVar(name) {
      try {
        return (getComputedStyle(document.documentElement).getPropertyValue(name) || "").trim();
      } catch (_) {
        return "";
      }
    }
    function num(v, fallback) {
      if (!v) return fallback;
      var n = parseFloat(v);
      return Number.isFinite(n) ? n : fallback;
    }

    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // remove old canvas if present (legacy)
      var oldCanvas = document.getElementById("bg-pattern-canvas");
      if (oldCanvas && oldCanvas.parentNode) oldCanvas.parentNode.removeChild(oldCanvas);

      // ensure svg
      var svg = document.getElementById("bg-pattern-svg");
      if (!svg) {
        svg = document.createElementNS(SVG_NS, "svg");
        svg.id = "bg-pattern-svg";
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("preserveAspectRatio", "none");
        document.body.insertBefore(svg, document.body.firstChild);
      }

      // layer styles
      var st = svg.style;
      st.position = "fixed";
      st.inset = "0";
      st.width = "100vw";
      st.height = "100vh";
      st.pointerEvents = "none";
      st.zIndex = "1";
      st.display = "block";
      st.mixBlendMode = "normal";
      st.opacity = "1";

      // enforce content z=2
      try {
        [".site-header", ".page-content", ".site-footer"].forEach(function (sel) {
          var el = document.querySelector(sel);
          if (el) {
            if (!el.style.position) el.style.position = "relative";
            el.style.zIndex = "2";
          }
        });
      } catch (_) {}

      // ==========================
      // TILE / PATH
      // ==========================
      var TILE_W = 480;
      var TILE_H = 576;

      // Strong smoothing parameters (CSS overrideable)
      // Bigger = smoother, but lines get a bit thicker.
      var DILATE = num(cssVar("--bg-pattern-dilate"), 0.9); // px
      var BLUR = num(cssVar("--bg-pattern-blur"), 0.75); // px

      // IMPORTANT:
      // This PATH describes the "line shapes" (filled geometry) that will be CUT OUT (transparent).
      var PATH_D = `M 0 392 L 1 401 L 15 417 L 18 425 L 18 545 L 16 549 L 15 569 L 12 575 L 17 575 L 21 553 L 22 484 L 20 476 L 20 433 L 22 429 L 24 429 L 57 468 L 57 575 L 61 575 L 61 477 L 65 478 L 71 484 L 97 516 L 97 575 L 101 575 L 101 528 L 103 525 L 111 532 L 127 554 L 132 565 L 134 575 L 139 575 L 137 565 L 130 550 L 115 529 L 106 519 L 105 521 L 103 516 L 102 517 L 99 514 L 100 511 L 91 503 L 92 501 L 88 498 L 85 492 L 78 484 L 76 486 L 73 480 L 68 477 L 67 472 L 56 462 L 55 458 L 42 445 L 32 432 L 31 428 L 25 425 L 24 421 Z M 0 311 L 0 319 L 134 482 L 141 488 L 156 507 L 160 515 L 164 517 L 172 533 L 176 549 L 177 575 L 181 575 L 180 549 L 175 528 L 163 507 L 159 504 L 150 491 L 135 478 L 134 474 L 130 471 L 117 453 L 112 450 L 108 445 L 108 442 L 95 429 L 95 426 L 64 391 L 24 340 L 16 333 L 15 329 Z M 97 0 L 97 154 L 102 195 L 121 226 L 286 428 L 295 455 L 296 575 L 305 575 L 373 487 L 379 448 L 379 230 L 409 193 L 416 191 L 414 506 L 400 535 L 364 575 L 371 575 L 394 548 L 411 523 L 418 503 L 420 326 L 455 372 L 456 384 L 456 514 L 448 552 L 438 569 L 432 572 L 432 575 L 437 575 L 453 550 L 459 530 L 459 383 L 461 381 L 479 402 L 479 395 L 432 338 L 422 316 L 419 181 L 448 146 L 453 141 L 456 143 L 457 279 L 464 300 L 479 321 L 479 314 L 464 291 L 459 261 L 459 134 L 479 110 L 479 104 L 360 245 L 340 278 L 336 302 L 337 531 L 302 569 L 300 267 L 307 240 L 316 226 L 472 38 L 479 29 L 479 23 L 341 187 L 304 238 L 296 271 L 296 430 L 293 433 L 259 385 L 260 244 L 264 216 L 287 180 L 436 0 L 425 5 L 418 18 L 352 97 L 346 100 L 264 206 L 256 244 L 255 378 L 220 339 L 220 212 L 223 188 L 244 152 L 370 0 L 363 0 L 346 20 L 320 56 L 240 149 L 224 174 L 216 219 L 215 329 L 180 290 L 181 174 L 185 151 L 205 119 L 304 0 L 296 0 L 264 43 L 260 38 L 261 0 L 257 0 L 256 51 L 223 89 L 220 86 L 221 0 L 217 0 L 217 96 L 184 143 L 181 141 L 181 0 L 177 0 L 175 281 L 149 255 L 140 238 L 139 0 L 134 0 L 137 20 L 137 231 L 133 235 L 111 206 L 103 184 L 101 0 Z M 373 237 L 376 241 L 375 461 L 371 481 L 363 494 L 364 498 L 361 501 L 360 499 L 358 500 L 356 504 L 358 506 L 352 508 L 349 517 L 346 516 L 341 520 L 339 517 L 340 297 L 346 273 Z M 57 0 L 56 19 L 48 42 L 38 58 L 32 64 L 32 67 L 28 68 L 28 71 L 22 76 L 0 103 L 0 110 L 15 93 L 18 95 L 18 233 L 20 250 L 24 263 L 35 281 L 51 302 L 191 469 L 200 483 L 203 484 L 212 501 L 214 509 L 217 541 L 217 575 L 221 575 L 220 519 L 217 501 L 211 488 L 205 483 L 196 469 L 180 452 L 170 437 L 148 413 L 146 408 L 136 398 L 135 394 L 130 388 L 123 383 L 124 382 L 117 372 L 109 365 L 103 356 L 95 350 L 95 346 L 74 322 L 74 320 L 68 317 L 68 314 L 47 290 L 43 282 L 39 279 L 39 276 L 32 270 L 24 250 L 21 219 L 21 88 L 24 81 L 46 54 L 55 38 L 57 39 L 58 203 L 62 226 L 67 237 L 81 258 L 227 433 L 247 461 L 251 469 L 256 489 L 257 575 L 261 575 L 260 487 L 257 483 L 255 469 L 247 453 L 222 420 L 219 419 L 206 401 L 192 386 L 187 377 L 183 375 L 180 369 L 176 366 L 175 362 L 170 360 L 170 357 L 154 337 L 136 318 L 135 314 L 130 308 L 127 307 L 127 305 L 112 289 L 104 277 L 96 270 L 95 266 L 76 243 L 67 228 L 63 215 L 61 195 L 61 0 Z M 17 0 L 12 0 L 8 9 L 5 12 L 2 19 L 0 20 L 0 29 L 13 10 Z`;

      // Rebuild SVG
      clearChildren(svg);

      var defs = createEl("defs", null, svg);

      // --- Strong smoothing filter for the mask cutouts ---
      var filt = createEl(
        "filter",
        {
          id: "bgPatternCutSmooth",
          x: "-10%",
          y: "-10%",
          width: "120%",
          height: "120%",
          "color-interpolation-filters": "sRGB",
        },
        defs
      );
      createEl("feMorphology", { in: "SourceGraphic", operator: "dilate", radius: String(DILATE), result: "dil" }, filt);
      createEl("feGaussianBlur", { in: "dil", stdDeviation: String(BLUR), result: "blr" }, filt);

      // --- Pattern of the CUTOUTS (where it should be transparent) ---
      var pattern = createEl(
        "pattern",
        {
          id: "bgCutPattern",
          patternUnits: "userSpaceOnUse",
          width: String(TILE_W),
          height: String(TILE_H),
        },
        defs
      );

      // The cutouts are BLACK in the mask (transparent), so we paint them black.
      // Apply smoothing filter here.
      var g = createEl("g", { filter: "url(#bgPatternCutSmooth)" }, pattern);

      // 3x3 offsets (seam fix)
      var offsets = [
        [-TILE_W, -TILE_H],
        [0, -TILE_H],
        [TILE_W, -TILE_H],
        [-TILE_W, 0],
        [0, 0],
        [TILE_W, 0],
        [-TILE_W, TILE_H],
        [0, TILE_H],
        [TILE_W, TILE_H],
      ];

      for (var i = 0; i < offsets.length; i++) {
        var ox = offsets[i][0];
        var oy = offsets[i][1];
        createEl(
          "path",
          {
            d: PATH_D,
            fill: "#000", // black = mask "hole"
            "fill-rule": "evenodd",
            transform: "translate(" + ox + " " + oy + ")",
            "shape-rendering": "geometricPrecision",
          },
          g
        );
      }

      // --- Mask: white background (opaque) + black cut pattern (transparent) ---
      // ★重要：maskUnits=userSpaceOnUse の場合、x/y/width/height を「実ピクセル」で毎回指定しないと、
      // ブラウザによって有効領域が壊れて “右上だけ” などになります。
      var mask = createEl(
        "mask",
        {
          id: "bgPatternMask",
          maskUnits: "userSpaceOnUse",
          x: "0",
          y: "0",
          width: "1",
          height: "1",
        },
        defs
      );

      // ★あとで resize で width/height を更新するため参照を保持する
      var maskWhite = createEl("rect", { x: 0, y: 0, width: 1, height: 1, fill: "#fff" }, mask);
      var maskCut = createEl("rect", { x: 0, y: 0, width: 1, height: 1, fill: "url(#bgCutPattern)" }, mask);

      // --- Final paint: solid white sheet with mask applied (holes become transparent) ---
      var rect = createEl(
        "rect",
        {
          id: "bg-pattern-rect",
          x: 0,
          y: 0,
          fill: "#fff", // ground is 100% white
          mask: "url(#bgPatternMask)",
        },
        svg
      );

      function resize() {
        var w = Math.max(1, Math.ceil(window.innerWidth));
        var h = Math.max(1, Math.ceil(window.innerHeight));

        svg.setAttribute("viewBox", "0 0 " + w + " " + h);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));

        rect.setAttribute("width", String(w));
        rect.setAttribute("height", String(h));

        // ★mask の有効領域をビューポート全面に固定
        mask.setAttribute("x", "0");
        mask.setAttribute("y", "0");
        mask.setAttribute("width", String(w));
        mask.setAttribute("height", String(h));

        maskWhite.setAttribute("width", String(w));
        maskWhite.setAttribute("height", String(h));
        maskCut.setAttribute("width", String(w));
        maskCut.setAttribute("height", String(h));
      }

      resize();

      var rto = 0;
      window.addEventListener(
        "resize",
        function () {
          clearTimeout(rto);
          rto = setTimeout(resize, 100);
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
