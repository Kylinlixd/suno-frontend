import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appendReview, cancelOrder, confirmReceipt, createReview, getOrderSummary, getOrders, orderStatusLabel, payOrder, queryOrderTrack, type Order, type OrderFilters, type OrderStatus } from "@suno/shared";
import { LoginPanel } from "../components/LoginPanel";
import { sessionApiOptions, useAuth } from "../lib/auth";

const PAGE_SIZE = 10;

// 全部为后端聚合；其余映射为后端真实的 payStatus / fulfillStatus 过滤参数
const STATUS_TABS: Array<{ value: "ALL" | OrderStatus; label: string; filters: OrderFilters }> = [
  { value: "ALL", label: "全部", filters: {} },
  { value: "WAIT_PAY", label: "待支付", filters: { payStatus: "UNPAID" } },
  { value: "PAID", label: "已支付", filters: { payStatus: "PAID" } },
  { value: "SHIPPED", label: "运输中", filters: { fulfillStatus: "DELIVERED" } },
  { value: "RECEIVED", label: "已收货", filters: { fulfillStatus: "COMPLETED" } },
  { value: "CANCELLED", label: "已取消", filters: { fulfillStatus: "CANCELLED" } }
];

export function OrdersPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Order | null>(null);
  const [actionError, setActionError] = useState("");
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["value"]>("ALL");
  const [page, setPage] = useState(0);
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const options = sessionApiOptions();
  const canRead = Boolean(options.demo || session);
  const activeTab = STATUS_TABS.find((item) => item.value === tab) ?? STATUS_TABS[0];
  const ordersQuery = useQuery({ queryKey: ["orders", session?.userId, tab, page], queryFn: () => getOrders(session?.userId, sessionApiOptions(), { ...activeTab.filters, page, size: PAGE_SIZE }), enabled: canRead });
  const summaryQuery = useQuery({ queryKey: ["orders-summary", session?.userId], queryFn: () => getOrderSummary(session?.userId, 365, sessionApiOptions()), enabled: canRead });
  const receiptMutation = useMutation({ mutationFn: (orderNo: string) => confirmReceipt(orderNo, session?.userId, sessionApiOptions()), onSuccess: () => { setActionError(""); void queryClient.invalidateQueries({ queryKey: ["orders"] }); }, onError: (error) => setActionError(error instanceof Error ? error.message : "确认收货失败，请稍后重试。") });
  const cancelMutation = useMutation({ mutationFn: (orderNo: string) => cancelOrder(orderNo, session?.userId, sessionApiOptions()), onSuccess: () => { setActionError(""); void queryClient.invalidateQueries({ queryKey: ["orders"] }); }, onError: (error) => setActionError(error instanceof Error ? error.message : "取消订单失败，请稍后重试。") });
  const payMutation = useMutation({ mutationFn: (orderNo: string) => payOrder(orderNo, sessionApiOptions()), onSuccess: () => { setActionError(""); void queryClient.invalidateQueries({ queryKey: ["orders"] }); }, onError: (error) => setActionError(error instanceof Error ? error.message : "支付失败，请稍后重试。") });
  const trackMutation = useMutation({ mutationFn: (orderNo: string) => queryOrderTrack(orderNo, session?.userId, sessionApiOptions()), onSuccess: (data) => { setActionError(""); setTracking(data); }, onError: (error) => setActionError(error instanceof Error ? error.message : "物流信息获取失败，请稍后重试。") });
  const orders = ordersQuery.data?.content ?? [];
  const totalPages = Math.max(1, ordersQuery.data?.totalPages ?? 1);

  return <section className="section-wrap page-section orders-page">
    <div className="page-intro"><p className="eyebrow">Your flow</p><h1>每一次<br /><em>选择都算数。</em></h1><p>从付款、发货到收货，所有状态都在这里清楚地发生。</p></div>
    {!canRead ? <div className="empty-state"><p>登录后才能查看你的订单与物流。</p><button className="button button-dark" onClick={() => setShowLogin(true)}>登录账户 ↗</button></div> : <>
      <div className="orders-summary"><div><span>进行中的订单</span><strong>{(ordersQuery.data?.content ?? []).filter((order) => !["RECEIVED", "CANCELLED"].includes(order.status)).length}</strong></div><div><span>已完成的流转</span><strong>{summaryQuery.data?.completedOrders ?? (ordersQuery.data?.content ?? []).filter((order) => order.status === "RECEIVED").length}</strong></div><div><span>累计消费</span><strong>{summaryQuery.isLoading ? "—" : `¥${(summaryQuery.data?.totalAmount ?? 0).toLocaleString()}`}</strong></div></div>
      <div className="filter-row orders-toolbar">{STATUS_TABS.map((item) => <button key={item.value} className={`filter-button ${tab === item.value ? "active" : ""}`} onClick={() => { setTab(item.value); setPage(0); }}>{item.label}</button>)}</div>
      {actionError && <p className="error-message">{actionError}</p>}
      {ordersQuery.isLoading ? <div className="loading-state">正在同步你的订单…</div> : ordersQuery.isError ? <div className="empty-state"><p>订单暂时无法加载，请检查网络后重试。</p><button className="button button-dark" onClick={() => void ordersQuery.refetch()}>重新加载 ↗</button></div> : orders.length === 0 ? <div className="empty-state"><p>这个状态下暂时没有订单。</p></div> : <div className="order-list">{orders.map((order) => <OrderCard key={order.orderNo} order={order} onTrack={() => trackMutation.mutate(order.orderNo)} onCancel={() => cancelMutation.mutate(order.orderNo)} onConfirm={() => receiptMutation.mutate(order.orderNo)} onPay={() => payMutation.mutate(order.orderNo)} onReview={() => setReviewTarget(order)} busy={trackMutation.isPending || cancelMutation.isPending || receiptMutation.isPending || payMutation.isPending} />)}</div>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}>下一页 →</button></div>}
      {reviewTarget && <ReviewPanel order={reviewTarget} onClose={() => setReviewTarget(null)} />}
      {tracking && <TrackingPanel data={tracking} onClose={() => setTracking(null)} />}
    </>}
    {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
  </section>;
}

function OrderCard({ order, onTrack, onCancel, onConfirm, onPay, onReview, busy }: { order: Order; onTrack: () => void; onCancel: () => void; onConfirm: () => void; onPay: () => void; onReview: () => void; busy: boolean }) {
  const status = order.status;
  return <article className="order-card"><div className="order-head"><span>{order.orderNo}</span><strong>{order.statusText ?? orderStatusLabel[status]}</strong></div><div className="order-body"><img src={order.listing.image} alt="" loading="lazy" /><div><h2>{order.listing.name}</h2><p>{order.createdAt}{order.trackingNo ? ` · ${order.trackingNo}` : ""}</p></div><b>¥{order.amount.toLocaleString()}</b></div><div className="order-actions"><button className="text-button" onClick={onTrack} disabled={busy}>查看物流 ↗</button><span className="order-actions-main">{status === "WAIT_PAY" && <><button className="button button-lime small" onClick={onPay} disabled={busy}>去支付</button><button className="button button-light small" onClick={onCancel} disabled={busy}>取消订单</button></>}{status === "SHIPPED" && <button className="button button-lime small" onClick={onConfirm} disabled={busy}>确认收货</button>}{status === "RECEIVED" && <button className="text-button" onClick={onReview} disabled={busy}>写评价 ↗</button>}</span></div></article>;
}

function ReviewPanel({ order, onClose }: { order: Order; onClose: () => void }) {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [appendContent, setAppendContent] = useState("");
  const [message, setMessage] = useState("");
  const trackQuery = useQuery({ queryKey: ["track", order.orderNo], queryFn: () => queryOrderTrack(order.orderNo, session?.userId, sessionApiOptions()) });
  const eligibility = (trackQuery.data?.reviewEligibility ?? {}) as Record<string, unknown>;
  const canCreate = Boolean(eligibility.canCreateReview);
  const canAppend = Boolean(eligibility.canAppendReview);
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ["reviews"] }); void queryClient.invalidateQueries({ queryKey: ["track", order.orderNo] }); };
  const createMutation = useMutation({ mutationFn: () => createReview({ orderNo: order.orderNo, buyerUserId: session?.userId, rating, content }, sessionApiOptions()), onSuccess: () => { setMessage("评价已提交，感谢你的认真反馈。"); setContent(""); invalidate(); }, onError: (error) => setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试。") });
  const appendMutation = useMutation({ mutationFn: () => appendReview({ orderNo: order.orderNo, buyerUserId: session?.userId, appendContent }, sessionApiOptions()), onSuccess: () => { setMessage("追评已提交。"); setAppendContent(""); invalidate(); }, onError: (error) => setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试。") });
  const pending = createMutation.isPending || appendMutation.isPending;
  return <div className="review-modal-overlay" role="dialog" aria-modal="true" aria-label="写评价"><div className="review-modal"><div className="review-modal-head"><div><p className="eyebrow">Review</p><h2>为 {order.listing.name} 留下反馈。</h2></div><button className="text-button" onClick={onClose}>关闭</button></div>{trackQuery.isLoading ? <p className="muted">正在获取评价资格…</p> : message ? <p className="success-message">{message}</p> : canCreate ? <div className="review-form"><label>你的评分<div className="star-picker" role="radiogroup" aria-label="评分">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={value <= rating ? "active" : ""} aria-pressed={value <= rating} onClick={() => setRating(value)}>★</button>)}</div></label><label>评价内容<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} placeholder="成色、包装、沟通……说说这次流转的体验。" /></label><button className="button button-dark" disabled={pending || !content.trim()} onClick={() => createMutation.mutate()}>{createMutation.isPending ? "正在提交…" : "提交评价 ↗"}</button></div> : canAppend ? <div className="review-form"><p className="muted">你已评价过这笔订单，收货确认后可以追加一次使用感受。</p><label>追评内容<textarea value={appendContent} onChange={(event) => setAppendContent(event.target.value)} rows={4} placeholder="使用一段时间后，它表现如何？" /></label><button className="button button-dark" disabled={pending || !appendContent.trim()} onClick={() => appendMutation.mutate()}>{appendMutation.isPending ? "正在提交…" : "提交追评 ↗"}</button></div> : <p className="muted">{trackQuery.isError ? "评价资格获取失败，请稍后重试。" : "当前订单暂不能评价（需已完成收货，且未超出追评窗口）。"}</p>}{createMutation.isError && !message && <p className="error-message">{createMutation.error instanceof Error ? createMutation.error.message : "提交失败"}</p>}</div></div>;
}

function TrackingPanel({ data, onClose }: { data: Record<string, unknown>; onClose: () => void }) {
  const rawEvents = Array.isArray(data.timeline) ? data.timeline : Array.isArray(data.events) ? data.events : [];
  const events = rawEvents as Array<Record<string, unknown>>;
  return <div className="tracking-panel"><div className="tracking-head"><div><p className="eyebrow">Logistics</p><h2>物流正在路上。</h2></div><button className="text-button" onClick={onClose}>关闭</button></div><p className="tracking-status">{String(data.orderNo ?? "")} · {events.length ? `${events.length} 条轨迹` : "暂无轨迹记录"}</p>{events.map((event, index) => <div className="tracking-event" key={`${String(event.actionType)}-${index}`}><i /><div><strong>{String(event.detail || event.actionType || "状态更新")}</strong><span>{String(event.createdAt ?? "")}</span></div></div>)}</div>;
}
