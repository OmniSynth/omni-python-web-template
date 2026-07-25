import { handleSessionExpired } from "@/lib/session-expired";
import { authHeaders } from "@/lib/session-token";
import {
  guardTenantWritable,
  isTenantExpiredMessage,
  showTenantExpiredNotice,
  TENANT_EXPIRED_MSG,
} from "@/lib/tenant-expiry";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const WRITE_ALLOW_PREFIXES = ["/api/v1/auth/logout", "/api/v1/auth/switch-tenant", "/api/v1/tenants", "/api/v1/orgs"];

function isWriteAllowlisted(url: string): boolean {
  return WRITE_ALLOW_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function requestMethod(options: RequestInit): string {
  return (options.method ?? "GET").toUpperCase();
}

export async function json<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = requestMethod(options);
  if (method !== "GET" && method !== "HEAD" && !isWriteAllowlisted(url) && !guardTenantWritable()) {
    throw new ApiError(TENANT_EXPIRED_MSG, 403);
  }

  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
    ...options,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data as { detail?: string }).detail || r.statusText;
    const text = typeof msg === "string" ? msg : JSON.stringify(msg);
    if (r.status === 403 && isTenantExpiredMessage(text)) {
      showTenantExpiredNotice({ force: true });
      throw new ApiError(text, r.status);
    }
    if (r.status === 401 && text !== "请先选择租户") {
      // 过期已改为软锁定，不再因到期文案踢下线
      if (!isTenantExpiredMessage(text)) {
        void handleSessionExpired();
      }
    }
    throw new ApiError(text, r.status);
  }
  return data as T;
}
