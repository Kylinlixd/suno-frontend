import { demoAdminMetrics, demoListings, demoOrders, demoPage, demoRecycles } from "./demo";
import { hmacSha256Hex } from "./paySignature";
import { placeholderImage } from "./placeholder";
import type { AdminMetrics, ApiOptions, ApiResponse, Listing, ListingFilters, Order, OrderFilters, OrderSummary, Page, PaymentReplaySummary, RecycleApplication, Review, ReviewRiskListing, ReviewRiskSummary, ReviewSummary, SessionList } from "./types";

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

const DEFAULT_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, options: ApiOptions): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ApiError("请求超时，请稍后重试", 408, "REQUEST_TIMEOUT")), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function buildUrl(path: string, options: ApiOptions): string {
  return `${options.baseUrl ?? "http://localhost:8080"}${path}`;
}

function buildHeaders(init: RequestInit, options: ApiOptions): HeadersInit {
  return {
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...init.headers
  };
}

export async function request<T>(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<T> {
  if (options.requester) return options.requester<T>(path, init);
  if (options.demo) return demoResponse<T>(path, init.method ?? "GET", init.body);
  const fetcher = options.fetcher ?? fetch;
  const method = (init.method ?? "GET").toUpperCase();
  const etagEntry = method === "GET" ? options.etagCache?.get(path) : undefined;
  const response = await withTimeout(
    fetcher(buildUrl(path, options), {
      ...init,
      headers: {
        ...buildHeaders(init, options),
        ...(etagEntry ? { "If-None-Match": etagEntry.etag } : {})
      }
    }),
    options
  );
  if (response.status === 304 && etagEntry) return unwrapResponse<T>(etagEntry.payload as ApiResponse<T>);
  let payload: ApiResponse<T> | undefined;
  try { payload = await response.json() as ApiResponse<T>; } catch { payload = undefined; }
  if (!response.ok) throw new ApiError(payload?.message || response.statusText || "请求失败", response.status, payload?.errorCode ?? payload?.code);
  if (!payload) throw new ApiError("响应不是有效的 JSON", response.status, "RESPONSE_NOT_JSON");
  const etag = typeof response.headers?.get === "function" ? response.headers.get("etag") : null;
  if (etag && options.etagCache && method === "GET") options.etagCache.set(path, { etag, payload });
  return unwrapResponse(payload);
}

export async function requestText(path: string, init: RequestInit = {}, options: ApiOptions = {}): Promise<string> {
  if (options.textRequester) return options.textRequester(path, init);
  if (options.demo) return demoTextResponse(path);
  const fetcher = options.fetcher ?? fetch;
  const response = await withTimeout(fetcher(buildUrl(path, options), { ...init, headers: buildHeaders(init, options) }), options);
  const content = await response.text();
  if (!response.ok) throw new ApiError(content || "请求失败", response.status);
  return content;
}

export async function getListings(filters: ListingFilters = {}, options?: ApiOptions): Promise<Page<Listing>> {
  const params = new URLSearchParams({ minStock: "1" });
  if (filters.grade) params.set("grade", filters.grade);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  const page = normalizePage<Listing>(await request<unknown>(`/api/mall/listings?${params.toString()}`, {}, options), 20);
  let listings = page.content.map(toListing);
  // demo 后端不解析筛选参数，客户端应用同一套过滤与排序
  if (options?.demo) {
    if (filters.grade) listings = listings.filter((listing) => listing.grade === filters.grade);
    if (filters.sortBy) {
      const direction = filters.sortOrder === "desc" ? -1 : 1;
      listings = [...listings].sort((a, b) => filters.sortBy === "price" ? (a.price - b.price) * direction : a.name.localeCompare(b.name) * direction);
    }
  }
  return { ...page, content: listings };
}

export async function getListing(id: string, options?: ApiOptions): Promise<Listing> {
  // 后端暂无单商品接口，从列表中查找；列表经 React Query 缓存，成本可控
  const listing = (await getListings({}, options)).content.find((item) => item.id === id);
  if (!listing) throw new ApiError("商品不存在", 404, "LISTING_NOT_FOUND");
  return listing;
}

export async function getOrders(userId: number | undefined, options?: ApiOptions, filters: OrderFilters = {}): Promise<Page<Order>> {
  if (!options?.demo && !Number.isInteger(userId)) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
  const params = new URLSearchParams({ buyerUserId: String(userId ?? 0), page: String(filters.page ?? 0), size: String(filters.size ?? 20) });
  if (filters.payStatus) params.set("payStatus", filters.payStatus);
  if (filters.fulfillStatus) params.set("fulfillStatus", filters.fulfillStatus);
  const query = options?.demo ? "" : `?${params.toString()}`;
  const data = await request<unknown>(`/api/mall/orders${query}`, {}, options);
  const page = normalizePage<Order>(data, filters.size ?? 20);
  let orders = page.content.map(toOrder);
  if (options?.demo) {
    if (filters.payStatus) orders = orders.filter((order) => toOrderStatus(undefined, filters.payStatus, undefined) === order.status);
    if (filters.fulfillStatus) orders = orders.filter((order) => toOrderStatus(undefined, undefined, filters.fulfillStatus) === order.status);
    const page0 = filters.page ?? 0;
    const size0 = filters.size ?? 20;
    orders = orders.slice(page0 * size0, (page0 + 1) * size0);
  }
  return { ...page, content: orders };
}

export async function getOrderSummary(userId: number | undefined, lookbackDays = 365, options?: ApiOptions): Promise<OrderSummary> {
  if (!options?.demo && !Number.isInteger(userId)) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
  const data = await request<Record<string, unknown>>(`/api/mall/orders/summary?buyerUserId=${userId}&lookbackDays=${lookbackDays}`, {}, options);
  return {
    totalOrders: numberValue(data.totalOrders),
    totalAmount: numberValue(data.totalAmount),
    paidAmount: numberValue(data.paidAmount),
    refundedAmount: numberValue(data.refundedAmount),
    completedOrders: numberValue(data.completedOrders),
    completionRate: numberValue(data.completionRate),
    refundRate: numberValue(data.refundRate),
    healthScore: numberValue(data.healthScore),
    healthLevel: String(data.healthLevel ?? "UNKNOWN"),
    payStatusCounts: numberMap(data.payStatusCounts),
    fulfillStatusCounts: numberMap(data.fulfillStatusCounts)
  };
}

export const getRecycles = (options?: ApiOptions) => options?.demo
  ? request<Page<RecycleApplication>>("/api/recycle/orders?page=0&size=20", {}, options)
  : Promise.reject(new ApiError("用户回收记录接口未提供", 404, "RECYCLE_HISTORY_UNAVAILABLE"));
export async function getAdminRecycles(options?: ApiOptions): Promise<Page<RecycleApplication>> {
  const page = normalizePage(await request<unknown>("/api/admin/recycle/orders", {}, options), 50);
  return { ...page, content: page.content.map(toRecycleApplication) };
}
export const getAdminMetrics = (options?: ApiOptions) => request<unknown>("/api/admin/auth/security-events/summary?lookbackMinutes=1440", {}, options).then(toAdminMetrics);
export const getPaymentReplaySummary = (options?: ApiOptions) => request<unknown>("/api/admin/payment/replay-tasks/summary", {}, options).then(toPaymentReplaySummary);
export const getAdminReviewRiskSummary = (options?: ApiOptions) => request<unknown>("/api/admin/recycle/review-risk/summary?lookbackMinutes=1440", {}, options).then(toReviewRiskSummary);
export async function getAdminReviewRiskTopListings(options?: ApiOptions): Promise<ReviewRiskListing[]> {
  const data = await request<unknown>("/api/admin/recycle/review-risk/top-listings?lookbackMinutes=1440&topN=10", {}, options);
  return Array.isArray(data) ? data.map(toReviewRiskListing) : [];
}
export const getAdminSecurityTimeline = (lookbackMinutes: number, options?: ApiOptions) => request<Record<string, unknown>>(`/api/admin/auth/security-events/timeline?lookbackMinutes=${lookbackMinutes}`, {}, options);

/** 支付待付订单：按后端 PaymentSignatureService 契约生成 HMAC-SHA256 签名 */
export function payOrder(orderNo: string, options?: ApiOptions): Promise<Record<string, unknown>> {
  if (options?.demo) return request<Record<string, unknown>>("/api/mall/orders/pay", { method: "POST", body: JSON.stringify({ orderNo }) }, options);
  const secret = options?.paymentSecret;
  if (!secret) return Promise.reject(new ApiError("未配置支付签名密钥（VITE_PAYMENT_SECRET / TARO_APP_PAYMENT_SECRET）", 500, "PAYMENT_SECRET_MISSING"));
  const idempotencyKey = `pay-${orderNo}-${Date.now()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
  const signature = hmacSha256Hex(`${orderNo}|${idempotencyKey}|${timestamp}|${nonce}`, secret);
  return request<Record<string, unknown>>("/api/mall/orders/pay", { method: "POST", body: JSON.stringify({ orderNo, idempotencyKey, timestamp, nonce, signature }) }, options);
}

export function createReview(body: { orderNo: string; buyerUserId: number | undefined; rating: number; content: string }, options?: ApiOptions) {
  if (!options?.demo && !Number.isInteger(body.buyerUserId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  if (body.rating < 1 || body.rating > 5 || !body.content.trim()) return Promise.reject(new ApiError("评分和评价内容不能为空", 400, "REVIEW_PAYLOAD_INVALID"));
  return request<Record<string, unknown>>("/api/mall/reviews/create", { method: "POST", body: JSON.stringify(body) }, options);
}

export function appendReview(body: { orderNo: string; buyerUserId: number | undefined; appendContent: string }, options?: ApiOptions) {
  if (!options?.demo && !Number.isInteger(body.buyerUserId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  if (!body.appendContent.trim()) return Promise.reject(new ApiError("追评内容不能为空", 400, "REVIEW_PAYLOAD_INVALID"));
  return request<Record<string, unknown>>("/api/mall/reviews/append", { method: "POST", body: JSON.stringify(body) }, options);
}

export function voteReviewUseful(body: { orderNo: string; voterUserId: number | undefined }, options?: ApiOptions) {
  if (!options?.demo && !Number.isInteger(body.voterUserId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<Record<string, unknown>>("/api/mall/reviews/vote-useful", { method: "POST", body: JSON.stringify(body) }, options);
}

export function reportReview(body: { orderNo: string; reporterUserId: number | undefined; reason: string }, options?: ApiOptions) {
  if (!options?.demo && !Number.isInteger(body.reporterUserId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  if (!body.reason.trim()) return Promise.reject(new ApiError("请填写举报原因", 400, "REVIEW_PAYLOAD_INVALID"));
  return request<Record<string, unknown>>("/api/mall/reviews/report", { method: "POST", body: JSON.stringify(body) }, options);
}

export const listSessions = (options?: ApiOptions) => request<unknown>("/api/auth/sessions", {}, options).then(toSessionList);
export const revokeDeviceSession = (deviceId: string, options?: ApiOptions) => request<void>("/api/auth/sessions/revoke-device", { method: "POST", body: JSON.stringify({ deviceId }) }, options);
export const revokeAllSessions = (options?: ApiOptions) => request<void>("/api/auth/sessions/revoke-all", { method: "POST", body: JSON.stringify({}) }, options);
export const createSecurityExportTask = (body: { type: string; format: string; lookbackMinutes: number; topN: number; actionTypes?: string[]; idempotencyKey: string }, options?: ApiOptions) => request<Record<string, unknown>>("/api/admin/auth/security-events/export/tasks", { method: "POST", body: JSON.stringify(body) }, options);
export const downloadSecurityExportTask = (taskId: string, options?: ApiOptions) => requestText(`/api/admin/auth/security-events/export/tasks/${encodeURIComponent(taskId)}/download`, {}, options);

export function createResaleOrder(listingId: string, userId: number | undefined, options?: ApiOptions) {
  if (!options?.demo && !Number.isInteger(userId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  const parsedListingId = Number(listingId);
  if (!options?.demo && !Number.isInteger(parsedListingId)) return Promise.reject(new ApiError("商品编号无效", 400, "LISTING_ID_INVALID"));
  return request<Record<string, unknown>>("/api/mall/orders", { method: "POST", body: JSON.stringify({ buyerUserId: userId, listingId: options?.demo ? listingId : parsedListingId }) }, options);
}

export async function getFavorites(userId: number | undefined, options?: ApiOptions): Promise<Page<Listing>> {
  if (!options?.demo && !Number.isInteger(userId)) throw new ApiError("请先登录", 401, "AUTH_REQUIRED");
  const data = await request<unknown>(`/api/mall/favorites?userId=${userId}`, {}, options);
  const page = normalizePage(data, 20);
  return { ...page, content: page.content.map(toListing) };
}

/** 后端商品列表不携带 favorite 字段，收藏态需经收藏列表查询回填 */
export async function isFavoriteListing(listingId: string, userId: number | undefined, options?: ApiOptions): Promise<boolean> {
  if (!options?.demo && !Number.isInteger(userId)) return false;
  const page = await getFavorites(userId, options);
  return page.content.some((listing) => listing.id === listingId);
}

export function queryOrderTrack(orderNo: string, userId: number | undefined, options?: ApiOptions) {
  if (!options?.demo && !Number.isInteger(userId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<Record<string, unknown>>(`/api/mall/orders/${encodeURIComponent(orderNo)}/track?buyerUserId=${userId}`, {}, options);
}

export async function getReviews(listingId: string, options?: ApiOptions): Promise<ReviewSummary> {
  const data = await request<unknown>(`/api/mall/reviews?listingId=${encodeURIComponent(listingId)}`, {}, options);
  const summary = (data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(summary.items) ? summary.items : [];
  return {
    listingId: String(summary.listingId ?? listingId),
    reviewCount: numberValue(summary.reviewCount),
    avgRating: numberValue(summary.avgRating),
    items: items.map(toReview)
  };
}

export function createRecycleApplication(payload: Pick<RecycleApplication, "title" | "image"> & Partial<{ userId: number; snCode: string; wearScore: number; recycleCount: number }>, options?: ApiOptions) {
  if (options?.demo) return request<RecycleApplication>("/api/recycle/orders", { method: "POST", body: JSON.stringify(payload) }, options);
  if (!options?.userId) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<RecycleApplication>("/api/recycle/orders", { method: "POST", body: JSON.stringify({ userId: options.userId, snCode: payload.snCode ?? payload.title, imageUrl: payload.image, wearScore: payload.wearScore ?? 50, recycleCount: payload.recycleCount ?? 0 }) }, options);
}

// buyerUserId 随后端归属校验补丁一并提交（后端 cancelUnpaidResaleOrder 将校验订单归属）
export const cancelOrder = (orderNo: string, userId: number | undefined, options?: ApiOptions) => {
  if (!options?.demo && !Number.isInteger(userId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<void>("/api/mall/orders/cancel", { method: "POST", body: JSON.stringify({ orderNo, buyerUserId: userId }) }, options);
};
export const confirmReceipt = (orderNo: string, userId: number | undefined, options?: ApiOptions) => {
  if (!options?.demo && !Number.isInteger(userId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<void>("/api/mall/orders/confirm-receipt", { method: "POST", body: JSON.stringify({ orderNo, buyerUserId: userId }) }, options);
};
export const addFavorite = (listingId: string, userId: number | undefined, options?: ApiOptions) => {
  if (!options?.demo && !Number.isInteger(userId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<void>("/api/mall/favorites/add", { method: "POST", body: JSON.stringify({ listingId: options?.demo ? listingId : parseListingId(listingId), userId }) }, options);
};
export const removeFavorite = (listingId: string, userId: number | undefined, options?: ApiOptions) => {
  if (!options?.demo && !Number.isInteger(userId)) return Promise.reject(new ApiError("请先登录", 401, "AUTH_REQUIRED"));
  return request<void>("/api/mall/favorites/remove", { method: "POST", body: JSON.stringify({ listingId: options?.demo ? listingId : parseListingId(listingId), userId }) }, options);
};
export const reviewRecycleOrder = (body: { orderNo: string; action: string; reviewedGrade?: string }, options?: ApiOptions) => request<void>("/api/admin/recycle/orders/review", { method: "PATCH", body: JSON.stringify(body) }, options);
export const publishListing = (body: { recycleOrderNo: string; salePrice: number; stock: number }, options?: ApiOptions) => request<void>("/api/admin/recycle/listings/publish", { method: "POST", body: JSON.stringify(body) }, options);
export const postAdminAction = (path: string, body: unknown, options?: ApiOptions) => request<void>(path, { method: "POST", body: JSON.stringify(body) }, options);

export function normalizePage<T>(data: unknown, size = 20): Page<T> {
  if (Array.isArray(data)) return { content: data as T[], totalElements: data.length, totalPages: data.length ? 1 : 0, page: 0, size };
  const page = data as (Partial<Page<T>> & { items?: unknown[] }) | undefined;
  const list = Array.isArray(page?.content) ? page.content : Array.isArray(page?.items) ? page.items : undefined;
  if (list) return { content: list as T[], totalElements: page?.totalElements ?? list.length, totalPages: page?.totalPages ?? 1, page: page?.page ?? 0, size: page?.size ?? size };
  return { content: [], totalElements: 0, totalPages: 0, page: 0, size };
}

function toSessionList(value: unknown): SessionList {
  const data = (value ?? {}) as Record<string, unknown>;
  const sessions = Array.isArray(data.sessions) ? data.sessions as Array<Record<string, unknown>> : [];
  return {
    username: String(data.username ?? ""),
    total: numberValue(data.total ?? sessions.length),
    sessions: sessions.map((session) => ({
      deviceId: String(session.deviceId ?? ""),
      createdAt: String(session.createdAt ?? ""),
      expireAt: String(session.expireAt ?? ""),
      revoked: Boolean(session.revoked)
    }))
  };
}

function toListing(value: unknown): Listing {
  const item = value as Record<string, unknown>;
  const id = String(item.id ?? item.listingId ?? "");
  const brand = String(item.brand ?? "Suno");
  const model = String(item.name ?? item.model ?? "未命名商品");
  const price = Number(item.price ?? item.salePrice ?? 0);
  const rawOriginal = item.originalPrice == null ? undefined : Number(item.originalPrice);
  return {
    id,
    name: item.name ? model : `${brand} ${model}`,
    brand,
    category: String(item.category ?? "数码"),
    grade: item.grade ? String(item.grade) : undefined,
    condition: String(item.condition ?? gradeLabel(item.grade) ?? "待确认"),
    price,
    originalPrice: rawOriginal != null && rawOriginal > price ? rawOriginal : undefined,
    image: String(item.image ?? placeholderImage(`suno-listing-${id}`)),
    stock: Number(item.stock ?? 0),
    favorite: Boolean(item.favorite),
    story: String(item.story ?? "经过审核、估价与整理，等待下一次被认真使用。")
  };
}

const GRADE_LABELS: Record<string, string> = { GOOD: "成色良好", MEDIUM: "成色中等", UNQUALIFIED: "有明显使用痕迹" };
function gradeLabel(grade: unknown): string | undefined {
  return grade ? GRADE_LABELS[String(grade)] ?? String(grade) : undefined;
}

function toOrder(value: unknown): Order {
  const item = value as Record<string, unknown>;
  const listingId = String(item.listingId ?? (item.listing as Record<string, unknown> | undefined)?.id ?? "");
  const brand = String(item.productBrand ?? (item.listing as Record<string, unknown> | undefined)?.brand ?? "Suno");
  const model = String(item.productModel ?? (item.listing as Record<string, unknown> | undefined)?.name ?? "商品");
  return {
    orderNo: String(item.orderNo ?? ""),
    status: toOrderStatus(item.status, item.payStatus, item.fulfillStatus),
    statusText: item.statusText ? String(item.statusText) : undefined,
    listing: { id: listingId, name: item.listing ? String((item.listing as Record<string, unknown>).name ?? model) : `${brand} ${model}`, image: String(item.image ?? placeholderImage(`suno-order-${listingId}`)) },
    amount: Number(item.amount ?? 0),
    createdAt: String(item.createdAt ?? "")
  };
}

function toOrderStatus(status: unknown, payStatus: unknown, fulfillStatus: unknown): Order["status"] {
  if (status === "CANCELLED" || fulfillStatus === "CANCELLED" || fulfillStatus === "AUTO_CLOSED") return "CANCELLED";
  if (status === "WAIT_PAY" || payStatus === "UNPAID") return "WAIT_PAY";
  if (status === "RECEIVED" || fulfillStatus === "COMPLETED") return "RECEIVED";
  if (status === "SHIPPED" || fulfillStatus === "DELIVERED") return "SHIPPED";
  return "PAID";
}

function toAdminMetrics(value: unknown): AdminMetrics {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    totalEvents: numberValue(data.totalEvents),
    counts: numberMap(data.counts),
    recommendation: String(data.recommendation ?? "")
  };
}

function toPaymentReplaySummary(value: unknown): PaymentReplaySummary {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    pending: numberValue(data.pending),
    processing: numberValue(data.processing),
    success: numberValue(data.success),
    dead: numberValue(data.dead),
    readyToConsume: numberValue(data.readyToConsume)
  };
}

function toReviewRiskSummary(value: unknown): ReviewRiskSummary {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    lookbackMinutes: numberValue(data.lookbackMinutes),
    totalReviews: numberValue(data.totalReviews),
    sensitiveReviewCount: numberValue(data.sensitiveReviewCount),
    sensitiveRate: numberValue(data.sensitiveRate),
    reportCount: numberValue(data.reportCount),
    pendingReportCount: numberValue(data.pendingReportCount),
    riskLevel: String(data.riskLevel ?? "UNKNOWN"),
    recommendation: String(data.recommendation ?? "")
  };
}

function toReview(value: unknown): Review {
  const item = value as Record<string, unknown>;
  return {
    orderNo: String(item.orderNo ?? ""),
    rating: numberValue(item.rating),
    content: String(item.content ?? ""),
    appendContent: item.appendContent ? String(item.appendContent) : undefined,
    merchantReply: item.merchantReply ? String(item.merchantReply) : undefined,
    usefulCount: numberValue(item.usefulCount),
    createdAt: String(item.createdAt ?? "")
  };
}

function toRecycleApplication(value: unknown): RecycleApplication {
  const item = value as Record<string, unknown>;
  const id = String(item.id ?? item.orderNo ?? "");
  const status = toRecycleStatus(item.status);
  return {
    id,
    title: String(item.title ?? item.orderNo ?? "回收申请"),
    image: String(item.image ?? placeholderImage(`suno-recycle-${id}`)),
    status,
    estimatedPrice: item.estimatedPrice == null ? undefined : Number(item.estimatedPrice),
    logisticsStatus: String(item.logisticsStatus ?? item.grade ?? "等待审核"),
    createdAt: String(item.createdAt ?? "")
  };
}

function toReviewRiskListing(value: unknown): ReviewRiskListing {
  const item = value as Record<string, unknown>;
  const sensitiveRate = numberValue(item.sensitiveRate);
  return {
    listingId: numberValue(item.listingId),
    reviewCount: numberValue(item.reviewCount),
    sensitiveReviewCount: numberValue(item.sensitiveReviewCount),
    // 后端若返回百分数（>1）则归一化为 0-1 小数
    sensitiveRate: sensitiveRate > 1 ? sensitiveRate / 100 : sensitiveRate,
    reportCount: numberValue(item.reportCount),
    riskScore: numberValue(item.riskScore)
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

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, numberValue(item)]));
}

function demoResponse<T>(path: string, method: string, body?: BodyInit | null): T {
  if (path.includes("/listings/") && method === "GET") return demoListings.find((listing) => listing.id === path.split("/").pop()) as T;
  if (path.includes("/listings") && method === "GET") return demoPage(demoListings) as T;
  if (path === "/api/auth/me") return { userId: 1, username: "Alex", role: "USER" } as T;
  if (path === "/api/auth/sessions") return { username: "Alex", total: 2, sessions: [{ deviceId: "suno-web", createdAt: "2026-08-01 09:00", expireAt: "2026-09-01 09:00", revoked: false }, { deviceId: "suno-mini", createdAt: "2026-08-03 20:12", expireAt: "2026-09-03 20:12", revoked: false }] } as T;
  if (path === "/api/mall/orders" && method === "POST") return { orderNo: `DEMO-${Date.now()}` } as T;
  if (path.includes("/api/mall/orders/summary") && method === "GET") return { totalOrders: 3, totalAmount: 26798, paidAmount: 26299, refundedAmount: 499, completedOrders: 1, completionRate: 33.33, refundRate: 1.86, healthScore: 84, healthLevel: "GOOD", payStatusCounts: { PAID: 2, UNPAID: 1 }, fulfillStatusCounts: { DELIVERED: 1, COMPLETED: 1, WAIT_PAY: 1 } } as T;
  if (path.includes("/track") && method === "GET") return { orderNo: path.split("/")[4] ?? "SN202608050018", payStatus: "PAID", fulfillStatus: "DELIVERED", timeline: [{ actionType: "RESALE_ORDER_PAY", detail: "支付完成，订单进入履约", createdAt: "2026-08-04 18:40" }, { actionType: "RESALE_ORDER_DELIVER", detail: "包裹已离开发货仓", createdAt: "2026-08-05 10:20" }], reviewEligibility: { hasReviewed: false, canCreateReview: true, canAppendReview: false } } as T;
  if (path.includes("/reviews") && method === "GET") return { listingId: path.split("listingId=")[1] ?? "l-001", reviewCount: 2, avgRating: 4.5, items: [{ orderNo: "SN202608010072", rating: 5, content: "成色和描述一致，包装很仔细。", appendContent: "", merchantReply: "感谢信任，欢迎下次再来。", usefulCount: 3, createdAt: "2026-08-02 09:12" }, { orderNo: "SN202607290011", rating: 4, content: "整体不错，物流稍慢。", appendContent: "", merchantReply: "", usefulCount: 1, createdAt: "2026-07-30 21:05" }] } as T;
  if (path.includes("/api/admin/recycle/orders") && method === "GET") return demoPage(demoRecycles) as T;
  if (path.includes("/api/admin/payment/replay-tasks/summary") && method === "GET") return { pending: 2, processing: 1, success: 18, dead: 0, readyToConsume: 2 } as T;
  if (path.includes("/api/admin/recycle/review-risk/summary") && method === "GET") return { totalReviews: 31, sensitiveReviewCount: 2, sensitiveRate: 0.0645, reportCount: 4, pendingReportCount: 1, riskLevel: "LOW", recommendation: "保持当前审核策略" } as T;
  if (path.includes("/api/admin/recycle/review-risk/top-listings") && method === "GET") return [{ listingId: 7, reviewCount: 12, sensitiveReviewCount: 2, sensitiveRate: 0.1667, reportCount: 3, riskScore: 26.67 }] as T;
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
  // demo 下无返回值的动作接口（取消订单、确认收货、审核、上架等）
  if (method === "POST" || method === "PATCH" || method === "DELETE") return undefined as T;
  throw new ApiError(`演示模式未实现该接口: ${method} ${path}`, 404, "DEMO_NOT_IMPLEMENTED");
}

function demoTextResponse(path: string): string {
  if (path.includes("/security-events/export/tasks/") && path.endsWith("/download")) return "event_type,count\nLOGIN,2\n";
  return "";
}
