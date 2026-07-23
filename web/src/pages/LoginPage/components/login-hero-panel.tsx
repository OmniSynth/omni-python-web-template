import { Layers3, ShieldCheck, Waypoints } from "lucide-react";
import { AppBrand } from "@/components/AppBrand";
import { AuthFadeIn, AuthGradientTitle } from "@/components/auth";

const HIGHLIGHTS = [
  { icon: ShieldCheck, title: "安全会话", desc: "统一认证与权限边界" },
  { icon: Layers3, title: "多租户隔离", desc: "组织数据按租户隔离" },
  { icon: Waypoints, title: "可扩展工作台", desc: "菜单与能力按需装配" },
] as const;

/** 登录页左侧品牌叙事区。 */
export function LoginHeroPanel() {
  return (
    <div className="relative flex h-full min-h-0 flex-col justify-between gap-10">
      <AuthFadeIn delay={120}>
        <AppBrand size="lg" nameClassName="text-base font-semibold tracking-wide" />
      </AuthFadeIn>

      <div className="space-y-6">
        <AuthFadeIn delay={220}>
          <p className="text-xs font-medium tracking-widest text-primary">安全接入</p>
          <h1 className="mt-3 max-w-md text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="block text-muted-foreground">进入</span>
            <AuthGradientTitle className="mt-1 text-5xl sm:text-6xl" />
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            多租户运营工作台。登录后按权限进入对应菜单与数据范围。
          </p>
        </AuthFadeIn>

        <AuthFadeIn delay={360}>
          <ul className="grid gap-3 sm:max-w-md">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li
                key={title}
                className="auth-glass-soft flex items-start gap-3 rounded-xl border px-3.5 py-3.5"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </AuthFadeIn>
      </div>

      <AuthFadeIn delay={480}>
        <p className="text-xs text-muted-foreground">会话加密传输 · 操作可审计</p>
      </AuthFadeIn>
    </div>
  );
}
