import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { AppBrand } from "@/components/AppBrand";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { HOME_NAV_LINKS } from "../data";

/** 首页顶栏：毛玻璃导航 + 登录/进入工作台。 */
export function HomeNav() {
  const { user, defaultHomePath } = useAuth();
  const [open, setOpen] = useState(false);
  const workspacePath = defaultHomePath ?? "/login";
  const entered = Boolean(user && !user.need_tenant_select);
  const ctaLabel = entered ? "进入工作台" : "登录";
  const ctaTo = entered ? workspacePath : "/login";

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/10 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="min-w-0" aria-label="返回首页">
          <AppBrand size="md" nameClassName="text-sm font-semibold" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {HOME_NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "relative text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100",
              )}
            >
              {link.label}
            </a>
          ))}
          <Link to={ctaTo} className={cn(buttonVariants({ size: "sm" }))}>
            {ctaLabel}
          </Link>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="打开导航菜单"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full max-w-xs">
          <SheetHeader>
            <SheetTitle>导航</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-3 px-4">
            {HOME_NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link to={ctaTo} className={cn(buttonVariants(), "mt-2")} onClick={() => setOpen(false)}>
              {ctaLabel}
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
