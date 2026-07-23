export interface RegionNode {
  value: string;
  label: string;
  children?: RegionNode[];
}

export interface RegionSelection {
  province: string;
  city: string;
  district: string;
  region: string;
}

let regionDataPromise: Promise<RegionNode[]> | null = null;

/** 按需加载全国省市区数据（独立 chunk）。 */
export function loadChinaRegionData(): Promise<RegionNode[]> {
  if (!regionDataPromise) {
    regionDataPromise = import("element-china-area-data").then((mod) => mod.regionData as RegionNode[]);
  }
  return regionDataPromise;
}

/** 将区县码规范为 6 位（用于地区编码）。 */
export function normalizeDistrictCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length < 2) return "";
  return digits.padEnd(6, "0").slice(0, 6);
}

/** 判断区县码与 region 是否对应（支持 6 位区县码与 9 位街道码）。 */
function districtMatchesRegion(districtValue: string, region: string): boolean {
  const dv = districtValue.replace(/\D/g, "");
  const rv = region.replace(/\D/g, "");
  if (!dv || !rv) return false;
  if (dv === rv) return true;
  if (dv.startsWith(rv)) return true;
  if (rv.length >= 6 && dv.slice(0, 6) === rv.slice(0, 6)) return true;
  return false;
}

/** 将 RegionSelection 解析为三级下拉所需的 value 编码。 */
export function resolveRegionSelectionCodes(
  data: RegionNode[],
  selection: RegionSelection,
): { provinceCode: string; cityCode: string; districtCode: string } {
  if (selection.region) {
    for (const province of data) {
      for (const city of province.children ?? []) {
        for (const district of city.children ?? []) {
          if (districtMatchesRegion(district.value, selection.region)) {
            return {
              provinceCode: province.value,
              cityCode: city.value,
              districtCode: district.value,
            };
          }
        }
      }
    }
  }
  if (selection.province) {
    const province = data.find((p) => p.label === selection.province);
    if (province) {
      const city = selection.city ? province.children?.find((c) => c.label === selection.city) : undefined;
      const district =
        city && selection.district ? city.children?.find((d) => d.label === selection.district) : undefined;
      return {
        provinceCode: province.value,
        cityCode: city?.value ?? "",
        districtCode: district?.value ?? "",
      };
    }
  }
  return { provinceCode: "", cityCode: "", districtCode: "" };
}

/** 根据区县码在树中反查省市区名称。 */
export function findSelectionByDistrictCode(data: RegionNode[], code: string): RegionSelection | null {
  const target = code.replace(/\D/g, "");
  if (target.length < 2) return null;
  for (const province of data) {
    for (const city of province.children ?? []) {
      for (const district of city.children ?? []) {
        if (districtMatchesRegion(district.value, code)) {
          return {
            province: province.label,
            city: city.label,
            district: district.label,
            region: normalizeDistrictCode(district.value) || code.replace(/\D/g, "").slice(0, 8),
          };
        }
      }
    }
  }
  return null;
}

/** 根据已选省市区名称查找区县码。 */
export function findDistrictCode(
  data: RegionNode[],
  provinceName: string,
  cityName: string,
  districtName: string,
): string | null {
  const province = data.find((p) => p.label === provinceName);
  const city = province?.children?.find((c) => c.label === cityName);
  const district = city?.children?.find((d) => d.label === districtName);
  if (!district) return null;
  return normalizeDistrictCode(district.value);
}

export function formatRegionAddress(province: string, city: string, district: string): string {
  const parts = [province, city, district].filter(Boolean);
  return parts.join(" / ");
}
