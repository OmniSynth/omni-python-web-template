import { type SubmitEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { useAuth } from "@/contexts/AuthContext";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import { resolveDefaultHomePath } from "@/lib/nav-menu-data";
import { isTenantExpiredMessage } from "@/lib/tenant-expiry";
import { useAuthStore } from "@/stores/auth-store";
import { LoginFormPanel } from "./components/login-form-panel";
import { LoginHeroPanel } from "./components/login-hero-panel";

export function LoginPage() {
  const { user, login, loading, defaultHomePath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const savedFrom = (location.state as { from?: string } | null)?.from;
  const from = savedFrom ?? defaultHomePath ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();
  const [submitting, setSubmitting] = useState(false);

  if (loading && !user) {
    return (
      <AuthPageShell contentClassName="items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </AuthPageShell>
    );
  }

  if (user && !user.need_tenant_select) {
    return <Navigate to={from} replace />;
  }

  if (user?.need_tenant_select) {
    return <Navigate to="/select-tenant" replace />;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!username.trim()) errors.username = "用户名必填";
    if (!password) errors.password = "密码必填";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      if (result.needTenantSelect) {
        navigate("/select-tenant", { replace: true });
        return;
      }
      const { navTree, user: authedUser } = useAuthStore.getState();
      const home = resolveDefaultHomePath(navTree, (code) => new Set(authedUser?.permissions ?? []).has(code)) ?? "/";
      navigate(savedFrom ?? home, { replace: true });
    } catch (err) {
      const message = errorMessage(err, "登录失败");
      // 套餐到期由 api client 统一弹阻断窗，避免重复 toast
      if (!isTenantExpiredMessage(message)) {
        showToastError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell contentClassName="min-h-dvh">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-12 lg:gap-8 xl:gap-12">
        <aside className="flex flex-col px-6 pb-4 pt-8 sm:px-8 lg:col-span-7 lg:px-10 lg:pb-10 lg:pt-12">
          <LoginHeroPanel />
        </aside>

        <main className="flex items-end px-6 pb-10 pt-2 sm:px-8 lg:col-span-5 lg:items-center lg:px-6 lg:py-12 xl:px-4">
          <div className="w-full lg:mx-auto lg:max-w-md">
            <LoginFormPanel
              username={username}
              password={password}
              submitting={submitting}
              fieldErrors={fieldErrors}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onClearFieldError={clearFieldError}
              onSubmit={(event) => void handleSubmit(event)}
            />
          </div>
        </main>
      </div>
    </AuthPageShell>
  );
}
