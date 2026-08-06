import Taro from "@tarojs/taro";
import { createSessionClient, type ApiOptions, type StorageAdapter } from "@suno/shared";

const buildEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const demo = buildEnv.TARO_APP_DEMO_MODE !== "false";
const baseUrl = buildEnv.TARO_APP_API_BASE_URL ?? "http://localhost:8080";

const storage: StorageAdapter = {
  get: (key) => {
    const value = Taro.getStorageSync(key);
    return typeof value === "string" ? value : undefined;
  },
  set: (key, value) => Taro.setStorageSync(key, value),
  remove: (key) => Taro.removeStorageSync(key)
};

const fetcher: NonNullable<ApiOptions["fetcher"]> = async (input, init) => {
  const headers: Record<string, string> = {};
  if (init?.headers instanceof Headers) init.headers.forEach((value, key) => { headers[key] = value; });
  else if (Array.isArray(init?.headers)) init.headers.forEach(([key, value]) => { headers[key] = value; });
  else if (init?.headers) Object.assign(headers, init.headers);
  const result = await Taro.request({
    url: String(input),
    method: (init?.method ?? "GET") as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
    header: headers,
    data: init?.body ? JSON.parse(String(init.body)) : undefined
  });
  return { ok: result.statusCode >= 200 && result.statusCode < 300, status: result.statusCode, json: async () => result.data } as Response;
};

export const sessionClient = createSessionClient({ storage, fetcher, baseUrl, demo, deviceId: "suno-mini" });
export const apiOptions: ApiOptions = { demo, baseUrl };
export const sessionApiOptions = (): ApiOptions => ({ demo, baseUrl, userId: sessionClient.read()?.userId, requester: sessionClient.request, textRequester: sessionClient.requestText });
