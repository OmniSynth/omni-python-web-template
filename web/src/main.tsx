import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { openAppDb } from "@/db/app-db";
import { applyDeviceDocumentTitle } from "@/lib/device-tenant-display";
import { useAuthStore } from "@/stores/auth-store";
import { App } from "./App";
import "./index.css";

applyDeviceDocumentTitle();

function renderApp(): void {
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

async function bootstrap() {
  try {
    await openAppDb();
    await useAuthStore.getState().hydrate();
  } catch (err) {
    console.error("[omni] 启动本地存储失败，继续无缓存模式", err);
    useAuthStore.setState({ loading: false, refreshing: false });
  }
  renderApp();
  void useAuthStore.getState().refresh();
}

void bootstrap();
