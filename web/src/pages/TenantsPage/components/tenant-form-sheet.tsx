import type { SubmitEvent } from "react";
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
import type { RegionSelection } from "@/lib/china-region";
import { tenantBindableRoleOptions } from "@/lib/role-type";
import type { OrganizationRecord, RoleRecord, TenantAdminUserOption, TenantRecord } from "@/types/auth";
import { ADMIN_AUTO, ORG_TYPE_LABELS } from "../types";
import { formatAdminOptionLabel, previewCodePrefix } from "../utils";

type TenantFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: TenantRecord | null;
  orgs: OrganizationRecord[];
  selectedOrg: OrganizationRecord | undefined;
  orgId: string;
  name: string;
  setName: (value: string) => void;
  phone: string;
  setPhone: (value: string) => void;
  location: RegionSelection;
  setLocation: (value: RegionSelection) => void;
  adminUserId: string;
  setAdminUserId: (value: string) => void;
  adminUserOptions: TenantAdminUserOption[];
  systemRoleCodes: string[];
  tenantBindableRoles: RoleRecord[];
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  fieldErrors: Record<string, string>;
  clearFieldError: (field: string) => void;
  sectionError: string;
  onOrgChange: (orgId: string) => void;
  onToggleSystemRole: (code: string, checked: boolean) => void;
  onSubmit: (e: SubmitEvent) => void;
};

export function TenantFormSheet({
  open,
  onOpenChange,
  editing,
  orgs,
  selectedOrg,
  orgId,
  name,
  setName,
  phone,
  setPhone,
  location,
  setLocation,
  adminUserId,
  setAdminUserId,
  adminUserOptions,
  systemRoleCodes,
  tenantBindableRoles,
  enabled,
  setEnabled,
  fieldErrors,
  clearFieldError,
  sectionError,
  onOrgChange,
  onToggleSystemRole,
  onSubmit,
}: TenantFormSheetProps) {
  const codePreview = editing ? null : previewCodePrefix(selectedOrg, location.region);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "编辑租户" : "新建租户"}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <form id="tenant-form" className="grid gap-4" onSubmit={onSubmit}>
            {editing ? (
              <div className="grid gap-2">
                <Label>编码</Label>
                <Input value={editing.code} disabled className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">编码创建后不可修改</p>
              </div>
            ) : (
              <FormField label="所属机构" required error={fieldErrors.orgId}>
                <Select
                  value={orgId || undefined}
                  options={orgs.map((o) => ({
                    value: String(o.id),
                    label: `${o.name}（${ORG_TYPE_LABELS[o.org_type] ?? o.org_type}）`,
                  }))}
                  onValueChange={onOrgChange}
                  required
                >
                  <SelectTrigger aria-invalid={!!fieldErrors.orgId}>
                    <SelectValue placeholder="请选择机构" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}（{ORG_TYPE_LABELS[o.org_type] ?? o.org_type}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedOrg ? (
                  <p className="text-xs text-muted-foreground">
                    行业前缀取自机构类型：{ORG_TYPE_LABELS[selectedOrg.org_type] ?? selectedOrg.org_type}
                  </p>
                ) : null}
                {codePreview ? (
                  <p className="text-xs text-muted-foreground">
                    编码将自动生成，形如 <span className="font-mono">{codePreview}</span>
                  </p>
                ) : null}
              </FormField>
            )}
            <FormField label="名称" htmlFor="tenant-name" required error={fieldErrors.name}>
              <Input
                id="tenant-name"
                value={name}
                aria-invalid={!!fieldErrors.name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearFieldError("name");
                }}
                required
              />
            </FormField>
            <FormField label="租户手机号" htmlFor="tenant-phone" required={!editing} error={fieldErrors.phone}>
              <Input
                id="tenant-phone"
                value={phone}
                aria-invalid={!!fieldErrors.phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  clearFieldError("phone");
                }}
                placeholder="11 位联系电话"
                maxLength={11}
                required={!editing}
              />
            </FormField>
            {open ? (
              <RegionCascader
                key={editing ? `edit-${editing.id}` : "create"}
                value={location}
                onChange={(next) => {
                  setLocation(next);
                  clearFieldError("location");
                }}
                required={!editing}
                error={fieldErrors.location}
              />
            ) : null}
            <FormField label="绑定管理员" error={fieldErrors.adminUserId}>
              <Select
                value={adminUserId || undefined}
                options={[
                  ...(!editing ? [{ value: ADMIN_AUTO, label: "自动匹配（按租户手机号绑定或新建）" }] : []),
                  ...[...adminUserOptions]
                    .sort((a, b) => Number(b.bound) - Number(a.bound))
                    .map((u) => ({
                      value: String(u.id),
                      label: formatAdminOptionLabel(u),
                    })),
                ]}
                onValueChange={(v) => {
                  setAdminUserId(v);
                  clearFieldError("adminUserId");
                }}
              >
                <SelectTrigger aria-invalid={!!fieldErrors.adminUserId}>
                  <SelectValue placeholder="请选择管理员" />
                </SelectTrigger>
                <SelectContent>
                  {!editing ? <SelectItem value={ADMIN_AUTO}>自动匹配（按租户手机号绑定或新建）</SelectItem> : null}
                  {[...adminUserOptions]
                    .sort((a, b) => Number(b.bound) - Number(a.bound))
                    .map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {formatAdminOptionLabel(u)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editing
                  ? "更换管理员后，原管理员将移除 admin 角色，保留其它角色与租户绑定。"
                  : "未手动指定时：若租户手机号已有对应用户则直接绑定，否则新建管理员并返回初始密码。"}
              </p>
            </FormField>
            <FormField label="绑定系统角色">
              {tenantBindableRoleOptions(tenantBindableRoles).map((opt) => {
                const inputId = `tenant-role-${opt.value}`;
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
              {editing ? (
                <p className="text-xs text-muted-foreground">
                  保存后将同步租户管理员权限（绑定角色并集 + 租户用户管理基线权限）
                </p>
              ) : null}
              <FormSectionError>{sectionError}</FormSectionError>
            </FormField>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="tenant-enabled">启用</Label>
              <Switch id="tenant-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="submit" form="tenant-form">
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
