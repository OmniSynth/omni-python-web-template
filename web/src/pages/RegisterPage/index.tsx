import { type SubmitEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AuthPageShell } from "@/components/layout/auth-page-shell";
import { useAuth } from "@/contexts/AuthContext";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { errorMessage, showToastError } from "@/lib/form-feedback";
import { resolveDefaultHomePath } from "@/lib/nav-menu-data";
import { LoginHeroPanel } from "@/pages/LoginPage/components/login-hero-panel";
import { useAuthStore } from "@/stores/auth-store";
import { RegisterFormPanel } from "./components/register-form-panel";
import { EMPTY_REGION, type RegisterFormValues } from "./types";

function validateRegisterForm(values: RegisterFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = "请填写机构名称";
  if (!values.orgType) errors.orgType = "请选择机构类型";
  if (!values.creditCode.trim()) errors.creditCode = "请填写统一社会信用代码";
  if (!values.phone.trim()) errors.phone = "请填写机构手机号";
  if (!values.location.province || !values.location.city || !values.location.district) {
    errors.location = "请选择省份、城市、区县";
  }
  return errors;
}

function resolvePostRegisterPath(needTenantSelect: boolean): string {
  if (needTenantSelect) return "/select-tenant";
  const { navTree, user: authedUser } = useAuthStore.getState();
  return resolveDefaultHomePath(navTree, (code) => new Set(authedUser?.permissions ?? []).has(code)) ?? "/";
}

export function RegisterPage() {
  const { user, register, loading, defaultHomePath } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    orgType: "company",
    creditCode: "",
    phone: "",
    location: EMPTY_REGION,
  });
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
    return <Navigate to={defaultHomePath ?? "/"} replace />;
  }

  if (user?.need_tenant_select) {
    return <Navigate to="/select-tenant" replace />;
  }

  function onChange<K extends keyof RegisterFormValues>(key: K, value: RegisterFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    clearFieldErrors();
    const errors = validateRegisterForm(values);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        name: values.name.trim(),
        org_type: values.orgType,
        credit_code: values.creditCode.trim(),
        phone: values.phone.trim(),
        province: values.location.province,
        city: values.location.city,
        district: values.location.district,
        region: values.location.region,
      });
      if (!result.credentials?.username || !result.credentials.password) {
        showToastError("注册成功，但未返回初始密码，请联系管理员重置");
      }
      navigate(resolvePostRegisterPath(result.needTenantSelect), { replace: true });
    } catch (err) {
      showToastError(errorMessage(err, "注册失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPageShell contentClassName="min-h-dvh">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl lg:grid-cols-12 lg:gap-8 xl:gap-12">
        <aside className="flex flex-col px-6 pb-4 pt-8 sm:px-8 lg:col-span-7 lg:px-10 lg:pb-10 lg:pt-12">
          <LoginHeroPanel />
          <p className="mt-4 text-sm text-muted-foreground lg:hidden">
            已有账号？{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              去登录
            </Link>
          </p>
        </aside>

        <main className="flex items-end px-6 pb-10 pt-2 sm:px-8 lg:col-span-5 lg:items-center lg:px-6 lg:py-12 xl:px-4">
          <div className="w-full lg:mx-auto lg:max-w-md">
            <RegisterFormPanel
              values={values}
              submitting={submitting}
              fieldErrors={fieldErrors}
              onChange={onChange}
              onClearFieldError={clearFieldError}
              onSubmit={(event: SubmitEvent) => void handleSubmit(event)}
            />
          </div>
        </main>
      </div>
    </AuthPageShell>
  );
}
