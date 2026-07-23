/** 从用户昵称生成头像文字，最多 4 个字符。 */
export function avatarLabel(displayName: string | undefined, username: string | undefined): string {
  const raw = (displayName?.trim() || username?.trim() || "").replace(/\s+/g, "");
  if (!raw) return "?";
  return [...raw].slice(0, 4).join("");
}

/** 根据昵称生成稳定色相，用于头像背景。 */
export function avatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
