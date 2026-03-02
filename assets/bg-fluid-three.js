// assets/bg-fluid-three.js
// Use local /assets/vendor/fluid-three/main.min.js (loaded in head.html)
// - Hijack the canvas fluid-three creates -> fixed full-screen background
// - Hide dat.GUI controls
// - Prevent initial layout shift by forcing newly added canvases to fixed immediately

(function () {
  "use strict";

  // Respect reduced-motion
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (_) {}

  function ensureNoControls() {
    if (document.getElementById("bg-fluid-no-gui")) return;
    var style = document.createElement("style");
    style.id = "bg-fluid-no-gui";
    style.textContent = `
      .dg, .dg.ac { display: none !important; } /* dat.GUI */
    `;
    document.head.appendChild(style);
  }

  function setCanvasAsBackground(c) {
    if (!c) return false;

    c.id = "bg-fluid-canvas";
    c.setAttribute("aria-hidden", "true");

    var st = c.style;
    st.position = "fixed";
    st.inset = "0";
    st.left = "0";
    st.top = "0";
    st.width = "100vw";
    st.height = "100vh";
    st.pointerEvents = "none";
    st.zIndex = "0";
    st.display = "block";

    return true;
  }

  function pickFluidCanvas() {
    var list = document.getElementsByTagName("canvas");
    if (!list || !list.length) return null;

    // Prefer a canvas not already used by other layers.
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if (!c) continue;
      if (c.id === "bg-fluid-canvas") return c;
      if (!c.id) return c; // fluid-three canvas is usually id-less
    }
    return list[list.length - 1];
  }

  function preventLayoutShiftForNewCanvas() {
    // If fluid-three injects a canvas before our RAF hijack runs,
    // force it to be fixed immediately to avoid pushing layout.
    var mo = new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var i = 0; i < added.length; i++) {
          var n = added[i];
          if (n && n.tagName === "CANVAS" && n.id !== "bg-fluid-canvas") {
            // minimal fix first (no id yet)
            n.style.position = "fixed";
            n.style.inset = "0";
            n.style.pointerEvents = "none";
            n.style.zIndex = "0";
            n.style.display = "block";
          }
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    // stop observing later (optional)
    setTimeout(function () { try { mo.disconnect(); } catch (_) {} }, 8000);
  }

  function waitAndHijack(maxFrames) {
    var frames = 0;
    function tick() {
      frames++;
      var c = pickFluidCanvas();
      if (c && setCanvasAsBackground(c)) return;
      if (frames < maxFrames) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function run() {
    if (!document.body) return requestAnimationFrame(run);

    ensureNoControls();
    preventLayoutShiftForNewCanvas();

    // Safety: remove old canvas if left behind
    try {
      var old = document.getElementById("bg-fluid-canvas");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}

    // We DO NOT load main.min.js here. head.html already loads it.
    waitAndHijack(180);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
