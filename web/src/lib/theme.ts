const STORAGE_KEY = "omni-theme";

/** 用户主题偏好：自动跟随系统、固定明亮、固定黑暗。 */
export type ThemePreference = "auto" | "light" | "dark";

/** 实际生效的主题（解析 auto 之后）。 */
export type ResolvedTheme = "light" | "dark";

export const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "auto", label: "自动" },
  { id: "light", label: "明亮" },
  { id: "dark", label: "黑暗" },
];

function isValidPreference(value: string): value is ThemePreference {
  return value === "auto" || value === "light" || value === "dark";
}

/** 读取本地主题偏好，无效时回退自动。 */
export function loadStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidPreference(stored)) return stored;
  } catch {
    /* 隐私模式等场景忽略 */
  }
  return "auto";
}

export function saveTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* 忽略 */
  }
}

/** 当前系统是否为深色。 */
export function getSystemDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** 将偏好解析为实际明暗。 */
export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return getSystemDark() ? "dark" : "light";
}

/** 将解析结果同步到 document.documentElement。 */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/** 按偏好写入 dark 类。 */
export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(preference);
  applyResolvedTheme(resolved);
  return resolved;
}
