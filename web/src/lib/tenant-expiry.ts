/** 租户套餐过期：文案、4 小时提示缓存、强制弹窗。 */

import { useAuthStore } from "@/stores/auth-store";

export const TENANT_EXPIRED_MSG = "套餐已过期，请联系管理员续费";
export const TENANT_EXPIRED_TITLE = "套餐已过期";

const DISMISS_STORAGE_KEY = "omni-tenant-expired-dismissed-at";
const DISMISS_TTL_MS = 4 * 60 * 60 * 1000;

type TenantExpiredListener = (open: boolean) => void;

const listeners = new Set<TenantExpiredListener>();

export function isTenantExpiredMessage(message: string): boolean {
  return message === TENANT_EXPIRED_MSG || message.includes("套餐已过期") || message.includes("套餐已到期");
}

export function isCurrentTenantExpired(): boolean {
  return Boolean(useAuthStore.getState().user?.tenant_expired);
}

function readDismissedAt(): number {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** 关闭提醒后 4 小时内不再自动弹出（强制触发不受此限制）。 */
export function markTenantExpiredNoticeDismissed(): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now()));
  } catch {
    // 隐私模式等忽略
  }
}

export function shouldAutoShowTenantExpiredNotice(): boolean {
  if (!isCurrentTenantExpired()) return false;
  const dismissedAt = readDismissedAt();
  if (!dismissedAt) return true;
  return Date.now() - dismissedAt >= DISMISS_TTL_MS;
}

/** 订阅过期弹窗（TenantExpiredNoticeHost）。 */
export function subscribeTenantExpiredNotice(listener: TenantExpiredListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitTenantExpiredNotice(open: boolean): void {
  for (const listener of listeners) {
    listener(open);
  }
}

/**
 * 展示套餐过期提示。
 * - force=false：受 4 小时关闭缓存约束（登录/进入工作台）
 * - force=true：立即弹出（翻页、导出、新增/编辑等），不受缓存限制
 */
export function showTenantExpiredNotice(options?: { force?: boolean }): void {
  const force = options?.force === true;
  if (!force && !shouldAutoShowTenantExpiredNotice()) return;
  emitTenantExpiredNotice(true);
}

/** 写操作/导出前拦截；返回 false 表示已阻断。 */
export function guardTenantWritable(): boolean {
  if (!isCurrentTenantExpired()) return true;
  showTenantExpiredNotice({ force: true });
  return false;
}

/** 翻到第 2 页及以后时拦截。 */
export function guardTenantListPage(page: number): boolean {
  if (page <= 1 || !isCurrentTenantExpired()) return true;
  showTenantExpiredNotice({ force: true });
  return false;
}
