import { create } from "zustand";
import { createSessionClient, jsonStorage, type ApiOptions, type AuthSession } from "@suno/shared";

const demo = import.meta.env.VITE_DEMO_MODE !== "false";
const baseUrl = import.meta.env.VITE_API_BASE_URL;
const fallbackStorage: Storage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0 };
const sessionClient = createSessionClient({ storage: jsonStorage(typeof localStorage === "undefined" ? fallbackStorage : localStorage), demo, baseUrl, deviceId: "suno-web" });

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

export const apiOptions: ApiOptions = { demo, baseUrl };
export const sessionApiOptions = (): ApiOptions => ({ demo, baseUrl, userId: useAuth.getState().session?.userId, requester: sessionClient.request, textRequester: sessionClient.requestText });
