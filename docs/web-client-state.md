# Web 客户端状态与本地存储

## 概述

前端会话与表格偏好统一由 **Zustand**（内存 React 状态）与 **Dexie**（IndexedDB `omni-local`）管理。登出或 API 401 时调用 `purgeLocalSession()` 清空会话域数据，防止跨账号信息泄漏。

设备级展示偏好（时区、日期格式、租户品牌名）存 `localStorage`，登出时保留。

## 架构

```
main.tsx bootstrap
  → openAppDb（失败则降级）
  → authStore.hydrate（有缓存则 loading=false，立即可渲染）
  → render App
  → authStore.refresh（后台 API 对齐，refreshing=true 不阻塞）

AuthProvider
  → document.title 随 currentTenant 更新

useAuth() ← AuthContext 瘦封装 ← useAuthStore
useTablePreferences ← table-pref-repo ← Dexie
```

## Dexie 数据库 `omni-local`

| 表 | 主键 | 说明 |
|---|---|---|
| `session` | `id: 'current'` | 单例行：token、user、navTree、tenantDisplay |
| `tablePreferences` | `preferenceStorageKey(userId, pageKey, tableKey)` | 表格列偏好，结构同 `CachedTablePreference` |

模块路径：`web/src/db/`（`app-db.ts`、`session-repo.ts`、`table-pref-repo.ts`、`types.ts`）。

IndexedDB 在 Safari 隐私模式或存储受限时可能不可用；`openAppDb()` 失败会降级为无本地缓存，应用仍可正常加载。

## Zustand `auth-store`

路径：`web/src/stores/auth-store.ts`

| 状态 | 说明 |
|---|---|
| `token` | 内存持有，供 `authHeaders()` 同步读取 |
| `user`, `navTree`, `boundTenants`, `tenantDisplayCache` | 与旧 AuthContext 一致 |
| `loading` | 无本地用户、等待首次鉴权时为 true；`RequireAuth` 仅在 `loading && !user` 时全屏阻塞 |
| `refreshing` | 有缓存会话、后台 `refresh` 与 API 对齐时为 true；顶栏细线提示，不阻塞页面 |

| 动作 | 说明 |
|---|---|
| `hydrate()` | 从 Dexie session 表填充 store（防刷新顶栏抖动） |
| `login` / `logout` / `refresh` / `switchTenant` | 会话生命周期 |
| `reset()` | 内存态归零（`purgeLocalSession` 后由调用方触发） |

对外 API：`useAuth()` 仍从 `web/src/contexts/AuthContext.tsx` 导出，调用方无需改 import。

`web/src/lib/auth.ts` 的 `getToken()` 读 store；`setToken` / `clearToken` 为空实现。

## 登出清理 `purgeLocalSession`

路径：`web/src/lib/purge-local-data.ts`

1. `deleteAppDb()` 删除整个 IndexedDB `omni-local`（含会话与表格偏好）
2. `openAppDb()` 重建空库实例
3. 清空 `localStorage` **除** `omni-timezone`、`omni-datetime-format`、`omni-tenant-display`、`omni-sidebar-layout` 外的所有键

调用方须随后 `useAuthStore.getState().reset()`。

| 触发点 | 行为 |
|---|---|
| `auth-store.logout()` | purge + reset |
| `auth-store.refresh()` 鉴权失败 | purge + reset |
| `api.ts` 401 响应 | dynamic import purge + reset |

## 设备级租户品牌

路径：`web/src/lib/device-tenant-display.ts`；`localStorage` 键 `omni-tenant-display`。

| 场景 | 标签页 / 顶栏 |
|---|---|
| 登录并选定租户 | 写入设备级缓存 |
| 刷新 | `index.html` 内联脚本 + `main.tsx` 同步读，首屏不闪烁 |
| 切换租户 | `syncTenantDisplayFromBoundTenants` 更新 |
| 登出 | 保留上次租户名（白名单不清理） |

顶栏与标签页通过 `resolveBrandTenantDisplay()` 合并会话租户与设备缓存。

## 设备级导航树

路径：`web/src/lib/nav-tree-cache.ts`；`localStorage` 键 `omni-nav-tree`（按 `user_id` + `tenant_id` 隔离）。

| 场景 | 侧栏 |
|---|---|
| 登录 / 切换租户 | 写入 Dexie session 与 localStorage |
| 刷新（权限未变） | `hydrate` 读缓存立即可渲染；`refresh` 深比较后**不**替换 navTree，避免抖动 |
| 刷新（权限已变） | `refresh` 更新 store、Dexie 与 localStorage |
| 登出 | 随 `purgeLocalSession` 清除（非白名单） |

`hydrate` 合并 IndexedDB 与 localStorage：均按 `sort_order` 规范化；两者不一致时优先 localStorage（通常由上次 `refresh` 写入）；若合并结果与 IndexedDB 不同则回写 IndexedDB 自愈。

## 侧栏目录展开状态

路径：`web/src/lib/nav-expanded-cache.ts`；`localStorage` 键 `omni-nav-expanded`（按 `user_id` + `tenant_id` 隔离）。

刷新时从缓存恢复已展开目录，且当前路由所属目录首帧同步展开，避免「先折叠再弹开」的视觉抖动。

## 设备级导航布局

路径：`web/src/lib/device-nav-layout.ts`；`localStorage` 键 `omni-sidebar-layout`。

| 字段 | 说明 |
|---|---|
| `position` | 菜单位置：`left` / `right` / `top` / `bottom` |
| `width` | 左/右侧栏宽度（px），可拖拽，范围 160–360 |
| `collapsed` | 左/右侧栏是否折叠隐藏 |
| `expandFab` | 折叠后悬浮展开按钮坐标（px，`fixed` 定位） |

| 场景 | 行为 |
|---|---|
| 切换位置 / 拖拽 / 折叠 | 即时写入 localStorage |
| 刷新 | 同步读取，位置、宽度、折叠状态保持不变 |
| 登出 | 白名单保留（与租户展示、时区同级） |

- **顶部 / 底部**：目录 + 悬浮子菜单（`lg+`）；顶部嵌入顶栏，底部在内容区下方；底栏样式与顶栏一致（`bg-card`）
- **左/右**：可拖拽调宽、可折叠；折叠后悬浮展开按钮可自由拖动且置顶；`<lg` 统一 Sheet

用户菜单 → **菜单位置** 可切换四种布局。

## 与时区模块的关系

`TimezoneContext`（`omni-timezone`、`omni-datetime-format`）不在 Zustand 迁移范围内；`purgeLocalSession` 白名单保留上述键、`omni-tenant-display` 与 `omni-sidebar-layout`。详见 [AGENTS.md](../AGENTS.md)「UTC」。

## 相关文档

- [Web 表格与列偏好](web-tables.md)
- [接口与路由](interfaces.md)
