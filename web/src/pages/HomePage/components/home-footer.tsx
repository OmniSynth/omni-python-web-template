import { Link } from "react-router-dom";
import { AppBrand } from "@/components/AppBrand";
import { APP_BRAND_NAME } from "@/lib/brand";
import { HOME_NAV_LINKS } from "../data";

/** 首页页脚。 */
export function HomeFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="space-y-2">
          <AppBrand size="sm" nameClassName="text-sm font-semibold" />
          <p className="text-xs text-muted-foreground">多租户运营工作台模板 · {APP_BRAND_NAME}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {HOME_NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-primary">
              {link.label}
            </a>
          ))}
          <Link to="/login" className="hover:text-primary">
            登录
          </Link>
        </div>
      </div>
    </footer>
  );
}
