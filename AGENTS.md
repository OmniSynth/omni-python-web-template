# Agent 指南

本文件是本仓库 AI 编码规则的**唯一源**。Cursor、Claude Code、Copilot、Codex、Antigravity 等均应遵守此处约定；勿再维护 `.cursor/rules`、`.agent/rules` 等平行副本。

---

# 中文

- 代码注释、docstring、项目文档用中文（库名、命令可保留英文）。
- 与用户对话、任务总结用中文。

# 执行约束

- 禁止以「太难」「性能不够」「工作量大」为由拒绝或只给伪代码。
- Python 禁止 `# TODO`、 `# ... 保持不变 ...`、`# 请在此处添加逻辑`（局部补丁且上下文已明确时除外）。
- React 禁止 `/* ... 保持不变 ... */` 注释。、`// TODO`、`// ... 保持不变 ...`、`// 请在此处添加逻辑`。
- 生成的函数/方法须完整可运行，不得留 `NameError` 级缺口。

# 死代码与卫生（强制）

变更交付前须确保**无死代码**；禁止“先加新实现、旧路径/多余 import 留着以后再清”。

## 禁止留下

- 未使用的 `import` / `from … import`（含仅类型用却未 `TYPE_CHECKING` 化的多余运行时导入）。
- 未使用的函数、方法、类、常量、变量、类型别名（含重构后不再被调用的旧 API）。
- 仅被上述死代码引用的级联私有辅助（删除入口后须一并删除）。
- 为通过检查而写的空壳实现、永远不走的分支、注释掉的大段旧代码。

## 变更时义务

- **替换**：新路径可用后，同一变更内删除旧函数/旧 import/旧调用点。
- **收窄**：删公共方法后，清理仅为其服务的 `_private` 辅助与相关字段/缓存。
- **重命名/搬迁**：同一变更内更新全部引用；禁止残留指向旧符号的 import。
- **完成前自检**：对改动涉及的 Python 文件确认无未使用符号；前端以 Biome `noUnusedVariables` 为准（`web/` 下 `npm run lint`）。

## 不算死代码（勿误删）

- FastAPI / Starlette 路由处理函数（`@router.*` / `@app.*`）。
- SQLAlchemy / 框架事件回调（`listen`、`event.listens_for` 注册的嵌套函数）。
- Pydantic `field_validator` / `model_validator`、pytest fixture、显式写入 `__all__` 且对外稳定的公共 API。
- 仅通过字符串/注册表分发调用、且仓库内确有注册点的符号。

## 与检查工具

- Python：类型检查中的未使用 import/符号（如 basedpyright `reportUnusedImport` / `reportUnusedFunction` / `reportUnusedVariable`）须清零后再结束任务；`uv run scripts/check_python.py` 不能替代此项。
- 前端：Biome `correctness/noUnusedVariables` 为 error，见下文「Biome」。

# uv

- 依赖：`pyproject.toml` + `uv.lock`；禁止 `pip`/`poetry`/`conda`、禁止 `requirements.txt`、禁止手建 venv。
- 运行 Python/测试/服务：`uv run ...`（含 `pytest`、`uvicorn`、文档与 CI 示例）。

# nvm

- 依赖：进入`web`使用`nvm use node`，禁止直接使用`node install`
- 编译 `npm run build`

# 入口

- 唯一启动：`main.py`（FastAPI + uvicorn）；`uv run main.py`（`--api-only` / `--web-only`）。
- 路由：`src/omni_api/api/`；静态：`web/static/`（`npm run build` 产物）。
- 业务逻辑在 `services/` 与领域模块；API/Web 禁止重复实现。
- 增删路由或页面时同步 `docs/interfaces.md`。

# 布局与文档

## 命名

- 小写；`docs/` 连字符，Python 下划线；一词一责；禁止 `utils`、`common`、`handler`。
- 重命名时同一变更内更新 import 与文档引用。

| 范围 | 示例 |
|---|---|
| Python | `tenant_repo.py`、`auth_service.py` |
| docs | `data-stores.md` |
| config | `local.toml`、`remote.toml` |

## 分层（禁止循环依赖；禁止延迟 import 掩盖环路）

```
L1 main.py、api/、web/ → 路由与 HTTP 适配
L2 services/ → 用例编排
L3 auth/、audit/… → 领域逻辑；禁止直接拼 SQL/Redis
L4 data/mysql|redis/ → 仓储封装
L5 config/、schemas/ → 类型与配置；无 IO
```

- `scripts/`、`tests/` 不得被 `src/` import。
- 同层共享类型放 `schemas/`。
- 分层或目录变更时同步 `docs/architecture.md`。

## 文档

- 正文在 `docs/`；`README.md` 仅简介与索引。
- docs 写职责、流程、配置；不写逐步复述源码。
- 改接口、配置、数据流时同一变更内更新对应 `docs/` 章节。

# UTC

MySQL 列细节见下文「MySQL 表结构」§时间。

## MySQL

- 时间列 `DATETIME(6)` naive UTC；禁止 `TIMESTAMP`、裸 `NOW()` 写业务列。
- 写入：`data/mysql/utc.py` 的 `utc_now()` / `naive_utc()`；连接 `SET time_zone = '+00:00'`。

## API

- 入参：`schemas/utc_datetime.py` → `parse_api_utc()`。
- 出参：`format_api_utc()` → ISO-8601 + `Z` + 6 位小数；DTO 用 `UtcDateTime`。
- API/Service 禁止做用户时区转换。

## Web

- 时区/格式唯一入口：顶栏 `UserMenu`（`omni-timezone`、`omni-datetime-format`）。
- 展示：`useTimezone().formatDateTime`；禁止 `toLocaleString`。
- 日期筛选：`dateOnlyToApiUtc(from|to, timezone, start|end)`；禁止 `toISOString()` 代替用户日界。
- 列表筛选 UI：`PageFilterToolbar` + `DateRangeFilterField`；多视图：`PageTabBar`。
- 参考：`web/src/lib/datetime.ts`、`contexts/TimezoneContext.tsx`、`pages/AuditLogsPage.tsx`。

# Python

编辑 `*.py` 时遵守：

- 公开 API 须类型注解；复杂结构用 `Pydantic` / `dataclasses`。
- 单文件 ≤400 行（≥300 行考虑拆分）；单函数 ≤50 行(不包含注释和空行、函数签名、类型注解)；控制流嵌套 ≤2 层（不包含函数主体）；但行字符宽度 ≤120。
- 禁止 `except: pass` / `except Exception: pass`；禁止 `print` 调试；资源用 `with` / `async with`。
- 禁止硬编码密钥/连接串；禁止模块级可变全局。
- 禁止未使用 import、未使用函数/方法等死代码；细则见上文「死代码与卫生」。
- 分层见上文「布局与文档」；依赖管理见上文「uv」。
- 提交前：`uv run scripts/check_python.py`（与本文一致；`scripts/` 允许 `print` 作 CLI 输出，`tests/` 豁免函数体行数与控制流嵌套检查；MySQL DDL 列注释见下文「MySQL 表结构」）。

# MySQL 表结构

编辑 `*.py` / `*.sql` 中的 DDL 时遵守：

## 列注释

- `CREATE TABLE` 每个业务列须 `COMMENT '…'`，简洁准确；禁止无注释列。
- 枚举/状态列注释须列出合法取值（如 `数据权限：1仅本人 2本部门 …`）。
- 复用 `data/mysql/ddl_comments.py` 常量；审计列见同文件 `AUDIT_COLUMN_DEFS`。
- 提交前：`uv run scripts/check_python.py` 会校验 `*_sql.py` 等 DDL 文件。
- 注释随 `CREATE TABLE` 写入；新库以 DDL 为准，不做运行时 COMMENT 同步。

## 审计字段（业务表必选）

顺序：业务列 → 审计列 → 索引/外键。

| 字段 | 类型 |
|---|---|
| `id` | `BIGINT AUTO_INCREMENT PRIMARY KEY` |
| `created_at` | `DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)` |
| `updated_at` | `DATETIME(6) … ON UPDATE CURRENT_TIMESTAMP(6)` |
| `created_by` | `BIGINT NULL` → `t_sys_user.id` |
| `updated_by` | `BIGINT NULL` → `t_sys_user.id` |

- 自然键可 `UNIQUE`，不得替代 `id`。
- 复用 `data/mysql/ddl_comments.py` 的 `AUDIT_COLUMN_DEFS`（经 `audit.py` re-export）。

## 时间

- 全部 `DATETIME(6)` naive UTC；写入 `utc_now()` / `naive_utc()`；禁止裸 `NOW()`。
- 详见上文「UTC」。

## 命名

| 层级 | 模式 | 示例 |
|---|---|---|
| 系统 | `t_sys_{名}` | `t_sys_user` |
| 业务 | `t_biz_{名}_{tenant_id}` | `t_biz_dept_{tenant_id}` |

- 业务表含 `dept_id`；新租户：`services/tenant_provisioner.py`。
- RBAC/多租户细节：`docs/rbac.md`、`docs/multitenant.md`。

## 写入

- 审计字段经 `api/actor_middleware.py` → `data/mysql/actor.py` → `audit_insert_params()` / `audit_update_params()`。
- 后台任务启动时 `contextvars.copy_context()` 保留操作人。
- 密码仅存 `password_hash`（bcrypt）。

## 审计日志表（例外）

- `t_sys_audit_request_logs`、`t_sys_audit_operation_logs`：仅 INSERT/SELECT；无 `created_by`/`updated_by`；事件时间 `occurred_at`。
- 详见 `docs/audit-logging.md`。

## 禁止

- 无 `id` 主键；跳过审计字段；`schemas/` 外散落 DDL。

# 前端

编辑 `web/**` 时遵守：

## 技术栈

- `web/`：Vite + React + TS + Tailwind v4 + shadcn/ui；基元 **Base UI**（`style: base-vega`）。
- UI 组件：`web/src/components/ui/` — 仅 `npx shadcn@latest add <name>` 安装；禁止手写与 registry 等价的基元。
- 组合用 Base UI `render` prop；禁止 Radix `asChild`。
- 构建：`npm run build` → `src/omni_api/web/static/`；主色 `#1677ff`（科技蓝）→ `--primary`。

## Tailwind CSS

编辑 `web/**` 的 className / 样式类时遵守：

### 禁止滥用 Arbitrary Values（方括号语法）

- **默认禁止**生成形如 `rounded-[4px]`、`p-[13px]`、`w-[342px]`、`gap-[7px]` 等 **`-[…px]`** 内联像素类名。
- 必须优先使用 Tailwind **标准语义类**（如 `rounded`、`rounded-md`、`p-4`、`w-full`、`max-w-xs`）。
- 仅在下列情况可使用 arbitrary values，且须有正当理由（优先用主题 token / 标准阶梯）：
  - 已有设计 token 表达式（如 `top-[calc(100%+0.375rem)]`、`w-[min(100vw,17.5rem)]`），且无法用标准类表达；
  - shadcn 基元自带、且与 registry 一致的写法（改基元仍优先语义类）。
- **未经用户明确许可**，不得新增任意像素尺寸（`[Npx]` / `[N.NNpx]`）。

### 设计稿圆角对照（优先映射）

| 设计稿 | Tailwind |
|---|---|
| 2px | `rounded-sm` |
| 4px | `rounded` |
| 6px | `rounded-md` |
| 8px | `rounded-lg` |
| 12px | `rounded-xl` |

间距、字号等同理：对照 Tailwind 默认阶梯（`p-1`/`p-2`/`p-3`/`p-4`…），禁止用方括号硬编码接近值。

### 生成前自检

- 写出 JSX/HTML 的 `className` 前，检查是否含 `-[…px]`（含 `rounded-[4px]`、`max-w-[200px]` 等）。
- 若存在：须替换为上表或标准语义类；无对应阶梯时选**最接近**的标准类，不得保留随意像素。
- 与下文「禁止」中的「内联 hex」一并遵守：颜色用 `--primary` 等主题变量 / 语义色类，禁止 class 内写死 `#rrggbb`。

## 组件目录（`web/src/components/`）

按职责分层；**目录名与文件名小写连字符**；导出组件名 PascalCase。

```
components/
  ui/                 # 仅 shadcn 基元（扁平，禁止业务逻辑）
  layout/             # AppShell、Page*、导航、分页、筛选栏
  form/               # 通用表单字段封装
  table/              # 表格与列设置
  <domain>/           # 业务域（如 dept、audit、permission-assign）
  <feature>/          # 多文件组件族（≥2 个相关 tsx）
  Foo.tsx             # 单文件、跨页复用的顶层组件
```

**落点规则**

1. shadcn 基元 → `ui/`（`npx shadcn@latest add`）。
2. 布局 / 表单 / 表格通用层 → `layout/`、`form/`、`table/`。
3. 同一功能 **≥2 个相关 tsx** → 收进 `<feature>/`；目录内用相对路径 `./` 引用子模块。
4. 目录对外只暴露公共 API：`index.ts` 再导出（如 `@/components/menu-catalog-tree`）。
5. 单文件、跨多页复用 → 根目录 `Foo.tsx`（如 `Can.tsx`、`StatusBadge.tsx`）。
6. 禁止为单文件组件再套一层目录（如 `Can/Can.tsx`）。

**当前业务域目录**

| 目录 | 职责 | 对外 import |
|---|---|---|
| `menu-catalog-tree/` | 权限/导航目录树 | `@/components/menu-catalog-tree` |
| `region-cascader/` | 省市区级联 | `@/components/region-cascader` |
| `permission-assign/` | 角色功能权限分配 | `@/components/permission-assign` |
| `dept/` | 部门树与数据范围 | `@/components/dept/...` |
| `audit/` | 审计 EXPLAIN 展示 | `@/components/audit/...` |

## 布局

- 登录后：`AppShell` = `AppTopHeader` + `SidebarNav` + `Page`/`PageHeader`/`PageBody`。
- `<lg`：侧栏收进左侧 `Sheet`；录入用右侧 `Sheet`，二者方向勿混。
- 列表禁止 `Card` 分块；多列表格用 `ConfigurableTable` + `TablePagination`（有分页时）。
- 每表注册 `pageKey` + `tableKey`；列定义 `TableColumnDef`；详见 `docs/web-tables.md`。
- 滚动：用 `ScrollArea` + `ScrollBar`；禁止裸 `overflow-auto`。

## 录入

- 新建/编辑/多字段配置：右侧 `Sheet`（`SheetHeader` + `SheetBody` + `SheetFooter`）。
- 行内开关/单字段：`Switch` 或行内控件；确认删除：`Dialog`（非表单）。
- 禁止居中 `Dialog` 承载多字段表单。

## 筛选与 Tab

- 多视图：`PageTabBar`（下划线样式）；禁止 `Button` 模拟 Tab。
- 筛选：`PageFilterToolbar` + `FilterField`；栅格由 `web/src/lib/filter-grid.ts` 计算，禁止页面手写 flex 栅格。
- 日期范围：`DateRangeFilterField`（禁止原生 `type="date"`）；UTC 见上文「UTC」。
- 功能按钮：`FilterToolbarActions`（可见 ≤3，超出「更多」）。

## 权限分配

- 目录/菜单：树 + 勾选联动；按钮：仅展示**当前点击（聚焦）菜单**下的平铺区。
- 未点击菜单时按钮区显示占位，禁止按勾选批量展示按钮块。
- 按钮勾选：`ButtonPermissionSelect` 平铺多选；禁止下拉或其它变体。
- 参考：`permission-assign/`（`PermissionAssignPanel`、`ButtonPermissionSelect`）、`menu-catalog-tree/`（`mode="assign"`）。

## 表单与错误

- 禁止业务代码用原生 `checkbox`/`radio`/`select`/`textarea`（`components/ui/` 封装层除外）。
- 字段错误：`FormField` + `FieldError`；API 失败：`showToastError`；阻断：`showBlockingError`。
- Sheet 校验失败须在字段旁可见。详见 `docs/web-forms.md`。
- 表单 `onSubmit` 事件类型用 DOM `SubmitEvent`，禁止从 `react` 导入已废弃的 `FormEvent`。

## Biome（`web/biome.json`）

提交前在 `web/` 运行 `npm run lint`（`biome check .`）。以下与配置一致，新增代码须遵守：

| 规则 | 级别 | 要求 |
|---|---|---|
| `suspicious/noDeprecatedImports` | error | 禁止从 `react` 导入 `@deprecated` 符号 |
| `suspicious/noExplicitAny` | error | 禁止 `any` |
| `correctness/noUnusedVariables` | error | 无未使用变量/导入；与上文「死代码与卫生」一致 |
| `correctness/useHookAtTopLevel` | error | Hook 仅顶层调用 |
| `style/noExcessiveLinesPerFile` | error | 单文件 ≤500 行（`pages/**` ≤800） |
| `complexity/noExcessiveLinesPerFunction` | warn | 单函数 ≤80 行 |

**React 类型（React 19）**

| 禁止 | 改用 |
|---|---|
| `FormEvent`（`react`） | `SubmitEvent`（表单提交）、`ChangeEvent`（输入变更）等 DOM 事件 |
| `MutableRefObject` | `RefObject`（`useRef` 返回值；可写 `.current`） |

**其它**

- 格式化：2 空格、双引号、分号、尾逗号、行宽 120。
- a11y 规则集关闭；以项目组件与页面规范为准。

## 禁止

- `web/static/*.html` 手写页；内联 hex；霓虹特效；滥用 Tailwind arbitrary 像素类（`-[…px]`）。
- 全局表面统一透明玻璃：优先 `.surface-glass` / `.surface-glass-strong` / `.surface-glass-pane`（`web/src/index.css`），勿再新增实心 `bg-card` 面板。
- 业务时间禁止 `toLocaleString`；禁止页面内单独时区设置。
- 未使用组件、未使用 hook/函数、未使用 import（见「死代码与卫生」）。
