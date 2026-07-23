import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthFadeIn } from "@/components/auth";
import { FormField } from "@/components/form/form-field";
import { RegionCascader } from "@/components/region-cascader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORG_TYPE_OPTIONS, type RegisterFormPanelProps } from "../types";

/** 注册页右侧玻璃表单：机构信息必填，开通后以手机号登录。 */
export function RegisterFormPanel({
  values,
  submitting,
  fieldErrors,
  onChange,
  onClearFieldError,
  onSubmit,
}: RegisterFormPanelProps) {
  return (
    <AuthFadeIn delay={280} className="w-full">
      <section className="auth-glass-panel relative overflow-hidden rounded-2xl border border-border/40 p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent"
        />
        <header className="mb-5 space-y-1.5">
          <p className="text-xs font-medium tracking-wide text-primary">开通租户</p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">注册机构</h2>
          <p className="text-sm text-muted-foreground">填写机构信息完成注册，系统将生成登录密码</p>
        </header>

        <ScrollArea className="h-[min(70dvh,36rem)] pr-3">
          <form id="register-form" className="grid gap-4 pb-2" onSubmit={onSubmit}>
            <FormField label="机构名称" htmlFor="reg-name" required error={fieldErrors.name}>
              <Input
                id="reg-name"
                className="h-11"
                placeholder="请输入机构名称"
                value={values.name}
                aria-invalid={!!fieldErrors.name}
                onChange={(e) => {
                  onChange("name", e.target.value);
                  onClearFieldError("name");
                }}
              />
            </FormField>

            <FormField label="机构类型" required error={fieldErrors.orgType}>
              <Select
                value={values.orgType}
                options={ORG_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                onValueChange={(value) => {
                  onChange("orgType", value);
                  onClearFieldError("orgType");
                }}
              >
                <SelectTrigger className="h-11" aria-invalid={!!fieldErrors.orgType}>
                  <SelectValue placeholder="请选择机构类型" />
                </SelectTrigger>
                <SelectContent>
                  {ORG_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="统一社会信用代码" htmlFor="reg-credit" required error={fieldErrors.creditCode}>
              <Input
                id="reg-credit"
                className="h-11 font-mono text-xs"
                placeholder="18 位"
                maxLength={18}
                value={values.creditCode}
                aria-invalid={!!fieldErrors.creditCode}
                onChange={(e) => {
                  onChange("creditCode", e.target.value.toUpperCase());
                  onClearFieldError("creditCode");
                }}
              />
            </FormField>

            <FormField label="机构手机号" htmlFor="reg-phone" required error={fieldErrors.phone}>
              <Input
                id="reg-phone"
                className="h-11"
                autoComplete="tel"
                placeholder="11 位大陆手机号（登录账号）"
                maxLength={11}
                value={values.phone}
                aria-invalid={!!fieldErrors.phone}
                onChange={(e) => {
                  onChange("phone", e.target.value);
                  onClearFieldError("phone");
                }}
              />
            </FormField>

            <RegionCascader
              value={values.location}
              onChange={(next) => {
                onChange("location", next);
                onClearFieldError("location");
              }}
              required
              enableLocate
              autoLocate
              showRegionCode={false}
              error={fieldErrors.location}
            />
          </form>
        </ScrollArea>

        <div className="mt-5 grid gap-3">
          <Button type="submit" form="register-form" size="lg" className="h-11 w-full gap-2" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                开通中…
              </>
            ) : (
              <>
                注册开通
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            已有账号？{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              去登录
            </Link>
          </p>
        </div>
      </section>
    </AuthFadeIn>
  );
}
