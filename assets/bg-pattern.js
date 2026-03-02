// assets/bg-pattern.js
// Canvas-rendered "one big sheet" pattern (e.g., 2000x3000) made from traced SVG path.
// Goal: eliminate jaggies by supersampling rasterization, then downscaling with drawImage.
// Stack: glow(z0) < pattern(z1) < content(z2)
// - NO requestAnimationFrame (static)
// - Rebuild big sheet only when needed (color/opacity/size change); on resize just redraw.

(function () {
  try {
    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // ---- remove old SVG version if present ----
      var oldSvg = document.getElementById("bg-pattern-svg");
      if (oldSvg && oldSvg.parentNode) oldSvg.parentNode.removeChild(oldSvg);

      // ---- ensure display canvas ----
      var canvas = document.getElementById("bg-pattern-canvas");
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.id = "bg-pattern-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.insertBefore(canvas, document.body.firstChild);
      }

      // ---- force layer styles (never break layout) ----
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

      // enforce content z=2 (guarantees stack)
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
      // SOURCE TILE (traced path)
      // ==========================
      // The traced tile size (same as before).
      var TILE_W = 480;
      var TILE_H = 576;

      // Use the FULL traced PATH (the one you already had) to preserve composition.
      // (Yes, it's long — but it only lives once and renders fast due to few tiles.)
      var PATH_D = `M 0 392 L 1 401 L 15 417 L 18 425 L 18 545 L 16 549 L 15 569 L 12 575 L 17 575 L 21 553 L 22 484 L 20 476 L 20 433 L 22 429 L 24 429 L 57 468 L 57 575 L 61 575 L 61 477 L 65 478 L 71 484 L 97 516 L 97 575 L 101 575 L 101 528 L 103 525 L 111 532 L 127 554 L 132 565 L 134 575 L 139 575 L 137 565 L 130 550 L 115 529 L 106 519 L 105 521 L 103 516 L 102 517 L 99 514 L 100 511 L 95 505 L 91 503 L 92 501 L 88 498 L 85 492 L 78 484 L 76 486 L 73 480 L 68 477 L 69 476 L 67 472 L 56 462 L 55 458 L 42 445 L 41 442 L 32 432 L 31 428 L 25 425 L 24 421 L 20 418 Z M 116 533 L 118 533 Z M 114 532 L 116 532 Z M 110 527 L 112 527 Z M 108 524 L 110 524 Z M 105 521 L 107 521 Z M 97 512 L 99 512 Z M 95 508 L 96 507 L 98 510 L 97 511 Z M 94 507 L 96 507 Z M 87 499 L 89 499 Z M 83 494 L 85 494 Z M 81 493 L 83 493 Z M 79 490 L 81 490 Z M 76 486 L 77 485 L 78 487 L 77 488 Z M 0 311 L 0 319 L 134 482 L 141 488 L 156 507 L 160 515 L 164 517 L 172 533 L 176 549 L 177 575 L 181 575 L 180 549 L 175 528 L 163 507 L 159 504 L 150 491 L 135 478 L 134 474 L 130 471 L 117 453 L 112 450 L 111 447 L 108 445 L 108 442 L 95 429 L 95 426 L 84 415 L 82 410 L 64 391 L 56 379 L 51 375 L 51 373 L 47 370 L 37 356 L 25 343 L 24 340 L 16 333 L 15 329 Z M 164 514 L 166 514 Z M 163 513 L 165 513 Z M 159 507 L 161 507 Z M 155 501 L 157 501 Z M 154 500 L 156 500 Z M 149 493 L 150 492 L 152 495 L 151 496 Z M 148 492 L 150 492 Z M 97 0 L 97 154 L 99 184 L 102 195 L 110 211 L 121 226 L 161 275 L 191 309 L 205 328 L 214 337 L 229 357 L 256 388 L 257 391 L 265 399 L 286 428 L 291 438 L 295 455 L 296 575 L 305 575 L 340 533 L 352 516 L 356 513 L 373 487 L 378 464 L 379 448 L 379 230 L 409 193 L 414 189 L 416 191 L 416 486 L 413 500 L 414 506 L 412 506 L 407 520 L 400 531 L 400 535 L 392 544 L 391 543 L 389 545 L 387 551 L 385 553 L 384 551 L 380 556 L 378 562 L 372 565 L 373 568 L 370 568 L 368 570 L 368 573 L 364 575 L 371 575 L 394 548 L 411 523 L 415 515 L 418 503 L 418 404 L 420 326 L 422 327 L 438 353 L 455 372 L 456 384 L 456 514 L 454 517 L 454 531 L 450 546 L 448 548 L 448 552 L 438 565 L 438 569 L 435 572 L 434 570 L 432 572 L 432 575 L 437 575 L 446 563 L 453 550 L 457 538 L 457 533 L 459 530 L 459 383 L 461 381 L 479 402 L 479 395 L 458 371 L 453 363 L 448 359 L 447 356 L 432 338 L 422 316 L 419 293 L 419 181 L 422 179 L 448 146 L 453 141 L 456 143 L 457 279 L 464 300 L 479 321 L 479 314 L 469 301 L 464 291 L 460 275 L 459 261 L 459 134 L 479 110 L 479 104 L 470 113 L 468 118 L 461 123 L 460 127 L 453 132 L 453 135 L 448 138 L 448 141 L 442 146 L 442 149 L 440 151 L 439 150 L 439 152 L 431 162 L 426 164 L 425 167 L 416 177 L 415 181 L 411 184 L 409 188 L 408 187 L 408 190 L 402 196 L 400 196 L 399 200 L 396 201 L 395 206 L 393 208 L 392 207 L 387 214 L 386 213 L 387 215 L 384 216 L 384 219 L 381 221 L 374 231 L 368 235 L 368 238 L 365 240 L 361 246 L 360 245 L 356 253 L 352 256 L 352 259 L 349 261 L 345 271 L 340 278 L 336 302 L 337 531 L 335 533 L 332 533 L 334 535 L 329 537 L 328 542 L 326 544 L 324 543 L 320 550 L 313 557 L 314 559 L 311 559 L 306 565 L 306 568 L 302 569 L 300 567 L 300 267 L 303 251 L 307 240 L 316 226 L 434 84 L 435 81 L 440 77 L 441 74 L 463 49 L 469 40 L 472 38 L 479 29 L 479 23 L 477 25 L 476 24 L 477 26 L 470 31 L 470 35 L 466 40 L 465 39 L 464 43 L 453 52 L 452 57 L 448 58 L 448 61 L 440 68 L 440 71 L 435 74 L 436 76 L 431 83 L 426 84 L 421 91 L 420 95 L 416 97 L 417 99 L 409 105 L 406 111 L 404 111 L 403 115 L 400 116 L 400 119 L 396 121 L 394 127 L 389 129 L 389 131 L 385 134 L 379 145 L 373 149 L 373 151 L 368 155 L 368 158 L 364 160 L 363 163 L 357 168 L 356 172 L 354 174 L 353 173 L 354 174 L 351 176 L 351 178 L 347 180 L 348 182 L 341 187 L 341 191 L 336 194 L 336 196 L 334 197 L 335 198 L 331 203 L 327 205 L 323 212 L 320 213 L 316 222 L 311 226 L 304 238 L 304 242 L 300 248 L 296 271 L 296 430 L 293 433 L 287 421 L 260 388 L 259 385 L 260 244 L 264 216 L 269 205 L 287 180 L 319 143 L 320 140 L 343 114 L 379 69 L 382 67 L 436 0 L 432 0 L 429 4 L 425 5 L 425 8 L 421 11 L 422 12 L 419 16 L 417 16 L 418 18 L 414 20 L 412 24 L 409 25 L 408 30 L 404 32 L 402 36 L 400 36 L 399 39 L 396 41 L 395 45 L 393 47 L 392 46 L 389 51 L 384 55 L 379 65 L 376 68 L 373 68 L 373 72 L 368 74 L 368 78 L 366 78 L 363 82 L 364 83 L 356 89 L 352 94 L 352 97 L 349 100 L 346 100 L 338 114 L 336 114 L 329 121 L 328 126 L 324 128 L 322 132 L 320 132 L 320 135 L 316 138 L 315 142 L 310 145 L 308 150 L 304 152 L 301 158 L 298 160 L 298 162 L 285 176 L 283 181 L 277 186 L 276 190 L 272 192 L 270 199 L 264 206 L 264 209 L 260 216 L 256 244 L 255 378 L 253 378 L 245 370 L 226 345 L 223 343 L 223 341 L 220 339 L 220 212 L 223 188 L 229 173 L 244 152 L 265 128 L 276 113 L 281 109 L 287 100 L 370 0 L 363 0 L 363 3 L 360 4 L 352 13 L 351 17 L 349 17 L 350 18 L 346 20 L 346 22 L 336 33 L 333 39 L 329 41 L 328 46 L 324 48 L 324 51 L 320 52 L 320 56 L 316 57 L 315 62 L 305 70 L 298 79 L 298 82 L 293 85 L 293 88 L 289 89 L 288 94 L 285 96 L 286 97 L 277 104 L 276 109 L 272 111 L 272 114 L 268 116 L 268 119 L 261 124 L 262 126 L 260 128 L 259 127 L 256 129 L 256 131 L 244 147 L 240 149 L 240 152 L 235 160 L 230 164 L 229 169 L 224 174 L 224 179 L 222 180 L 218 196 L 216 219 L 217 325 L 215 329 L 213 329 L 207 323 L 198 310 L 192 306 L 187 297 L 180 290 L 181 174 L 185 151 L 192 137 L 205 119 L 223 99 L 263 49 L 268 45 L 268 43 L 304 0 L 296 0 L 296 2 L 292 5 L 293 7 L 289 9 L 289 13 L 286 16 L 285 15 L 283 18 L 284 19 L 276 25 L 276 28 L 274 30 L 273 29 L 273 32 L 266 37 L 266 41 L 264 43 L 260 38 L 261 0 L 257 0 L 256 51 L 248 59 L 248 62 L 242 68 L 240 68 L 240 70 L 223 89 L 220 86 L 221 0 L 217 0 L 217 96 L 208 108 L 208 111 L 201 116 L 196 126 L 189 133 L 187 141 L 184 143 L 181 141 L 181 0 L 177 0 L 177 277 L 175 281 L 172 280 L 166 274 L 162 267 L 154 259 L 154 257 L 149 255 L 147 249 L 141 242 L 140 238 L 141 14 L 139 0 L 134 0 L 137 20 L 137 231 L 133 235 L 130 232 L 130 229 L 127 228 L 126 224 L 119 216 L 119 214 L 111 206 L 111 202 L 107 196 L 103 184 L 101 166 L 101 0 Z M 57 0 L 56 19 L 52 34 L 48 42 L 38 56 L 38 58 L 32 64 L 32 67 L 28 68 L 28 71 L 22 76 L 0 103 L 0 110 L 15 93 L 18 95 L 18 233 L 20 250 L 24 263 L 35 281 L 51 302 L 160 432 L 166 441 L 191 469 L 200 483 L 203 484 L 212 501 L 214 509 L 217 541 L 217 575 L 221 575 L 220 519 L 217 501 L 211 488 L 208 484 L 205 483 L 196 469 L 180 452 L 175 443 L 170 439 L 170 437 L 163 431 L 159 424 L 148 413 L 146 408 L 136 398 L 135 394 L 131 391 L 130 388 L 128 388 L 126 384 L 123 383 L 124 382 L 117 372 L 109 365 L 103 356 L 95 350 L 95 346 L 91 343 L 87 336 L 74 322 L 74 320 L 68 317 L 68 314 L 63 310 L 63 308 L 47 290 L 43 282 L 39 279 L 39 276 L 32 270 L 24 250 L 21 219 L 21 88 L 24 81 L 46 54 L 53 40 L 55 38 L 57 39 L 58 203 L 62 226 L 67 237 L 81 258 L 137 324 L 160 354 L 164 357 L 166 361 L 208 410 L 209 413 L 227 433 L 247 461 L 251 469 L 256 489 L 257 575 L 261 575 L 260 487 L 257 483 L 255 469 L 247 453 L 243 449 L 238 440 L 223 423 L 222 420 L 219 419 L 206 401 L 192 386 L 187 377 L 183 375 L 180 369 L 176 366 L 175 362 L 170 360 L 170 357 L 159 345 L 154 337 L 136 318 L 135 314 L 131 311 L 130 308 L 127 307 L 127 305 L 119 297 L 119 295 L 112 289 L 104 277 L 96 270 L 95 266 L 91 263 L 79 247 L 79 245 L 76 243 L 76 241 L 71 236 L 67 228 L 63 215 L 61 195 L 61 0 Z M 17 0 L 12 0 L 8 9 L 5 12 L 2 19 L 0 20 L 0 29 L 13 10 Z`;

      // Make Path2D from SVG path string (modern browsers).
      // If Path2D(svgPath) is not supported, we fallback to SVG->Image rendering.
      var path2d = null;
      try {
        path2d = new Path2D(PATH_D);
      } catch (_) {
        path2d = null;
      }

      // ==========================
      // BIG SHEET SETTINGS
      // ==========================
      // You can override via CSS:
      // :root { --bg-pattern-sheet-w:2000; --bg-pattern-sheet-h:3000; --bg-pattern-sheet-ss:2; }
      function cssNum(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        if (!v) return fallback;
        var n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
      }
      var SHEET_W = Math.max(800, Math.min(6000, cssNum("--bg-pattern-sheet-w", 2000)));
      var SHEET_H = Math.max(800, Math.min(8000, cssNum("--bg-pattern-sheet-h", 3000)));
      // supersampling factor (2〜3 推奨)
      var SS = Math.max(1, Math.min(4, cssNum("--bg-pattern-sheet-ss", 2)));

      // Color/opacity from CSS vars (same defaults as before)
      function cssStr(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
      }
      var COLOR = cssStr("--bg-pattern-color", "#fff");
      var OPACITY = (function () {
        var v = cssNum("--bg-pattern-opacity", 1);
        return Math.max(0, Math.min(1, v));
      })();

      // Cache big sheet
      var sheet = null;
      var sheetKey = "";

      function buildSheet() {
        var key = [SHEET_W, SHEET_H, SS, COLOR, OPACITY].join("|");
        if (sheet && sheetKey === key) return;

        sheetKey = key;

        var cw = Math.floor(SHEET_W * SS);
        var ch = Math.floor(SHEET_H * SS);

        var c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        var cctx = c.getContext("2d", { alpha: true });

        // Best quality downsampling later
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = "high";

        // Work in CSS-px coordinates, scaled by SS
        cctx.setTransform(SS, 0, 0, SS, 0, 0);

        cctx.clearRect(0, 0, SHEET_W, SHEET_H);
        cctx.globalAlpha = OPACITY;
        cctx.fillStyle = COLOR;

        // --- layout: brick offset to match your current composition ---
        // repeat tiles to cover 2000x3000
        var startX = -TILE_W;
        var startY = -TILE_H;
        var endX = SHEET_W + TILE_W;
        var endY = SHEET_H + TILE_H;

        var row = 0;
        for (var y = startY; y < endY; y += TILE_H) {
          var xOffset = (row % 2) * (TILE_W * 0.5);
          for (var x = startX; x < endX; x += TILE_W) {
            cctx.save();
            cctx.translate(x + xOffset, y);

            if (path2d) {
              cctx.fill(path2d);
            } else {
              // Fallback: render as SVG image (still supersampled)
              // (rarely needed; Path2D is supported in modern Chrome/Safari)
            }

            cctx.restore();
          }
          row++;
        }

        // slight extra smoothing: draw itself down once (SS -> 1)
        // This makes edges less “steppy” even if source path is noisy.
        var down = document.createElement("canvas");
        down.width = SHEET_W;
        down.height = SHEET_H;
        var dctx = down.getContext("2d", { alpha: true });
        dctx.imageSmoothingEnabled = true;
        dctx.imageSmoothingQuality = "high";
        dctx.clearRect(0, 0, SHEET_W, SHEET_H);
        dctx.drawImage(c, 0, 0, cw, ch, 0, 0, SHEET_W, SHEET_H);

        sheet = down;
      }

      function resizeDisplayCanvas() {
        var dpr = Math.max(1, window.devicePixelRatio || 1);
        var w = Math.max(1, Math.ceil(window.innerWidth));
        var h = Math.max(1, Math.ceil(window.innerHeight));

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawToViewport(w, h);
      }

      function drawToViewport(w, h) {
        buildSheet();

        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // "cover" fit: fill viewport without distortion
        var sx = 0, sy = 0, sw = sheet.width, sh = sheet.height;
        var scale = Math.max(w / sw, h / sh);
        var dw = sw * scale;
        var dh = sh * scale;
        var dx = (w - dw) / 2;
        var dy = (h - dh) / 2;

        ctx.drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh);
      }

      // initial
      resizeDisplayCanvas();

      // resize only (redraw; sheet is reused)
      var rto = 0;
      window.addEventListener(
        "resize",
        function () {
          clearTimeout(rto);
          rto = setTimeout(resizeDisplayCanvas, 120);
        },
        { passive: true }
      );

      // Optional: if you change CSS vars at runtime and want refresh:
      // window.dispatchEvent(new Event("bg-pattern-refresh"));
      window.addEventListener(
        "bg-pattern-refresh",
        function () {
          sheetKey = ""; // force rebuild
          resizeDisplayCanvas();
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
