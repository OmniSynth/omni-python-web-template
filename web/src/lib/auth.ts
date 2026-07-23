/** 登录态 token 读取（内存，Dexie 持久化由 auth store 同步）。 */

/** @deprecated 使用 getSessionToken */
export { authHeaders, getSessionToken, getSessionToken as getAuthToken, setSessionToken } from "@/lib/session-token";
