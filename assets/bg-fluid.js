// assets/bg-pattern.js
// White sheet with transparent cut lines (stable version)

(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function run() {
    if (!document.body) return requestAnimationFrame(run);

    // remove old
    const old = document.getElementById("bg-pattern-svg");
    if (old) old.remove();

    const w = window.innerWidth;
    const h = window.innerHeight;

    const svg = el("svg", {
      id: "bg-pattern-svg",
      viewBox: `0 0 ${w} ${h}`,
      width: w,
      height: h,
      preserveAspectRatio: "none"
    }, document.body);

    // style via CSS (NOT attribute units)
    svg.style.position = "fixed";
    svg.style.inset = "0";
    svg.style.zIndex = "1";
    svg.style.pointerEvents = "none";

    const defs = el("defs", {}, svg);

    const mask = el("mask", {
      id: "bgMask",
      maskUnits: "userSpaceOnUse",
      x: 0,
      y: 0,
      width: w,
      height: h
    }, defs);

    // white base (opaque)
    el("rect", {
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "#fff"
    }, mask);

    // === pattern ===
    const TILE_W = 480;
    const TILE_H = 576;

    const PATH_D = `M 0 392 L 1 401 L 15 417 L 18 425 L 18 545 L 16 549 L 15 569 L 12 575 L 17 575 L 21 553 L 22 484 L 20 476 L 20 433 L 22 429 L 24 429 L 57 468 L 57 575 L 61 575 L 61 477 L 65 478 L 71 484 L 97 516 L 97 575 L 101 575 L 101 528 L 103 525 L 111 532 L 127 554 L 132 565 L 134 575 L 139 575 L 137 565 L 130 550 L 115 529 L 106 519 L 105 521 L 103 516 L 102 517 L 99 514 L 100 511 L 91 503 L 92 501 L 88 498 L 85 492 L 78 484 L 76 486 L 73 480 L 68 477 L 67 472 L 56 462 L 55 458 L 42 445 L 32 432 L 31 428 L 25 425 L 24 421 Z`;

    const pattern = el("pattern", {
      id: "cutPattern",
      patternUnits: "userSpaceOnUse",
      width: TILE_W,
      height: TILE_H
    }, defs);

    el("path", {
      d: PATH_D,
      fill: "#000"
    }, pattern);

    // fill whole mask with repeating pattern
    el("rect", {
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "url(#cutPattern)"
    }, mask);

    // final white sheet using mask
    el("rect", {
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "#fff",
      mask: "url(#bgMask)"
    }, svg);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
