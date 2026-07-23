/** 401 会话失效：清理本地存储并通知 auth store 重置（无 auth-store 静态依赖）。 */

import { purgeLocalSession } from "@/lib/purge-local-data";
import { setSessionToken } from "@/lib/session-token";

type SessionExpiredHandler = () => void | Promise<void>;

let onSessionExpired: SessionExpiredHandler | null = null;

export function registerSessionExpiredHandler(handler: SessionExpiredHandler): void {
  onSessionExpired = handler;
}

/** API 返回 401 时调用；须先通过 registerSessionExpiredHandler 注册 store reset。 */
export async function handleSessionExpired(): Promise<void> {
  setSessionToken(null);
  await purgeLocalSession();
  await onSessionExpired?.();
}
