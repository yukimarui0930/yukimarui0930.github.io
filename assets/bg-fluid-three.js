// assets/bg-fluid-three.js
// Force fluid-three canvas to be the bottom background layer
// by moving it into a dedicated fixed root with z-index:0!important.

(function () {
  "use strict";

  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (_) {}

  function ensureBgRoot() {
    var root = document.getElementById("bg-fluid-root");
    if (root) return root;

    root = document.createElement("div");
    root.id = "bg-fluid-root";
    root.setAttribute("aria-hidden", "true");

    // Fixed full-viewport, bottom layer (IMPORTANT)
    var st = root.style;
    st.setProperty("position", "fixed", "important");
    st.setProperty("inset", "0", "important");
    st.setProperty("left", "0", "important");
    st.setProperty("top", "0", "important");
    st.setProperty("width", "100vw", "important");
    st.setProperty("height", "100vh", "important");
    st.setProperty("pointer-events", "none", "important");
    st.setProperty("z-index", "0", "important");
    st.setProperty("overflow", "hidden", "important");

    // Put it as the first child of body so it stays under everything
    document.body.insertBefore(root, document.body.firstChild);
    return root;
  }

  function hardHideGUI() {
    // Hide/remove both dat.GUI and lil-gui variants
    if (!document.getElementById("bg-fluid-no-gui")) {
      var style = document.createElement("style");
      style.id = "bg-fluid-no-gui";
      style.textContent = `
        .dg, .dg.ac, .lil-gui, .lil-gui.root, #gui { 
          display:none !important; visibility:hidden !important; pointer-events:none !important; 
        }
      `;
      document.head.appendChild(style);
    }
    try {
      var nodes = document.querySelectorAll(".dg, .dg.ac, .lil-gui, .lil-gui.root, #gui");
      for (var i = 0; i < nodes.length; i++) nodes[i].remove();
    } catch (_) {}
  }

  function isFluidCandidateCanvas(c) {
    if (!c || c.tagName !== "CANVAS") return false;
    // exclude your own id if already set
    if (c.id === "bg-fluid-canvas") return true;
    // exclude none (pattern is already removed in head.html)
    return true;
  }

  function pickNewestCanvas() {
    var list = document.getElementsByTagName("canvas");
    if (!list || !list.length) return null;
    // pick last canvas (fluid-three typically injects late)
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if (isFluidCandidateCanvas(c)) return c;
    }
    return null;
  }

  function mountCanvasToBg(c) {
    if (!c) return false;

    var root = ensureBgRoot();

    // Move canvas into the fixed background root (THIS is the key)
    if (c.parentNode !== root) {
      try { root.appendChild(c); } catch (_) {}
    }

    c.id = "bg-fluid-canvas";
    c.setAttribute("aria-hidden", "true");

    var st = c.style;
    // Force full size inside root
    st.setProperty("position", "absolute", "important");
    st.setProperty("inset", "0", "important");
    st.setProperty("width", "100%", "important");
    st.setProperty("height", "100%", "important");
    st.setProperty("pointer-events", "none", "important");
    // IMPORTANT: even if fluid-three sets z-index high, we clamp it
    st.setProperty("z-index", "0", "important");
    st.setProperty("display", "block", "important");

    return true;
  }

  function reinforceContentLayer() {
    // Make sure content is above (in case some lib styles mess with it)
    try {
      [".site-header", ".page-content", ".site-footer"].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (!el) return;
        el.style.setProperty("position", "relative", "important");
        el.style.setProperty("z-index", "2", "important");
      });
    } catch (_) {}
  }

  function run() {
    if (!document.body) return requestAnimationFrame(run);

    hardHideGUI();
    reinforceContentLayer();
    ensureBgRoot();

    // 1) if canvas already exists, mount immediately
    var c0 = pickNewestCanvas();
    if (c0) mountCanvasToBg(c0);

    // 2) keep watching: fluid-three may recreate / reinsert canvas
    var mo = new MutationObserver(function () {
      hardHideGUI();
      reinforceContentLayer();
      var c = pickNewestCanvas();
      if (c) mountCanvasToBg(c);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // stop later (optional)
    setTimeout(function () { try { mo.disconnect(); } catch (_) {} }, 20000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
