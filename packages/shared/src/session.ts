import { ApiError, request, requestText } from "./api";
import type { ApiOptions, AuthSession, AuthTokens, AuthUser, StorageAdapter } from "./types";

export type { StorageAdapter } from "./types";

const SESSION_KEY = "suno-auth";

interface SessionClientOptions extends Omit<ApiOptions, "token" | "userId"> {
  storage: StorageAdapter;
  deviceId?: string;
  demoRole?: string;
}

export function createSessionClient(options: SessionClientOptions) {
  const deviceId = options.deviceId ?? "suno-web";

  const read = (): AuthSession | undefined => {
    const raw = options.storage.get(SESSION_KEY);
    if (!raw) return undefined;
    try { return JSON.parse(raw) as AuthSession; } catch { options.storage.remove(SESSION_KEY); return undefined; }
  };
  const save = (session: AuthSession) => options.storage.set(SESSION_KEY, JSON.stringify(session));
  const clear = () => options.storage.remove(SESSION_KEY);

  async function requestRefresh(): Promise<AuthSession> {
    const current = read();
    if (!current?.refreshToken) throw new ApiError("请重新登录", 401, "AUTH_REQUIRED");
    const data = await request<AuthTokens & AuthUser>("/api/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: current.refreshToken, deviceId: current.deviceId }) }, options);
    const next = { ...current, ...data, deviceId: data.deviceId ?? current.deviceId };
    save(next);
    return next;
  }

  // 并发 401 时共享同一次刷新，避免旋转式 refresh token 被重复使用导致掉登录
  let refreshPromise: Promise<AuthSession> | null = null;
  async function refresh(): Promise<AuthSession> {
    if (!refreshPromise) refreshPromise = requestRefresh().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function sessionRequest<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    if (options.demo) return request<T>(path, init, options);
    const current = read();
    if (!current?.accessToken) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
    try {
      return await request<T>(path, init, { ...options, token: current.accessToken });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !retried && !path.endsWith("/auth/refresh")) {
        const next = await refresh();
        return request<T>(path, init, { ...options, token: next.accessToken });
      }
      throw error;
    }
  }

  async function sessionTextRequest(path: string, init: RequestInit = {}, retried = false): Promise<string> {
    if (options.demo) return requestText(path, init, options);
    const current = read();
    if (!current?.accessToken) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
    try {
      return await requestText(path, init, { ...options, token: current.accessToken });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && !retried && !path.endsWith("/auth/refresh")) {
        const next = await refresh();
        return requestText(path, init, { ...options, token: next.accessToken });
      }
      throw error;
    }
  }

  return {
    read,
    clear,
    async login(username: string, password: string): Promise<AuthSession> {
      if (options.demo) { const session = { accessToken: "demo-token", refreshToken: "demo-refresh", userId: 1, username: username || "Alex", role: options.demoRole ?? "USER", deviceId }; save(session); return session; }
      const data = await request<AuthTokens & AuthUser>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password, deviceId }) }, options);
      let session: AuthSession = { ...data, deviceId: data.deviceId ?? deviceId };
      // 后端 login/refresh 响应不含 userId，登录后立即用 /api/auth/me 回填
      try {
        const user = await request<AuthUser>("/api/auth/me", {}, { ...options, token: session.accessToken });
        session = { ...session, ...user };
      } catch { /* me 失败不阻断登录；userId 缺失时受保护接口会提示重新登录 */ }
      save(session);
      return session;
    },
    refresh,
    requestText: sessionTextRequest,
    request: sessionRequest,
    async me(): Promise<AuthUser> {
      const data = await sessionRequest<AuthUser>("/api/auth/me");
      const current = read();
      if (current) save({ ...current, ...data });
      return data;
    },
    async logout() {
      const current = read();
      if (current && !options.demo) await sessionRequest("/api/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: current.refreshToken }) }).catch(() => undefined);
      clear();
    }
  };
}

export function jsonStorage(storage: Storage): StorageAdapter {
  return { get: (key) => storage.getItem(key) ?? undefined, set: (key, value) => storage.setItem(key, value), remove: (key) => storage.removeItem(key) };
}
