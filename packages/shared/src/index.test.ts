import { describe, expect, it } from "vitest";
import { addFavorite, createResaleOrder, createSecurityExportTask, downloadSecurityExportTask, getAdminReviewRiskSummary, getAdminSecurityTimeline, getFavorites, getListings, getOrders, getPaymentReplaySummary, normalizePage, queryOrderTrack, unwrapResponse } from "./index";
import { createSessionClient, type StorageAdapter } from "./session";

describe("unwrapResponse", () => {
  it("returns data from a successful Suno envelope", () => {
    expect(unwrapResponse({ code: "OK", message: "ok", data: { id: "listing-1" } })).toEqual({ id: "listing-1" });
  });

  it("throws the backend error code from a failed envelope", () => {
    expect(() => unwrapResponse({ code: "ORDER_STOCK_CONFLICT", message: "库存不足" })).toThrow("ORDER_STOCK_CONFLICT");
  });

  it("accepts the Spring ApiResponse envelope", () => {
    expect(unwrapResponse({ success: true, message: "OK", data: { id: "listing-2" } })).toEqual({ id: "listing-2" });
    expect(() => unwrapResponse({ success: false, message: "登录失效", errorCode: "AUTH_UNAUTHORIZED" })).toThrow("AUTH_UNAUTHORIZED");
  });

  it("wraps backend listing arrays as a page", () => {
    expect(normalizePage(["a", "b"], 20)).toMatchObject({ content: ["a", "b"], totalElements: 2, totalPages: 1, page: 0, size: 20 });
  });

  it("maps backend marketplace listings and orders into the client model", async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      const url = String(input);
      const data = url.includes("/listings")
        ? [{ listingId: 7, brand: "Suno", model: "Phone", grade: "A", salePrice: 1999, stock: 2 }]
        : { items: [{ orderNo: "ORD-1", listingId: 7, productBrand: "Suno", productModel: "Phone", amount: 1999, payStatus: "PAID", fulfillStatus: "DELIVERED", createdAt: "2026-08-05T00:00:00Z" }] };
      return new Response(JSON.stringify({ success: true, message: "OK", data }), { status: 200 });
    };
    await expect(getListings({ baseUrl: "http://api", fetcher })).resolves.toMatchObject({ content: [{ id: "7", name: "Suno Phone", condition: "A", price: 1999 }] });
    await expect(getOrders(1, { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ content: [{ orderNo: "ORD-1", status: "SHIPPED", listing: { id: "7", name: "Suno Phone" } }] });
  });

  it("refreshes once after a 401 and stores the replacement token", async () => {
    const values = new Map<string, string>();
    const storage: StorageAdapter = { get: (key) => values.get(key), set: (key, value) => void values.set(key, value), remove: (key) => void values.delete(key) };
    let protectedCalls = 0;
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/refresh")) return new Response(JSON.stringify({ success: true, message: "OK", data: { accessToken: "access-2", refreshToken: "refresh-2", userId: 1, username: "alice", role: "USER" } }), { status: 200 });
      protectedCalls += 1;
      if (protectedCalls === 1) return new Response(JSON.stringify({ success: false, message: "登录失效", errorCode: "AUTH_UNAUTHORIZED" }), { status: 401 });
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-2");
      return new Response(JSON.stringify({ success: true, message: "OK", data: { ok: true } }), { status: 200 });
    };
    storage.set("suno-auth", JSON.stringify({ accessToken: "access-1", refreshToken: "refresh-1", userId: 1, username: "alice", role: "USER", deviceId: "test-device" }));
    const session = createSessionClient({ storage, fetcher, baseUrl: "http://api", deviceId: "test-device" });
    await expect(session.request("/api/protected")).resolves.toEqual({ ok: true });
    expect(JSON.parse(values.get("suno-auth") ?? "{}").accessToken).toBe("access-2");
  });

  it("refreshes once before downloading raw export text", async () => {
    const values = new Map<string, string>();
    const storage: StorageAdapter = { get: (key) => values.get(key), set: (key, value) => void values.set(key, value), remove: (key) => void values.delete(key) };
    let exportCalls = 0;
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/refresh")) return new Response(JSON.stringify({ success: true, message: "OK", data: { accessToken: "access-2", refreshToken: "refresh-2", userId: 1, username: "alice", role: "USER" } }), { status: 200 });
      exportCalls += 1;
      if (exportCalls === 1) return new Response("登录失效", { status: 401 });
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer access-2");
      return new Response("event_type,count\nLOGIN,2\n", { status: 200 });
    };
    storage.set("suno-auth", JSON.stringify({ accessToken: "access-1", refreshToken: "refresh-1", userId: 1, username: "alice", role: "USER", deviceId: "test-device" }));
    const session = createSessionClient({ storage, fetcher, baseUrl: "http://api", deviceId: "test-device" });
    await expect(session.requestText("/api/export")).resolves.toBe("event_type,count\nLOGIN,2\n");
    expect(exportCalls).toBe(2);
  });

  it("uses the live marketplace action payloads", async () => {
    const calls: Array<{ path: string; method: string; body: string }> = [];
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ path: String(input), method: init?.method ?? "GET", body: String(init?.body ?? "") });
      const data = String(input).includes("/favorites") ? [{ listingId: 7, brand: "Suno", model: "Phone", grade: "A", salePrice: 1999, stock: 2 }] : { orderNo: "ORD-2" };
      return new Response(JSON.stringify({ success: true, message: "OK", data }), { status: 200 });
    };
    await createResaleOrder("7", 1, { baseUrl: "http://api", fetcher });
    await addFavorite("7", 1, { baseUrl: "http://api", fetcher });
    await expect(getFavorites(1, { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ content: [{ id: "7", name: "Suno Phone" }] });
    await queryOrderTrack("ORD-2", 1, { baseUrl: "http://api", fetcher });
    await getPaymentReplaySummary({ baseUrl: "http://api", fetcher });
    await getAdminReviewRiskSummary({ baseUrl: "http://api", fetcher });
    await getAdminSecurityTimeline({ baseUrl: "http://api", fetcher });
    await createSecurityExportTask({ type: "summary", format: "csv", lookbackMinutes: 60, topN: 10, idempotencyKey: "test-export" }, { baseUrl: "http://api", fetcher });
    expect(calls[0]).toMatchObject({ path: "http://api/api/mall/orders", method: "POST", body: JSON.stringify({ buyerUserId: 1, listingId: 7 }) });
    expect(calls[1]).toMatchObject({ path: "http://api/api/mall/favorites/add", method: "POST", body: JSON.stringify({ listingId: 7, userId: 1 }) });
    expect(calls[3]).toMatchObject({ path: "http://api/api/mall/orders/ORD-2/track?buyerUserId=1", method: "GET" });
    expect(calls[4]).toMatchObject({ path: "http://api/api/admin/payment/replay-tasks/summary", method: "GET" });
    expect(calls[5]).toMatchObject({ path: "http://api/api/admin/recycle/review-risk/summary?lookbackMinutes=1440", method: "GET" });
    expect(calls[6]).toMatchObject({ path: "http://api/api/admin/auth/security-events/timeline?lookbackMinutes=60", method: "GET" });
    expect(calls[7]).toMatchObject({ path: "http://api/api/admin/auth/security-events/export/tasks", method: "POST", body: JSON.stringify({ type: "summary", format: "csv", lookbackMinutes: 60, topN: 10, idempotencyKey: "test-export" }) });
  });

  it("downloads a security export as raw text", async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("http://api/api/admin/auth/security-events/export/tasks/task-1/download");
      return new Response("event_type,count\nLOGIN,2\n", { status: 200 });
    };
    await expect(downloadSecurityExportTask("task-1", { baseUrl: "http://api", fetcher })).resolves.toBe("event_type,count\nLOGIN,2\n");
  });
});
