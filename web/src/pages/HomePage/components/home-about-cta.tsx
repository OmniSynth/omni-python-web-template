import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { APP_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** 关于与行动号召。 */
export function HomeAboutCta() {
  return (
    <section id="about" className="border-t border-border/60 bg-muted/25 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="auth-glass-panel mx-auto max-w-3xl rounded-2xl border border-border/50 px-6 py-10 text-center sm:px-10">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">准备开始使用 {APP_BRAND_NAME}？</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            深耕多租户与权限治理场景，帮助团队以更少成本搭建可扩展的运营后台。
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 min-w-40 gap-2 px-8")}>
              登录体验
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href="#features"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 min-w-40 px-8")}
            >
              返回功能介绍
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
