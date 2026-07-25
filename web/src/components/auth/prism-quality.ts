/** 棱镜 WebGL 自适应画质：缓解 Windows 核显掉帧；独显可走高档。 */

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

const QUALITY_LOW: PrismQuality = {
  dprCap: 1,
  renderScale: 0.5,
  stepCount: 40,
  maxFps: 30,
  perfTier: "low",
};

/** Windows 核显：进一步降分辨率/步进/帧率，避免 GPU 占满导致鼠标指针飞跳。 */
const QUALITY_WINDOWS_IGPU: PrismQuality = {
  dprCap: 1,
  renderScale: 0.32,
  stepCount: 20,
  maxFps: 18,
  perfTier: "low",
};

const QUALITY_BALANCED: PrismQuality = {
  dprCap: 1.25,
  renderScale: 0.75,
  stepCount: 64,
  maxFps: 45,
  perfTier: "balanced",
};

const QUALITY_HIGH: PrismQuality = {
  dprCap: 1.5,
  renderScale: 0.9,
  stepCount: 80,
  maxFps: 60,
  perfTier: "high",
};

function isWindowsPlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  if (/Win/i.test(platform)) return true;
  return /Windows/i.test(navigator.userAgent);
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

/** 按平台与硬件给出棱镜画质档位。 */
export function resolvePrismQuality(): PrismQuality {
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  if (saveData) return { ...QUALITY_LOW, renderScale: 0.5 };

  const windows = isWindowsPlatform();
  const discrete = isLikelyDiscreteGpu(probeGpuRenderer());

  if (windows && !discrete) return QUALITY_WINDOWS_IGPU;
  if (cores <= 4 && !discrete) return { ...QUALITY_LOW, renderScale: 0.6, stepCount: 48 };
  if (cores <= 8) return QUALITY_BALANCED;
  return QUALITY_HIGH;
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
