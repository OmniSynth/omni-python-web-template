import { FormField } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { useProfilePage } from "../hooks/use-profile-page";
import { ProfileAvatar } from "./profile-avatar";

type ProfilePageState = ReturnType<typeof useProfilePage>;

export function ProfileBasicSection({ page }: { page: ProfilePageState }) {
  return (
    <section className="surface-glass grid gap-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">基本资料</h2>
      <div className="flex items-center gap-4">
        <ProfileAvatar displayName={page.displayName} username={page.username} avatarUrl={page.avatarUrl} />
        <div className="min-w-0 space-y-2 text-sm text-muted-foreground">
          <p>用户名：{page.username || "—"}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="profile-avatar-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="max-w-xs cursor-pointer"
              disabled={page.uploadingAvatar}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void page.handleUploadAvatar(file);
              }}
            />
            {page.uploadingAvatar ? <span className="text-xs">上传中…</span> : null}
          </div>
          {page.fieldErrors.avatarUrl ? (
            <p className="text-xs text-destructive">{page.fieldErrors.avatarUrl}</p>
          ) : (
            <p className="text-xs">支持 JPEG / PNG / WebP / GIF，最大 2MB；上传后立即生效。</p>
          )}
        </div>
      </div>
      <FormField label="昵称" htmlFor="profile-display-name" required error={page.fieldErrors.displayName}>
        <Input
          id="profile-display-name"
          value={page.displayName}
          aria-invalid={!!page.fieldErrors.displayName}
          onChange={(e) => {
            page.setDisplayName(e.target.value);
            page.clearFieldError("displayName");
          }}
        />
      </FormField>
      <div>
        <Button type="button" disabled={page.savingProfile} onClick={() => void page.handleSaveProfile()}>
          保存资料
        </Button>
      </div>
    </section>
  );
}

export function ProfilePasswordSection({ page }: { page: ProfilePageState }) {
  return (
    <section className="surface-glass grid gap-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">修改密码</h2>
      <FormField label="原密码" htmlFor="profile-old-password" error={page.fieldErrors.oldPassword}>
        <Input
          id="profile-old-password"
          type="password"
          autoComplete="current-password"
          value={page.oldPassword}
          onChange={(e) => {
            page.setOldPassword(e.target.value);
            page.clearFieldError("oldPassword");
          }}
        />
      </FormField>
      <FormField label="新密码" htmlFor="profile-new-password" error={page.fieldErrors.newPassword}>
        <Input
          id="profile-new-password"
          type="password"
          autoComplete="new-password"
          value={page.newPassword}
          onChange={(e) => {
            page.setNewPassword(e.target.value);
            page.clearFieldError("newPassword");
          }}
        />
      </FormField>
      <FormField label="确认新密码" htmlFor="profile-confirm-password" error={page.fieldErrors.confirmPassword}>
        <Input
          id="profile-confirm-password"
          type="password"
          autoComplete="new-password"
          value={page.confirmPassword}
          onChange={(e) => {
            page.setConfirmPassword(e.target.value);
            page.clearFieldError("confirmPassword");
          }}
        />
      </FormField>
      <div>
        <Button
          type="button"
          variant="secondary"
          disabled={page.savingPassword}
          onClick={() => void page.handleChangePassword()}
        >
          修改密码
        </Button>
      </div>
    </section>
  );
}

export function ProfileIdentitySection({ page }: { page: ProfilePageState }) {
  const identityVerified = page.profile?.identity_verified === true;

  return (
    <section className="surface-glass grid gap-4 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-foreground">实名认证</h2>
      {identityVerified ? (
        <div className="grid gap-2 text-sm">
          <p>
            <Label className="text-muted-foreground">姓名</Label>
            <span className="ml-2">{page.profile?.real_name}</span>
          </p>
          <p>
            <Label className="text-muted-foreground">身份证号</Label>
            <span className="ml-2">{page.profile?.id_card_masked}</span>
          </p>
          {page.profile?.identity_verified_at ? (
            <p className="text-xs text-muted-foreground">
              认证时间：{page.formatDateTime(page.profile.identity_verified_at)}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">提交后不可修改；身份证号仅存储哈希与脱敏展示。</p>
          <FormField label="姓名" htmlFor="profile-real-name" required error={page.fieldErrors.realName}>
            <Input
              id="profile-real-name"
              value={page.realName}
              onChange={(e) => {
                page.setRealName(e.target.value);
                page.clearFieldError("realName");
              }}
            />
          </FormField>
          <FormField label="身份证号" htmlFor="profile-id-card" required error={page.fieldErrors.idCard}>
            <Input
              id="profile-id-card"
              value={page.idCard}
              maxLength={18}
              onChange={(e) => {
                page.setIdCard(e.target.value);
                page.clearFieldError("idCard");
              }}
            />
          </FormField>
          <div>
            <Button type="button" disabled={page.savingIdentity} onClick={() => void page.handleVerifyIdentity()}>
              提交认证
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
