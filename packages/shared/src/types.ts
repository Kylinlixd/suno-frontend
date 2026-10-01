export type OrderStatus = "WAIT_PAY" | "PAID" | "SHIPPED" | "RECEIVED" | "CANCELLED";
export type RecycleStatus = "SUBMITTED" | "AUDITING" | "VALUED" | "QUALITY_CONFIRMED" | "LISTED";

export interface ApiResponse<T = unknown> {
  code?: string;
  success?: boolean;
  message: string;
  errorCode?: string | null;
  data?: T;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  deviceId: string;
}

export interface AuthUser {
  userId: number;
  username: string;
  role: string;
  accountStatus?: string;
}

export interface AuthSession extends AuthTokens, AuthUser {}

export interface StorageAdapter {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
}

export interface ApiOptions {
  baseUrl?: string;
  token?: string;
  demo?: boolean;
  userId?: number;
  timeoutMs?: number;
  /** 支付签名密钥（VITE_PAYMENT_SECRET / TARO_APP_PAYMENT_SECRET），需与后端 PAYMENT_CALLBACK_SECRET 一致 */
  paymentSecret?: string;
  /** ETag 协商缓存：GET 请求命中 304 时直接返回缓存 envelope（仅 web fetch 路径） */
  etagCache?: Map<string, { etag: string; payload: unknown }>;
  fetcher?: Fetcher;
  requester?: Requester;
  textRequester?: TextRequester;
}

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Requester = <T>(path: string, init?: RequestInit) => Promise<T>;
export type TextRequester = (path: string, init?: RequestInit) => Promise<string>;

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface Listing {
  id: string;
  name: string;
  brand: string;
  category: string;
  /** 后端成色枚举：GOOD / MEDIUM / UNQUALIFIED */
  grade?: string;
  condition: string;
  price: number;
  /** 后端无原价字段；仅在确实存在且大于现价时展示划线价 */
  originalPrice?: number;
  image: string;
  stock: number;
  favorite?: boolean;
  story: string;
}

export interface ListingFilters {
  grade?: string;
  sortBy?: "createdAt" | "price";
  sortOrder?: "asc" | "desc";
}

export interface OrderFilters {
  payStatus?: string;
  fulfillStatus?: string;
  page?: number;
  size?: number;
}

export interface SessionInfo {
  deviceId: string;
  createdAt: string;
  expireAt: string;
  revoked: boolean;
}

export interface SessionList {
  username: string;
  total: number;
  sessions: SessionInfo[];
}

export interface Order {
  orderNo: string;
  status: OrderStatus;
  /** 后端提供的 i18n 状态文案（如“已发货”），优先于本地推导 */
  statusText?: string;
  listing: Pick<Listing, "id" | "name" | "image">;
  amount: number;
  createdAt: string;
  trackingNo?: string;
}

export interface OrderSummary {
  totalOrders: number;
  totalAmount: number;
  paidAmount: number;
  refundedAmount: number;
  completedOrders: number;
  completionRate: number;
  refundRate: number;
  healthScore: number;
  healthLevel: string;
  payStatusCounts: Record<string, number>;
  fulfillStatusCounts: Record<string, number>;
}

export interface ReviewRiskListing {
  listingId: number;
  reviewCount: number;
  sensitiveReviewCount: number;
  sensitiveRate: number;
  reportCount: number;
  riskScore: number;
}

export interface Review {
  orderNo: string;
  rating: number;
  content: string;
  appendContent?: string;
  merchantReply?: string;
  usefulCount: number;
  createdAt: string;
}

export interface ReviewSummary {
  listingId: string;
  reviewCount: number;
  avgRating: number;
  items: Review[];
}

export interface RecycleApplication {
  id: string;
  title: string;
  image: string;
  status: RecycleStatus;
  estimatedPrice?: number;
  logisticsStatus: string;
  createdAt: string;
}

export interface AdminMetrics {
  /** 安全事件总数（近 lookbackMinutes） */
  totalEvents: number;
  /** 按事件类型计数，如 LOGIN_SUCCESS */
  counts: Record<string, number>;
  recommendation: string;
}

export interface PaymentReplaySummary {
  pending: number;
  processing: number;
  success: number;
  dead: number;
  readyToConsume: number;
}

export interface ReviewRiskSummary {
  lookbackMinutes: number;
  totalReviews: number;
  sensitiveReviewCount: number;
  sensitiveRate: number;
  reportCount: number;
  pendingReportCount: number;
  riskLevel: string;
  recommendation: string;
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  WAIT_PAY: "待支付",
  PAID: "已支付",
  SHIPPED: "运输中",
  RECEIVED: "已收货",
  CANCELLED: "已取消"
};

export const recycleStatusLabel: Record<RecycleStatus, string> = {
  SUBMITTED: "已提交",
  AUDITING: "审核中",
  VALUED: "已估价",
  QUALITY_CONFIRMED: "质检完成",
  LISTED: "已上架"
};
