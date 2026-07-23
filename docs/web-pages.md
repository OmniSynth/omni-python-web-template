# Web 页面目录规范

## 硬性标准

| 规则 | 限制 |
|---|---|
| 单文件行数 | ≤ 400（ESLint `max-lines`，忽略空行与注释） |
| 单行字符 | ≤ 120（ESLint `max-len`；Prettier `printWidth: 120`） |

校验：`cd web && npm run lint`（`max-lines` 仅作用于 `src/pages/`）

## 何时目录化

所有 `pages/` 下页面均已采用 **Page-as-Folder** 结构（含登录、404 等简单页面）。

| 行数 | 结构 |
|---|---|
| 任意 | `pages/FooPage/index.tsx` 导出 `FooPage`；复杂页面再拆 `hooks/`、`components/` |

当前目录化页面：HomePage、UsersPage、AuditLogsPage、DeptsPage、TenantsPage、RolesPage、OrgsPage、PermissionsPage、ScheduledJobsPage、DevParamsPage、ProfilePage、LoginPage、TenantSelectPage、NotFoundPage。

## Page-as-a-Folder 结构

```
pages/UsersPage/
├── index.tsx           # 入口：组合 hooks 与子组件，导出 UsersPage
├── types.ts            # 页面专属类型
├── utils.ts            # 纯函数辅助
├── hooks/              # 页面专属状态与副作用
│   ├── use-users-page.ts
│   └── use-user-columns.tsx
└── components/         # 页面专属 UI，禁止泄漏到全局 components/
    ├── user-form-sheet.tsx
    └── password-reveal-dialog.tsx
```

## 职责边界

- **index.tsx**：装配中心，不写复杂业务逻辑
- **hooks/**：列表加载、表单提交、弹窗状态
- **components/**：接收 props 渲染，无跨页面复用则放页面内
- **全局** `components/`：跨 ≥2 页面复用才提升
- **全局** `hooks/`：与具体页面无关的抽象（如 `useClientTable`）
- **stores/**：跨页面高频状态（auth、行情等）；页面内状态留 hooks

## 路由注册

`page-registry.ts` 的 import 路径保持 `@/pages/UsersPage`，文件夹需提供 `index.tsx` 并 `export function UsersPage`。

简单页面（LoginPage、NotFoundPage、TenantSelectPage）亦为文件夹，内容较少时仅含 `index.tsx`。

## 相关文档

- [Web 客户端状态](web-client-state.md)
- [Web 表格与列偏好](web-tables.md)
