import type { Address, AdminMetrics, CartEntry, Category, CouponSummary, Listing, NotificationItem, Order, Page, PointsLedger, RecycleApplication, RefundRecord } from "./types";
import { placeholderImage } from "./placeholder";

export const demoListings: Listing[] = [
  { id: "l-001", name: "Air Jordan 1 Retro High", brand: "Jordan", category: "鞋履", grade: "GOOD", condition: "9.5 成新", price: 899, originalPrice: 1299, image: placeholderImage("jordan-1"), stock: 1, favorite: true, story: "穿过城市雨夜的黑红配色，鞋面保养得很干净。" },
  { id: "l-002", name: "Leica Q2 Monochrom", brand: "Leica", category: "影像", grade: "GOOD", condition: "95 新", price: 24800, originalPrice: 31900, image: placeholderImage("leica-q2"), stock: 1, story: "一台属于慢下来的人使用的相机，快门声仍然清脆。" },
  { id: "l-003", name: "Braun Audio LE03", brand: "Braun", category: "家居", grade: "MEDIUM", condition: "9 成新", price: 2399, originalPrice: 3699, image: placeholderImage("braun-audio"), stock: 2, story: "极简音箱被重新擦亮，适合放在一张空桌上。" },
  { id: "l-004", name: "Carhartt Canvas Jacket", brand: "Carhartt", category: "服装", grade: "MEDIUM", condition: "8.5 成新", price: 499, originalPrice: 899, image: placeholderImage("carhartt"), stock: 3, story: "旧工装的褶皱是它被认真穿过的证据。" },
  { id: "l-005", name: "Herman Miller Aeron", brand: "Herman Miller", category: "家居", grade: "GOOD", condition: "9 成新", price: 3299, originalPrice: 8699, image: placeholderImage("aeron"), stock: 1, story: "让下一段工作时间少一点疲惫，多一点专注。" },
  { id: "l-006", name: "Sony WH-1000XM5", brand: "Sony", category: "数码", grade: "GOOD", condition: "95 新", price: 1499, originalPrice: 2399, image: placeholderImage("sony-headphones"), stock: 4, story: "安静地隔离一座城市，也保留一条回到现实的路。" }
];

export const demoOrders: Order[] = [
  { orderNo: "SN202608050018", status: "SHIPPED", listing: demoListings[1], amount: 24800, createdAt: "2026-08-04 18:32", trackingNo: "SF1468209381" },
  { orderNo: "SN202608010072", status: "RECEIVED", listing: demoListings[3], amount: 499, createdAt: "2026-08-01 09:20" },
  { orderNo: "SN202607290011", status: "WAIT_PAY", listing: demoListings[5], amount: 1499, createdAt: "2026-07-29 15:06" }
];

export const demoRecycles: RecycleApplication[] = [
  { id: "r-001", title: "iPhone 15 Pro Max 256G", image: placeholderImage("iphone-recycle"), status: "VALUED", estimatedPrice: 5630, logisticsStatus: "等待寄出", createdAt: "2026-08-03 12:08" },
  { id: "r-002", title: "Nike Air Max 90", image: placeholderImage("airmax-recycle"), status: "LISTED", estimatedPrice: 420, logisticsStatus: "已完成回收", createdAt: "2026-07-24 08:16" }
];

export const demoAdminMetrics: AdminMetrics = {
  totalEvents: 12,
  counts: {
    LOGIN_SUCCESS: 6,
    LOGIN_FAILED: 2,
    TOKEN_REFRESH: 3,
    LOGOUT: 1
  },
  recommendation: "安全事件处于正常区间，保持当前策略。"
};

export function demoPage<T>(items: T[], page = 0, size = 20): Page<T> {
  return { content: items.slice(page * size, (page + 1) * size), totalElements: items.length, totalPages: Math.ceil(items.length / size), page, size };
}

/** M1 演示分类：按演示商品分类首次出现顺序生成，categoryId 与 getListings 的 demo 过滤对齐 */
export const demoCategories: Category[] = [...new Set(demoListings.map((listing) => listing.category))]
  .map((name, index) => ({ categoryId: index + 1, name, parentId: null, sortOrder: (index + 1) * 10 }));

/** M1 演示积分流水：与演示账户 Alex 的初始积分一致 */
export const demoPointsLedger: PointsLedger = {
  content: [
    { id: 3, pointsDelta: 200, reason: "RECYCLE_ORDER:r-002", createdAt: "2026-07-24 10:20" },
    { id: 2, pointsDelta: 430, reason: "RECYCLE_ORDER:r-001", createdAt: "2026-08-03 12:40" },
    { id: 1, pointsDelta: 570, reason: "注册礼遇", createdAt: "2026-07-01 09:00" }
  ],
  totalElements: 3,
  totalPages: 1,
  page: 0,
  size: 10,
  balance: 1200
};

export const demoImageFor = (seed: string): string => placeholderImage(seed);

/** M2 演示地址 */
export const demoAddresses: Address[] = [
  { addressId: 1, receiverName: "李循环", receiverPhone: "13800138000", province: "上海市", city: "上海市", district: "浦东新区", detailAddress: "世纪大道 100 号 3 幢 501", isDefault: true },
  { addressId: 2, receiverName: "李循环", receiverPhone: "13800138000", province: "北京市", city: "北京市", district: "朝阳区", detailAddress: "望京 SOHO T1 2201", isDefault: false }
];

/** M2 演示购物车（二手单件） */
export const demoCartEntries: CartEntry[] = [
  { cartItemId: 11, listingId: 2, brand: "Leica", model: "Leica Q2 Monochrom", grade: "GOOD", salePrice: 24800, stock: 1, listingStatus: "ON_SHELF", image: placeholderImage("leica-q2"), addedAt: "2026-08-05 10:12", orderable: true },
  { cartItemId: 12, listingId: 5, brand: "Herman Miller", model: "Herman Miller Aeron", grade: "GOOD", salePrice: 3299, stock: 1, listingStatus: "ON_SHELF", image: placeholderImage("aeron"), addedAt: "2026-08-04 21:40", orderable: true }
];

/** M2 演示优惠券：可领 + 我的 */
export const demoClaimableCoupons: CouponSummary[] = [
  { couponId: 101, name: "新手满 2000 减 200", couponType: "FIXED", discountValue: 200, minOrderAmount: 2000, remainingCount: 88, perUserLimit: 1, endTime: "2026-12-31 23:59:59" },
  { couponId: 102, name: "循环生活满 1000 减 80", couponType: "FIXED", discountValue: 80, minOrderAmount: 1000, remainingCount: 200, perUserLimit: 2, endTime: "2026-11-30 23:59:59" }
];

export const demoMyCoupons: CouponSummary[] = [
  { couponId: 102, name: "循环生活满 1000 减 80", couponType: "FIXED", discountValue: 80, minOrderAmount: 1000, couponUserId: 9001, status: "UNUSED", expireAt: "2026-11-30 23:59:59" }
];

/** M2 演示售后记录 */
export const demoRefunds: RefundRecord[] = [
  { refundId: 31, refundNo: "RFD-DEMO0001", orderNo: "SN202607201033", amount: 499, reason: "商品与描述不符，希望退款", status: "PROCESSED", createdAt: "2026-07-21 09:12", processedAt: "2026-07-21 18:30" }
];

/** M2 演示通知 */
export const demoNotifications: NotificationItem[] = [
  { id: 1, title: "商品已发货", content: "订单 SN202608050018 已发货，请注意查收。", notificationType: "ORDER_DELIVERED", relatedType: "RESALE_ORDER", isRead: false, createdAt: "2026-08-05 10:20" },
  { id: 2, title: "支付成功", content: "订单 SN202608050018 已支付，我们会尽快为你安排发货。", notificationType: "ORDER_PAID", relatedType: "RESALE_ORDER", isRead: false, createdAt: "2026-08-04 18:40" },
  { id: 3, title: "订单已创建", content: "订单 SN202608050018 已创建，请尽快完成支付。", notificationType: "ORDER_CREATED", relatedType: "RESALE_ORDER", isRead: true, createdAt: "2026-08-04 18:32" }
];

/** M3 演示：管理端数据 */
export const demoAdminListings: Array<Record<string, unknown>> = demoListings.map((listing, index) => ({
  listingId: Number(listing.id.replace("l-", "")) || index + 1,
  brand: listing.brand,
  model: listing.name,
  grade: listing.grade ?? "GOOD",
  salePrice: listing.price,
  stock: listing.stock,
  status: "ON_SHELF",
  createdAt: "2026-08-0" + ((index % 9) + 1) + " 10:00"
}));

export const demoAdminOrders: Array<Record<string, unknown>> = demoOrders.map((order, index) => ({
  orderNo: order.orderNo,
  buyerUserId: 1001,
  buyerUsername: index % 2 === 0 ? "alice" : "bob",
  productBrand: order.listing.name.split(" ")[0],
  productModel: order.listing.name,
  amount: order.amount,
  payableAmount: order.amount,
  payStatus: order.status === "WAIT_PAY" ? "UNPAID" : "PAID",
  fulfillStatus: order.status === "SHIPPED" ? "DELIVERED" : order.status === "RECEIVED" ? "COMPLETED" : order.status === "WAIT_PAY" ? "WAIT_PAY" : "TO_DELIVER",
  createdAt: order.createdAt
}));

export const demoAdminUsers: Array<Record<string, unknown>> = [
  { userId: 1001, username: "alice", role: "USER", accountStatus: "ACTIVE", level: "VIP", points: 1200 },
  { userId: 1002, username: "bob", role: "USER", accountStatus: "ACTIVE", level: "NORMAL", points: 300 },
  { userId: 9001, username: "admin", role: "ADMIN", accountStatus: "ACTIVE", level: "ADMIN", points: 99999 }
];

export const demoAdminCoupons: Array<Record<string, unknown>> = [
  { couponId: 101, name: "新手满 2000 减 200", couponType: "FIXED", discountValue: 200, minOrderAmount: 2000, totalCount: 100, remainingCount: 88, perUserLimit: 1, status: "ACTIVE", endTime: "2026-12-31 23:59:59" },
  { couponId: 102, name: "循环生活满 1000 减 80", couponType: "FIXED", discountValue: 80, minOrderAmount: 1000, totalCount: 500, remainingCount: 312, perUserLimit: 2, status: "ACTIVE", endTime: "2026-11-30 23:59:59" }
];

export const demoAdminReport = {
  totalOrders: 3, paidOrders: 2, completedOrders: 1, refundedOrders: 0, refundRate: 0,
  gmv: 26299, refundedAmount: 0, recycleCount: 31, trendDays: 14,
  trend: Array.from({ length: 14 }, (_, index) => ({ date: `2026-10-${index + 10}`, orders: (index * 7) % 5, paidOrders: (index * 3) % 4 }))
};

/** P1 演示：审计日志与管理端售后 */
export const demoAuditLogs: Array<Record<string, unknown>> = [
  { id: 1, actionType: "RESALE_ORDER_PAY", targetType: "RESALE_ORDER", targetId: "B2C-DEMO0001", detail: "payStatus=PAID", createdAt: "2026-08-05 10:20" },
  { id: 2, actionType: "RESALE_ORDER_DELIVER", targetType: "RESALE_ORDER", targetId: "B2C-DEMO0001", detail: "fulfillStatus=DELIVERED", createdAt: "2026-08-05 15:40" },
  { id: 3, actionType: "RESALE_LISTING_PRICE", targetType: "RESALE_LISTING", targetId: "7", detail: "from=2499,to=2299", createdAt: "2026-08-06 09:10" }
];

export const demoAdminRefunds: Array<Record<string, unknown>> = [
  { refundId: 41, refundNo: "RFD-DEMO0001", orderNo: "B2C-DEMO0002", amount: 100, reason: "外包装轻微破损协商补偿", status: "PENDING", buyerUserId: 1001, payChannel: "ALIPAY", createdAt: "2026-08-06 11:00" },
  { refundId: 31, refundNo: "RFD-DEMO0002", orderNo: "B2C-DEMO0003", amount: 499, reason: "商品与描述不符", status: "PROCESSED", buyerUserId: 1002, payChannel: "MOCK", createdAt: "2026-08-04 09:12", processedAt: "2026-08-04 18:30" }
];
