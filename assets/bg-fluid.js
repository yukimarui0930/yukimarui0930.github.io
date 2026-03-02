// assets/bg-fluid.js
// Bottom-most layer: fluid (z:-1) < glow (z:0) < pattern (z:1) < content (z:2)
// WebGL2 stable-fluids style (advection/divergence/pressure/splat).
// Theme: Chrome Yellow gradient based on #FDD000 (mouse-follow).
(function () {
  "use strict";

  const ID = "bg-fluid-canvas";
  const REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- DOM layer ----
  function ensureCanvas() {
    let c = document.getElementById(ID);
    if (c) return c;

    c = document.createElement("canvas");
    c.id = ID;
    Object.assign(c.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "-1",
      pointerEvents: "none",
      display: "block",
    });

    // Insert as early as possible so it's truly behind.
    (document.body || document.documentElement).prepend(c);
    return c;
  }

  if (REDUCE) {
    // Keep it static: nothing to do (canvas can exist but unused).
    ensureCanvas();
    return;
  }

  const canvas = ensureCanvas();
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });

  if (!gl) {
    // WebGL2 unavailable: silently no-op.
    return;
  }

  // ---- Helpers ----
  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      return true;
    }
    return false;
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      // Fail silently but keep console useful
      console.error("[bg-fluid] shader compile error:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function program(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error("[bg-fluid] program link error:", gl.getProgramInfoLog(p));
      gl.deleteProgram(p);
      return null;
    }
    return p;
  }

  function texFormat() {
    // Use RGBA16F if available, fallback to RGBA8
    const ext = gl.getExtension("EXT_color_buffer_float");
    const hf = gl.getExtension("OES_texture_float_linear");
    const linearFloat = !!hf;
    return { ext, linearFloat };
  }

  // ---- Shaders ----
  const VERT = `#version 300 es
    precision highp float;
    in vec2 aPos;
    out vec2 vUv;
    void main(){
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  // Advect a field by velocity
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

  // Adds dye and velocity around pointer ("splat")
  const SPLAT = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 o;
    uniform sampler2D uTarget;
    uniform vec2 uPoint;
    uniform float uRadius;
    uniform vec3 uColor;
    uniform vec2 uForce;
    uniform int uMode; // 0: dye, 1: velocity
    void main(){
      vec4 base = texture(uTarget, vUv);
      vec2 p = vUv - uPoint;
      float d = dot(p, p);
      float a = exp(-d / uRadius);

      if (uMode == 0) {
        // Dye: make it a gradient-y yellow (slightly warmer in center)
        vec3 col = uColor;
        o = vec4(base.rgb + a * col, 1.0);
      } else {
        // Velocity
        vec2 vel = base.xy + a * uForce;
        o = vec4(vel, 0.0, 1.0);
      }
    }`;

  const DISPLAY = `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 o;
    uniform sampler2D uDye;
    // Tone for #FDD000-ish with soft falloff
    void main(){
      vec3 d = texture(uDye, vUv).rgb;

      // Soft non-linear boost (keeps it "liquid light" rather than flat paint)
      d = 1.0 - exp(-d * 1.35);

      // Convert to chromeyellow family; treat dye as intensity
      // Base: #FDD000 ≈ (0.992, 0.816, 0.0)
      vec3 base = vec3(0.992, 0.816, 0.0);
      // Add slight warm highlight (tiny red) for gradient feel
      vec3 warm = vec3(1.0, 0.72, 0.05);

      float t = clamp((d.r + d.g + d.b) / 3.0, 0.0, 1.0);
      vec3 col = mix(base, warm, smoothstep(0.15, 0.95, t)) * t;

      // Important: keep alpha modest so your glow/pattern remain dominant
      float alpha = clamp(t * 0.55, 0.0, 0.55);
      o = vec4(col, alpha);
    }`;

  // ---- Build pipeline ----
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const psAdv = compile(gl.FRAGMENT_SHADER, ADVECT);
  const psDiv = compile(gl.FRAGMENT_SHADER, DIVERGENCE);
  const psJac = compile(gl.FRAGMENT_SHADER, JACOBI);
  const psGra = compile(gl.FRAGMENT_SHADER, GRADIENT);
  const psSpl = compile(gl.FRAGMENT_SHADER, SPLAT);
  const psDis = compile(gl.FRAGMENT_SHADER, DISPLAY);
  if (!vs || !psAdv || !psDiv || !psJac || !psGra || !psSpl || !psDis) return;

  const progAdv = program(vs, psAdv);
  const progDiv = program(vs, psDiv);
  const progJac = program(vs, psJac);
  const progGra = program(vs, psGra);
  const progSpl = program(vs, psSpl);
  const progDis = program(vs, psDis);
  if (!progAdv || !progDiv || !progJac || !progGra || !progSpl || !progDis) return;

  function bindQuad(p) {
    gl.useProgram(p);
    const loc = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
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
    const tex1 = createTex(w, h, internalFormat, format, type, linear);
    const tex2 = createTex(w, h, internalFormat, format, type, linear);
    const fbo1 = createFBO(tex1);
    const fbo2 = createFBO(tex2);
    return {
      read: { tex: tex1, fbo: fbo1 },
      write: { tex: tex2, fbo: fbo2 },
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
    };
  }

  const { ext, linearFloat } = texFormat();
  // Prefer float buffers when possible
  const useFloat = !!ext;
  const internal = useFloat ? gl.RGBA16F : gl.RGBA8;
  const type = useFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
  const linear = useFloat ? linearFloat : true;

  // Simulation resolution (tweak here)
  const SIM_SCALE = 0.45; // smaller => faster, blurrier
  const PRESSURE_ITERS = 16;

  let simW = 2, simH = 2;
  let velocity, dye, pressure, divergence;

  function initTargets() {
    const w = Math.max(64, Math.floor(canvas.width * SIM_SCALE));
    const h = Math.max(64, Math.floor(canvas.height * SIM_SCALE));
    if (w === simW && h === simH && velocity && dye) return;

    simW = w; simH = h;
    velocity = createDoubleFBO(simW, simH, internal, gl.RGBA, type, linear);
    dye      = createDoubleFBO(simW, simH, internal, gl.RGBA, type, linear);
    pressure = createDoubleFBO(simW, simH, internal, gl.RGBA, type, false);
    divergence = (() => {
      const t = createTex(simW, simH, internal, gl.RGBA, type, false);
      const f = createFBO(t);
      return { tex: t, fbo: f };
    })();

    // Clear all
    gl.bindFramebuffer(gl.FRAMEBUFFER, velocity.read.fbo);
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
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

  function setTex(p, name, tex, unit) {
    const loc = gl.getUniformLocation(p, name);
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  // ---- Interaction ----
  const pointer = { down: false, x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0 };
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1.0 - (e.clientY - rect.top) / rect.height;
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = Math.max(0, Math.min(1, x));
    pointer.y = Math.max(0, Math.min(1, y));
    pointer.vx = pointer.x - pointer.px;
    pointer.vy = pointer.y - pointer.py;
    pointer.down = true; // always react (hover)
  }
  window.addEventListener("pointermove", onMove, { passive: true });

  // ---- Steps ----
  function splat(pointX, pointY, forceX, forceY) {
    // Dye splat color: base #FDD000
    const col = [0.992, 0.816, 0.0];

    // 1) dye
    bindQuad(progSpl);
    setTex(progSpl, "uTarget", dye.read.tex, 0);
    gl.uniform2f(gl.getUniformLocation(progSpl, "uPoint"), pointX, pointY);
    gl.uniform1f(gl.getUniformLocation(progSpl, "uRadius"), 0.0028); // smaller => tighter
    gl.uniform3f(gl.getUniformLocation(progSpl, "uColor"), col[0], col[1], col[2]);
    gl.uniform2f(gl.getUniformLocation(progSpl, "uForce"), 0.0, 0.0);
    gl.uniform1i(gl.getUniformLocation(progSpl, "uMode"), 0);
    drawTo(dye.write.fbo);
    dye.swap();

    // 2) velocity
    bindQuad(progSpl);
    setTex(progSpl, "uTarget", velocity.read.tex, 0);
    gl.uniform2f(gl.getUniformLocation(progSpl, "uPoint"), pointX, pointY);
    gl.uniform1f(gl.getUniformLocation(progSpl, "uRadius"), 0.0035);
    gl.uniform3f(gl.getUniformLocation(progSpl, "uColor"), 0, 0, 0);
    // Force scale tuned for “liquid” feel
    gl.uniform2f(gl.getUniformLocation(progSpl, "uForce"), forceX * 650.0, forceY * 650.0);
    gl.uniform1i(gl.getUniformLocation(progSpl, "uMode"), 1);
    drawTo(velocity.write.fbo);
    velocity.swap();
  }

  let lastT = performance.now();
  function step() {
    const now = performance.now();
    const dt = Math.min(0.016, (now - lastT) / 1000);
    lastT = now;

    const resized = resize();
    if (resized) initTargets();
    else initTargets();

    const texelX = 1.0 / simW;
    const texelY = 1.0 / simH;

    // Add splat on movement (hover-follow)
    const speed = Math.hypot(pointer.vx, pointer.vy);
    if (pointer.down && speed > 0.00001) {
      // More speed => stronger injection, but clamp
      const fx = pointer.vx / dt;
      const fy = pointer.vy / dt;
      splat(pointer.x, pointer.y, fx, fy);
    }
    pointer.down = false;

    // Advect velocity
    bindQuad(progAdv);
    setTex(progAdv, "uVelocity", velocity.read.tex, 0);
    setTex(progAdv, "uSource", velocity.read.tex, 1);
    gl.uniform2f(gl.getUniformLocation(progAdv, "uTexel"), texelX, texelY);
    gl.uniform1f(gl.getUniformLocation(progAdv, "uDt"), dt);
    gl.uniform1f(gl.getUniformLocation(progAdv, "uDissipation"), 0.985);
    drawTo(velocity.write.fbo);
    velocity.swap();

    // Advect dye
    bindQuad(progAdv);
    setTex(progAdv, "uVelocity", velocity.read.tex, 0);
    setTex(progAdv, "uSource", dye.read.tex, 1);
    gl.uniform2f(gl.getUniformLocation(progAdv, "uTexel"), texelX, texelY);
    gl.uniform1f(gl.getUniformLocation(progAdv, "uDt"), dt);
    gl.uniform1f(gl.getUniformLocation(progAdv, "uDissipation"), 0.992);
    drawTo(dye.write.fbo);
    dye.swap();

    // Divergence
    bindQuad(progDiv);
    setTex(progDiv, "uVelocity", velocity.read.tex, 0);
    gl.uniform2f(gl.getUniformLocation(progDiv, "uTexel"), texelX, texelY);
    drawTo(divergence.fbo);

    // Clear pressure a bit (implicit dissipation)
    gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo);
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Jacobi iterations
    for (let i = 0; i < PRESSURE_ITERS; i++) {
      bindQuad(progJac);
      setTex(progJac, "uPressure", pressure.read.tex, 0);
      setTex(progJac, "uDivergence", divergence.tex, 1);
      gl.uniform2f(gl.getUniformLocation(progJac, "uTexel"), texelX, texelY);
      drawTo(pressure.write.fbo);
      pressure.swap();
    }

    // Subtract gradient
    bindQuad(progGra);
    setTex(progGra, "uPressure", pressure.read.tex, 0);
    setTex(progGra, "uVelocity", velocity.read.tex, 1);
    gl.uniform2f(gl.getUniformLocation(progGra, "uTexel"), texelX, texelY);
    drawTo(velocity.write.fbo);
    velocity.swap();

    // Display (to screen)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    bindQuad(progDis);
    setTex(progDis, "uDye", dye.read.tex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    requestAnimationFrame(step);
  }

  // First init + kick
  resize();
  initTargets();
  requestAnimationFrame(step);
})();
