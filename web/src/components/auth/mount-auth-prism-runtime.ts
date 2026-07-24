import {
  applyPrismPerfTier,
  downgradePrismQuality,
  type PrismQuality,
  type PrismRuntimeMode,
  rememberPrismCssFallback,
} from "./prism-quality";

export type PrismRuntimeHandles = {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  canvas: HTMLCanvasElement;
  locs: Record<string, WebGLUniformLocation | null>;
  resolution: Float32Array;
};

export type PrismRuntimeVisual = {
  scale: number;
  noise: number;
};

const SLOW_STREAK_DOWNGRADE = 6;
const OVERLOAD_GAP_RATIO = 2.4;
const SLOW_CPU_DRAW_MS = 10;

function activateGlProgram(gl: WebGLRenderingContext, program: WebGLProgram): void {
  // 勿直接写 gl.useProgram：Biome 会误判为 React Hook
  const bindProgram = gl.useProgram.bind(gl);
  bindProgram(program);
}

export function resizePrismCanvas(
  container: HTMLElement,
  handles: PrismRuntimeHandles,
  scale: number,
  quality: PrismQuality,
): void {
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

type RuntimeState = {
  quality: PrismQuality;
  frameInterval: number;
  frame: number;
  lastDrawAt: number;
  visible: boolean;
  pageVisible: boolean;
  slowStreak: number;
  mode: PrismRuntimeMode;
  disposed: boolean;
  clearPerfTier: () => void;
};

function createDrawLoop(
  state: RuntimeState,
  handles: PrismRuntimeHandles,
  paintFrame: (now: number) => void,
  handleOverload: () => void,
): void {
  const { gl, program } = handles;
  const draw = (now: number) => {
    if (state.disposed || state.mode !== "animate") return;
    state.frame = requestAnimationFrame(draw);
    if (!state.visible || !state.pageVisible) return;
    const gap = state.lastDrawAt > 0 ? now - state.lastDrawAt : state.frameInterval;
    if (now - state.lastDrawAt < state.frameInterval) return;
    state.lastDrawAt = now;
    const t0 = performance.now();
    paintFrame(now);
    const cpuMs = performance.now() - t0;
    const overloaded = gap > state.frameInterval * OVERLOAD_GAP_RATIO || cpuMs >= SLOW_CPU_DRAW_MS;
    if (overloaded) {
      state.slowStreak += 1;
      if (state.slowStreak >= SLOW_STREAK_DOWNGRADE) {
        state.slowStreak = 0;
        handleOverload();
      }
    } else {
      state.slowStreak = Math.max(0, state.slowStreak - 1);
    }
  };
  void gl;
  void program;
  state.frame = requestAnimationFrame(draw);
}

/** 启动限帧绘制、过载降级与可见性控制；返回 dispose。 */
export function startPrismRuntime(args: {
  container: HTMLElement;
  handles: PrismRuntimeHandles;
  resolved: PrismRuntimeVisual;
  initialQuality: PrismQuality;
  clearPerfTier: () => void;
  onModeChange?: (mode: PrismRuntimeMode) => void;
}): () => void {
  const { container, handles, resolved, onModeChange } = args;
  const { gl, program, canvas } = handles;
  const startedAt = performance.now();
  const state: RuntimeState = {
    quality: args.initialQuality,
    frameInterval: 1000 / args.initialQuality.maxFps,
    frame: 0,
    lastDrawAt: 0,
    visible: true,
    pageVisible: document.visibilityState === "visible",
    slowStreak: 0,
    mode: "animate",
    disposed: false,
    clearPerfTier: args.clearPerfTier,
  };

  const paintFrame = (now: number) => {
    activateGlProgram(gl, program);
    gl.uniform1f(handles.locs.iTime, (now - startedAt) * 0.001);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const applyQuality = (next: PrismQuality) => {
    state.quality = next;
    state.clearPerfTier();
    state.clearPerfTier = applyPrismPerfTier(next.perfTier);
    activateGlProgram(gl, program);
    gl.uniform1f(handles.locs.uStepCount, next.stepCount);
    gl.uniform1f(handles.locs.uNoise, next.perfTier === "low" ? 0 : resolved.noise);
    resizePrismCanvas(container, handles, resolved.scale, next);
    state.frameInterval = 1000 / next.maxFps;
  };

  const switchToCssFallback = () => {
    if (state.mode === "css" || state.disposed) return;
    state.mode = "css";
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    rememberPrismCssFallback();
    if (canvas.parentElement === container) container.removeChild(canvas);
    onModeChange?.("css");
  };

  const freezeStatic = () => {
    if (state.mode !== "animate" || state.disposed) return;
    state.mode = "static";
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    paintFrame(performance.now());
    onModeChange?.("static");
  };

  const handleOverload = () => {
    const next = downgradePrismQuality(state.quality);
    if (next) {
      applyQuality(next);
      return;
    }
    if (state.mode === "animate") {
      freezeStatic();
      return;
    }
    switchToCssFallback();
  };

  createDrawLoop(state, handles, paintFrame, handleOverload);

  const detach = attachPrismObservers({
    container,
    handles,
    resolvedScale: resolved.scale,
    state,
    paintFrame,
    switchToCssFallback,
  });

  return () => {
    state.disposed = true;
    cancelAnimationFrame(state.frame);
    detach();
    state.clearPerfTier();
    if (canvas.parentElement === container) container.removeChild(canvas);
    gl.deleteProgram(program);
  };
}

function attachPrismObservers(args: {
  container: HTMLElement;
  handles: PrismRuntimeHandles;
  resolvedScale: number;
  state: RuntimeState;
  paintFrame: (now: number) => void;
  switchToCssFallback: () => void;
}): () => void {
  const { container, handles, resolvedScale, state, paintFrame, switchToCssFallback } = args;
  const { gl, program } = handles;

  const ro = new ResizeObserver(() => {
    if (state.disposed || state.mode === "css") return;
    activateGlProgram(gl, program);
    resizePrismCanvas(container, handles, resolvedScale, state.quality);
    if (state.mode === "static") paintFrame(performance.now());
  });
  ro.observe(container);

  const io = new IntersectionObserver(
    (entries) => {
      state.visible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.02);
    },
    { threshold: [0, 0.02, 0.1] },
  );
  io.observe(container);

  const onVisibility = () => {
    state.pageVisible = document.visibilityState === "visible";
  };
  document.addEventListener("visibilitychange", onVisibility);

  const staticWatch = window.setInterval(() => {
    if (state.disposed || state.mode !== "static") return;
    let ticks = 0;
    const tStart = performance.now();
    const probe = () => {
      ticks += 1;
      if (ticks < 2) {
        requestAnimationFrame(probe);
        return;
      }
      if (performance.now() - tStart > 420) switchToCssFallback();
    };
    requestAnimationFrame(probe);
  }, 4000);

  return () => {
    window.clearInterval(staticWatch);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
