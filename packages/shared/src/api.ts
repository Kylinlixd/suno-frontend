import { demoAdminMetrics, demoListings, demoOrders, demoPage, demoRecycles } from "./demo";
import type { AdminMetrics, ApiOptions, ApiResponse, Listing, Order, Page, RecycleApplication } from "./types";

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.success !== true && response.code !== "OK") {
    const code = response.errorCode ?? response.code ?? response.message;
    throw new ApiError(code, undefined, code);
  }
  return response.data as T;
}

export async function request<T>(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<T> {
  if (options.requester) return options.requester<T>(path, init);
  if (options.demo) return demoResponse<T>(path, init.method ?? "GET", init.body);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${options.baseUrl ?? "http://localhost:8080"}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...init.headers }
  });
  const payload = await response.json() as ApiResponse<T>;
  if (!response.ok) throw new ApiError(payload.message, response.status, payload.errorCode ?? payload.code);
  return unwrapResponse(payload);
}

export async function requestText(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<string> {
  if (options.textRequester) return options.textRequester(path, init);
  if (options.demo) return demoTextResponse(path);
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(`${options.baseUrl ?? "http://localhost:8080"}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...init.headers }
  });
  const content = await response.text();
  if (!response.ok) throw new ApiError(content || "请求失败", response.status);
  return content;
}

export async function getListings(options?: ApiOptions): Promise<Page<Listing>> {
  const page = normalizePage(await request<unknown>("/api/mall/listings?minStock=1", {}, options), 20);
  return { ...page, content: page.content.map(toListing) };
}

export async function getListing(id: string, options?: ApiOptions): Promise<Listing> {
  if (options?.demo) return demoListings.find((listing) => listing.id === id) as Listing;
  const listing = (await getListings(options)).content.find((item) => item.id === id);
  if (!listing) throw new ApiError("商品不存在", 404, "LISTING_NOT_FOUND");
  return listing;
}

export async function getOrders(userId?: number, options?: ApiOptions): Promise<Page<Order>> {
  if (!options?.demo && !userId) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
  const query = options?.demo ? "" : `?buyerUserId=${userId}&page=0&size=20`;
  const data = await request<unknown>(`/api/mall/orders${query}`, {}, options);
  const page = normalizePage(data && typeof data === "object" && !Array.isArray(data) && "items" in data ? (data as { items: unknown[] }).items : data, 20);
  return { ...page, content: page.content.map(toOrder) };
}

export const getRecycles = (options?: ApiOptions) => options?.demo
  ? request<Page<RecycleApplication>>("/api/recycle/orders?page=0&size=20", {}, options)
  : Promise.reject(new ApiError("用户回收记录接口未提供", 404, "RECYCLE_HISTORY_UNAVAILABLE"));
export async function getAdminRecycles(options?: ApiOptions): Promise<Page<RecycleApplication>> {
  const page = normalizePage(await request<unknown>("/api/admin/recycle/orders", {}, options), 50);
  return { ...page, content: page.content.map(toRecycleApplication) };
}
export const getAdminMetrics = (options?: ApiOptions) => request<AdminMetrics>("/api/admin/auth/security-events/summary", {}, options);
export const getPaymentReplaySummary = (options?: ApiOptions) => request<Record<string, unknown>>("/api/admin/payment/replay-tasks/summary", {}, options);
export const getAdminReviewRiskSummary = (options?: ApiOptions) => request<Record<string, unknown>>("/api/admin/recycle/review-risk/summary?lookbackMinutes=1440", {}, options);
export const getAdminSecurityTimeline = (options?: ApiOptions) => request<Record<string, unknown>>("/api/admin/auth/security-events/timeline?lookbackMinutes=60", {}, options);
export const createSecurityExportTask = (body: { type: string; format: string; lookbackMinutes: number; topN: number; actionTypes?: string[]; idempotencyKey: string }, options?: ApiOptions) => request<Record<string, unknown>>("/api/admin/auth/security-events/export/tasks", { method: "POST", body: JSON.stringify(body) }, options);
export const downloadSecurityExportTask = (taskId: string, options?: ApiOptions) => requestText(`/api/admin/auth/security-events/export/tasks/${encodeURIComponent(taskId)}/download`, {}, options);

export function createResaleOrder(listingId: string, userId: number, options?: ApiOptions) {
  if (!options?.demo && !userId) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  const parsedListingId = Number(listingId);
  if (!options?.demo && !Number.isInteger(parsedListingId)) return Promise.reject(new ApiError("商品编号无效", 400, "LISTING_ID_INVALID"));
  return request<Record<string, unknown>>("/api/mall/orders", { method: "POST", body: JSON.stringify({ buyerUserId: userId, listingId: options?.demo ? listingId : parsedListingId }) }, options);
}

export async function getFavorites(userId: number, options?: ApiOptions): Promise<Page<Listing>> {
  if (!options?.demo && !userId) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
  const data = await request<unknown>(`/api/mall/favorites?userId=${userId}`, {}, options);
  const page = normalizePage(data, 20);
  return { ...page, content: page.content.map(toListing) };
}

export function queryOrderTrack(orderNo: string, userId: number, options?: ApiOptions) {
  if (!options?.demo && !userId) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<Record<string, unknown>>(`/api/mall/orders/${encodeURIComponent(orderNo)}/track?buyerUserId=${userId}`, {}, options);
}

export function createRecycleApplication(payload: Pick<RecycleApplication, "title" | "image"> & Partial<{ userId: number; snCode: string; wearScore: number; recycleCount: number }>, options?: ApiOptions) {
  if (options?.demo) return request<RecycleApplication>("/api/recycle/orders", { method: "POST", body: JSON.stringify(payload) }, options);
  if (!options?.userId) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<RecycleApplication>("/api/recycle/orders", { method: "POST", body: JSON.stringify({ userId: options.userId, snCode: payload.snCode ?? payload.title, imageUrl: payload.image, wearScore: payload.wearScore ?? 50, recycleCount: payload.recycleCount ?? 0 }) }, options);
}

export const cancelOrder = (orderNo: string, options?: ApiOptions) => request<void>("/api/mall/orders/cancel", { method: "POST", body: JSON.stringify({ orderNo }) }, options);
export const confirmReceipt = (orderNo: string, userId: number, options?: ApiOptions) => request<void>("/api/mall/orders/confirm-receipt", { method: "POST", body: JSON.stringify({ orderNo, buyerUserId: userId }) }, options);
export const addFavorite = (listingId: string, userId: number, options?: ApiOptions) => request<void>("/api/mall/favorites/add", { method: "POST", body: JSON.stringify({ listingId: options?.demo ? listingId : parseListingId(listingId), userId }) }, options);
export const removeFavorite = (listingId: string, userId: number, options?: ApiOptions) => request<void>("/api/mall/favorites/remove", { method: "POST", body: JSON.stringify({ listingId: options?.demo ? listingId : parseListingId(listingId), userId }) }, options);
export const reviewRecycleOrder = (body: { orderNo: string; action: string; reviewedGrade?: string }, options?: ApiOptions) => request<void>("/api/admin/recycle/orders/review", { method: "PATCH", body: JSON.stringify(body) }, options);
export const publishListing = (body: { recycleOrderNo: string; salePrice: number; stock: number }, options?: ApiOptions) => request<void>("/api/admin/recycle/listings/publish", { method: "POST", body: JSON.stringify(body) }, options);
export const postAdminAction = (path: string, body: unknown, options?: ApiOptions) => request<void>(path, { method: "POST", body: JSON.stringify(body) }, options);

export function normalizePage<T>(data: unknown, size = 20): Page<T> {
  if (Array.isArray(data)) return { content: data as T[], totalElements: data.length, totalPages: data.length ? 1 : 0, page: 0, size };
  const page = data as Partial<Page<T>> | undefined;
  if (page?.content && Array.isArray(page.content)) return { content: page.content, totalElements: page.totalElements ?? page.content.length, totalPages: page.totalPages ?? 1, page: page.page ?? 0, size: page.size ?? size };
  return { content: [], totalElements: 0, totalPages: 0, page: 0, size };
}

function toListing(value: unknown): Listing {
  const item = value as Record<string, unknown>;
  const id = String(item.id ?? item.listingId ?? "");
  const brand = String(item.brand ?? "Suno");
  const model = String(item.name ?? item.model ?? "未命名商品");
  const price = Number(item.price ?? item.salePrice ?? 0);
  return {
    id,
    name: item.name ? model : `${brand} ${model}`,
    brand,
    category: String(item.category ?? "数码"),
    condition: String(item.condition ?? item.grade ?? "待确认"),
    price,
    originalPrice: Number(item.originalPrice ?? price),
    image: String(item.image ?? `https://picsum.photos/seed/suno-listing-${id}/800/1000`),
    stock: Number(item.stock ?? 0),
    favorite: Boolean(item.favorite),
    story: String(item.story ?? "经过审核、估价与整理，等待下一次被认真使用。")
  };
}

function toOrder(value: unknown): Order {
  const item = value as Record<string, unknown>;
  const listingId = String(item.listingId ?? (item.listing as Record<string, unknown> | undefined)?.id ?? "");
  const brand = String(item.productBrand ?? (item.listing as Record<string, unknown> | undefined)?.brand ?? "Suno");
  const model = String(item.productModel ?? (item.listing as Record<string, unknown> | undefined)?.name ?? "商品");
  return {
    orderNo: String(item.orderNo ?? ""),
    status: toOrderStatus(item.status, item.payStatus, item.fulfillStatus),
    listing: { id: listingId, name: item.listing ? String((item.listing as Record<string, unknown>).name ?? model) : `${brand} ${model}`, image: String(item.image ?? `https://picsum.photos/seed/suno-order-${listingId}/800/1000`) },
    amount: Number(item.amount ?? 0),
    createdAt: String(item.createdAt ?? "")
  };
}

function toOrderStatus(status: unknown, payStatus: unknown, fulfillStatus: unknown): Order["status"] {
  if (status === "WAIT_PAY" || payStatus === "UNPAID") return "WAIT_PAY";
  if (status === "CANCELLED" || fulfillStatus === "CANCELLED") return "CANCELLED";
  if (status === "RECEIVED" || fulfillStatus === "COMPLETED") return "RECEIVED";
  if (status === "SHIPPED" || fulfillStatus === "DELIVERED") return "SHIPPED";
  return "PAID";
}

function toRecycleApplication(value: unknown): RecycleApplication {
  const item = value as Record<string, unknown>;
  const id = String(item.id ?? item.orderNo ?? "");
  const status = toRecycleStatus(item.status);
  return {
    id,
    title: String(item.title ?? item.orderNo ?? "回收申请"),
    image: String(item.image ?? `https://picsum.photos/seed/suno-recycle-${id}/800/1000`),
    status,
    estimatedPrice: item.estimatedPrice == null ? undefined : Number(item.estimatedPrice),
    logisticsStatus: String(item.logisticsStatus ?? item.grade ?? "等待审核"),
    createdAt: String(item.createdAt ?? "")
  };
}

function toRecycleStatus(value: unknown): RecycleApplication["status"] {
  if (value === "CREATED") return "SUBMITTED";
  if (value === "QUALITY_CHECKED") return "QUALITY_CONFIRMED";
  if (value === "PRICE_REVIEWED") return "VALUED";
  return String(value ?? "SUBMITTED") as RecycleApplication["status"];
}

function parseListingId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new ApiError("商品编号无效", 400, "LISTING_ID_INVALID");
  return id;
}

function demoResponse<T>(path: string, method: string, body?: BodyInit | null): T {
  if (path.includes("/listings/") && method === "GET") return demoListings.find((listing) => listing.id === path.split("/").pop()) as T;
  if (path.includes("/listings") && method === "GET") return demoPage(demoListings) as T;
  if (path === "/api/mall/orders" && method === "POST") return { orderNo: `DEMO-${Date.now()}` } as T;
  if (path.includes("/track") && method === "GET") return { trackingNo: "SF1468209381", status: "运输中", events: [{ actionType: "ORDER_SHIPPED", detail: "包裹已离开发货仓", createdAt: "2026-08-05 10:20" }] } as T;
  if (path.includes("/api/admin/recycle/orders") && method === "GET") return demoPage(demoRecycles) as T;
  if (path.includes("/api/admin/payment/replay-tasks/summary") && method === "GET") return { pending: 2, processing: 1, success: 18, dead: 0, readyToConsume: 2 } as T;
  if (path.includes("/api/admin/recycle/review-risk/summary") && method === "GET") return { totalReviews: 31, sensitiveReviewCount: 2, sensitiveRate: 0.0645, reportCount: 4, pendingReportCount: 1, riskLevel: "LOW", recommendation: "保持当前审核策略" } as T;
  if (path.includes("/api/admin/auth/security-events/timeline") && method === "GET") return { points: [{ minute: "2026-08-06T00:20:00", total: 0 }, { minute: "2026-08-06T00:21:00", total: 2 }, { minute: "2026-08-06T00:22:00", total: 0 }] } as T;
  if (path.includes("/api/admin/auth/security-events/export/tasks") && method === "POST") return { taskId: "demo-export-1", status: "SUCCESS", fileName: "security-events-summary.csv", format: "csv" } as T;
  if (path.includes("/orders") && method === "GET") return demoPage(demoOrders) as T;
  if (path.includes("/favorites") && method === "GET") return demoListings.filter((listing) => listing.favorite) as T;
  if (path.includes("/favorites") && (method === "POST" || method === "DELETE")) return { favorited: method === "POST" } as T;
  if (path.includes("/recycle/orders") && method === "GET") return demoPage(demoRecycles) as T;
  if (path.includes("security-events/summary")) return demoAdminMetrics as T;
  if (path === "/api/recycle/orders" && method === "POST") {
    const data = JSON.parse(String(body ?? "{}")) as Pick<RecycleApplication, "title" | "image">;
    return { id: `r-${Date.now()}`, ...data, status: "SUBMITTED", logisticsStatus: "等待审核", createdAt: new Date().toISOString() } as T;
  }
  return undefined as T;
}

function demoTextResponse(path: string): string {
  if (path.includes("/security-events/export/tasks/") && path.endsWith("/download")) return "event_type,count\nLOGIN,2\n";
  return "";
}
