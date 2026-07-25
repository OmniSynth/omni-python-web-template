import { AUTH_PRISM_FRAG, AUTH_PRISM_VERT } from "./auth-prism-shaders";
import { applyPrismPerfTier, type PrismQuality, resolvePrismQuality } from "./prism-quality";

export type AuthPrismOptions = {
  height?: number;
  baseWidth?: number;
  scale?: number;
  timeScale?: number;
  glow?: number;
  bloom?: number;
  noise?: number;
  hueShift?: number;
  colorFrequency?: number;
};

type PrismHandles = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  canvas: HTMLCanvasElement;
  locs: Record<string, WebGLUniformLocation | null>;
  resolution: Float32Array;
  offsetPx: Float32Array;
  rot: Float32Array;
};

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("无法创建着色器");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? "compile failed";
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, AUTH_PRISM_VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, AUTH_PRISM_FRAG);
  const program = gl.createProgram();
  if (!program) throw new Error("无法创建程序");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? "link failed";
    gl.deleteProgram(program);
    throw new Error(info);
  }
  return program;
}

function activateGlProgram(gl: WebGLRenderingContext, program: WebGLProgram): void {
  const bind = gl.useProgram;
  bind.call(gl, program);
}

function bindFullscreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram): void {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

function uniformLocations(gl: WebGLRenderingContext, program: WebGLProgram): PrismHandles["locs"] {
  const names = [
    "iResolution",
    "iTime",
    "uHeight",
    "uBaseHalf",
    "uRot",
    "uUseBaseWobble",
    "uGlow",
    "uOffsetPx",
    "uNoise",
    "uSaturation",
    "uScale",
    "uHueShift",
    "uColorFreq",
    "uBloom",
    "uCenterShift",
    "uInvBaseHalf",
    "uInvHeight",
    "uMinAxis",
    "uPxScale",
    "uTimeScale",
    "uStepCount",
  ] as const;
  const locs: PrismHandles["locs"] = {};
  for (const name of names) locs[name] = gl.getUniformLocation(program, name);
  return locs;
}

function setStaticUniforms(handles: PrismHandles, options: Required<AuthPrismOptions>, quality: PrismQuality): void {
  const { gl, locs } = handles;
  const height = Math.max(0.001, options.height);
  const baseHalf = 0.5 * Math.max(0.001, options.baseWidth);
  const scale = Math.max(0.001, options.scale);
  gl.uniform1f(locs.uHeight, height);
  gl.uniform1f(locs.uBaseHalf, baseHalf);
  gl.uniform1i(locs.uUseBaseWobble, 1);
  gl.uniformMatrix3fv(locs.uRot, false, handles.rot);
  gl.uniform1f(locs.uGlow, Math.max(0, options.glow));
  gl.uniform2fv(locs.uOffsetPx, handles.offsetPx);
  gl.uniform1f(locs.uNoise, Math.max(0, options.noise));
  gl.uniform1f(locs.uSaturation, 1.5);
  gl.uniform1f(locs.uScale, scale);
  gl.uniform1f(locs.uHueShift, options.hueShift);
  gl.uniform1f(locs.uColorFreq, Math.max(0, options.colorFrequency));
  gl.uniform1f(locs.uBloom, Math.max(0, options.bloom));
  gl.uniform1f(locs.uCenterShift, 0.25 * height);
  gl.uniform1f(locs.uInvBaseHalf, 1 / baseHalf);
  gl.uniform1f(locs.uInvHeight, 1 / height);
  gl.uniform1f(locs.uMinAxis, Math.min(baseHalf, height));
  gl.uniform1f(locs.uTimeScale, Math.max(0, options.timeScale));
  gl.uniform1f(locs.uStepCount, quality.stepCount);
}

function resizePrism(container: HTMLElement, handles: PrismHandles, scale: number, quality: PrismQuality): void {
  const { gl, canvas, locs, resolution } = handles;
  const dpr = Math.min(quality.dprCap, window.devicePixelRatio || 1);
  const width = Math.max(1, container.clientWidth);
  const height = Math.max(1, container.clientHeight);
  const pixelW = Math.max(1, Math.floor(width * dpr * quality.renderScale));
  const pixelH = Math.max(1, Math.floor(height * dpr * quality.renderScale));
  if (canvas.width === pixelW && canvas.height === pixelH) return;
  canvas.width = pixelW;
  canvas.height = pixelH;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  gl.viewport(0, 0, pixelW, pixelH);
  resolution[0] = pixelW;
  resolution[1] = pixelH;
  gl.uniform2fv(locs.iResolution, resolution);
  gl.uniform1f(locs.uPxScale, 1 / (0.1 * pixelH * scale));
}

/** 在容器内挂载棱镜 WebGL 动画；返回卸载函数。失败时抛错由调用方回退。 */
export function mountAuthPrism(container: HTMLElement, options: AuthPrismOptions = {}): () => void {
  const quality = resolvePrismQuality();
  const clearPerfTier = applyPrismPerfTier(quality.perfTier);
  const resolved: Required<AuthPrismOptions> = {
    height: options.height ?? 3.2,
    baseWidth: options.baseWidth ?? 5.2,
    scale: options.scale ?? 2.8,
    timeScale: options.timeScale ?? 0.75,
    glow: options.glow ?? 1.55,
    bloom: options.bloom ?? 1.45,
    noise: options.noise ?? (quality.perfTier === "low" ? 0 : 0.02),
    hueShift: options.hueShift ?? 0.05,
    colorFrequency: options.colorFrequency ?? 1.35,
  };

  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
  });
  const lowPower = quality.perfTier === "low";
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: lowPower ? "low-power" : "high-performance",
    preserveDrawingBuffer: false,
    desynchronized: true,
  });
  if (!gl) throw new Error("WebGL 不可用");

  const program = createProgram(gl);
  activateGlProgram(gl, program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  bindFullscreenTriangle(gl, program);

  const handles: PrismHandles = {
    gl,
    program,
    canvas,
    locs: uniformLocations(gl, program),
    resolution: new Float32Array(2),
    offsetPx: new Float32Array(2),
    rot: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  };
  setStaticUniforms(handles, resolved, quality);
  container.appendChild(canvas);
  resizePrism(container, handles, resolved.scale, quality);

  const startedAt = performance.now();
  const frameInterval = 1000 / quality.maxFps;
  let raf = 0;
  let timer = 0;
  let loopActive = false;
  let visible = true;
  let pageVisible = document.visibilityState === "visible";

  const stopLoop = () => {
    loopActive = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (timer) {
      window.clearTimeout(timer);
      timer = 0;
    }
  };

  const paint = (now: number) => {
    raf = 0;
    if (!visible || !pageVisible) {
      loopActive = false;
      return;
    }
    activateGlProgram(gl, program);
    gl.uniform1f(handles.locs.iTime, (now - startedAt) * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const spent = performance.now() - now;
    timer = window.setTimeout(kick, Math.max(0, frameInterval - spent));
  };

  const kick = () => {
    timer = 0;
    if (!visible || !pageVisible) {
      loopActive = false;
      return;
    }
    raf = requestAnimationFrame(paint);
  };

  const ensureRunning = () => {
    if (loopActive || !visible || !pageVisible) return;
    loopActive = true;
    kick();
  };

  ensureRunning();

  const ro = new ResizeObserver(() => {
    activateGlProgram(gl, program);
    resizePrism(container, handles, resolved.scale, quality);
  });
  ro.observe(container);

  const io = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.02);
      if (visible) ensureRunning();
      else stopLoop();
    },
    { threshold: [0, 0.02, 0.1] },
  );
  io.observe(container);

  const onVisibility = () => {
    pageVisible = document.visibilityState === "visible";
    if (pageVisible) ensureRunning();
    else stopLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    stopLoop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    clearPerfTier();
    if (canvas.parentElement === container) container.removeChild(canvas);
    gl.deleteProgram(program);
  };
}
