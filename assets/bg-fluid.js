// assets/bg-fluid.js
// Layer order (final): fluid(z0) < pattern(z1) < content(z2)
// - Creates #bg-fluid-canvas as the bottom layer (z-index:0)
// - Drives bg-pattern mask variables: --bgx1/--bgy1 ... --bgx3/--bgy3
// - WebGL2 fluid simulation when available; 2D fallback otherwise
(function () {
  "use strict";

  const ID = "bg-fluid-canvas";
  const REDUCE =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- DOM ----------
  function ensureCanvas() {
    let c = document.getElementById(ID);
    if (c) return c;

    c = document.createElement("canvas");
    c.id = ID;
    c.setAttribute("aria-hidden", "true");

    Object.assign(c.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "0", // IMPORTANT: fluid is z0
      pointerEvents: "none",
      display: "block",
    });

    // Put it as early as possible in body (behind other fixed layers)
    (document.body || document.documentElement).prepend(c);
    return c;
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  // Update CSS vars for bg-pattern mask (top-left origin, percent strings)
  function setMaskVars(px01, py01, tSec) {
    const root = document.documentElement;

    const cx = px01 * 100;
    const cy = (1 - py01) * 100;

    // orbital drift (percent offsets)
    const o1x = Math.sin(tSec * 0.8) * 10.0;
    const o1y = Math.cos(tSec * 0.9) * 7.0;

    const o2x = Math.sin(tSec * 1.1 + 1.7) * 14.0;
    const o2y = Math.cos(tSec * 1.0 + 2.2) * 10.0;

    root.style.setProperty("--bgx1", (cx + o1x).toFixed(2) + "%");
    root.style.setProperty("--bgy1", (cy + o1y).toFixed(2) + "%");
    root.style.setProperty("--bgx2", (cx + o2x).toFixed(2) + "%");
    root.style.setProperty("--bgy2", (cy + o2y).toFixed(2) + "%");
    root.style.setProperty("--bgx3", (cx - o2x * 0.7).toFixed(2) + "%");
    root.style.setProperty("--bgy3", (cy - o2y * 0.7).toFixed(2) + "%");
  }

  function resizeCanvas(canvas, dprCap, scale) {
    const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1)) * scale;
    const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    const changed = canvas.width !== w || canvas.height !== h;
    if (changed) {
      canvas.width = w;
      canvas.height = h;
    }
    return changed;
  }

  // ---------- Pointer ----------
  const pointer = {
    x: 0.5,
    y: 0.5,
    px: 0.5,
    py: 0.5,
    vx: 0,
    vy: 0,
    moved: false,
    hasEverMoved: false,
  };

  function attachPointer(canvas) {
    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = clamp01(x);
      pointer.y = clamp01(y);
      pointer.vx = pointer.x - pointer.px;
      pointer.vy = pointer.y - pointer.py;
      pointer.moved = true;
      pointer.hasEverMoved = true;
    }
    window.addEventListener("pointermove", onMove, { passive: true });
  }

  // =========================
  // 2D fallback (always works)
  // =========================
  function run2D(canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let last = performance.now();
    let t = 0;

    // inertial follower so it feels “fluid”
    let fx = pointer.x,
      fy = pointer.y;
    let vx = 0,
      vy = 0;

    function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;

      resizeCanvas(canvas, 2, 1);

      // follow pointer with inertia (even if no move, drift a bit)
      const tx = pointer.hasEverMoved ? pointer.x : 0.52 + Math.sin(t * 0.15) * 0.06;
      const ty = pointer.hasEverMoved ? pointer.y : 0.48 + Math.cos(t * 0.13) * 0.06;

      const ax = (tx - fx) * 10.0;
      const ay = (ty - fy) * 10.0;
      vx = (vx + ax * dt) * 0.92;
      vy = (vy + ay * dt) * 0.92;
      fx = clamp01(fx + vx * dt);
      fy = clamp01(fy + vy * dt);

      // Drive bg-pattern mask variables
      setMaskVars(fx, fy, t);

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // chromeyellow #FDD000
      const mx = fx * w;
      const my = fy * h;

      // radii
      const R0 = Math.min(w, h) * 0.26;
      const R1 = R0 * 0.85;
      const R2 = R0 * 0.70;

      // blob centers (match the 3-point mask drift)
      const b1x = mx + Math.sin(t * 0.8) * R0 * 0.25;
      const b1y = my + Math.cos(t * 0.9) * R0 * 0.22;

      const b2x = mx + Math.sin(t * 1.1 + 1.7) * R0 * 0.35;
      const b2y = my + Math.cos(t * 1.0 + 2.2) * R0 * 0.28;

      const b3x = mx - Math.sin(t * 1.1 + 1.7) * R0 * 0.25;
      const b3y = my - Math.cos(t * 1.0 + 2.2) * R0 * 0.20;

      function radial(cx, cy, r, a0, a1) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0.0, `rgba(253,208,0,${a0})`);
        g.addColorStop(0.6, `rgba(253,208,0,${a1})`);
        g.addColorStop(1.0, `rgba(253,208,0,0)`);
        return g;
      }

      // keep subtle: pattern must remain the “main”
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = radial(b1x, b1y, R0, 0.22, 0.10);
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = radial(b2x, b2y, R1, 0.16, 0.08);
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = radial(b3x, b3y, R2, 0.12, 0.06);
      ctx.fillRect(0, 0, w, h);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // =========================
  // WebGL2 fluid (stable-ish)
  // =========================
  function runWebGL2(canvas) {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) return false;

    // If float color buffer unavailable, many shaders still run,
    // but we'll keep it conservative.
    const hasFloat = !!gl.getExtension("EXT_color_buffer_float");
    const hasLinearFloat = !!gl.getExtension("OES_texture_float_linear");

    function compile(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error("[bg-fluid] shader error:", gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }
    function link(vs, fs) {
      const p = gl.createProgram();
      gl.attachShader(p, vs);
      gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        console.error("[bg-fluid] program error:", gl.getProgramInfoLog(p));
        gl.deleteProgram(p);
        return null;
      }
      return p;
    }

    const VERT = `#version 300 es
      precision highp float;
      in vec2 aPos;
      out vec2 vUv;
      void main(){
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }`;

    const ADVECT = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 o;
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform vec2 uTexel;
      uniform float uDt;
      uniform float uDissipation;
      void main(){
        vec2 vel = texture(uVelocity, vUv).xy;
        vec2 coord = vUv - uDt * vel * uTexel;
        o = uDissipation * texture(uSource, coord);
      }`;

    const DIVERGENCE = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 o;
      uniform sampler2D uVelocity;
      uniform vec2 uTexel;
      void main(){
        float L = texture(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
        float T = texture(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
        float div = 0.5 * (R - L + T - B);
        o = vec4(div, 0.0, 0.0, 1.0);
      }`;

    const JACOBI = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 o;
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      uniform vec2 uTexel;
      void main(){
        float L = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
        float div = texture(uDivergence, vUv).x;
        float p = (L + R + B + T - div) * 0.25;
        o = vec4(p, 0.0, 0.0, 1.0);
      }`;

    const GRADIENT = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 o;
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      uniform vec2 uTexel;
      void main(){
        float L = texture(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture(uPressure, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture(uPressure, vUv + vec2(0.0, uTexel.y)).x;
        vec2 vel = texture(uVelocity, vUv).xy;
        vel -= 0.5 * vec2(R - L, T - B);
        o = vec4(vel, 0.0, 1.0);
      }`;

    const SPLAT = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 o;
      uniform sampler2D uTarget;
      uniform vec2 uPoint;
      uniform float uRadius;
      uniform vec3 uColor;
      uniform vec2 uForce;
      uniform int uMode; // 0:dye, 1:velocity
      void main(){
        vec4 base = texture(uTarget, vUv);
        vec2 p = vUv - uPoint;
        float d = dot(p, p);
        float a = exp(-d / uRadius);

        if (uMode == 0) {
          o = vec4(base.rgb + a * uColor, 1.0);
        } else {
          vec2 vel = base.xy + a * uForce;
          o = vec4(vel, 0.0, 1.0);
        }
      }`;

    const DISPLAY = `#version 300 es
      precision highp float;
      in vec2 vUv;
      out vec4 o;
      uniform sampler2D uDye;
      void main(){
        vec3 d = texture(uDye, vUv).rgb;
        d = 1.0 - exp(-d * 1.35);

        vec3 base = vec3(0.992, 0.816, 0.0); // #FDD000
        vec3 warm = vec3(1.0, 0.72, 0.05);

        float t = clamp((d.r + d.g + d.b) / 3.0, 0.0, 1.0);
        vec3 col = mix(base, warm, smoothstep(0.15, 0.95, t)) * t;

        // keep it behind the pattern; subtle
        float alpha = clamp(t * 0.45, 0.0, 0.45);
        o = vec4(col, alpha);
      }`;

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fsAdv = compile(gl.FRAGMENT_SHADER, ADVECT);
    const fsDiv = compile(gl.FRAGMENT_SHADER, DIVERGENCE);
    const fsJac = compile(gl.FRAGMENT_SHADER, JACOBI);
    const fsGra = compile(gl.FRAGMENT_SHADER, GRADIENT);
    const fsSpl = compile(gl.FRAGMENT_SHADER, SPLAT);
    const fsDis = compile(gl.FRAGMENT_SHADER, DISPLAY);
    if (!vs || !fsAdv || !fsDiv || !fsJac || !fsGra || !fsSpl || !fsDis) return false;

    const pAdv = link(vs, fsAdv);
    const pDiv = link(vs, fsDiv);
    const pJac = link(vs, fsJac);
    const pGra = link(vs, fsGra);
    const pSpl = link(vs, fsSpl);
    const pDis = link(vs, fsDis);
    if (!pAdv || !pDiv || !pJac || !pGra || !pSpl || !pDis) return false;

    // full-screen quad
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    function bindQuad(prog) {
      gl.useProgram(prog);
      const loc = gl.getAttribLocation(prog, "aPos");
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    function setTex(prog, name, tex, unit) {
      const loc = gl.getUniformLocation(prog, name);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(loc, unit);
    }

    function createTex(w, h, internalFormat, format, type, linear) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
      return t;
    }

    function createFBO(tex) {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return f;
    }

    function createDoubleFBO(w, h, internalFormat, format, type, linear) {
      const t1 = createTex(w, h, internalFormat, format, type, linear);
      const t2 = createTex(w, h, internalFormat, format, type, linear);
      const f1 = createFBO(t1);
      const f2 = createFBO(t2);
      return {
        read: { tex: t1, fbo: f1 },
        write: { tex: t2, fbo: f2 },
        swap() {
          const tmp = this.read;
          this.read = this.write;
          this.write = tmp;
        },
      };
    }

    // simulation params
    const SIM_SCALE = 0.45; // lower => faster/blurrier
    const PRESSURE_ITERS = 16;

    let simW = 2,
      simH = 2;
    let velocity, dye, pressure, divergence;

    // texture formats (conservative)
    const useFloat = hasFloat;
    const internal = useFloat ? gl.RGBA16F : gl.RGBA8;
    const type = useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    const linear = useFloat ? hasLinearFloat : true;

    function initTargets() {
      const w = Math.max(64, Math.floor(canvas.width * SIM_SCALE));
      const h = Math.max(64, Math.floor(canvas.height * SIM_SCALE));
      if (w === simW && h === simH && velocity && dye) return;

      simW = w;
      simH = h;

      velocity = createDoubleFBO(simW, simH, internal, gl.RGBA, type, linear);
      dye = createDoubleFBO(simW, simH, internal, gl.RGBA, type, linear);
      pressure = createDoubleFBO(simW, simH, internal, gl.RGBA, type, false);

      const divTex = createTex(simW, simH, internal, gl.RGBA, type, false);
      const divFbo = createFBO(divTex);
      divergence = { tex: divTex, fbo: divFbo };

      // clear
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.read.fbo);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.write.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindFramebuffer(gl.FRAMEBUFFER, dye.read.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.write.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindFramebuffer(gl.FRAMEBUFFER, divergence.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function drawTo(fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function splat(x, y, fx, fy) {
      // dye color #FDD000 (normalized)
      const col = [0.992, 0.816, 0.0];

      // dye
      bindQuad(pSpl);
      setTex(pSpl, "uTarget", dye.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uPoint"), x, y);
      gl.uniform1f(gl.getUniformLocation(pSpl, "uRadius"), 0.0028);
      gl.uniform3f(gl.getUniformLocation(pSpl, "uColor"), col[0], col[1], col[2]);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uForce"), 0.0, 0.0);
      gl.uniform1i(gl.getUniformLocation(pSpl, "uMode"), 0);
      drawTo(dye.write.fbo);
      dye.swap();

      // velocity
      bindQuad(pSpl);
      setTex(pSpl, "uTarget", velocity.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uPoint"), x, y);
      gl.uniform1f(gl.getUniformLocation(pSpl, "uRadius"), 0.0035);
      gl.uniform3f(gl.getUniformLocation(pSpl, "uColor"), 0.0, 0.0, 0.0);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uForce"), fx * 650.0, fy * 650.0);
      gl.uniform1i(gl.getUniformLocation(pSpl, "uMode"), 1);
      drawTo(velocity.write.fbo);
      velocity.swap();
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.016, (now - last) / 1000);
      last = now;

      // keep updating mask vars even if reduced motion is on (but we won't animate fluid)
      const t = now * 0.001;

      // if user never moved, gentle autopilot
      if (!pointer.hasEverMoved) {
        pointer.x = 0.52 + Math.sin(t * 0.15) * 0.06;
        pointer.y = 0.48 + Math.cos(t * 0.13) * 0.06;
      }

      setMaskVars(pointer.x, pointer.y, t);

      const resized = resizeCanvas(canvas, 2, 1);
      if (resized) gl.viewport(0, 0, canvas.width, canvas.height);
      initTargets();

      if (!REDUCE) {
        const texelX = 1 / simW;
        const texelY = 1 / simH;

        // splat when moved (or inject a tiny idle)
        const speed = Math.hypot(pointer.vx, pointer.vy);
        if (pointer.moved && speed > 0.00001) {
          const fx = pointer.vx / Math.max(1e-4, dt);
          const fy = pointer.vy / Math.max(1e-4, dt);
          splat(pointer.x, 1 - pointer.y, fx, -fy); // NOTE: GL y is bottom-origin
        } else if (!pointer.hasEverMoved) {
          // tiny idle “breathing”
          splat(
            pointer.x,
            1 - pointer.y,
            Math.sin(t * 0.7) * 0.2,
            Math.cos(t * 0.8) * 0.2
          );
        }
        pointer.moved = false;
        pointer.vx = 0;
        pointer.vy = 0;

        // advect velocity
        bindQuad(pAdv);
        setTex(pAdv, "uVelocity", velocity.read.tex, 0);
        setTex(pAdv, "uSource", velocity.read.tex, 1);
        gl.uniform2f(gl.getUniformLocation(pAdv, "uTexel"), texelX, texelY);
        gl.uniform1f(gl.getUniformLocation(pAdv, "uDt"), dt);
        gl.uniform1f(gl.getUniformLocation(pAdv, "uDissipation"), 0.985);
        drawTo(velocity.write.fbo);
        velocity.swap();

        // advect dye
        bindQuad(pAdv);
        setTex(pAdv, "uVelocity", velocity.read.tex, 0);
        setTex(pAdv, "uSource", dye.read.tex, 1);
        gl.uniform2f(gl.getUniformLocation(pAdv, "uTexel"), texelX, texelY);
        gl.uniform1f(gl.getUniformLocation(pAdv, "uDt"), dt);
        gl.uniform1f(gl.getUniformLocation(pAdv, "uDissipation"), 0.992);
        drawTo(dye.write.fbo);
        dye.swap();

        // divergence
        bindQuad(pDiv);
        setTex(pDiv, "uVelocity", velocity.read.tex, 0);
        gl.uniform2f(gl.getUniformLocation(pDiv, "uTexel"), texelX, texelY);
        drawTo(divergence.fbo);

        // clear pressure
        gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // pressure solve
        for (let i = 0; i < PRESSURE_ITERS; i++) {
          bindQuad(pJac);
          setTex(pJac, "uPressure", pressure.read.tex, 0);
          setTex(pJac, "uDivergence", divergence.tex, 1);
          gl.uniform2f(gl.getUniformLocation(pJac, "uTexel"), texelX, texelY);
          drawTo(pressure.write.fbo);
          pressure.swap();
        }

        // subtract gradient
        bindQuad(pGra);
        setTex(pGra, "uPressure", pressure.read.tex, 0);
        setTex(pGra, "uVelocity", velocity.read.tex, 1);
        gl.uniform2f(gl.getUniformLocation(pGra, "uTexel"), texelX, texelY);
        drawTo(velocity.write.fbo);
        velocity.swap();
      }

      // display
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      bindQuad(pDis);
      setTex(pDis, "uDye", dye.read.tex, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
    return true;
  }

  // ---------- Boot ----------
  function boot() {
    const canvas = ensureCanvas();
    attachPointer(canvas);

    // Initialize mask vars immediately (so pattern has sane defaults)
    setMaskVars(pointer.x, pointer.y, performance.now() * 0.001);

    // Prefer WebGL2; fallback to 2D
    const ok = runWebGL2(canvas);
    if (!ok) run2D(canvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
