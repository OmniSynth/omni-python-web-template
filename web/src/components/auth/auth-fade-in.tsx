import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type AuthFadeInProps = {
  children: ReactNode;
  /** 入场延迟（毫秒），对齐营销站 hero FadeIn。 */
  delay?: number;
  className?: string;
};

/** 自下而上淡入；挂载后触发，尊重 prefers-reduced-motion。 */
export function AuthFadeIn({ children, delay = 0, className }: AuthFadeInProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const id = window.setTimeout(() => setVisible(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);

  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
