import { FormField } from "@/components/form/form-field";
import { FormSectionError } from "@/components/form/form-section-error";
import { RegionCascader } from "@/components/region-cascader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { tenantBindableRoleOptions } from "@/lib/role-type";
import { ADMIN_AUTO, formatAdminOptionLabel, ORG_TYPE_OPTIONS, type OrgFormSheetProps } from "../types";

export function OrgFormSheet({
  open,
  onOpenChange,
  editing,
  name,
  orgType,
  creditCode,
  phone,
  location,
  systemRoleCodes,
  tenantBindableRoles,
  adminUserId,
  adminUserOptions,
  enabled,
  fieldErrors,
  sectionError,
  onNameChange,
  onOrgTypeChange,
  onCreditCodeChange,
  onPhoneChange,
  onLocationChange,
  onAdminUserIdChange,
  onToggleSystemRole,
  onEnabledChange,
  onClearFieldError,
  onSubmit,
}: OrgFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "编辑机构" : "新建机构"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form id="org-form" className="grid gap-4" onSubmit={onSubmit}>
            <FormField label="名称" htmlFor="org-name" required error={fieldErrors.name}>
              <Input
                id="org-name"
                value={name}
                aria-invalid={!!fieldErrors.name}
                onChange={(e) => {
                  onNameChange(e.target.value);
                  onClearFieldError("name");
                }}
                required
              />
            </FormField>
            <FormField label="机构手机号" htmlFor="org-phone" required={!editing} error={fieldErrors.phone}>
              <Input
                id="org-phone"
                value={phone}
                aria-invalid={!!fieldErrors.phone}
                onChange={(e) => {
                  onPhoneChange(e.target.value);
                  onClearFieldError("phone");
                }}
                placeholder="11 位，机构联系电话（全局唯一）"
                maxLength={11}
                required={!editing}
              />
            </FormField>
            {!editing && open ? (
              <RegionCascader
                value={location}
                onChange={(next) => {
                  onLocationChange(next);
                  onClearFieldError("location");
                }}
                required
                error={fieldErrors.location}
              />
            ) : null}
            <FormField label="统一社会信用代码" htmlFor="org-credit-code" required error={fieldErrors.creditCode}>
              <Input
                id="org-credit-code"
                value={creditCode}
                aria-invalid={!!fieldErrors.creditCode}
                onChange={(e) => {
                  onCreditCodeChange(e.target.value.toUpperCase());
                  onClearFieldError("creditCode");
                }}
                placeholder="18 位"
                maxLength={18}
                className="font-mono text-xs"
                required
              />
            </FormField>
            <FormField label="类型">
              <Select
                value={orgType}
                options={ORG_TYPE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                onValueChange={onOrgTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
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
            {!editing ? (
              <FormField label="绑定管理员">
                <Select
                  value={adminUserId}
                  options={[
                    { value: ADMIN_AUTO, label: "自动匹配（按机构手机号绑定或新建）" },
                    ...adminUserOptions.map((u) => ({
                      value: String(u.id),
                      label: formatAdminOptionLabel(u),
                    })),
                  ]}
                  onValueChange={onAdminUserIdChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ADMIN_AUTO}>自动匹配（按机构手机号绑定或新建）</SelectItem>
                    {adminUserOptions.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {formatAdminOptionLabel(u)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  未手动指定时：若机构手机号已有对应用户则直接绑定，否则新建管理员并返回初始密码。
                </p>
              </FormField>
            ) : null}
            {!editing ? (
              <FormField label="绑定系统角色">
                {tenantBindableRoleOptions(tenantBindableRoles).map((opt) => {
                  const inputId = `org-role-${opt.value}`;
                  return (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={inputId}
                        checked={systemRoleCodes.includes(opt.value)}
                        onCheckedChange={(checked) => onToggleSystemRole(opt.value, checked === true)}
                      />
                      <Label htmlFor={inputId} className="cursor-pointer font-normal text-foreground">
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
                <FormSectionError>{sectionError}</FormSectionError>
              </FormField>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="org-enabled">启用</Label>
              <Switch id="org-enabled" checked={enabled} onCheckedChange={onEnabledChange} />
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="org-form">
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
