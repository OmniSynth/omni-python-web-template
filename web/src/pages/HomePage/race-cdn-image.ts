/** 首页截图 CDN：JSDMirror 与 jsDelivr 并行竞速，先成功者胜出。 */

const HOME_IMAGE_CDNS = [
  "https://cdn.jsdmirror.com/gh/OmniSynth/omni-python-web-template@main/docs/images",
  "https://cdn.jsdelivr.net/gh/OmniSynth/omni-python-web-template@main/docs/images",
] as const;

const winnerByFile = new Map<string, string>();

export function homeImageLocalFallback(file: string): string {
  return `/images/${file}`;
}

export function peekRacedHomeImageUrl(file: string): string | undefined {
  return winnerByFile.get(file);
}

/** 并行请求各 CDN，完整拉取成功最快的 URL（并写入会话级缓存）。 */
export async function raceHomeImageUrl(file: string, signal?: AbortSignal): Promise<string> {
  const cached = winnerByFile.get(file);
  if (cached) return cached;

  const urls = HOME_IMAGE_CDNS.map((base) => `${base}/${file}`);
  const winner = await raceFirstCompleteUrl(urls, signal);
  winnerByFile.set(file, winner);
  return winner;
}

function raceFirstCompleteUrl(urls: string[], signal?: AbortSignal): Promise<string> {
  if (urls.length === 0) {
    return Promise.reject(new Error("无可用 CDN 地址"));
  }

  const controllers = urls.map(() => new AbortController());
  const abortAll = () => {
    for (const controller of controllers) {
      controller.abort();
    }
  };

  if (signal?.aborted) {
    abortAll();
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }
  signal?.addEventListener("abort", abortAll, { once: true });

  return new Promise((resolve, reject) => {
    let remaining = urls.length;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", abortAll);
      fn();
    };

    urls.forEach((url, index) => {
      const controller = controllers[index];
      if (!controller) return;

      void fetch(url, { signal: controller.signal, mode: "cors", cache: "force-cache" })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          // 等到正文可读完再判定胜出，避免仅首包快、整图慢
          await response.blob();
          finish(() => {
            for (const [i, other] of controllers.entries()) {
              if (i !== index) other.abort();
            }
            resolve(url);
          });
        })
        .catch((error: unknown) => {
          if (settled) return;
          if (isAbortError(error) && signal?.aborted) {
            finish(() => reject(error));
            return;
          }
          remaining -= 1;
          if (remaining === 0) {
            finish(() => reject(new Error("全部 CDN 均失败")));
          }
        });
    });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
