import { useEffect, useState } from "react";

/** 筛选栅格断点：< lg 手机；lg–1535 四列（12–14 寸）；≥1536 六列（14 寸以上大屏）。 */
const MOBILE_QUERY = "(max-width: 1023px)";
const SIX_COL_QUERY = "(min-width: 1536px)";

export interface FilterGridConfig {
  isMobile: boolean;
  /** 单行最大栅格数。 */
  maxColsPerRow: number;
}

function resolveFilterGridConfig(): FilterGridConfig {
  if (typeof window === "undefined") {
    return { isMobile: false, maxColsPerRow: 4 };
  }
  if (window.matchMedia(MOBILE_QUERY).matches) {
    return { isMobile: true, maxColsPerRow: 1 };
  }
  if (window.matchMedia(SIX_COL_QUERY).matches) {
    return { isMobile: false, maxColsPerRow: 6 };
  }
  return { isMobile: false, maxColsPerRow: 4 };
}

/** 监听视口，返回筛选区单行栅格上限。 */
export function useFilterGridConfig(): FilterGridConfig {
  const [config, setConfig] = useState(resolveFilterGridConfig);

  useEffect(() => {
    const mobileMq = window.matchMedia(MOBILE_QUERY);
    const sixColMq = window.matchMedia(SIX_COL_QUERY);

    function sync() {
      setConfig(resolveFilterGridConfig());
    }

    mobileMq.addEventListener("change", sync);
    sixColMq.addEventListener("change", sync);
    return () => {
      mobileMq.removeEventListener("change", sync);
      sixColMq.removeEventListener("change", sync);
    };
  }, []);

  return config;
}
