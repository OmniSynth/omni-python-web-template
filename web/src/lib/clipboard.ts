/** 复制文本到剪贴板（同步优先 + Clipboard API + execCommand 降级）。 */

export type CopySource = HTMLTextAreaElement | HTMLInputElement;

function isSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

/** 从已可见的 input/textarea 选区复制（对话框内最可靠）。 */
function copyFromElement(el: CopySource): boolean {
  try {
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
    return document.execCommand("copy");
  } catch {
    return false;
  }
}

/** 临时 textarea 复制；避免 readonly、过远定位与过早移除。 */
function execCommandCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.opacity = "0.01";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let ok: boolean;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }

  window.setTimeout(() => {
    textarea.remove();
  }, 100);

  return ok;
}

async function verifyClipboard(expected: string): Promise<boolean> {
  if (!isSecureContext() || !navigator.clipboard?.readText) {
    return true;
  }
  try {
    const actual = await navigator.clipboard.readText();
    return actual === expected;
  } catch {
    return true;
  }
}

/**
 * 复制到剪贴板。
 * @param text 待复制文本
 * @param source 可选：页面上已有的 textarea/input，优先从中选区复制（对话框场景更稳）
 */
export async function copyToClipboard(text: string, source?: CopySource | null): Promise<boolean> {
  if (!text) return false;

  if (source?.value) {
    if (copyFromElement(source)) {
      if (await verifyClipboard(source.value)) return true;
    }
  }

  if (execCommandCopy(text)) {
    if (await verifyClipboard(text)) return true;
  }

  if (navigator.clipboard?.writeText && isSecureContext()) {
    try {
      await navigator.clipboard.writeText(text);
      if (await verifyClipboard(text)) return true;
    } catch {
      // 权限或焦点丢失，继续降级
    }
  }

  if (source?.value && copyFromElement(source)) {
    return true;
  }

  return execCommandCopy(text);
}
