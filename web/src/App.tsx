import { Suspense } from "react";
import { BrowserRouter, type RouteObject, useRoutes } from "react-router-dom";
import { BlockingErrorHost } from "@/components/form/blocking-error-host";
import { AppShell } from "@/components/layout/AppShell";
import { PendingRegisterCredentialsHost } from "@/components/PendingRegisterCredentialsHost";
import { RequireAuth, RequirePermission } from "@/components/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { APP_MENU_ROUTES } from "@/lib/app-menu-routes";
import { pageComponent } from "@/lib/page-registry";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { TenantSelectPage } from "@/pages/TenantSelectPage";

const pageFallback = <p className="p-6 text-muted-foreground">加载中…</p>;
const appShellElement = <AppShell />;

function menuRouteObjects(menus: Array<{ code: string; path: string; componentKey: string }>): RouteObject[] {
  const routes: RouteObject[] = [];
  for (const menu of menus) {
    const Component = pageComponent(menu.componentKey);
    if (!Component) continue;
    routes.push({
      element: <RequirePermission permission={menu.code} />,
      children: [
        {
          path: menu.path,
          element: (
            <Suspense fallback={pageFallback}>
              <Component />
            </Suspense>
          ),
        },
      ],
    });
  }
  return routes;
}

const APP_ROUTE_CONFIG: RouteObject[] = [
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/select-tenant", element: <TenantSelectPage /> },
      {
        element: appShellElement,
        children: [...menuRouteObjects(APP_MENU_ROUTES), { path: "*", element: <NotFoundPage /> }],
      },
    ],
  },
];

function AppRoutes() {
  return useRoutes(APP_ROUTE_CONFIG);
}

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <TimezoneProvider>
          <TooltipProvider delay={200}>
            <BrowserRouter>
              <AppRoutes />
              <PendingRegisterCredentialsHost />
            </BrowserRouter>
            <Toaster />
            <BlockingErrorHost />
          </TooltipProvider>
        </TimezoneProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
