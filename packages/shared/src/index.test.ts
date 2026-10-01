import { describe, expect, it } from "vitest";
import { ApiError, addFavorite, cancelOrder, createResaleOrder, createSecurityExportTask, downloadSecurityExportTask, getAdminReviewRiskSummary, getAdminReviewRiskTopListings, getAdminSecurityTimeline, getFavorites, getListing, getListings, getOrderSummary, getOrders, getPaymentReplaySummary, getReviews, isFavoriteListing, normalizePage, payOrder, queryOrderTrack, unwrapResponse } from "./index";
import { hmacSha256Hex } from "./paySignature";
import { createSessionClient, type StorageAdapter } from "./session";
import type { ApiOptions } from "./types";

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
    await expect(getListings({}, { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ content: [{ id: "7", name: "Suno Phone", condition: "A", price: 1999 }] });
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
    await getAdminSecurityTimeline(60, { baseUrl: "http://api", fetcher });
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

  it("maps the buyer order summary endpoint", async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("http://api/api/mall/orders/summary?buyerUserId=1&lookbackDays=365");
      return new Response(JSON.stringify({ success: true, message: "OK", data: { totalOrders: 3, totalAmount: "26798.00", paidAmount: 26299, refundedAmount: 499, completedOrders: 1, completionRate: "33.33", refundRate: 33.33, healthScore: 74, healthLevel: "GOOD" } }), { status: 200 });
    };
    await expect(getOrderSummary(1, 365, { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ totalOrders: 3, totalAmount: 26798, paidAmount: 26299, refundedAmount: 499, completedOrders: 1, completionRate: 33.33, healthLevel: "GOOD" });
  });

  it("loads the admin review risk top listings", async () => {
    const fetcher = async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("http://api/api/admin/recycle/review-risk/top-listings?lookbackMinutes=1440&topN=10");
      return new Response(JSON.stringify({ success: true, message: "OK", data: [{ listingId: 7, reviewCount: 12, sensitiveReviewCount: 2, sensitiveRate: 0.1667, reportCount: 3, riskScore: 26.67 }] }), { status: 200 });
    };
    await expect(getAdminReviewRiskTopListings({ baseUrl: "http://api", fetcher })).resolves.toMatchObject([{ listingId: 7, reportCount: 3, riskScore: 26.67 }]);
  });

  it("normalizes percent-shaped sensitive rates into 0-1 fractions", async () => {
    const fetcher = async () => new Response(JSON.stringify({ success: true, message: "OK", data: [{ listingId: 8, reviewCount: 5, sensitiveReviewCount: 1, sensitiveRate: 20, reportCount: 2, riskScore: 10 }] }), { status: 200 });
    await expect(getAdminReviewRiskTopListings({ baseUrl: "http://api", fetcher })).resolves.toMatchObject([{ sensitiveRate: 0.2 }]);
  });

  it("throws a readable ApiError when the backend answers with non-JSON", async () => {
    const fetcher = async () => new Response("<html>gateway error</html>", { status: 502, statusText: "Bad Gateway" });
    const error = await getListings({}, { baseUrl: "http://api", fetcher }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
    expect((error as ApiError).message).toBe("Bad Gateway");
  });

  it("resolves a single listing via the list endpoint (backend has no detail route)", async () => {
    const calls: string[] = [];
    const fetcher = async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ success: true, message: "OK", data: [{ listingId: 7, brand: "Suno", model: "Phone", grade: "A", salePrice: 1999, stock: 2 }] }), { status: 200 });
    };
    await expect(getListing("7", { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ id: "7", name: "Suno Phone" });
    expect(calls).toEqual(["http://api/api/mall/listings?minStock=1"]);
    await expect(getListing("8", { baseUrl: "http://api", fetcher })).rejects.toMatchObject({ code: "LISTING_NOT_FOUND" });
  });

  it("fills userId from /api/auth/me after login (backend login response lacks it)", async () => {
    const values = new Map<string, string>();
    const storage: StorageAdapter = { get: (key) => values.get(key), set: (key, value) => void values.set(key, value), remove: (key) => void values.delete(key) };
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/auth/login")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ username: "alice", password: "pw", deviceId: "test-device" });
        return new Response(JSON.stringify({ success: true, message: "OK", data: { accessToken: "a1", refreshToken: "r1", deviceId: "test-device", username: "alice", role: "USER" } }), { status: 200 });
      }
      if (url.endsWith("/api/auth/me")) {
        expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer a1");
        return new Response(JSON.stringify({ success: true, message: "OK", data: { userId: 42, username: "alice", role: "USER", accountStatus: "ACTIVE" } }), { status: 200 });
      }
      throw new Error(`unexpected call: ${url}`);
    };
    const session = createSessionClient({ storage, fetcher, baseUrl: "http://api", deviceId: "test-device" });
    const loggedIn = await session.login("alice", "pw");
    expect(loggedIn.userId).toBe(42);
    expect(JSON.parse(values.get("suno-auth") ?? "{}").userId).toBe(42);
  });

  it("backfills favorite state from the favorites list and loads listing reviews", async () => {
    const calls: string[] = [];
    const fetcher = async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/api/mall/favorites")) return new Response(JSON.stringify({ success: true, message: "OK", data: [{ listingId: 7, brand: "Suno", model: "Phone", grade: "A", salePrice: 1999, stock: 2 }] }), { status: 200 });
      if (url.includes("/api/mall/reviews")) return new Response(JSON.stringify({ success: true, message: "OK", data: { listingId: 7, reviewCount: 1, avgRating: 5, items: [{ orderNo: "ORD-9", rating: 5, content: "很好", usefulCount: 2, createdAt: "2026-08-05T00:00:00" }] } }), { status: 200 });
      throw new Error(`unexpected call: ${url}`);
    };
    await expect(isFavoriteListing("7", 1, { baseUrl: "http://api", fetcher })).resolves.toBe(true);
    await expect(isFavoriteListing("8", 1, { baseUrl: "http://api", fetcher })).resolves.toBe(false);
    await expect(getReviews("7", { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ listingId: "7", reviewCount: 1, avgRating: 5, items: [{ orderNo: "ORD-9", rating: 5, content: "很好" }] });
  });

  it("maps cancelled unpaid orders to CANCELLED instead of WAIT_PAY", async () => {
    const fetcher = async () => new Response(JSON.stringify({ success: true, message: "OK", data: { items: [{ orderNo: "ORD-3", listingId: 7, productBrand: "Suno", productModel: "Phone", amount: 1999, status: "CANCELLED", payStatus: "UNPAID", fulfillStatus: "CANCELLED" }] } }), { status: 200 });
    await expect(getOrders(1, { baseUrl: "http://api", fetcher })).resolves.toMatchObject({ content: [{ orderNo: "ORD-3", status: "CANCELLED" }] });
  });

  it("normalizes item-shaped list payloads", () => {
    expect(normalizePage(["a"], 20)).toMatchObject({ content: ["a"], totalElements: 1 });
    expect(normalizePage({ items: ["a", "b"], totalElements: 9 }, 20)).toMatchObject({ content: ["a", "b"], totalElements: 9, totalPages: 1 });
  });

  it("refreshes once for concurrent 401 requests", async () => {
    const values = new Map<string, string>();
    const storage: StorageAdapter = { get: (key) => values.get(key), set: (key, value) => void values.set(key, value), remove: (key) => void values.delete(key) };
    let refreshCalls = 0;
    const fetcher = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return new Response(JSON.stringify({ success: true, message: "OK", data: { accessToken: "access-2", refreshToken: "refresh-2", userId: 1, username: "alice", role: "USER" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ success: false, message: "登录失效", errorCode: "AUTH_UNAUTHORIZED" }), { status: 401 });
    };
    storage.set("suno-auth", JSON.stringify({ accessToken: "access-1", refreshToken: "refresh-1", userId: 1, username: "alice", role: "USER", deviceId: "test-device" }));
    const session = createSessionClient({ storage, fetcher, baseUrl: "http://api", deviceId: "test-device" });
    const results = await Promise.allSettled([session.request("/api/a"), session.request("/api/b")]);
    expect(results.every((result) => result.status === "rejected")).toBe(true);
    expect(refreshCalls).toBe(1);
  });

  it("rejects write actions without an integer userId outside demo mode", async () => {
    const fetcher = async () => new Response(JSON.stringify({ success: true, message: "OK", data: {} }), { status: 200 });
    await expect(createResaleOrder("7", undefined, { baseUrl: "http://api", fetcher })).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    await expect(addFavorite("7", undefined, { baseUrl: "http://api", fetcher })).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
    await expect(cancelOrder("SN-1", undefined, { baseUrl: "http://api", fetcher })).rejects.toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("computes RFC 4231 test vectors for HMAC-SHA256", () => {
    expect(hmacSha256Hex("The quick brown fox jumps over the lazy dog", "key")).toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
    expect(hmacSha256Hex("", "")).toBe("b613679a0814d9ec772f95d778c35fc5ff1697c493715653c6c712144292c5ad");
  });

  it("signs pay orders with the payment secret and rejects when missing", async () => {
    const bodies: string[] = [];
    const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ""));
      return new Response(JSON.stringify({ success: true, message: "OK", data: { orderNo: "SN-1", payStatus: "PAID" } }), { status: 200 });
    };
    await payOrder("SN-1", { baseUrl: "http://api", fetcher, paymentSecret: "test-secret" });
    const payload = JSON.parse(bodies[0]) as { orderNo: string; idempotencyKey: string; timestamp: number; nonce: string; signature: string };
    expect(payload.orderNo).toBe("SN-1");
    expect(payload.signature).toBe(hmacSha256Hex(`${payload.orderNo}|${payload.idempotencyKey}|${payload.timestamp}|${payload.nonce}`, "test-secret"));
    await expect(payOrder("SN-1", { baseUrl: "http://api", fetcher })).rejects.toMatchObject({ code: "PAYMENT_SECRET_MISSING" });
  });

  it("reuses cached payload when the backend answers 304 with ETag", async () => {
    const etagCache = new Map<string, { etag: string; payload: unknown }>();
    let calls = 0;
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ success: true, message: "OK", data: [{ listingId: 7, brand: "Suno", model: "Phone", grade: "A", salePrice: 1999, stock: 2 }] }), { status: 200, headers: { Etag: '"v1"' } });
      }
      expect(new Headers(init?.headers).get("If-None-Match")).toBe('"v1"');
      return new Response(null, { status: 304, headers: { Etag: '"v1"' } });
    };
    const options: ApiOptions = { baseUrl: "http://api", fetcher, etagCache };
    await expect(getListings({}, options)).resolves.toMatchObject({ content: [{ id: "7" }] });
    await expect(getListings({}, options)).resolves.toMatchObject({ content: [{ id: "7" }] });
    expect(calls).toBe(2);
  });
});
