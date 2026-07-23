import { Loader2, LocateFixed } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { RegionSelection } from "@/lib/china-region";
import { detectCurrentRegion } from "@/lib/detect-current-region";
import { errorMessage, showToastError } from "@/lib/form-feedback";

interface UseRegionLocateOptions {
  enabled: boolean;
  autoLocate: boolean;
  ready: boolean;
  disabled: boolean;
  value: RegionSelection;
  onChange: (selection: RegionSelection) => void;
}

/** 当前位置定位：省份旁图标 + 可选自动填充一次。 */
export function useRegionLocate({ enabled, autoLocate, ready, disabled, value, onChange }: UseRegionLocateOptions): {
  locating: boolean;
  locateAction: ReactNode;
} {
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  const autoLocateTried = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  async function locate(silent: boolean) {
    if (disabled || locatingRef.current) return;
    locatingRef.current = true;
    setLocating(true);
    try {
      const selection = await detectCurrentRegion();
      onChangeRef.current({ ...selection });
    } catch (err) {
      if (!silent) {
        showToastError(errorMessage(err, "定位失败"));
      }
    } finally {
      locatingRef.current = false;
      setLocating(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: 地区数据就绪后仅自动定位一次
  useEffect(() => {
    if (!autoLocate || !enabled || !ready || autoLocateTried.current) return;
    const current = valueRef.current;
    if (current.province || current.city || current.district || current.region) {
      autoLocateTried.current = true;
      return;
    }
    autoLocateTried.current = true;
    void locate(true);
  }, [autoLocate, enabled, ready]);

  return {
    locating,
    locateAction: enabled ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-primary"
        disabled={disabled || locating}
        title={locating ? "定位中…" : "IP 定位填写省市区"}
        aria-label={locating ? "定位中" : "IP 定位填写省市区"}
        onClick={() => void locate(false)}
      >
        {locating ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="h-4 w-4" aria-hidden />
        )}
      </Button>
    ) : null,
  };
}
