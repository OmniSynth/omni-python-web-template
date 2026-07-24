/** 棱镜 WebGL 自适应画质：静态探测 + 运行时降级档位。 */

export type PrismQuality = {
  /** 设备像素比上限 */
  dprCap: number;
  /** 相对 CSS 尺寸的内部渲染倍率（<1 后由浏览器放大） */
  renderScale: number;
  /** 光线步进上限（着色器内硬顶 100） */
  stepCount: number;
  /** 目标帧率 */
  maxFps: number;
  /** 写入 documentElement，供 CSS 减弱毛玻璃 */
  perfTier: "high" | "balanced" | "low";
};

/** 运行时降级结果：继续动 / 定格最后一帧 / 卸掉 WebGL 改 CSS。 */
export type PrismRuntimeMode = "animate" | "static" | "css";

export const QUALITY_ULTRA_LOW: PrismQuality = {
  dprCap: 1,
  renderScale: 0.32,
  stepCount: 22,
  maxFps: 16,
  perfTier: "low",
};

export const QUALITY_LOW: PrismQuality = {
  dprCap: 1,
  renderScale: 0.5,
  stepCount: 40,
  maxFps: 30,
  perfTier: "low",
};

export const QUALITY_BALANCED: PrismQuality = {
  dprCap: 1.25,
  renderScale: 0.75,
  stepCount: 64,
  maxFps: 45,
  perfTier: "balanced",
};

export const QUALITY_HIGH: PrismQuality = {
  dprCap: 1.5,
  renderScale: 0.9,
  stepCount: 80,
  maxFps: 60,
  perfTier: "high",
};

const CSS_FALLBACK_SESSION_KEY = "omni-prism-css-fallback";

function isWindowsPlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  if (/Win/i.test(platform)) return true;
  return /Windows/i.test(navigator.userAgent);
}

function deviceMemoryGb(): number | null {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof mem === "number" && mem > 0 ? mem : null;
}

/** 读取 WebGL 未屏蔽渲染器字符串（失败返回空）。 */
function probeGpuRenderer(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!(gl instanceof WebGLRenderingContext)) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "";
    return String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "");
  } catch {
    return "";
  }
}

/** 根据渲染器名判断是否更像独立显卡。 */
export function isLikelyDiscreteGpu(renderer: string): boolean {
  const r = renderer.toLowerCase();
  if (!r || /swiftshader|llvmpipe|softpipe|software|microsoft basic/i.test(r)) {
    return false;
  }
  if (/nvidia|geforce|rtx|gtx|quadro|tesla/i.test(r)) return true;
  if (/radeon\s+rx|radeon\s+pro|radeon\s+r[579]|radeon\s+hd\s+[5-9]/i.test(r)) return true;
  if (/arc\s+a\d{2,}/i.test(r)) return true;
  return false;
}

/** 本会话是否已判定应跳过 WebGL（多标签卡顿后记住）。 */
export function shouldSkipPrismWebGl(): boolean {
  try {
    return sessionStorage.getItem(CSS_FALLBACK_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberPrismCssFallback(): void {
  try {
    sessionStorage.setItem(CSS_FALLBACK_SESSION_KEY, "1");
  } catch {
    /* 隐私模式等忽略 */
  }
}

/** 按平台与硬件给出棱镜画质档位。 */
export function resolvePrismQuality(): PrismQuality {
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const memoryGb = deviceMemoryGb();
  if (saveData || (memoryGb !== null && memoryGb <= 2) || cores <= 2) {
    return { ...QUALITY_ULTRA_LOW };
  }

  const windows = isWindowsPlatform();
  const discrete = isLikelyDiscreteGpu(probeGpuRenderer());

  if (windows && !discrete) {
    return memoryGb !== null && memoryGb <= 4 ? { ...QUALITY_ULTRA_LOW } : { ...QUALITY_LOW };
  }

  if (cores <= 4 && !discrete) {
    return { ...QUALITY_LOW, renderScale: 0.6, stepCount: 48 };
  }
  if (cores <= 8) return { ...QUALITY_BALANCED };
  return { ...QUALITY_HIGH };
}

/**
 * 运行时降一级；已在最低动效档则返回 null（调用方应定格或改 CSS）。
 */
export function downgradePrismQuality(current: PrismQuality): PrismQuality | null {
  if (current.perfTier === "high") {
    return { ...QUALITY_BALANCED };
  }
  if (current.perfTier === "balanced") {
    return { ...QUALITY_LOW };
  }
  if (current.renderScale > QUALITY_ULTRA_LOW.renderScale + 0.02 || current.stepCount > QUALITY_ULTRA_LOW.stepCount) {
    return { ...QUALITY_ULTRA_LOW };
  }
  if (current.maxFps > 10) {
    return { ...QUALITY_ULTRA_LOW, maxFps: 10, renderScale: 0.25, stepCount: 16 };
  }
  return null;
}

export function applyPrismPerfTier(tier: PrismQuality["perfTier"]): () => void {
  const root = document.documentElement;
  root.dataset.prismPerf = tier;
  return () => {
    if (root.dataset.prismPerf === tier) {
      delete root.dataset.prismPerf;
    }
  };
}
