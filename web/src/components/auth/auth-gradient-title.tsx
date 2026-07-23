import { APP_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

type AuthGradientTitleProps = {
  className?: string;
  text?: string;
};

/** 流动渐变品牌标题（营销站 hero `animate-gradient-x` 同系）。 */
export function AuthGradientTitle({ className, text = APP_BRAND_NAME }: AuthGradientTitleProps) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="auth-gradient-title bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
        {text}
      </span>
      <span
        aria-hidden
        className="auth-gradient-title-glow pointer-events-none absolute inset-0 bg-linear-to-r from-primary/20 via-primary/40 to-primary/20 bg-clip-text text-transparent opacity-50"
      >
        {text}
      </span>
    </span>
  );
}
