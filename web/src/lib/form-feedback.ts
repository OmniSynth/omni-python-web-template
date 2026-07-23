import { toast } from "sonner";
import type { FieldErrors } from "@/hooks/useFieldErrors";

/** P2：全局气泡错误提示。 */
export function showToastError(message: string): void {
  toast.error(message);
}

/** 全局气泡成功提示。 */
export function showToastSuccess(message: string): void {
  toast.success(message);
}

/** P1 辅助：批量设置字段错误（需配合 useFieldErrors）。 */
export function pickFieldErrors(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, msg]) => Boolean(msg)));
}

/** 从 Error 对象提取可展示文案。 */
export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

type BlockingErrorPayload = { title: string; message: string };

type BlockingErrorListener = (payload: BlockingErrorPayload | null) => void;

const blockingListeners = new Set<BlockingErrorListener>();

/** 订阅阻断性错误弹窗状态（由 BlockingErrorHost 使用）。 */
export function subscribeBlockingError(listener: BlockingErrorListener): () => void {
  blockingListeners.add(listener);
  return () => blockingListeners.delete(listener);
}

function emitBlockingError(payload: BlockingErrorPayload | null) {
  for (const listener of blockingListeners) {
    listener(payload);
  }
}

/** P3：阻断性错误弹窗。 */
export function showBlockingError(title: string, message: string): void {
  emitBlockingError({ title, message });
}

/** 关闭阻断性错误弹窗。 */
export function dismissBlockingError(): void {
  emitBlockingError(null);
}

export type { BlockingErrorPayload };
