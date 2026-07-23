import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthFadeIn, AuthGradientTitle, AuthPrismBackground } from "@/components/auth";
import { buttonVariants } from "@/components/ui/button";
import { APP_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { HOME_STATS } from "../data";

/** 首页 Hero：棱镜背景 + 品牌主张 + 主 CTA。 */
export function HomeHero() {
  return (
    <section
      id="hero"
      className="auth-page-shell relative flex min-h-dvh items-center justify-center overflow-hidden pt-16"
    >
      <AuthPrismBackground />
      <div className="auth-page-shell__aurora" aria-hidden>
        <span className="auth-page-shell__blob auth-page-shell__blob--a" />
        <span className="auth-page-shell__blob auth-page-shell__blob--b" />
        <span className="auth-page-shell__blob auth-page-shell__blob--c" />
      </div>
      <div className="auth-page-shell__veil" aria-hidden />

      <div className="hero-content relative z-10 mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="space-y-8">
          <AuthFadeIn delay={160}>
            <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary sm:text-sm">
              多租户 · RBAC · 审计一体化
            </div>
          </AuthFadeIn>

          <AuthFadeIn delay={320}>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <AuthGradientTitle className="text-4xl sm:text-5xl lg:text-6xl" />
              <span className="mt-3 block text-xl font-medium text-muted-foreground sm:text-2xl lg:text-3xl">
                面向组织的智能运营工作台
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {APP_BRAND_NAME} 提供认证、权限、组织与审计的一站式能力，帮助团队快速搭建可扩展的多租户业务后台。
            </p>
          </AuthFadeIn>

          <AuthFadeIn delay={480}>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/login" className={cn(buttonVariants({ size: "lg" }), "h-11 min-w-40 gap-2 px-8")}>
                立即体验
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a
                href="#features"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 min-w-40 px-8")}
              >
                了解功能
              </a>
            </div>
          </AuthFadeIn>

          <AuthFadeIn delay={640}>
            <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 pt-10 sm:grid-cols-3">
              {HOME_STATS.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <p className="text-2xl font-semibold text-primary sm:text-3xl">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </AuthFadeIn>
        </div>
      </div>
    </section>
  );
}
