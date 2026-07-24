/** 租户套餐到期提示文案（与后端 TENANT_EXPIRED_MSG 保持一致）。 */

export const TENANT_EXPIRED_MSG = "租户套餐已到期，请联系管理员续费";

export function isTenantExpiredMessage(message: string): boolean {
  return message === TENANT_EXPIRED_MSG || message.includes("套餐已到期");
}
