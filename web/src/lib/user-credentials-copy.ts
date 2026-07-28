import { DEFAULT_DOCUMENT_TITLE } from "@/lib/document-title";

/** 当前访问站点的根地址（origin + `/`，不含 path）。 */
export function currentSiteOriginUrl(): string {
  const origin = window.location.origin;
  return origin.endsWith("/") ? origin : `${origin}/`;
}

/** 当前页面标题（与浏览器标签页一致，通常为租户/站点名称）。 */
export function currentSiteTitle(): string {
  return document.title.trim() || DEFAULT_DOCUMENT_TITLE;
}

/**
 * 生成用户账号信息复制文本。
 * `siteName` 须显式传入（机构/租户名）；勿依赖 document.title，否则注册瞬间可能仍是上一家企业缓存名。
 */
export function formatUserCredentialsCopy(username: string, password: string, siteName?: string): string {
  const site = siteName?.trim() || currentSiteTitle();
  return [`网站：${site}`, `网址：${currentSiteOriginUrl()}`, `账号：${username}`, `密码：${password}`].join("\n");
}
