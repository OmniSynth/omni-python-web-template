/** 角色编码：字母、数字、连字符、下划线。 */
export const ROLE_CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** 输入时过滤非法字符，仅保留字母、数字、连字符与下划线。 */
export function sanitizeRoleCodeInput(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function validateRoleCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return "请填写角色编码";
  if (!ROLE_CODE_PATTERN.test(trimmed)) {
    return "角色编码仅允许字母、数字、连字符与下划线";
  }
  return null;
}

export function validateRoleName(name: string): string | null {
  if (!name.trim()) return "请填写角色名称";
  return null;
}
