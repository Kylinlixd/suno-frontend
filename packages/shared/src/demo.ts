import type { AdminMetrics, Listing, Order, Page, RecycleApplication } from "./types";
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

export const demoImageFor = (seed: string): string => placeholderImage(seed);
