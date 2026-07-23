/** 内存中的 API 会话 token（供 fetch 层读取，避免 api/client ↔ auth-store 循环依赖）。 */

let sessionToken: string | null = null;

export function getSessionToken(): string | null {
  return sessionToken;
}

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

export function authHeaders(): HeadersInit {
  if (!sessionToken) return {};
  return { Authorization: `Bearer ${sessionToken}` };
}
