/** Portal 内浮层（Select 等）的交互不应触发 Dialog/Sheet 关闭。 */

const PORTAL_CLOSE_GUARD_MS = 400;
let lastSelectCloseAt = 0;
let lastPopoverCloseAt = 0;

/** Select 关闭时调用，防止同一手势误触蒙版导致抽屉关闭。 */
export function notifySelectClosed(): void {
  lastSelectCloseAt = Date.now();
}

/** Popover 关闭时调用，防止同一手势误触蒙版导致抽屉关闭。 */
export function notifyPopoverClosed(): void {
  lastPopoverCloseAt = Date.now();
}

function isRecentPortaledOverlayClose(): boolean {
  const now = Date.now();
  return now - lastSelectCloseAt < PORTAL_CLOSE_GUARD_MS || now - lastPopoverCloseAt < PORTAL_CLOSE_GUARD_MS;
}

const SELECT_SELECTOR = '[data-slot="select-content"], [data-slot="select-trigger"], [role="listbox"], [role="option"]';

const PORTAL_OVERLAY_SELECTOR = `${SELECT_SELECTOR}, [data-slot="popover-content"], [data-slot="combobox-popup"], [data-slot="command"], [cmdk-root], [cmdk-list], [cmdk-input]`;

export function isPortaledOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(PORTAL_OVERLAY_SELECTOR));
}

/** 是否为 Dialog/Sheet 蒙版层（仅蒙版点击才允许关闭抽屉）。 */
export function isDialogOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.hasAttribute("data-slot") && target.getAttribute("data-slot") === "sheet-overlay") {
    return true;
  }
  if (target.closest('[data-slot="sheet-overlay"], [data-slot="dialog-overlay"]')) return true;
  const cls = typeof target.className === "string" ? target.className : "";
  return cls.includes("backdrop-blur-sm") && cls.includes("inset-0");
}

function isSelectOpen(): boolean {
  return Boolean(document.querySelector('[data-slot="select-content"][data-open]'));
}

export function shouldPreventSheetDismiss(event: Event): boolean {
  if (isPortaledOverlayTarget(event.target)) return true;
  if (isSelectOpen()) return true;
  if (isRecentPortaledOverlayClose() && isDialogOverlayTarget(event.target)) return true;
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node.closest(SELECT_SELECTOR)) return true;
    if (node.closest('[data-slot="popover-content"], [data-slot="combobox-popup"], [data-slot="command"], [cmdk-root]'))
      return true;
  }
  return false;
}

/** Base UI Dialog onOpenChange：判断是否应 cancel 关闭。 */
export function shouldCancelSheetDismiss(event: Event, closeOnOverlayClick: boolean): boolean {
  if (shouldPreventSheetDismiss(event)) return true;
  if (!closeOnOverlayClick) return true;
  if (!isDialogOverlayTarget(event.target)) return true;
  return false;
}

export function preventCloseOnPortaledOverlay(event: Event): void {
  if (shouldPreventSheetDismiss(event)) {
    event.preventDefault();
  }
}

/** 打开主导航等高层级浮层前，尝试关闭可能残留的 Select/Popover。 */
export function dismissOpenPortaledOverlays(): void {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }),
  );
}

/** 蒙版点击允许关闭；其余外部点击（如 Portal 下拉）拦截。 */
export function applySheetOutsideDismissPolicy(event: Event, closeOnOverlayClick: boolean): void {
  preventCloseOnPortaledOverlay(event);
  if (event.defaultPrevented) return;
  if (!closeOnOverlayClick) {
    event.preventDefault();
    return;
  }
  if (!isDialogOverlayTarget(event.target)) {
    event.preventDefault();
  }
}
