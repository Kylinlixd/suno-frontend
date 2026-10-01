import { create } from "zustand";
import { createSessionClient, jsonStorage, type ApiOptions, type AuthSession } from "@suno/shared";

const rawDemo = import.meta.env.VITE_DEMO_MODE;
const demo = rawDemo !== "false";
if (import.meta.env.PROD && rawDemo !== "true" && rawDemo !== "false") {
  // 生产构建禁止静默落入演示模式：必须显式声明
  throw new Error("[suno] 生产构建必须显式设置 VITE_DEMO_MODE=true 或 false");
}
const baseUrl = import.meta.env.VITE_API_BASE_URL;
if (import.meta.env.PROD && !demo && !baseUrl) {
  throw new Error("[suno] 非演示模式的生产构建必须设置 VITE_API_BASE_URL");
}
const fallbackStorage: Storage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0 };
const etagCache = new Map<string, { etag: string; payload: unknown }>();
const sessionClient = createSessionClient({ storage: jsonStorage(typeof localStorage === "undefined" ? fallbackStorage : localStorage), demo, baseUrl, etagCache, deviceId: "suno-web" });
const paymentSecret = import.meta.env.VITE_PAYMENT_SECRET;

interface AuthState {
  session: AuthSession | null;
  ready: boolean;
  setSession: (session: AuthSession | null) => void;
  login: (username: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  session: sessionClient.read() ?? null,
  ready: false,
  setSession: (session) => set({ session }),
  login: async (username, password) => { const session = await sessionClient.login(username, password); set({ session, ready: true }); return session; },
  logout: async () => { await sessionClient.logout(); set({ session: null, ready: true }); },
  hydrate: async () => { const existing = sessionClient.read(); if (!existing) { set({ ready: true }); return; } try { const user = await sessionClient.me(); set({ session: { ...existing, ...user }, ready: true }); } catch { await sessionClient.logout(); set({ session: null, ready: true }); } }
}));

export const apiOptions: ApiOptions = { demo, baseUrl, etagCache };
export const sessionApiOptions = (): ApiOptions => ({ demo, baseUrl, etagCache, paymentSecret, userId: useAuth.getState().session?.userId, requester: sessionClient.request, textRequester: sessionClient.requestText });
