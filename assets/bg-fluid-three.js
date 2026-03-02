// assets/bg-fluid-three.js
// Hardening layer for mnmxmx/fluid-three background on Jekyll/Minima.
// Fixes:
// - GUI panel still visible (dat.GUI OR lil-gui) -> hide + remove + keep removing
// - Layout shift / background-content "misalignment" caused by overflow hidden (scrollbar jump)
// - Make injected canvas always fixed, full-viewport, bottom layer.

(function () {
  "use strict";

  // Respect reduced-motion
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (_) {}

  function injectHardCSS() {
    if (document.getElementById("bg-fluid-hard-css")) return;
    var style = document.createElement("style");
    style.id = "bg-fluid-hard-css";
    style.textContent = `
      /* Hide any common GUI implementations */
      .dg, .dg.ac, .lil-gui, .lil-gui.root, #gui, [class*="gui"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      /* In case the lib forces overflow hidden (scrollbar jump / misalignment) */
      html, body {
        overflow: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeGUI() {
    try {
      var nodes = document.querySelectorAll(".dg, .dg.ac, .lil-gui, .lil-gui.root, #gui");
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n && n.parentNode) n.parentNode.removeChild(n);
      }
    } catch (_) {}
  }

  function restoreOverflow() {
    try {
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    } catch (_) {}
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

    // Prefer an id-less canvas (fluid-three’s typical)
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if (!c) continue;
      if (c.id === "bg-fluid-canvas") return c;
      if (!c.id) return c;
    }
    return list[list.length - 1];
  }

  function hardenNewNodes() {
    // Prevent any one-frame layout shift and keep GUI removed even if re-created.
    var mo = new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var i = 0; i < added.length; i++) {
          var n = added[i];
          if (!n) continue;

          // If a canvas appears, force it to fixed immediately
          if (n.tagName === "CANVAS" && n.id !== "bg-fluid-canvas") {
            n.style.position = "fixed";
            n.style.inset = "0";
            n.style.pointerEvents = "none";
            n.style.zIndex = "0";
            n.style.display = "block";
          }

          // If GUI appears, remove it
          if (n.nodeType === 1) {
            // element
            if (
              (n.classList && (n.classList.contains("dg") || n.classList.contains("lil-gui"))) ||
              n.id === "gui"
            ) {
              try { n.parentNode && n.parentNode.removeChild(n); } catch (_) {}
            }
          }
        }
      }

      // Also re-sweep (covers nested GUI)
      removeGUI();
      restoreOverflow();
    });

    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { try { mo.disconnect(); } catch (_) {} }, 15000);
  }

  function waitAndHijack(maxFrames) {
    var frames = 0;
    function tick() {
      frames++;
      removeGUI();
      restoreOverflow();

      var c = pickFluidCanvas();
      if (c && setCanvasAsBackground(c)) return;

      if (frames < maxFrames) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function run() {
    if (!document.body) return requestAnimationFrame(run);

    injectHardCSS();
    removeGUI();
    restoreOverflow();
    hardenNewNodes();

    // Safety: remove old bg canvas if left behind
    try {
      var old = document.getElementById("bg-fluid-canvas");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}

    // main.min.js is loaded by head.html, so just hijack
    waitAndHijack(240);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
