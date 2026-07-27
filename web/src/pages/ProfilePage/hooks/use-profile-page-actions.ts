import type { Dispatch, SetStateAction } from "react";
import { api } from "@/lib/api";
import { errorMessage, showToastError, showToastSuccess } from "@/lib/form-feedback";
import type { UserProfile } from "@/types/auth";

export function useProfilePageActions({
  displayName,
  avatarUrl,
  setAvatarUrl,
  oldPassword,
  newPassword,
  confirmPassword,
  realName,
  idCard,
  clearFieldErrors,
  setFieldErrors,
  setProfile,
  setSavingProfile,
  setUploadingAvatar,
  setSavingPassword,
  setSavingIdentity,
  setOldPassword,
  setNewPassword,
  setConfirmPassword,
  setIdCard,
  refreshAuth,
}: {
  displayName: string;
  avatarUrl: string;
  setAvatarUrl: Dispatch<SetStateAction<string>>;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  realName: string;
  idCard: string;
  clearFieldErrors: () => void;
  setFieldErrors: (errors: Record<string, string>) => void;
  setProfile: Dispatch<SetStateAction<UserProfile | null>>;
  setSavingProfile: Dispatch<SetStateAction<boolean>>;
  setUploadingAvatar: Dispatch<SetStateAction<boolean>>;
  setSavingPassword: Dispatch<SetStateAction<boolean>>;
  setSavingIdentity: Dispatch<SetStateAction<boolean>>;
  setOldPassword: Dispatch<SetStateAction<string>>;
  setNewPassword: Dispatch<SetStateAction<string>>;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  setIdCard: Dispatch<SetStateAction<string>>;
  refreshAuth: () => Promise<void>;
}) {
  async function handleSaveProfile() {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!displayName.trim()) errors.displayName = "昵称必填";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await api.profile.update({
        display_name: displayName.trim(),
      });
      setProfile(updated);
      setAvatarUrl(updated.avatar_url ?? avatarUrl);
      await refreshAuth();
      showToastSuccess("资料已保存");
    } catch (err) {
      showToastError(errorMessage(err, "保存失败"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleUploadAvatar(file: File) {
    clearFieldErrors();
    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors({ avatarUrl: "头像文件不能超过 2MB" });
      return;
    }
    setUploadingAvatar(true);
    try {
      const updated = await api.profile.uploadAvatar(file);
      setProfile(updated);
      setAvatarUrl(updated.avatar_url ?? "");
      await refreshAuth();
      showToastSuccess("头像已更新");
    } catch (err) {
      showToastError(errorMessage(err, "头像上传失败"));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleChangePassword() {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!oldPassword) errors.oldPassword = "请输入原密码";
    if (!newPassword) errors.newPassword = "请输入新密码";
    else if (newPassword.length < 6) errors.newPassword = "新密码至少 6 位";
    if (newPassword !== confirmPassword) errors.confirmPassword = "两次输入不一致";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSavingPassword(true);
    try {
      await api.profile.changePassword({ old_password: oldPassword, new_password: newPassword });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToastSuccess("密码已修改");
    } catch (err) {
      showToastError(errorMessage(err, "修改密码失败"));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleVerifyIdentity() {
    clearFieldErrors();
    const errors: Record<string, string> = {};
    if (!realName.trim()) errors.realName = "姓名必填";
    if (!idCard.trim()) errors.idCard = "身份证号必填";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setSavingIdentity(true);
    try {
      const updated = await api.profile.verifyIdentity({
        real_name: realName.trim(),
        id_card: idCard.trim(),
      });
      setProfile(updated);
      setIdCard("");
      showToastSuccess("实名认证已提交");
    } catch (err) {
      showToastError(errorMessage(err, "实名认证失败"));
    } finally {
      setSavingIdentity(false);
    }
  }

  return { handleSaveProfile, handleUploadAvatar, handleChangePassword, handleVerifyIdentity };
}
