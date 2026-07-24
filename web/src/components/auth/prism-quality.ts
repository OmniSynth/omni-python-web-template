/** 棱镜 WebGL 自适应画质：缓解 Windows 核显掉帧。 */

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

function isWindowsPlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  if (/Win/i.test(platform)) return true;
  return /Windows/i.test(navigator.userAgent);
}

/** 按平台与硬件给出棱镜画质档位。 */
export function resolvePrismQuality(): PrismQuality {
  const cores = navigator.hardwareConcurrency || 4;
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const windows = isWindowsPlatform();
  const lowEnd = saveData || cores <= 4;

  if (windows || lowEnd) {
    return {
      dprCap: 1,
      renderScale: windows ? 0.5 : 0.6,
      stepCount: windows ? 40 : 48,
      maxFps: 30,
      perfTier: "low",
    };
  }
  if (cores <= 8) {
    return {
      dprCap: 1.25,
      renderScale: 0.75,
      stepCount: 64,
      maxFps: 45,
      perfTier: "balanced",
    };
  }
  return {
    dprCap: 1.5,
    renderScale: 0.9,
    stepCount: 80,
    maxFps: 60,
    perfTier: "high",
  };
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
