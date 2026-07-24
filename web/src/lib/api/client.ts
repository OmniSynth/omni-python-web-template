import { showBlockingError } from "@/lib/form-feedback";
import { handleSessionExpired } from "@/lib/session-expired";
import { authHeaders } from "@/lib/session-token";
import { isTenantExpiredMessage } from "@/lib/tenant-expiry";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function json<T>(url: string, options: RequestInit = {}): Promise<T> {
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
    if (r.status === 401 && text !== "请先选择租户") {
      if (isTenantExpiredMessage(text)) {
        showBlockingError("套餐已到期", text);
      }
      void handleSessionExpired();
    }
    throw new ApiError(text, r.status);
  }
  return data as T;
}
