// assets/bg-fluid.js
// Layer: fluid(z0) < pattern(z1) < content(z2)
// Safari-safe: RGBA8/UNSIGNED_BYTE only. If WebGL pipeline fails -> 2D fallback.
(function () {
  "use strict";

  const ID = "bg-fluid-canvas";
  const REDUCE =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

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
      zIndex: "0",
      pointerEvents: "none",
      display: "block",
    });

    (document.body || document.documentElement).prepend(c);
    return c;
  }

  function resizeCanvas(canvas, dprCap = 2) {
    const dpr = Math.max(1, Math.min(dprCap, window.devicePixelRatio || 1));
    const w = Math.max(2, Math.floor(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.floor(canvas.clientHeight * dpr));
    const changed = canvas.width !== w || canvas.height !== h;
    if (changed) {
      canvas.width = w;
      canvas.height = h;
    }
    return changed;
  }

  // Drive optional mask vars for pattern (you can keep or ignore)
  function setMaskVars(px01, py01, tSec) {
    const root = document.documentElement;
    const cx = px01 * 100;
    const cy = (1 - py01) * 100;

    // smaller drift so it doesn't fly off-screen
    const o1x = Math.sin(tSec * 0.8) * 6.0;
    const o1y = Math.cos(tSec * 0.9) * 4.5;
    const o2x = Math.sin(tSec * 1.1 + 1.7) * 8.0;
    const o2y = Math.cos(tSec * 1.0 + 2.2) * 6.0;

    const clampPct = (v) => Math.max(0, Math.min(100, v));

    root.style.setProperty("--bgx1", clampPct(cx + o1x).toFixed(2) + "%");
    root.style.setProperty("--bgy1", clampPct(cy + o1y).toFixed(2) + "%");
    root.style.setProperty("--bgx2", clampPct(cx + o2x).toFixed(2) + "%");
    root.style.setProperty("--bgy2", clampPct(cy + o2y).toFixed(2) + "%");
    root.style.setProperty("--bgx3", clampPct(cx - o2x * 0.7).toFixed(2) + "%");
    root.style.setProperty("--bgy3", clampPct(cy - o2y * 0.7).toFixed(2) + "%");
  }

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
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;

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

  // -------------------------
  // 2D fallback (always works)
  // -------------------------
  function run2D(canvas) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let last = performance.now();
    let t = 0;

    let fx = pointer.x,
      fy = pointer.y,
      vx = 0,
      vy = 0;

    function tick(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      t += dt;

      resizeCanvas(canvas, 2);

      // autopilot if no pointer
      const tx = pointer.hasEverMoved ? pointer.x : 0.52 + Math.sin(t * 0.15) * 0.06;
      const ty = pointer.hasEverMoved ? pointer.y : 0.48 + Math.cos(t * 0.13) * 0.06;

      const ax = (tx - fx) * 10.0;
      const ay = (ty - fy) * 10.0;
      vx = (vx + ax * dt) * 0.92;
      vy = (vy + ay * dt) * 0.92;
      fx = clamp01(fx + vx * dt);
      fy = clamp01(fy + vy * dt);

      setMaskVars(fx, fy, t);

      const w = canvas.width,
        h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const mx = fx * w,
        my = fy * h;
      const R0 = Math.min(w, h) * 0.30;
      const R1 = R0 * 0.85;
      const R2 = R0 * 0.70;

      const b1x = mx + Math.sin(t * 0.8) * R0 * 0.25;
      const b1y = my + Math.cos(t * 0.9) * R0 * 0.22;
      const b2x = mx + Math.sin(t * 1.1 + 1.7) * R0 * 0.35;
      const b2y = my + Math.cos(t * 1.0 + 2.2) * R0 * 0.28;
      const b3x = mx - Math.sin(t * 1.1 + 1.7) * R0 * 0.25;
      const b3y = my - Math.cos(t * 1.0 + 2.2) * R0 * 0.20;

      function radial(cx, cy, r, a0, a1) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0.0, `rgba(253,208,0,${a0})`); // #FDD000
        g.addColorStop(0.6, `rgba(253,208,0,${a1})`);
        g.addColorStop(1.0, `rgba(253,208,0,0)`);
        return g;
      }

      // stronger than before so it's unmistakable under the pattern holes
      ctx.fillStyle = radial(b1x, b1y, R0, 0.45, 0.22);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = radial(b2x, b2y, R1, 0.32, 0.16);
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = radial(b3x, b3y, R2, 0.24, 0.12);
      ctx.fillRect(0, 0, w, h);

      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // -------------------------
  // WebGL2 RGBA8 fluid-lite
  // -------------------------
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
        d = 1.0 - exp(-d * 1.25);

        vec3 base = vec3(0.992, 0.816, 0.0); // #FDD000
        vec3 warm = vec3(1.0, 0.72, 0.05);
        float t = clamp((d.r + d.g + d.b) / 3.0, 0.0, 1.0);

        vec3 col = mix(base, warm, smoothstep(0.15, 0.95, t)) * t;

        // strong alpha so it's unmistakable; reduce later if needed
        float alpha = clamp(t * 1.0, 0.0, 1.0);
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

    // Quad
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

    // RGBA8 only
    function createTex(w, h, linear) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      return t;
    }

    function createFBO(tex) {
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      return f;
    }

    function fboComplete(fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      const s = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      return s === gl.FRAMEBUFFER_COMPLETE;
    }

    function createDoubleFBO(w, h, linear) {
      const t1 = createTex(w, h, linear);
      const t2 = createTex(w, h, linear);
      const f1 = createFBO(t1);
      const f2 = createFBO(t2);
      if (!fboComplete(f1) || !fboComplete(f2)) return null;
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

    const SIM_SCALE = 0.45;
    const PRESSURE_ITERS = 14;

    let simW = 2,
      simH = 2;
    let velocity = null,
      dye = null,
      pressure = null,
      divergence = null;

    function initTargets() {
      const w = Math.max(64, Math.floor(canvas.width * SIM_SCALE));
      const h = Math.max(64, Math.floor(canvas.height * SIM_SCALE));
      if (w === simW && h === simH && velocity && dye) return true;

      simW = w;
      simH = h;

      velocity = createDoubleFBO(simW, simH, true);
      dye = createDoubleFBO(simW, simH, true);
      pressure = createDoubleFBO(simW, simH, false);
      if (!velocity || !dye || !pressure) return false;

      const divTex = createTex(simW, simH, false);
      const divFbo = createFBO(divTex);
      if (!fboComplete(divFbo)) return false;
      divergence = { tex: divTex, fbo: divFbo };

      // clear all
      [velocity.read.fbo, velocity.write.fbo, dye.read.fbo, dye.write.fbo, pressure.read.fbo, pressure.write.fbo, divergence.fbo].forEach(
        (f) => {
          gl.bindFramebuffer(gl.FRAMEBUFFER, f);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      );

      return true;
    }

    function drawTo(fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function splat(x, y, fx, fy, radiusMul) {
      const col = [0.992, 0.816, 0.0]; // #FDD000

      // dye
      bindQuad(pSpl);
      setTex(pSpl, "uTarget", dye.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uPoint"), x, y);
      gl.uniform1f(gl.getUniformLocation(pSpl, "uRadius"), 0.0040 * radiusMul);
      gl.uniform3f(gl.getUniformLocation(pSpl, "uColor"), col[0], col[1], col[2]);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uForce"), 0.0, 0.0);
      gl.uniform1i(gl.getUniformLocation(pSpl, "uMode"), 0);
      drawTo(dye.write.fbo);
      dye.swap();

      // velocity
      bindQuad(pSpl);
      setTex(pSpl, "uTarget", velocity.read.tex, 0);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uPoint"), x, y);
      gl.uniform1f(gl.getUniformLocation(pSpl, "uRadius"), 0.0050 * radiusMul);
      gl.uniform3f(gl.getUniformLocation(pSpl, "uColor"), 0.0, 0.0, 0.0);
      gl.uniform2f(gl.getUniformLocation(pSpl, "uForce"), fx * 450.0, fy * 450.0);
      gl.uniform1i(gl.getUniformLocation(pSpl, "uMode"), 1);
      drawTo(velocity.write.fbo);
      velocity.swap();
    }

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.016, (now - last) / 1000);
      last = now;
      const t = now * 0.001;

      resizeCanvas(canvas, 2);
      gl.viewport(0, 0, canvas.width, canvas.height);

      if (!initTargets()) return false;

      // autopilot if no pointer
      if (!pointer.hasEverMoved) {
        pointer.x = 0.52 + Math.sin(t * 0.15) * 0.06;
        pointer.y = 0.48 + Math.cos(t * 0.13) * 0.06;
      }

      setMaskVars(pointer.x, pointer.y, t);

      if (!REDUCE) {
        const texelX = 1 / simW;
        const texelY = 1 / simH;

        // ALWAYS inject a tiny amount so it never becomes fully transparent
        splat(pointer.x, 1 - pointer.y, 0.0, 0.0, 0.85);

        // plus extra on movement
        if (pointer.moved) {
          const fx = pointer.vx / Math.max(1e-4, dt);
          const fy = pointer.vy / Math.max(1e-4, dt);
          splat(pointer.x, 1 - pointer.y, fx, -fy, 1.0);
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
      return true;
    }

    requestAnimationFrame(frame);
    return true;
  }

  function boot() {
    const canvas = ensureCanvas();
    attachPointer(canvas);

    // set initial vars
    setMaskVars(pointer.x, pointer.y, performance.now() * 0.001);

    // Prefer WebGL2, but if it fails, fallback to 2D
    const ok = runWebGL2(canvas);
    if (!ok) run2D(canvas);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
