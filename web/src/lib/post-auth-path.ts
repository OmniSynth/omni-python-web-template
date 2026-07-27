/** 登录/选租户后的回跳路径：仅接受站内路径，排除认证页本身。 */

const AUTH_PATH_PREFIXES = ["/login", "/register", "/select-tenant"];

export function locationToReturnPath(location: { pathname: string; search: string; hash: string }): string {
  return `${location.pathname}${location.search}${location.hash}`;
}

export function resolvePostAuthPath(savedFrom: string | undefined | null, fallback: string): string {
  const raw = savedFrom?.trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }
  const pathOnly = raw.split(/[?#]/)[0] ?? raw;
  if (AUTH_PATH_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) {
    return fallback;
  }
  return raw;
}
