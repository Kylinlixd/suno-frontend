import Taro from "@tarojs/taro";
import { createSessionClient, type ApiOptions, type StorageAdapter } from "@suno/shared";

// 必须以字面量形式书写 process.env.TARO_APP_*，Taro 构建期才会内联实际值；
// 运行时属性查找（如 globalThis.process.env[key]）在微信环境中拿不到任何配置。
declare const process: { env: { TARO_APP_DEMO_MODE?: string; TARO_APP_API_BASE_URL?: string; TARO_APP_PAYMENT_SECRET?: string; NODE_ENV?: string } } | undefined;
const isProd = typeof process !== "undefined" && process.env.NODE_ENV === "production";
const rawDemo = typeof process !== "undefined" ? process.env.TARO_APP_DEMO_MODE : undefined;
const demo = rawDemo !== "false";
if (isProd && rawDemo !== "true" && rawDemo !== "false") {
  // 生产构建禁止静默落入演示模式：必须显式声明
  throw new Error("[suno] 生产构建必须显式设置 TARO_APP_DEMO_MODE=true 或 false");
}
const baseUrl = (typeof process !== "undefined" ? process.env.TARO_APP_API_BASE_URL : undefined) ?? "http://localhost:8080";

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
    data: init?.body ? JSON.parse(String(init.body)) : undefined,
    timeout: 20_000
  });
  return {
    ok: result.statusCode >= 200 && result.statusCode < 300,
    status: result.statusCode,
    json: async () => result.data,
    text: async () => (typeof result.data === "string" ? result.data : JSON.stringify(result.data ?? ""))
  } as Response;
};

export const sessionClient = createSessionClient({ storage, fetcher, baseUrl, demo, deviceId: "suno-mini" });
const paymentSecret = typeof process !== "undefined" ? process.env.TARO_APP_PAYMENT_SECRET : undefined;
export const apiOptions: ApiOptions = { demo, baseUrl };
export const sessionApiOptions = (): ApiOptions => ({ demo, baseUrl, paymentSecret, userId: sessionClient.read()?.userId, requester: sessionClient.request, textRequester: sessionClient.requestText });
