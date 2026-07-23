import { useEffect, useMemo, useState } from "react";
import { useSheetPortalContainer } from "@/components/ui/sheet";
import {
  loadChinaRegionData,
  normalizeDistrictCode,
  type RegionNode,
  type RegionSelection,
  resolveRegionSelectionCodes,
} from "@/lib/china-region";
import { RegionCascaderSelects } from "./region-cascader-selects";
import { useRegionLocate } from "./use-region-locate";

interface RegionCascaderProps {
  value: RegionSelection;
  onChange: (selection: RegionSelection) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  portalContainer?: HTMLElement | null;
  /** 显示「定位当前位置」按钮。 */
  enableLocate?: boolean;
  /** 挂载时若尚未选择地区则自动尝试定位一次。 */
  autoLocate?: boolean;
  /** 是否展示只读地区编码；默认展示。 */
  showRegionCode?: boolean;
}

export function RegionCascader({
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  portalContainer: portalContainerProp,
  enableLocate = false,
  autoLocate = false,
  showRegionCode = true,
}: RegionCascaderProps) {
  const sheetPortal = useSheetPortalContainer();
  const portalContainer = portalContainerProp ?? sheetPortal;
  const [regionData, setRegionData] = useState<RegionNode[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const { locateAction } = useRegionLocate({
    enabled: enableLocate,
    autoLocate,
    ready: regionData != null,
    disabled,
    value,
    onChange,
  });

  useEffect(() => {
    let active = true;
    loadChinaRegionData()
      .then((data) => {
        if (active) setRegionData(data);
      })
      .catch(() => {
        if (active) setLoadError("地区数据加载失败");
      });
    return () => {
      active = false;
    };
  }, []);

  const selectionCodes = useMemo(() => {
    if (!regionData) {
      return { provinceCode: "", cityCode: "", districtCode: "" };
    }
    return resolveRegionSelectionCodes(regionData, value);
  }, [regionData, value]);

  const provinceNode = useMemo(
    () => regionData?.find((p) => p.value === selectionCodes.provinceCode),
    [regionData, selectionCodes.provinceCode],
  );
  const cityNode = useMemo(
    () => provinceNode?.children?.find((c) => c.value === selectionCodes.cityCode),
    [provinceNode, selectionCodes.cityCode],
  );

  function handleProvinceChange(nextProvinceValue: string) {
    if (!regionData) return;
    const province = regionData.find((p) => p.value === nextProvinceValue);
    onChange({
      province: province?.label ?? "",
      city: "",
      district: "",
      region: "",
    });
  }

  function handleCityChange(nextCityValue: string) {
    if (!regionData) return;
    const city = provinceNode?.children?.find((c) => c.value === nextCityValue);
    onChange({
      province: provinceNode?.label ?? value.province,
      city: city?.label ?? "",
      district: "",
      region: "",
    });
  }

  function handleDistrictChange(nextDistrictValue: string) {
    if (!regionData) return;
    const district = cityNode?.children?.find((d) => d.value === nextDistrictValue);
    onChange({
      province: provinceNode?.label ?? value.province,
      city: cityNode?.label ?? value.city,
      district: district?.label ?? "",
      region: district ? normalizeDistrictCode(district.value) : "",
    });
  }

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (!regionData) {
    return <p className="text-sm text-muted-foreground">加载地区数据…</p>;
  }

  return (
    <RegionCascaderSelects
      key={value.region || "empty"}
      regionData={regionData}
      selectionCodes={selectionCodes}
      provinceNode={provinceNode}
      cityNode={cityNode}
      value={value}
      disabled={disabled}
      required={required}
      error={error}
      portalContainer={portalContainer}
      showRegionCode={showRegionCode}
      provinceAction={locateAction}
      onProvinceChange={handleProvinceChange}
      onCityChange={handleCityChange}
      onDistrictChange={handleDistrictChange}
    />
  );
}
