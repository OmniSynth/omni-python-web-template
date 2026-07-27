import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { api } from "@/lib/api";
import type { UserProfile } from "@/types/auth";
import { useProfilePageActions } from "./use-profile-page-actions";

export function useProfilePage() {
  const { user, refresh: refreshAuth } = useAuth();
  const { formatDateTime } = useTimezone();
  const { fieldErrors, setFieldErrors, clearFieldError, clearFieldErrors } = useFieldErrors();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageLoadError, setPageLoadError] = useState("");
  const [displayName, setDisplayName] = useState(() => user?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(() => user?.avatar_url ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [realName, setRealName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);

  const load = useCallback(async () => {
    const data = await api.profile.get();
    setProfile(data);
    setDisplayName(data.display_name);
    setAvatarUrl(data.avatar_url ?? "");
  }, []);

  useEffect(() => {
    load()
      .then(() => setPageLoadError(""))
      .catch((e: Error) => setPageLoadError(e.message));
  }, [load]);

  const username = profile?.username ?? user?.username ?? "";

  const { handleSaveProfile, handleUploadAvatar, handleChangePassword, handleVerifyIdentity } = useProfilePageActions({
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
  });

  return {
    profile,
    username,
    pageLoadError,
    displayName,
    setDisplayName,
    avatarUrl,
    uploadingAvatar,
    savingProfile,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    savingPassword,
    realName,
    setRealName,
    idCard,
    setIdCard,
    savingIdentity,
    fieldErrors,
    clearFieldError,
    formatDateTime,
    handleSaveProfile,
    handleUploadAvatar,
    handleChangePassword,
    handleVerifyIdentity,
  };
}
