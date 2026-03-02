// assets/bg-fluid-three.js
// Make fluid-three truly a background layer:
// - Create #bg-fluid-root (fixed, z-index:-1)
// - Move injected canvas into it and make canvas absolute
// - Remove/hide GUI repeatedly

(function () {
  "use strict";

  function ensureRoot() {
    var root = document.getElementById("bg-fluid-root");
    if (root) return root;

    root = document.createElement("div");
    root.id = "bg-fluid-root";
    root.setAttribute("aria-hidden", "true");

    var st = root.style;
    st.setProperty("position", "fixed", "important");
    st.setProperty("inset", "0", "important");
    st.setProperty("width", "100vw", "important");
    st.setProperty("height", "100vh", "important");
    st.setProperty("pointer-events", "none", "important");
    st.setProperty("z-index", "-1", "important");
    st.setProperty("overflow", "hidden", "important");

    document.body.insertBefore(root, document.body.firstChild);
    return root;
  }

  function killGUI() {
    // CSS
    if (!document.getElementById("bg-fluid-killgui")) {
      var style = document.createElement("style");
      style.id = "bg-fluid-killgui";
      style.textContent =
        ".dg,.dg.ac,.lil-gui,.lil-gui.root,#gui{display:none!important;visibility:hidden!important;pointer-events:none!important;}";
      document.head.appendChild(style);
    }
    // DOM remove
    try {
      document.querySelectorAll(".dg,.dg.ac,.lil-gui,.lil-gui.root,#gui").forEach(function (n) {
        n.remove();
      });
    } catch (_) {}
  }

  function pickBodyCanvas() {
    // fluid-three は body に canvas を入れるので、body直下から拾うのが一番確実
    var c = document.querySelector("body > canvas");
    if (c) return c;

    // fallback: newest canvas
    var list = document.getElementsByTagName("canvas");
    if (!list || !list.length) return null;
    return list[list.length - 1];
  }

  function mount(canvas) {
    if (!canvas) return false;

    var root = ensureRoot();

    if (canvas.parentNode !== root) root.appendChild(canvas);

    canvas.id = "bg-fluid-canvas";
    canvas.setAttribute("aria-hidden", "true");

    var st = canvas.style;
    st.setProperty("position", "absolute", "important");
    st.setProperty("inset", "0", "important");
    st.setProperty("width", "100%", "important");
    st.setProperty("height", "100%", "important");
    st.setProperty("pointer-events", "none", "important");
    st.setProperty("z-index", "-1", "important");
    st.setProperty("display", "block", "important");

    return true;
  }

  function run() {
    if (!document.body) return requestAnimationFrame(run);

    killGUI();
    ensureRoot();

    // Watch for late injection / re-creation
    var mo = new MutationObserver(function () {
      killGUI();
      mount(pickBodyCanvas());
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });

    // Try for a while on RAF too
    var frames = 0;
    (function tick() {
      frames++;
      killGUI();
      mount(pickBodyCanvas());
      if (frames < 240) requestAnimationFrame(tick);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
