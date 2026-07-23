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
    const province = data.find((p) => p.label === selection.province) ?? findChildByName(data, selection.province);
    if (province) {
      const city = selection.city
        ? (province.children?.find((c) => c.label === selection.city) ??
          findChildByName(province.children, selection.city))
        : undefined;
      const district =
        city && selection.district
          ? (city.children?.find((d) => d.label === selection.district) ??
            findChildByName(city.children, selection.district))
          : undefined;
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

/** 去掉省市区等后缀，便于与逆地理结果模糊匹配。 */
export function normalizeAdminName(name: string): string {
  return name
    .trim()
    .replace(/特别行政区$/u, "")
    .replace(/壮族自治区$/u, "")
    .replace(/回族自治区$/u, "")
    .replace(/维吾尔自治区$/u, "")
    .replace(/自治区$/u, "")
    .replace(/(省|市|地区|盟|州)$/u, "")
    .replace(/(区|县|旗|市)$/u, "");
}

function adminNamesMatch(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const na = normalizeAdminName(left);
  const nb = normalizeAdminName(right);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function findChildByName(nodes: RegionNode[] | undefined, name: string): RegionNode | undefined {
  if (!nodes?.length || !name.trim()) return undefined;
  return nodes.find((n) => n.label === name) ?? nodes.find((n) => adminNamesMatch(n.label, name));
}

/** 按省市区名称（支持模糊）匹配行政区划选择。 */
export function findSelectionByAdminNames(
  data: RegionNode[],
  provinceName: string,
  cityName: string,
  districtName: string,
): RegionSelection | null {
  const province = findChildByName(data, provinceName);
  if (!province) return null;

  const cities = province.children ?? [];
  let city = findChildByName(cities, cityName);
  // 直辖市等：逆地理城市名常与省名相同，或落在唯一子级
  if (!city && adminNamesMatch(province.label, cityName)) {
    city = cities.find((c) => adminNamesMatch(c.label, province.label)) ?? cities[0];
  }
  if (!city && cities.length === 1) {
    city = cities[0];
  }
  if (!city) return null;

  const district = findChildByName(city.children, districtName);
  if (!district) return null;

  return {
    province: province.label,
    city: city.label,
    district: district.label,
    region: normalizeDistrictCode(district.value),
  };
}

/** 根据已选省市区名称查找区县码。 */
export function findDistrictCode(
  data: RegionNode[],
  provinceName: string,
  cityName: string,
  districtName: string,
): string | null {
  const matched = findSelectionByAdminNames(data, provinceName, cityName, districtName);
  return matched?.region || null;
}

export function formatRegionAddress(province: string, city: string, district: string): string {
  const parts = [province, city, district].filter(Boolean);
  return parts.join(" / ");
}
