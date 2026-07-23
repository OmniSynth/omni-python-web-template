import { useEffect, useRef, useState } from "react";
import { mountAuthPrism } from "./mount-auth-prism";

/** 认证页全屏棱镜背景（WebGL）；不可用时由外层 CSS 光斑兜底。 */
export function AuthPrismBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    try {
      const dispose = mountAuthPrism(host, {
        height: 3.2,
        baseWidth: 5.2,
        scale: 2.8,
        timeScale: 0.75,
        glow: 1.55,
        bloom: 1.45,
        // 与 logo 蓝系对齐，不做绿色相偏移
        hueShift: 0.05,
        colorFrequency: 1.35,
        noise: 0.02,
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
