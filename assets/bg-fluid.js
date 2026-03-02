// assets/bg-pattern.js
// Solid white sheet with transparent line cutouts (NO filter, NO blur)

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

    let old = document.getElementById("bg-pattern-svg");
    if (old) old.remove();

    const svg = el("svg", {
      id: "bg-pattern-svg",
      width: "100vw",
      height: "100vh",
      viewBox: `0 0 ${window.innerWidth} ${window.innerHeight}`,
      preserveAspectRatio: "none",
      style: "position:fixed;inset:0;z-index:1;pointer-events:none;"
    }, document.body);

    const defs = el("defs", {}, svg);

    const mask = el("mask", {
      id: "bgMask",
      maskUnits: "userSpaceOnUse",
      x: "0",
      y: "0",
      width: window.innerWidth,
      height: window.innerHeight
    }, defs);

    // white base
    el("rect", {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      fill: "#fff"
    }, mask);

    // CUTOUT PATH (black = transparent)
    const PATH_D = `M 0 392 L 1 401 L 15 417 L 18 425 L 18 545 L 16 549 L 15 569 L 12 575 L 17 575 L 21 553 L 22 484 L 20 476 L 20 433 L 22 429 L 24 429 L 57 468 L 57 575 L 61 575 L 61 477 L 65 478 L 71 484 L 97 516 L 97 575 L 101 575 L 101 528 L 103 525 L 111 532 L 127 554 L 132 565 L 134 575 L 139 575 L 137 565 L 130 550 L 115 529 L 106 519 L 105 521 L 103 516 L 102 517 L 99 514 L 100 511 L 91 503 L 92 501 L 88 498 L 85 492 L 78 484 L 76 486 L 73 480 L 68 477 L 67 472 L 56 462 L 55 458 L 42 445 L 32 432 L 31 428 L 25 425 L 24 421 Z`;

    const pattern = el("pattern", {
      id: "cutPattern",
      patternUnits: "userSpaceOnUse",
      width: 480,
      height: 576
    }, defs);

    el("path", {
      d: PATH_D,
      fill: "#000"
    }, pattern);

    el("rect", {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
      fill: "url(#cutPattern)"
    }, mask);

    el("rect", {
      x: 0,
      y: 0,
      width: window.innerWidth,
      height: window.innerHeight,
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
