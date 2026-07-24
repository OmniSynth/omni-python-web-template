import { AUTH_PRISM_FRAG, AUTH_PRISM_VERT } from "./auth-prism-shaders";
import { resizePrismCanvas, startPrismRuntime } from "./mount-auth-prism-runtime";
import { applyPrismPerfTier, type PrismQuality, type PrismRuntimeMode, resolvePrismQuality } from "./prism-quality";

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
  /** 运行时模式变化：static 定格；css 卸掉 WebGL。 */
  onModeChange?: (mode: PrismRuntimeMode) => void;
};

type PrismVisualOptions = {
  height: number;
  baseWidth: number;
  scale: number;
  timeScale: number;
  glow: number;
  bloom: number;
  noise: number;
  hueShift: number;
  colorFrequency: number;
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
  const bindProgram = gl.useProgram.bind(gl);
  bindProgram(program);
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

function setStaticUniforms(handles: PrismHandles, options: PrismVisualOptions, quality: PrismQuality): void {
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

function createPrismHandles(container: HTMLElement): PrismHandles {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    display: "block",
  });
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error("WebGL 不可用");
  const program = createProgram(gl);
  activateGlProgram(gl, program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  bindFullscreenTriangle(gl, program);
  container.appendChild(canvas);
  return {
    gl,
    program,
    canvas,
    locs: uniformLocations(gl, program),
    resolution: new Float32Array(2),
    offsetPx: new Float32Array(2),
    rot: new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  };
}

/** 在容器内挂载棱镜 WebGL 动画；返回卸载函数。失败时抛错由调用方回退。 */
export function mountAuthPrism(container: HTMLElement, options: AuthPrismOptions = {}): () => void {
  const quality = resolvePrismQuality();
  const clearPerfTier = applyPrismPerfTier(quality.perfTier);
  const resolved: PrismVisualOptions = {
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
  const handles = createPrismHandles(container);
  activateGlProgram(handles.gl, handles.program);
  setStaticUniforms(handles, resolved, quality);
  resizePrismCanvas(container, handles, resolved.scale, quality);
  return startPrismRuntime({
    container,
    handles,
    resolved: { scale: resolved.scale, noise: resolved.noise },
    initialQuality: quality,
    clearPerfTier,
    onModeChange: options.onModeChange,
  });
}
