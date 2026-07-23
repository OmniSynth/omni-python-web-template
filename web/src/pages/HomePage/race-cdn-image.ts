/** 首页截图 CDN：一次性探测 JSDMirror / jsDelivr 延迟，全站图片共用胜出源。 */

const HOME_IMAGE_CDNS = [
  "https://cdn.jsdmirror.com/gh/OmniSynth/omni-python-web-template@main/docs/images",
  "https://cdn.jsdelivr.net/gh/OmniSynth/omni-python-web-template@main/docs/images",
] as const;

/** 仅用于测延迟，探测后取消正文，不占完整静态流量。 */
const PROBE_FILE = "login.png";
const SESSION_KEY = "omni-home-image-cdn";
const PROBE_TIMEOUT_MS = 4000;

type HomeImageCdn = (typeof HOME_IMAGE_CDNS)[number];

let winnerBase: HomeImageCdn | null = null;
let probePromise: Promise<HomeImageCdn> | null = null;

export function homeImageLocalFallback(file: string): string {
  return `/images/${file}`;
}

function isHomeImageCdn(value: string): value is HomeImageCdn {
  return (HOME_IMAGE_CDNS as readonly string[]).includes(value);
}

function readSessionWinner(): HomeImageCdn | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored && isHomeImageCdn(stored)) return stored;
  } catch {
    // sessionStorage 不可用时忽略
  }
  return null;
}

function writeSessionWinner(base: HomeImageCdn): void {
  try {
    sessionStorage.setItem(SESSION_KEY, base);
  } catch {
    // 忽略配额/隐私模式写入失败
  }
}

/** 若已选定 CDN，同步返回图片 URL；否则 null。 */
export function peekRacedHomeImageUrl(file: string): string | undefined {
  if (!winnerBase) {
    winnerBase = readSessionWinner();
  }
  return winnerBase ? `${winnerBase}/${file}` : undefined;
}

/** 解析图片最终 URL：共用一次延迟探测结果，不再按图双拉。 */
export async function raceHomeImageUrl(file: string): Promise<string> {
  const base = await resolveHomeImageCdnBase();
  return `${base}/${file}`;
}

async function resolveHomeImageCdnBase(): Promise<HomeImageCdn> {
  if (winnerBase) return winnerBase;

  const fromSession = readSessionWinner();
  if (fromSession) {
    winnerBase = fromSession;
    return fromSession;
  }

  if (!probePromise) {
    probePromise = probeLowestLatencyCdn()
      .then((base) => {
        winnerBase = base;
        writeSessionWinner(base);
        return base;
      })
      .catch((error: unknown) => {
        probePromise = null;
        throw error;
      });
  }

  return probePromise;
}

/** 并行探测各 CDN 首包延迟，选用最低者；败方立即中止，不下载完整图。 */
async function probeLowestLatencyCdn(): Promise<HomeImageCdn> {
  const controllers = HOME_IMAGE_CDNS.map(() => new AbortController());

  const probes = HOME_IMAGE_CDNS.map(async (base, index) => {
    const controller = controllers[index];
    if (!controller) {
      throw new Error("CDN 探测控制器缺失");
    }
    const latencyMs = await measureCdnLatency(base, controller.signal);
    return { base, latencyMs };
  });

  const results = await Promise.allSettled(probes);
  const ok = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));

  for (const controller of controllers) {
    controller.abort();
  }

  if (ok.length === 0) {
    throw new Error("全部 CDN 探测失败");
  }

  ok.sort((a, b) => a.latencyMs - b.latencyMs);
  const winner = ok[0];
  if (!winner) {
    throw new Error("全部 CDN 探测失败");
  }
  return winner.base;
}

async function measureCdnLatency(base: HomeImageCdn, signal: AbortSignal): Promise<number> {
  const url = `${base}/${PROBE_FILE}`;
  const started = performance.now();
  const timeout = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeout]);

  try {
    const head = await fetch(url, {
      method: "HEAD",
      mode: "cors",
      cache: "no-store",
      signal: combined,
    });
    if (head.ok) {
      return performance.now() - started;
    }
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    // HEAD 不支持时回退 GET，读到响应头后取消正文
  }

  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
    signal: combined,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const latencyMs = performance.now() - started;
  await response.body?.cancel();
  return latencyMs;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
