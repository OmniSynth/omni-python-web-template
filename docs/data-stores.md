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

## 租户开发参数表（租户分表）

| 基名 | 物理表 | 用途 |
|---|---|---|
| `dev_param_group` | `t_biz_dev_param_group_{tenant_id}` | 开发参数分组（名称、描述）；由 `sync_rbac.py` 或新建租户时开通 |
| `dev_params` | `t_biz_dev_params_{tenant_id}` | 开发参数子表（key-value，无部门隔离） |
