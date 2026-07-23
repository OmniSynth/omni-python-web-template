import { useNavigate } from "react-router-dom";
import { Page, PageBody, PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function NotFoundPage() {
  const { user, logout, defaultHomePath } = useAuth();
  const navigate = useNavigate();

  function goHome() {
    navigate(user ? (defaultHomePath ?? "/") : "/login", { replace: true });
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <Page>
      <PageHeader title="404" subtitle="你访问的地址不存在，或已被移动" />
      <PageBody className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="text-5xl font-normal tabular-nums text-muted-foreground">404</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={goHome}>
              返回首页
            </Button>
            {user ? (
              <Button type="button" variant="secondary" onClick={handleLogout}>
                退出登录
              </Button>
            ) : null}
          </div>
        </div>
      </PageBody>
    </Page>
  );
}
