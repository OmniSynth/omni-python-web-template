# 数据存储

## 职责划分

| 库 | 用途 | 配置节 |
|---|---|---|
| MySQL | 用户、权限、租户业务状态、审计等应用数据 | `[mysql]` |
| Redis | 会话、缓存、pub/sub | `[redis]` |

服务监听地址见 `[app]`。认证见 `[auth]`。

MySQL 表结构审计字段与时间（UTC `DATETIME(6)`）规范见 [AGENTS.md](../AGENTS.md)「MySQL 表结构」；端到端流程见 [datetime.md](datetime.md)。

## 配置文件

所有环境配置集中在 `config/` 目录，每环境一个文件：

| 文件 | 场景 |
|---|---|
| `config/local.toml` | 内网 |
| `config/remote.toml` | 外网（远程调试） |

设置 `OMNI_PROFILE=local` 或 `remote`，加载 `config/{profile}.toml`。

## 系统开发参数表

| 表 | 用途 |
|---|---|
| `t_sys_dev_param_group` | 系统开发参数分组（如「系统对象存储」） |
| `t_sys_dev_param` | 系统开发参数 key-value（头像等系统级 OSS 配置） |

由 `ensure_sys_schema` / `sync_rbac.py` 创建；密钥勿入库到配置文件，可经管理端或环境变量首次种子。

## 租户开发参数表（租户分表）

| 基名 | 物理表 | 用途 |
|---|---|---|
| `dev_param_group` | `t_biz_dev_param_group_{tenant_id}` | 开发参数分组（名称、描述）；含「租户对象存储」 |
| `dev_params` | `t_biz_dev_params_{tenant_id}` | 开发参数子表（key-value，无部门隔离；租户 OSS） |

对象存储参数键：`oss.provider` / `oss.access_key` / `oss.secret_key` / `oss.domain` / `oss.upload_bucket_domain` / `oss.basic_path`。

- 系统 `oss.basic_path`：可编辑，默认 `omni/static`（展示为 `/omni/static`）。
- 租户 `oss.basic_path`：只读，恒为「系统基础路径 / 租户 ID」（如 `/omni/static/12`）；加载时忽略租户库内旧值。
- `oss.domain`：仅 `http://` 或 `https://` + 主机（可选端口），规范化后恰好一个尾 `/`。
