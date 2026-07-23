import type { ReactNode } from "react";
import { AuthPrismBackground } from "@/components/auth";
import { cn } from "@/lib/utils";

interface AuthPageShellProps {
  children: ReactNode;
  className?: string;
  /** 内容区额外 class，默认居中。 */
  contentClassName?: string;
}

/** 登录/选租户等认证页：棱镜 WebGL 底 + 玻璃内容层。 */
export function AuthPageShell({ children, className, contentClassName }: AuthPageShellProps) {
  return (
    <div className={cn("auth-page-shell relative flex min-h-dvh flex-col", className)}>
      <AuthPrismBackground />
      <div className="auth-page-shell__aurora" aria-hidden>
        <span className="auth-page-shell__blob auth-page-shell__blob--a" />
        <span className="auth-page-shell__blob auth-page-shell__blob--b" />
        <span className="auth-page-shell__blob auth-page-shell__blob--c" />
      </div>
      <div className="auth-page-shell__veil" aria-hidden />
      <div className={cn("relative z-10 flex flex-1 flex-col", contentClassName)}>{children}</div>
    </div>
  );
}
