/** 地区定位：优先中国大陆 IP（CORS 可用），备用国际 IP / 浏览器定位。 */

import {
  findSelectionByAdminNames,
  findSelectionByDistrictCode,
  loadChinaRegionData,
  type RegionNode,
  type RegionSelection,
} from "@/lib/china-region";

interface AdminNames {
  province: string;
  city: string;
  district: string;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
}

interface BigDataCloudAdmin {
  name?: string;
  adminLevel?: number;
}

interface BigDataCloudResponse {
  countryCode?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
  localityInfo?: {
    administrative?: BigDataCloudAdmin[];
  };
}

interface NetartIpResponse {
  country?: { code?: string; name?: string };
  subdivision?: string;
  city?: string;
  area?: string;
  geo_cn?: {
    division?: { full?: string[]; short?: string[] };
    division_code?: number;
  };
}

interface UapisIpResponse {
  region?: string;
  district?: string;
  city_code?: string;
}

interface IpWhoResponse {
  success?: boolean;
  country_code?: string;
  country?: string;
  region?: string;
  city?: string;
}

const FETCH_TIMEOUT_MS = 6_000;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`请求失败 (${response.status})`);
  }
  return (await response.json()) as T;
}

function isMainlandChina(country: string | undefined, countryCode: string | undefined): boolean {
  const code = (countryCode ?? "").trim().toUpperCase();
  if (code === "CN" || code === "CHN") return true;
  const name = (country ?? "").trim();
  return name === "中国" || name === "中华人民共和国" || name.includes("中国大陆");
}

function pickAdminNames(payload: BigDataCloudResponse): AdminNames {
  const admins = [...(payload.localityInfo?.administrative ?? [])]
    .filter((item): item is BigDataCloudAdmin & { name: string; adminLevel: number } => {
      return Boolean(item.name) && typeof item.adminLevel === "number";
    })
    .sort((a, b) => a.adminLevel - b.adminLevel);

  const byLevel = (level: number) => admins.find((item) => item.adminLevel === level)?.name ?? "";
  const province = payload.principalSubdivision || byLevel(4) || byLevel(3);
  const city = payload.city || byLevel(5) || byLevel(6) || province;
  const district = payload.locality || byLevel(6) || byLevel(7) || byLevel(8);

  return {
    province: province.trim(),
    city: city.trim(),
    district: district.trim(),
  };
}

function matchRegionOrThrow(data: RegionNode[], names: AdminNames): RegionSelection {
  const candidates: AdminNames[] = [names];
  if (!names.district && names.city) {
    candidates.push({ ...names, district: names.city });
  }
  for (const item of candidates) {
    if (!item.province || !item.district) continue;
    const matched = findSelectionByAdminNames(data, item.province, item.city || item.province, item.district);
    if (matched) return matched;
  }
  throw new Error(`未能匹配行政区划（${names.province}/${names.city}/${names.district}），请手动选择`);
}

/** 中国大陆 IP：ip.netart.cn（支持 CORS，精度到区）。 */
async function detectByNetartIp(data: RegionNode[]): Promise<RegionSelection> {
  const payload = await fetchJson<NetartIpResponse>("https://ip.netart.cn/");
  const countryCode = payload.country?.code;
  const countryName = payload.country?.name;
  if (!isMainlandChina(countryName, countryCode)) {
    throw new Error("当前 IP 不在中国大陆");
  }

  const code = payload.geo_cn?.division_code;
  if (code != null) {
    const byCode = findSelectionByDistrictCode(data, String(code).padStart(6, "0"));
    if (byCode) return byCode;
  }

  const full = payload.geo_cn?.division?.full;
  if (full && full.length >= 2) {
    const matched = findSelectionByAdminNames(data, full[0] ?? "", full[1] ?? full[0] ?? "", full[2] ?? full[1] ?? "");
    if (matched) return matched;
  }

  const short = payload.geo_cn?.division?.short;
  if (short && short.length >= 2) {
    const matched = findSelectionByAdminNames(
      data,
      short[0] ?? "",
      short[1] ?? short[0] ?? "",
      short[2] ?? short[1] ?? "",
    );
    if (matched) return matched;
  }

  return matchRegionOrThrow(data, {
    province: (payload.subdivision ?? "").trim(),
    city: (payload.city ?? "").trim(),
    district: (payload.area ?? "").trim(),
  });
}

/** 中国大陆 IP 备用：uapis（支持 CORS）。 */
async function detectByUapisIp(data: RegionNode[]): Promise<RegionSelection> {
  const payload = await fetchJson<UapisIpResponse>("https://uapis.cn/api/v1/network/myip?source=commercial");
  if (payload.city_code) {
    const byCode = findSelectionByDistrictCode(data, payload.city_code);
    if (byCode) return byCode;
  }

  const parts = (payload.region ?? "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  // 形如「中国 浙江 杭州 上城」
  if (parts[0] === "中国") {
    parts.shift();
  }
  if (parts.length < 2) {
    throw new Error("uapis 未能解析出省市区");
  }
  return matchRegionOrThrow(data, {
    province: parts[0] ?? "",
    city: parts[1] ?? parts[0] ?? "",
    district: payload.district || parts[2] || parts[1] || "",
  });
}

/** 中国大陆 IP 定位（优先，仅用支持 CORS 的接口）。 */
async function detectByChinaIp(data: RegionNode[]): Promise<RegionSelection> {
  const errors: string[] = [];
  try {
    return await detectByNetartIp(data);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  try {
    return await detectByUapisIp(data);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  throw new Error(errors[errors.length - 1] || "中国大陆 IP 定位失败");
}

/** 国际 IP：ipwho.is（支持 CORS）。 */
async function detectByIpWho(data: RegionNode[]): Promise<RegionSelection> {
  const payload = await fetchJson<IpWhoResponse>("https://ipwho.is/");
  if (payload.success === false) {
    throw new Error("ipwho 定位失败");
  }
  if (!isMainlandChina(payload.country, payload.country_code)) {
    throw new Error("当前 IP 不在中国境内，无法自动匹配行政区划");
  }
  return matchRegionOrThrow(data, {
    province: (payload.region ?? "").trim(),
    city: (payload.city ?? "").trim(),
    district: (payload.city ?? "").trim(),
  });
}

/** 国际 IP：BigDataCloud（支持 CORS）。 */
async function detectByBigDataCloudIp(data: RegionNode[]): Promise<RegionSelection> {
  const url = new URL("https://api.bigdatacloud.net/data/ip-geolocation-client");
  url.searchParams.set("localityLanguage", "zh");
  const payload = await fetchJson<BigDataCloudResponse>(url.toString());
  if (payload.countryCode && payload.countryCode !== "CN") {
    throw new Error("当前 IP 不在中国境内，无法自动匹配行政区划");
  }
  const names = pickAdminNames(payload);
  if (!names.province) {
    throw new Error("国际 IP 定位未能解析出省份");
  }
  return matchRegionOrThrow(data, names);
}

/** 国际 IP 定位（备用）。 */
async function detectByIntlIp(data: RegionNode[]): Promise<RegionSelection> {
  const errors: string[] = [];
  try {
    return await detectByIpWho(data);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  try {
    return await detectByBigDataCloudIp(data);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  throw new Error(errors[errors.length - 1] || "国际 IP 定位失败");
}

function readBrowserPosition(): Promise<GeoPosition> {
  if (!navigator.geolocation) {
    throw new Error("当前浏览器不支持定位");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("定位权限被拒绝，请在浏览器中允许位置访问"));
          return;
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("无法获取当前位置"));
          return;
        }
        reject(new Error("定位超时，请重试"));
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}

async function reverseGeocode(position: GeoPosition): Promise<AdminNames> {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(position.latitude));
  url.searchParams.set("longitude", String(position.longitude));
  url.searchParams.set("localityLanguage", "zh");

  const payload = await fetchJson<BigDataCloudResponse>(url.toString());
  if (payload.countryCode && payload.countryCode !== "CN") {
    throw new Error("当前位置不在中国境内，无法自动匹配行政区划");
  }
  const names = pickAdminNames(payload);
  if (!names.province || !names.district) {
    throw new Error("未能解析出省市区，请手动选择");
  }
  return names;
}

/** 浏览器 GPS + 逆地理（最后备用）。 */
async function detectByBrowser(data: RegionNode[]): Promise<RegionSelection> {
  const position = await readBrowserPosition();
  const names = await reverseGeocode(position);
  return matchRegionOrThrow(data, names);
}

/** 获取当前位置并匹配为 RegionSelection。 */
export async function detectCurrentRegion(): Promise<RegionSelection> {
  const regionData = await loadChinaRegionData();
  const errors: string[] = [];

  try {
    return await detectByChinaIp(regionData);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  try {
    return await detectByIntlIp(regionData);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  try {
    return await detectByBrowser(regionData);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  throw new Error(errors[errors.length - 1] || "定位失败，请手动选择省市区");
}
