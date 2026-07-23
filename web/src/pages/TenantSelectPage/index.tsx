import { Building2, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppBrand } from "@/components/AppBrand";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { TenantMetaList } from "@/components/TenantMeta";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import { resolveDefaultHomePath } from "@/lib/nav-menu-data";
import { useAuthStore } from "@/stores/auth-store";
import type { BoundTenantInfo } from "@/types/auth";

export function TenantSelectPage() {
  const { switchTenant, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState<BoundTenantInfo[]>([]);
  const [accessError, setAccessError] = useState("");
  const [pageLoadError, setPageLoadError] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);

  useEffect(() => {
    const denied = (location.state as { accessDenied?: boolean } | null)?.accessDenied;
    if (denied) {
      setAccessError("未开通访问权限，请联系管理员");
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    api.auth
      .tenants()
      .then((list) => {
        setTenants(list);
        setPageLoadError("");
      })
      .catch((err: Error) => setPageLoadError(err.message));
  }, []);

  async function handleSelect(tenantId: number) {
    setLoadingId(tenantId);
    try {
      await switchTenant(tenantId);
      const { navTree, user: authedUser } = useAuthStore.getState();
      const home = resolveDefaultHomePath(navTree, (code) => new Set(authedUser?.permissions ?? []).has(code)) ?? "/";
      navigate(home, { replace: true });
    } catch (err) {
      showToastError(errorMessage(err, "切换租户失败"));
    } finally {
      setLoadingId(null);
    }
  }

  const displayName = user?.display_name || user?.username || "";

  return (
    <AuthPageShell contentClassName="items-center px-4 py-10 sm:py-14">
      <div className="w-full max-w-3xl">
        <header className="mb-8 text-center sm:mb-10">
          <AppBrand
            size="lg"
            className="justify-center"
            nameClassName="text-sm font-semibold tracking-wide text-primary"
          />
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">选择工作租户</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            欢迎，<span className="font-medium text-foreground">{displayName}</span>
            <span className="mx-1.5 text-border">·</span>
            请选择要进入的租户环境
          </p>
        </header>

        {accessError || pageLoadError ? (
          <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
            {accessError || pageLoadError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {tenants.map((tenant) => {
            const loading = loadingId === tenant.id;
            const disabled = loadingId !== null;
            return (
              <button
                key={tenant.id}
                type="button"
                disabled={disabled}
                onClick={() => void handleSelect(tenant.id)}
                className="auth-glass-panel group relative flex w-full flex-col rounded-xl border border-border/40 p-5 text-left transition hover:border-primary/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold leading-snug">{tenant.name}</h2>
                    </div>
                  </div>
                  {loading ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  )}
                </div>

                <TenantMetaList
                  className="mt-4 border-t border-border/80 pt-4"
                  meta={{
                    tenant_code: tenant.code,
                    province: tenant.province,
                    city: tenant.city,
                    district: tenant.district,
                    org_name: tenant.org_name,
                    org_credit_code: tenant.org_credit_code,
                    dept_name: tenant.dept_name,
                  }}
                />
              </button>
            );
          })}
        </div>

        {tenants.length === 0 && !pageLoadError && !accessError ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">暂无可选租户</p>
        ) : null}
      </div>
    </AuthPageShell>
  );
}
