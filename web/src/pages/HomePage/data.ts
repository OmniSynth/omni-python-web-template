/** 首页产品能力与截图素材（`public/images`）。 */
export const HOME_NAV_LINKS = [
  { href: "#hero", label: "首页" },
  { href: "#features", label: "产品功能" },
  { href: "#showcase", label: "产品截图" },
  { href: "#about", label: "关于" },
] as const;

export const HOME_STATS = [
  { value: "多租户", label: "机构与租户隔离" },
  { value: "RBAC", label: "角色与数据权限" },
  { value: "审计", label: "请求与操作可追溯" },
] as const;

export const HOME_FEATURES = [
  {
    title: "统一认证登录",
    description: "账号密码登录、会话鉴权与多租户切换，进入工作台即可按权限开展业务。",
    image: "/images/login.png",
    imageAlt: "登录页截图",
  },
  {
    title: "用户与组织管理",
    description: "用户、部门、机构一体化维护，支持启用状态、数据权限与组织树结构。",
    image: "/images/usermanage.png",
    imageAlt: "用户管理截图",
  },
  {
    title: "角色与功能权限",
    description: "基于 RBAC 分配菜单与按钮权限，精细控制可见范围与操作能力。",
    image: "/images/rolemanage.png",
    imageAlt: "角色管理截图",
  },
  {
    title: "权限目录编排",
    description: "目录、菜单、按钮分层管理，支持权限码同步与可视化分配。",
    image: "/images/authmanage.png",
    imageAlt: "权限管理截图",
  },
  {
    title: "租户与机构运营",
    description: "平台侧管理租户开通与机构信息，支撑多组织并行运营。",
    image: "/images/tenantmanage.png",
    imageAlt: "租户管理截图",
  },
  {
    title: "审计与可观测",
    description: "请求与操作日志留痕，便于追溯异常与合规审查。",
    image: "/images/logaudit.png",
    imageAlt: "审计日志截图",
  },
] as const;

export const HOME_SHOWCASE = [
  {
    title: "部门管理",
    description: "树形部门结构，支撑数据范围与组织协作。",
    image: "/images/deptmanage.png",
    imageAlt: "部门管理截图",
  },
  {
    title: "机构管理",
    description: "机构档案与管理员绑定，一站式开通租户环境。",
    image: "/images/orgmanage.png",
    imageAlt: "机构管理截图",
  },
  {
    title: "自定义字段",
    description: "列表字段可配置展示，贴合不同业务查看习惯。",
    image: "/images/customfields.png",
    imageAlt: "自定义字段截图",
  },
] as const;
