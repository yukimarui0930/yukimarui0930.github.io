// assets/bg-pattern.js
// Traced SVG pattern (NOT bitmap). Adds a tiny same-color stroke overlay to smooth edges.
// Stack: glow(z0) < pattern(z1) < content(z2)
// - NO requestAnimationFrame (static; redraw only on resize)
// - Default: pure white (#fff), fully opaque (override by CSS vars)

(function () {
  try {
    var SVG_NS = "http://www.w3.org/2000/svg";

    function createEl(tag, attrs, parent) {
      var el = document.createElementNS(SVG_NS, tag);
      if (attrs) {
        for (var k in attrs) {
          if (Object.prototype.hasOwnProperty.call(attrs, k)) {
            el.setAttribute(k, String(attrs[k]));
          }
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
      return isFinite(n) ? n : fallback;
    }

    function run() {
      if (!document.body) return void setTimeout(run, 0);

      // --- remove old canvas if present ---
      var oldCanvas = document.getElementById("bg-pattern-canvas");
      if (oldCanvas && oldCanvas.parentNode) oldCanvas.parentNode.removeChild(oldCanvas);

      // --- ensure svg ---
      var svg = document.getElementById("bg-pattern-svg");
      if (!svg) {
        svg = document.createElementNS(SVG_NS, "svg");
        svg.id = "bg-pattern-svg";
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        svg.setAttribute("preserveAspectRatio", "none");
        document.body.insertBefore(svg, document.body.firstChild);
      }

      // --- force layer styles (never break layout) ---
      var st = svg.style;
      st.position = "fixed";
      st.inset = "0";
      st.width = "100vw";
      st.height = "100vh";
      st.pointerEvents = "none";
      st.zIndex = "1";
      st.display = "block";
      st.mixBlendMode = "normal";

      // Color via currentColor
      // Defaults: pure white and fully opaque
      st.color = "var(--bg-pattern-color, #fff)";
      st.opacity = "var(--bg-pattern-opacity, 1)";

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

      // ==========================
      // TRACED TILE (userSpace)
      // ==========================
      var TILE_W = 480;
      var TILE_H = 576;

      // Smoothing knobs (optional CSS override)
      // --bg-pattern-smooth-stroke: tiny outline stroke width (recommended: 0.25 ~ 0.8)
      var SMOOTH_STROKE = num(cssVar("--bg-pattern-smooth-stroke"), 0.45);

      // Rebuild SVG content (idempotent)
      clearChildren(svg);

      var defs = createEl("defs", null, svg);

      // (Optional) ultra subtle blur for stair-step reduction.
      // Default OFF. Set e.g. :root{ --bg-pattern-smooth-blur: 0.18; }
      var blur = num(cssVar("--bg-pattern-smooth-blur"), 0);
      if (blur > 0) {
        var f = createEl(
          "filter",
          {
            id: "bgPatternSmooth",
            x: "-5%",
            y: "-5%",
            width: "110%",
            height: "110%",
            "color-interpolation-filters": "sRGB",
          },
          defs
        );
        createEl("feGaussianBlur", { in: "SourceGraphic", stdDeviation: String(blur) }, f);
      }

      var pattern = createEl(
        "pattern",
        {
          id: "bgPattern",
          patternUnits: "userSpaceOnUse",
          width: String(TILE_W),
          height: String(TILE_H),
        },
        defs
      );

      // NOTE:
      // This is the traced vector path data (filled geometry).
      // We draw it as fill + a tiny same-color stroke to smooth the silhouette.
      var PATH_D = `M 0 392 L 1 401 L 15 417 L 18 425 L 18 545 L 16 549 L 15 569 L 12 575 L 17 575 L 21 553 L 22 484 L 20 476 L 20 433 L 22 429 L 24 429 L 57 468 L 57 575 L 61 575 L 61 477 L 65 478 L 71 484 L 97 516 L 97 575 L 101 575 L 101 528 L 103 525 L 111 532 L 127 554 L 132 565 L 134 575 L 139 575 L 137 565 L 130 550 L 115 529 L 106 519 L 105 521 L 103 516 L 102 517 L 99 514 L 100 511 L 95 505 L 91 503 L 92 501 L 88 498 L 85 492 L 78 484 L 76 486 L 73 480 L 68 477 L 69 476 L 67 472 L 56 462 L 55 458 L 42 445 L 41 442 L 32 432 L 31 428 L 25 425 L 24 421 L 20 418 Z M 116 533 L 118 533 Z M 114 532 L 116 532 Z M 110 527 L 112 527 Z M 108 524 L 110 524 Z M 105 521 L 107 521 Z M 97 512 L 99 512 Z M 95 508 L 96 507 L 98 510 L 97 511 Z M 94 507 L 96 507 Z M 87 499 L 89 499 Z M 83 494 L 85 494 Z M 81 493 L 83 493 Z M 79 490 L 81 490 Z M 76 486 L 77 485 L 78 487 L 77 488 Z M 0 311 L 0 319 L 134 482 L 141 488 L 156 507 L 160 515 L 164 517 L 172 533 L 176 549 L 177 575 L 181 575 L 180 549 L 175 528 L 163 507 L 159 504 L 150 491 L 135 478 L 134 474 L 130 471 L 117 453 L 112 450 L 111 447 L 108 445 L 108 442 L 95 429 L 95 426 L 84 415 L 82 410 L 64 391 L 56 379 L 51 375 L 51 373 L 47 370 L 37 356 L 25 343 L 24 340 L 16 333 L 15 329 Z M 164 514 L 166 514 Z M 163 513 L 165 513 Z M 159 507 L 161 507 Z M 155 501 L 157 501 Z M 154 500 L 156 500 Z M 149 493 L 150 492 L 152 495 L 151 496 Z M 148 492 L 150 492 Z M 97 0 L 97 154 L 99 184 L 102 195 L 110 211 L 121 226 L 161 275 L 191 309 L 205 328 L 214 337 L 229 357 L 256 388 L 257 391 L 265 399 L 286 428 L 291 438 L 295 455 L 296 575 L 305 575 L 340 533 L 352 516 L 356 513 L 373 487 L 378 464 L 379 448 L 379 230 L 409 193 L 414 189 L 416 191 L 416 486 L 413 500 L 414 506 L 412 506 L 407 520 L 400 531 L 400 535 L 392 544 L 391 543 L 389 545 L 387 551 L 385 553 L 384 551 L 380 556 L 378 562 L 372 565 L 373 568 L 370 568 L 368 570 L 368 573 L 364 575 L 371 575 L 394 548 L 411 523 L 415 515 L 418 503 L 418 404 L 420 326 L 422 327 L 438 353 L 455 372 L 456 384 L 456 514 L 454 517 L 454 531 L 450 546 L 448 548 L 448 552 L 438 565 L 438 569 L 435 572 L 434 570 L 432 572 L 432 575 L 437 575 L 446 563 L 453 550 L 457 538 L 457 533 L 459 530 L 459 383 L 461 381 L 479 402 L 479 395 L 458 371 L 453 363 L 448 359 L 447 356 L 432 338 L 422 316 L 419 293 L 419 181 L 422 179 L 448 146 L 453 141 L 456 143 L 457 279 L 464 300 L 479 321 L 479 314 L 469 301 L 464 291 L 460 275 L 459 261 L 459 134 L 479 110 L 479 104 L 470 113 L 468 118 L 461 123 L 460 127 L 453 132 L 453 135 L 448 138 L 448 141 L 442 146 L 442 149 L 440 151 L 439 150 L 439 152 L 431 162 L 426 164 L 425 167 L 416 177 L 415 181 L 411 184 L 409 188 L 408 187 L 408 190 L 402 196 L 400 196 L 399 200 L 396 201 L 395 206 L 393 208 L 392 207 L 387 214 L 386 213 L 387 215 L 384 216 L 384 219 L 381 221 L 374 231 L 368 235 L 368 238 L 365 240 L 361 246 L 360 245 L 356 253 L 352 256 L 352 259 L 349 261 L 345 271 L 340 278 L 336 302 L 337 531 L 335 533 L 332 533 L 334 535 L 329 537 L 328 542 L 326 544 L 324 543 L 320 550 L 313 557 L 314 559 L 311 559 L 306 565 L 306 568 L 302 569 L 300 567 L 300 267 L 303 251 L 307 240 L 316 226 L 434 84 L 435 81 L 440 77 L 441 74 L 463 49 L 469 40 L 472 38 L 479 29 L 479 23 L 477 25 L 476 24 L 477 26 L 470 31 L 470 35 L 466 40 L 465 39 L 464 43 L 453 52 L 452 57 L 448 58 L 448 61 L 440 68 L 440 71 L 435 74 L 436 76 L 431 83 L 426 84 L 421 91 L 420 95 L 416 97 L 417 99 L 409 105 L 406 111 L 404 111 L 403 115 L 400 116 L 400 119 L 396 121 L 394 127 L 389 129 L 389 131 L 385 134 L 379 145 L 373 149 L 373 151 L 368 155 L 368 158 L 364 160 L 363 163 L 357 168 L 356 172 L 354 174 L 353 173 L 354 174 L 351 176 L 351 178 L 347 180 L 348 182 L 341 187 L 341 191 L 336 194 L 336 196 L 334 197 L 335 198 L 331 203 L 327 205 L 323 212 L 320 213 L 316 222 L 311 226 L 304 238 L 304 242 L 300 248 L 296 271 L 296 430 L 293 433 L 287 421 L 260 388 L 259 385 L 260 244 L 264 216 L 269 205 L 287 180 L 319 143 L 320 140 L 343 114 L 379 69 L 382 67 L 436 0 L 432 0 L 429 4 L 425 5 L 425 8 L 421 11 L 422 12 L 419 16 L 417 16 L 418 18 L 414 20 L 412 24 L 409 25 L 408 30 L 404 32 L 402 36 L 400 36 L 399 39 L 396 41 L 395 45 L 393 47 L 392 46 L 389 51 L 384 55 L 379 65 L 376 68 L 373 68 L 373 72 L 368 74 L 368 78 L 366 78 L 363 82 L 364 83 L 356 89 L 352 94 L 352 97 L 349 100 L 346 100 L 338 114 L 336 114 L 329 121 L 328 126 L 324 128 L 322 132 L 320 132 L 320 135 L 316 138 L 315 142 L 310 145 L 308 150 L 304 152 L 301 158 L 298 160 L 298 162 L 285 176 L 283 181 L 277 186 L 276 190 L 272 192 L 270 199 L 264 206 L 264 209 L 260 216 L 256 244 L 255 378 L 253 378 L 245 370 L 226 345 L 223 343 L 223 341 L 220 339 L 220 212 L 223 188 L 229 173 L 244 152 L 265 128 L 276 113 L 281 109 L 287 100 L 370 0 L 363 0 L 363 3 L 360 4 L 352 13 L 351 17 L 349 17 L 350 18 L 346 20 L 346 22 L 336 33 L 333 39 L 329 41 L 328 46 L 324 48 L 324 51 L 320 52 L 320 56 L 316 57 L 315 62 L 305 70 L 298 79 L 298 82 L 293 85 L 293 88 L 289 89 L 288 94 L 285 96 L 286 97 L 277 104 L 276 109 L 272 111 L 272 114 L 268 116 L 268 119 L 261 124 L 262 126 L 260 128 L 259 127 L 256 129 L 256 131 L 244 147 L 240 149 L 240 152 L 235 160 L 230 164 L 229 169 L 224 174 L 224 179 L 222 180 L 218 196 L 216 219 L 217 325 L 215 329 L 213 329 L 207 323 L 198 310 L 192 306 L 187 297 L 180 290 L 181 174 L 185 151 L 192 137 L 205 119 L 223 99 L 263 49 L 268 45 L 268 43 L 304 0 L 296 0 L 296 2 L 292 5 L 293 7 L 289 9 L 289 13 L 286 16 L 285 15 L 283 18 L 284 19 L 276 25 L 276 28 L 274 30 L 273 29 L 273 32 L 266 37 L 266 41 L 264 43 L 260 38 L 261 0 L 257 0 L 256 51 L 248 59 L 248 62 L 242 68 L 240 68 L 240 70 L 223 89 L 220 86 L 221 0 L 217 0 L 217 96 L 208 108 L 208 111 L 201 116 L 196 126 L 189 133 L 187 141 L 184 143 L 181 141 L 181 0 L 177 0 L 177 277 L 175 281 L 172 280 L 166 274 L 162 267 L 154 259 L 154 257 L 149 255 L 147 249 L 141 242 L 140 238 L 141 14 L 139 0 L 134 0 L 137 20 L 137 231 L 133 235 L 130 232 L 130 229 L 127 228 L 126 224 L 119 216 L 119 214 L 111 206 L 111 202 L 107 196 L 103 184 L 101 166 L 101 0 Z M 433 572 L 435 572 Z M 301 571 L 303 571 Z M 373 565 L 375 565 Z M 443 558 L 445 558 Z M 313 557 L 315 557 Z M 328 539 L 330 539 Z M 330 537 L 332 537 Z M 400 531 L 402 531 Z M 401 529 L 403 527 L 404 528 L 403 530 Z M 403 526 L 405 526 Z M 341 522 L 343 522 Z M 344 520 L 346 520 Z M 345 519 L 347 519 Z M 351 511 L 353 511 Z M 412 508 L 414 508 Z M 355 507 L 357 507 Z M 359 501 L 361 501 Z M 363 494 L 364 493 L 365 495 L 364 496 Z M 365 492 L 367 492 Z M 337 491 L 338 490 L 339 492 L 338 493 Z M 368 487 L 370 487 Z M 254 379 L 256 379 Z M 213 331 L 215 331 Z M 143 247 L 145 247 Z M 373 237 L 376 241 L 375 461 L 371 481 L 363 494 L 364 498 L 361 501 L 360 499 L 358 500 L 356 504 L 357 503 L 358 506 L 352 508 L 349 517 L 346 516 L 343 520 L 341 520 L 339 517 L 340 297 L 346 273 L 355 259 Z M 280 101 L 282 101 Z M 420 93 L 422 93 Z M 421 92 L 423 92 Z M 354 92 L 356 92 Z M 222 91 L 224 91 Z M 423 89 L 425 89 Z M 425 87 L 427 87 Z M 294 85 L 296 85 Z M 297 81 L 299 81 Z M 298 80 L 300 80 Z M 232 80 L 234 80 Z M 299 79 L 301 79 Z M 439 70 L 441 70 Z M 448 59 L 450 59 Z M 386 53 L 387 52 L 388 54 L 387 55 Z M 455 50 L 457 48 L 458 49 L 457 51 Z M 261 43 L 264 43 Z M 472 29 L 474 29 Z M 473 28 L 475 28 Z M 279 22 L 280 21 L 281 23 L 280 24 Z M 280 21 L 282 21 Z M 353 13 L 355 13 Z M 363 1 L 365 1 Z M 57 0 L 56 19 L 52 34 L 48 42 L 38 56 L 38 58 L 32 64 L 32 67 L 28 68 L 28 71 L 22 76 L 0 103 L 0 110 L 15 93 L 18 95 L 18 233 L 20 250 L 24 263 L 35 281 L 51 302 L 160 432 L 166 441 L 191 469 L 200 483 L 203 484 L 212 501 L 214 509 L 217 541 L 217 575 L 221 575 L 220 519 L 217 501 L 211 488 L 208 484 L 205 483 L 196 469 L 180 452 L 175 443 L 170 439 L 170 437 L 163 431 L 159 424 L 148 413 L 146 408 L 136 398 L 135 394 L 131 391 L 130 388 L 128 388 L 126 384 L 123 383 L 124 382 L 117 372 L 109 365 L 103 356 L 95 350 L 95 346 L 91 343 L 87 336 L 74 322 L 74 320 L 68 317 L 68 314 L 63 310 L 63 308 L 47 290 L 43 282 L 39 279 L 39 276 L 32 270 L 24 250 L 21 219 L 21 88 L 24 81 L 46 54 L 53 40 L 55 38 L 57 39 L 58 203 L 62 226 L 67 237 L 81 258 L 137 324 L 160 354 L 164 357 L 166 361 L 208 410 L 209 413 L 227 433 L 247 461 L 251 469 L 256 489 L 257 575 L 261 575 L 260 487 L 257 483 L 255 469 L 247 453 L 243 449 L 238 440 L 223 423 L 222 420 L 219 419 L 206 401 L 192 386 L 187 377 L 183 375 L 180 369 L 176 366 L 175 362 L 170 360 L 170 357 L 159 345 L 154 337 L 136 318 L 135 314 L 131 311 L 130 308 L 127 307 L 127 305 L 119 297 L 119 295 L 112 289 L 104 277 L 96 270 L 95 266 L 91 263 L 79 247 L 79 245 L 76 243 L 76 241 L 71 236 L 67 228 L 63 215 L 61 195 L 61 0 Z M 212 497 L 214 497 Z M 212 493 L 212 497 Z M 17 0 L 12 0 L 8 9 L 5 12 L 2 19 L 0 20 L 0 29 L 13 10 Z`;

      var pathAttrs = {
        d: PATH_D,
        // base geometry is fill (traced)
        fill: "currentColor",
        "fill-rule": "evenodd",
        // smoothing overlay stroke (same color)
        stroke: "currentColor",
        "stroke-width": String(SMOOTH_STROKE),
        "stroke-linejoin": "round",
        "stroke-linecap": "round",
        "stroke-miterlimit": "1",
        // keeps stroke consistent even if anything scales
        "vector-effect": "non-scaling-stroke",
        // help browsers choose better AA
        "shape-rendering": "geometricPrecision",
        // draw stroke first, then fill (stroke becomes subtle outer AA)
        "paint-order": "stroke fill",
      };

      if (blur > 0) pathAttrs.filter = "url(#bgPatternSmooth)";

      createEl("path", pathAttrs, pattern);

      // Paint to viewport
      var rect = createEl("rect", { id: "bg-pattern-rect", x: 0, y: 0, fill: "url(#bgPattern)" }, svg);

      function resize() {
        var w = Math.max(1, Math.ceil(window.innerWidth));
        var h = Math.max(1, Math.ceil(window.innerHeight));
        svg.setAttribute("viewBox", "0 0 " + w + " " + h);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));
        rect.setAttribute("width", String(w));
        rect.setAttribute("height", String(h));
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
