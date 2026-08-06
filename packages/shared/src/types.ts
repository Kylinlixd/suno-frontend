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
  condition: string;
  price: number;
  originalPrice: number;
  image: string;
  stock: number;
  favorite?: boolean;
  story: string;
}

export interface Order {
  orderNo: string;
  status: OrderStatus;
  listing: Pick<Listing, "id" | "name" | "image">;
  amount: number;
  createdAt: string;
  trackingNo?: string;
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
  recycleCount: number;
  pendingReview: number;
  fulfillment: number;
  paymentIssues: number;
  recentActivity: Array<{ label: string; value: string; tone: "lime" | "amber" | "rose" | "blue" }>;
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
