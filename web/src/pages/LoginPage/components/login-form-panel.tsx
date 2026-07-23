import { ArrowRight, Loader2 } from "lucide-react";
import type { SubmitEvent } from "react";
import { Link } from "react-router-dom";
import { AuthFadeIn } from "@/components/auth";
import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LoginFormPanelProps = {
  username: string;
  password: string;
  submitting: boolean;
  fieldErrors: Record<string, string>;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onClearFieldError: (key: string) => void;
  onSubmit: (event: SubmitEvent) => void;
};

/** 登录页右侧玻璃表单。 */
export function LoginFormPanel({
  username,
  password,
  submitting,
  fieldErrors,
  onUsernameChange,
  onPasswordChange,
  onClearFieldError,
  onSubmit,
}: LoginFormPanelProps) {
  return (
    <AuthFadeIn delay={280} className="w-full">
      <section className="auth-glass-panel relative overflow-hidden rounded-2xl border border-border/40 p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
        />
        <header className="mb-6 space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-primary">账号登录</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">登录工作台</h2>
          <p className="text-sm text-muted-foreground">输入账号与密码以继续</p>
        </header>

        <form className="grid gap-5" onSubmit={onSubmit}>
          <FormField label="用户名" htmlFor="login-username" required error={fieldErrors.username}>
            <Input
              id="login-username"
              className="h-11"
              autoComplete="username"
              placeholder="请输入用户名"
              value={username}
              aria-invalid={!!fieldErrors.username}
              onChange={(e) => {
                onUsernameChange(e.target.value);
                onClearFieldError("username");
              }}
            />
          </FormField>
          <FormField label="密码" htmlFor="login-password" required error={fieldErrors.password}>
            <Input
              id="login-password"
              type="password"
              className="h-11"
              autoComplete="current-password"
              placeholder="请输入密码"
              value={password}
              aria-invalid={!!fieldErrors.password}
              onChange={(e) => {
                onPasswordChange(e.target.value);
                onClearFieldError("password");
              }}
            />
          </FormField>
          <Button type="submit" size="lg" className="h-11 w-full gap-2" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                登录中…
              </>
            ) : (
              <>
                进入系统
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            还没有账号？{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              注册开通
            </Link>
          </p>
        </form>
      </section>
    </AuthFadeIn>
  );
}
