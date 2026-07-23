# Web 全局主题

前端源码在 `web/`，使用 **Tailwind CSS v4 + shadcn/ui（Base UI / `base-vega`）**。设计令牌定义在 `web/src/index.css`（`:root` CSS 变量）。

新增 UI 基元组件须通过 shadcn CLI：

```bash
cd web && npx shadcn@latest add <component-name>
```

## 开发

需要 **Node.js 20+**（`web/.nvmrc` 指定版本；`nvm use`）。

```bash
nvm use
cd web
npm install
npm run dev          # http://localhost:5173，/api 代理到后端
```

另开终端：

```bash
uv run main.py
```

## 构建与部署

```bash
cd web && npm run build
```

产物写入 `src/omni_api/web/static/`（`index.html` + `assets/`）。`main.py` 提供 SPA 回退，支持 React Router 路径刷新。

## 配色

取自科技蓝主色 / 黄点缀 / 中性灰：

| 令牌 | 浅色 | 用途 |
|---|---|---|
| `--primary` | `#1677ff` | 主按钮、链接、选中态 |
| `--accent` | `#e8f3ff` | 浅强调底 |
| `--brand-highlight` | `#f8c818` | logo 黄点缀（按需） |
| `--background` | `#eef0f4` | 柔灰页面底（降低整体亮度） |
| `--sheet` | 约 98% 柔白 | 右侧抽屉 |
| `--card` / `--card-solid` | `#f7f8fa` 柔白玻璃 | 内容面板（忌纯白刺眼） |
| `--field` / `--muted` | `#f7f8fa` / `#e8eaef` | 输入框柔白底 / 禁用与次要填充 |
| `--input` | `#cfd4dc` | 输入框边框 |
| `--auth-panel` | 约 70% 白 | 登录表单卡（对齐 login.png） |
| `--auth-panel-soft` | 约 42% 白 | 登录页左侧能力条（高透明玻璃） |

暗色模式对齐 IDEA 炭黑（底 `#2B2B2B`）：

| 令牌 | 暗色 | 用途 |
|---|---|---|
| `--background` | `#2b2b2b` | 页面底（IDEA 主背景） |
| `--card-solid` / `--sidebar` | `#313335` | 抬升面板 / 侧栏 |
| `--popover` / `--sheet` / `--field` | `#3c3f41` | 浮层、抽屉、输入底 |
| `--border` | `#4a4a4a` | 分隔线 |
| `--foreground` | `#d1d1d1` | 正文 |
| `--primary` | `#3e6db5` | 低饱和科技蓝（选中/按钮） |

## 全局玻璃风格

- 共享类：`.surface-glass` / `.surface-glass-strong` / `.surface-glass-pane` / `.sheet-surface`（见 `index.css`）
- UI 基元：Card / Dialog / Popover / Select 等用毛玻璃；**Sheet 抽屉**用近白 `.sheet-surface`（弱饱和模糊，避免透出遮罩冷色）
- 表单输入统一 `fieldControlClass`：柔白 `--field` + 可见 `--input` 边框；悬停/聚焦用主色描边；禁用态改更深灰底以区分
- 表格行使用 `--table-row` / `--table-row-alt`，固定列可透底且不穿字
- 新增面板优先加 `surface-glass`；抽屉内嵌套块用浅底/`border-border/70`，避免再叠一层硬白玻璃

背景层级：氛围底 `--background` → 侧栏/顶栏玻璃 → 内容平面 `.surface-glass-pane`。暗色为 IDEA 炭黑分层，弱蓝雾。

## 响应式布局

### 登录后三栏结构

```
┌──────────────── AppTopHeader 全宽，高≤64px ──────────────┐
├──────── 侧栏（可拖拽宽度，可折叠）─┬── 内容区（无壳层外边距）──┤
│  SidebarNav                  │  PageHeader + PageBody    │
└──────────────────────────────┴───────────────────────────┘
```

- **顶栏** [`AppTopHeader.tsx`](web/src/components/layout/AppTopHeader.tsx)：品牌、当前租户名（`sm+`）、汉堡（`<lg`）；桌面侧栏折叠/展开按钮（`lg+`）；右侧 `UserMenu` 头像菜单（多租户时可切换、**时区**、**时间格式**、退出）。时区与格式约定见 [datetime.md](datetime.md)。
- **侧栏** [`SidebarNav.tsx`](web/src/components/layout/SidebarNav.tsx) + [`desktop-sidebar.tsx`](web/src/components/layout/desktop-sidebar.tsx) + [`horizontal-nav.tsx`](web/src/components/layout/horizontal-nav.tsx)：支持左/右/顶/底四种菜单位置（用户菜单配置）；`lg+` 左/右可拖拽调宽、折叠；顶部与顶栏同一行；`<lg` 左侧 Sheet
- **内容区**：`.surface-glass-pane` 连续玻璃平面；`Page` + `PageHeader` + `PageBody`；列表/表格直接铺陈，分组面板用 `surface-glass`

公开首页 [`HomePage`](web/src/pages/HomePage/index.tsx)：毛玻璃顶栏 + Hero 棱镜动画 + 产品截图宣传（素材在 `web/public/images/`）。登录页为左右分栏（[`LoginPage`](web/src/pages/LoginPage/index.tsx)）；认证壳 [`AuthPageShell`](web/src/components/layout/auth-page-shell.tsx)。业务壳带轻微品牌色氛围底以衬托玻璃。

### 布局令牌（`index.css`）

| 变量 | 默认值 | 含义 |
|---|---|---|
| `--header-height` | `4rem`（64px） | 顶栏高度 |
| `--sidebar-width` | `11.25rem`（180px） | 侧栏最大宽度 |
| `--layout-max` | `1680px` | 登录页等居中场景 |
| `--layout-gutter` | `1rem` | 独立页面边距参考 |

### 断点行为

| 档位 | 宽度 | 行为 |
|---|---|---|
| 手机 / 平板竖屏 | `< lg`（&lt;1024px） | 全宽顶栏 + 汉堡；左侧 `Sheet` 平铺导航；筛选区与 PC 同逻辑（四列 flex + 展开） |
| 桌面 | `lg+` | 顶栏 + 固定侧栏 + 内容区 |
| 带鱼屏 | 超宽视口 | 登录后全宽铺满；`DataTable` 表格横滑 |

### 布局组件

| 组件 | 路径 |
|---|---|
| `AppTopHeader` | `web/src/components/layout/AppTopHeader.tsx` |
| `PageLayout` | `web/src/components/layout/PageLayout.tsx` |
| `AppShell` | `web/src/components/layout/AppShell.tsx` |
| `SidebarNav` | `web/src/components/layout/SidebarNav.tsx` |
| `DataTable` | `web/src/components/layout/DataTable.tsx` |
| `TablePagination` | `web/src/components/layout/TablePagination.tsx` |
| `PageFilterToolbar` | `web/src/components/layout/PageFilterToolbar.tsx` |

- **筛选区**：手机默认全折叠，展开单列全宽；lg 四列（12–14 寸）；2xl 六列（大屏）；操作组右侧「展开|查询|…」
- **分页**：手机单行紧凑；桌面完整页码条

- **表格分页**：列表页用 `useClientPagination` + `TablePagination`；每页条数全站共用（`localStorage` 键 `omni-global-page-size`），切换菜单/刷新后保持不变；数字页码条（1 2 3 … N）+ 页码输入失焦或 Enter 跳转；审计等服务端分页同样读取全局每页条数

- **表单抽屉**：导航 `side="left"`；新建/编辑 `side="right"`

### 开发自检

1. DevTools：`375px`、`768px`、`1280px`、`3440px`
2. 桌面：顶栏 64px 全宽；侧栏 180px；内容区无壳层 margin
3. 手机：顶栏 + 抽屉导航；表格可横滑
4. `npm run build` 无 TypeScript 错误

## 表单与错误反馈

控件与错误分级规范见 [web-forms.md](web-forms.md)。要点：

| 组件 | 路径 |
|---|---|
| `FormField` / `RequiredMark` / `FieldError` | `web/src/components/form/` |
| `useFieldErrors` | `web/src/hooks/useFieldErrors.ts` |
| `showToastError` / `showBlockingError` | `web/src/lib/form-feedback.ts` |
| `Toaster` | `web/src/components/ui/sonner.tsx`（挂载于 `App.tsx`） |

- 表单字段：`FormField` + shadcn 控件；必填自动渲染 `*`
- 校验失败：字段下方内联（P1）→ Toast（P2）→ AlertDialog（P3）
- 禁止业务层使用原生 checkbox/select/textarea

## 页面

| 路由 | 组件 |
|---|---|
| `/login` | `LoginPage` |
| `/users` | `UsersPage`（租户） |
| `/roles` | `RolesPage`（租户） |
| `/depts` | `DeptsPage`（租户） |
| `/profile` | `ProfilePage` |
| `/dev-params` | `DevParamsPage` |
| `/sys/users` | `UsersPage`（平台） |
| `/sys/roles` | `RolesPage`（平台） |
| `/sys/permissions` | `PermissionsPage` |
| `/sys/audit` | `AuditLogsPage` |
| `/sys/scheduled-jobs` | `ScheduledJobsPage` |
| `/sys/orgs` | `OrgsPage` |
| `/sys/tenants` | `TenantsPage` |

共用布局：`components/layout/AppShell.tsx`（`PageHeader`、`PageBody`）。
