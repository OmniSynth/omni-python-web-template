import { useEffect, useRef, useState } from "react";
import { mountAuthPrism } from "./mount-auth-prism";
import { shouldSkipPrismWebGl } from "./prism-quality";

/** 认证页全屏棱镜背景（WebGL）；卡顿时自动定格或回退 CSS 光斑。 */
export function AuthPrismBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (shouldSkipPrismWebGl()) return;

    try {
      const dispose = mountAuthPrism(host, {
        height: 3.2,
        baseWidth: 5.2,
        scale: 2.8,
        timeScale: 0.75,
        glow: 1.55,
        bloom: 1.45,
        hueShift: 0.05,
        colorFrequency: 1.35,
        noise: 0.02,
        onModeChange: (mode) => {
          if (mode === "css") setActive(false);
        },
      });
      setActive(true);
      return () => {
        dispose();
        setActive(false);
      };
    } catch {
      setActive(false);
    }
  }, []);

  return (
    <div
      ref={hostRef}
      className="auth-page-shell__prism absolute inset-0 z-0"
      aria-hidden
      data-active={active ? "true" : undefined}
    />
  );
}
