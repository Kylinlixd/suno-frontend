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
  /** multipart 上传专用通道（会话层带 token + 401 刷新；通用 request 会强设 JSON Content-Type，不可复用） */
  uploader?: Uploader;
}

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type Requester = <T>(path: string, init?: RequestInit) => Promise<T>;
export type TextRequester = (path: string, init?: RequestInit) => Promise<string>;
export type Uploader = (path: string, form: FormData) => Promise<unknown>;

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
  /** 商品图库（主图 + 追加图，去重）；无图库时仅含主图 */
  images?: string[];
}

export interface ListingFilters {
  grade?: string;
  /** M1 关键词搜索：匹配品牌/型号/SN（大小写不敏感包含） */
  keyword?: string;
  /** M1 分类过滤：后端 suno_category 主键 */
  categoryId?: number;
  page?: number;
  size?: number;
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

/** M1 商品分类目录项（GET /api/mall/categories） */
export interface Category {
  categoryId: number;
  name: string;
  parentId?: number | null;
  sortOrder: number;
}

/** M1 用户积分流水条目（GET /api/recycle/points/ledger） */
export interface PointsEntry {
  id: number;
  pointsDelta: number;
  reason: string;
  createdAt: string;
}

/** M2 收货地址 */
export interface Address {
  addressId: number;
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  isDefault: boolean;
}

export interface AddressPayload {
  receiverName: string;
  receiverPhone: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  isDefault?: boolean;
}

/** M2 购物车条目（二手单件，数量恒 1） */
export interface CartEntry {
  cartItemId: number;
  listingId: number;
  brand: string;
  model: string;
  grade?: string;
  salePrice: number;
  stock: number;
  listingStatus: string;
  image: string;
  addedAt: string;
  orderable: boolean;
}

/** M2 优惠券摘要（可领列表与我的券共用） */
export interface CouponSummary {
  couponId: number;
  name: string;
  couponType: string;
  discountValue: number;
  minOrderAmount?: number;
  remainingCount?: number;
  perUserLimit?: number;
  startTime?: string;
  endTime?: string;
  couponUserId?: number;
  status?: "UNUSED" | "USED";
  expireAt?: string;
}

/** M2 售后记录 */
export interface RefundRecord {
  refundId: number;
  refundNo: string;
  orderNo?: string;
  amount: number;
  reason?: string;
  status: "PENDING" | "PROCESSING" | "PROCESSED" | "CANCELLED" | string;
  createdAt: string;
  processedAt?: string;
}

/** M2 站内通知 */
export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  notificationType: string;
  relatedId?: number;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
}

/** M1 用户积分流水分页 + 当前余额 */
export interface PointsLedger extends Page<PointsEntry> {
  balance: number;
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
