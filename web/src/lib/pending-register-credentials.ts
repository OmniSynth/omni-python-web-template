/** 注册成功后暂存一次性凭据，进入系统加载完成后再展示。 */

import type { ProvisionCredentials } from "@/types/auth";

const STORAGE_KEY = "omni-pending-register-credentials";

export function stashPendingRegisterCredentials(credentials: ProvisionCredentials): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
}

export function peekPendingRegisterCredentials(): ProvisionCredentials | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProvisionCredentials;
    if (!parsed?.username || !parsed?.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingRegisterCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
