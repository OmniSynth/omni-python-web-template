import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  applyThemePreference,
  loadStoredTheme,
  type ResolvedTheme,
  resolveTheme,
  saveTheme,
  THEME_OPTIONS,
  type ThemePreference,
} from "@/lib/theme";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  themeOptions: typeof THEME_OPTIONS;
  setTheme: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => loadStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(loadStoredTheme()));

  const setTheme = useCallback((preference: ThemePreference) => {
    setThemeState(preference);
    saveTheme(preference);
    setResolvedTheme(applyThemePreference(preference));
  }, []);

  useEffect(() => {
    setResolvedTheme(applyThemePreference(theme));
  }, [theme]);

  useEffect(() => {
    if (theme !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function onChange() {
      setResolvedTheme(applyThemePreference("auto"));
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      themeOptions: THEME_OPTIONS,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme 须在 ThemeProvider 内使用");
  return ctx;
}
