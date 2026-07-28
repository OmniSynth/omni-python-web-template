/** 注册成功后暂存一次性凭据，进入系统加载完成后再展示。 */

import type { ProvisionCredentials } from "@/types/auth";

const STORAGE_KEY = "omni-pending-register-credentials";

export type PendingRegisterCredentials = ProvisionCredentials & {
  site_name: string;
};

export function stashPendingRegisterCredentials(credentials: PendingRegisterCredentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function peekPendingRegisterCredentials(): PendingRegisterCredentials | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingRegisterCredentials;
    if (!parsed?.username || !parsed?.password) return null;
    return {
      username: parsed.username,
      password: parsed.password,
      site_name: typeof parsed.site_name === "string" ? parsed.site_name.trim() : "",
    };
  } catch {
    return null;
  }
}

export function clearPendingRegisterCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
