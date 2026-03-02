// assets/bg-fluid-three.js
// Put mnmxmx/fluid-three as the *bottom* background layer (z0)
// Strategy:
// 1) Load fluid-three dist bundle (it creates a <canvas> by itself)
// 2) After it appears, hijack that canvas -> id="bg-fluid-canvas" + fixed full-screen styles
// 3) Keep your existing stack: fluid(z0) < pattern(z1) < content(z2)
//
// Refs:
// - fluid-three repo/dist: https://github.com/mnmxmx/fluid-three (MIT)
// - jsDelivr GitHub endpoint: https://cdn.jsdelivr.net/gh/user/repo@version/file

(function () {
  "use strict";

  // Respect reduced-motion
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (_) {}

  var FLUID_THREE_SRC =
    "https://cdn.jsdelivr.net/gh/mnmxmx/fluid-three@master/dist/main.min.js";

  function setCanvasAsBackground(c) {
    if (!c) return false;

    // If fluid-three already injected styles, we override only what's necessary for your layer stack.
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

    // Optional: allow tuning opacity from CSS variables.
    // e.g. :root { --bg-fluid-opacity: 1; }
    try {
      var op = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-fluid-opacity")
        .trim();
      if (op) st.opacity = op;
    } catch (_) {}

    return true;
  }

  function findNewestCanvas() {
    // fluid-three creates a canvas with no id. We'll pick the last canvas in DOM.
    var list = document.getElementsByTagName("canvas");
    if (!list || !list.length) return null;

    // Prefer a canvas not already used by your other layers.
    for (var i = list.length - 1; i >= 0; i--) {
      var c = list[i];
      if (c && c.id !== "bg-pattern-canvas" && c.id !== "bg-fluid-canvas") return c;
    }
    return list[list.length - 1];
  }

  function waitForCanvasAndHijack(maxFrames) {
    var frames = 0;

    function tick() {
      frames++;
      var c = findNewestCanvas();
      if (c && setCanvasAsBackground(c)) return;

      if (frames < maxFrames) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  function loadScript(src, onload) {
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.crossOrigin = "anonymous";
    s.onload = onload;
    s.onerror = function (e) {
      console.error("[bg-fluid-three] failed to load:", src, e);
    };
    document.head.appendChild(s);
  }

  function run() {
    if (!document.body) return requestAnimationFrame(run);

    // Remove your previous fluid layer canvas if it exists (optional safety)
    try {
      var old = document.getElementById("bg-fluid-canvas");
      if (old && old.parentNode) old.parentNode.removeChild(old);
    } catch (_) {}

    // Ensure content is above (z2). bg-pattern.js also enforces, but keep it safe.
    try {
      [".site-header", ".page-content", ".site-footer"].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) {
          if (!el.style.position) el.style.position = "relative";
          el.style.zIndex = "2";
        }
      });
    } catch (_) {}

    loadScript(FLUID_THREE_SRC, function () {
      // fluid-three injects canvas immediately; we wait a few frames just in case
      waitForCanvasAndHijack(120);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
