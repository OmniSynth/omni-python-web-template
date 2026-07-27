/** 访问域名：http(s) + 主机（可选端口），恰好一个尾斜杠；空串表示未配置。 */

export function normalizeOssDomain(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  return `${text.replace(/\/+$/, "")}/`;
}

export function validateOssDomain(raw: string): string | null {
  const normalized = normalizeOssDomain(raw);
  if (!normalized) return null;
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return "访问域名格式无效，请输入合法 http(s) 域名";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "访问域名须以 http:// 或 https:// 开头";
  }
  if (!parsed.hostname) {
    return "访问域名格式无效，请输入合法域名或主机";
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    return "访问域名不能包含路径，仅协议与主机，须以单个 / 结尾";
  }
  return null;
}
