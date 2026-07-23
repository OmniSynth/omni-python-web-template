import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CredentialsDialog } from "@/components/CredentialsDialog";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingRegisterCredentials, peekPendingRegisterCredentials } from "@/lib/pending-register-credentials";
import type { ProvisionCredentials } from "@/types/auth";

const PUBLIC_AUTH_PATHS = new Set(["/", "/login", "/register"]);

/** 注册成功进入系统并完成会话加载后，弹出一次性管理员密码。 */
export function PendingRegisterCredentialsHost() {
  const { user, loading, refreshing } = useAuth();
  const location = useLocation();
  const [credentials, setCredentials] = useState<ProvisionCredentials | null>(null);

  useEffect(() => {
    if (credentials) return;
    if (!user || loading || refreshing) return;
    if (PUBLIC_AUTH_PATHS.has(location.pathname)) return;

    const pending = peekPendingRegisterCredentials();
    if (!pending) return;

    const timer = window.setTimeout(() => {
      setCredentials(pending);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [user, loading, refreshing, location.pathname, credentials]);

  function handleOpenChange(open: boolean) {
    if (open) return;
    clearPendingRegisterCredentials();
    setCredentials(null);
  }

  return (
    <CredentialsDialog
      open={credentials != null}
      onOpenChange={handleOpenChange}
      title="注册成功"
      username={credentials?.username ?? ""}
      password={credentials?.password ?? ""}
    />
  );
}
