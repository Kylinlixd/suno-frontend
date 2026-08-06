import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelOrder, confirmReceipt, getOrderSummary, getOrders, orderStatusLabel, queryOrderTrack, type Order } from "@suno/shared";
import { LoginPanel } from "../components/LoginPanel";
import { sessionApiOptions, useAuth } from "../lib/auth";

export function OrdersPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [cancelledOrder, setCancelledOrder] = useState("");
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const options = sessionApiOptions();
  const canRead = Boolean(options.demo || session);
  const ordersQuery = useQuery({ queryKey: ["orders", session?.userId], queryFn: () => getOrders(session?.userId, sessionApiOptions()), enabled: canRead });
  const summaryQuery = useQuery({ queryKey: ["orders-summary", session?.userId], queryFn: () => getOrderSummary(session?.userId, 365, sessionApiOptions()), enabled: canRead });
  const receiptMutation = useMutation({ mutationFn: (orderNo: string) => confirmReceipt(orderNo, session?.userId ?? 0, sessionApiOptions()), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["orders"] }) });
  const cancelMutation = useMutation({ mutationFn: (orderNo: string) => cancelOrder(orderNo, sessionApiOptions()), onSuccess: (_, orderNo) => { setCancelledOrder(orderNo); void queryClient.invalidateQueries({ queryKey: ["orders"] }); } });
  const trackMutation = useMutation({ mutationFn: (orderNo: string) => queryOrderTrack(orderNo, session?.userId ?? 1, sessionApiOptions()), onSuccess: (data) => setTracking(data) });

  return <section className="section-wrap page-section orders-page">
    <div className="page-intro"><p className="eyebrow">Your flow</p><h1>每一次<br /><em>选择都算数。</em></h1><p>从付款、发货到收货，所有状态都在这里清楚地发生。</p></div>
    {!canRead ? <div className="empty-state"><p>登录后才能查看你的订单与物流。</p><button className="button button-dark" onClick={() => setShowLogin(true)}>登录账户 ↗</button></div> : <>
      <div className="orders-summary"><div><span>进行中的订单</span><strong>{(ordersQuery.data?.content ?? []).filter((order) => !["RECEIVED", "CANCELLED"].includes(order.status)).length}</strong></div><div><span>已完成的流转</span><strong>{summaryQuery.data?.completedOrders ?? (ordersQuery.data?.content ?? []).filter((order) => order.status === "RECEIVED").length}</strong></div><div><span>累计消费</span><strong>{summaryQuery.isLoading ? "—" : `¥${(summaryQuery.data?.totalAmount ?? 0).toLocaleString()}`}</strong></div></div>
      {ordersQuery.isLoading ? <div className="loading-state">正在同步你的订单…</div> : ordersQuery.isError ? <div className="empty-state"><p>订单暂时无法加载，请检查网络后重试。</p><button className="button button-dark" onClick={() => void ordersQuery.refetch()}>重新加载 ↗</button></div> : ordersQuery.data?.content.length === 0 ? <div className="empty-state"><p>还没有订单，去市场看看下一件好东西。</p></div> : <div className="order-list">{(ordersQuery.data?.content ?? []).map((order) => <OrderCard key={order.orderNo} order={order} cancelled={cancelledOrder === order.orderNo} onTrack={() => trackMutation.mutate(order.orderNo)} onCancel={() => cancelMutation.mutate(order.orderNo)} onConfirm={() => receiptMutation.mutate(order.orderNo)} busy={trackMutation.isPending || cancelMutation.isPending || receiptMutation.isPending} />)}</div>}
      {tracking && <TrackingPanel data={tracking} onClose={() => setTracking(null)} />}
    </>}
    {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
  </section>;
}

function OrderCard({ order, cancelled, onTrack, onCancel, onConfirm, busy }: { order: Order; cancelled: boolean; onTrack: () => void; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  const status = cancelled ? "CANCELLED" : order.status;
  return <article className="order-card"><div className="order-head"><span>{order.orderNo}</span><strong>{orderStatusLabel[status]}</strong></div><div className="order-body"><img src={order.listing.image} alt="" /><div><h2>{order.listing.name}</h2><p>{order.createdAt}{order.trackingNo ? ` · ${order.trackingNo}` : ""}</p></div><b>¥{order.amount.toLocaleString()}</b></div><div className="order-actions"><button className="text-button" onClick={onTrack} disabled={busy}>查看物流 ↗</button>{status === "WAIT_PAY" && <>{cancelled ? <span className="muted">已取消</span> : <button className="button button-light small" onClick={onCancel} disabled={busy}>取消订单</button>}</>}{status === "SHIPPED" && <button className="button button-lime small" onClick={onConfirm} disabled={busy}>确认收货</button>}</div></article>;
}

function TrackingPanel({ data, onClose }: { data: Record<string, unknown>; onClose: () => void }) {
  const events = Array.isArray(data.events) ? data.events as Array<Record<string, unknown>> : [];
  return <div className="tracking-panel"><div className="tracking-head"><div><p className="eyebrow">Logistics</p><h2>物流正在路上。</h2></div><button className="text-button" onClick={onClose}>关闭</button></div><p className="tracking-status">{String(data.status ?? "运输状态已更新")}{data.trackingNo ? ` · ${String(data.trackingNo)}` : ""}</p>{events.map((event, index) => <div className="tracking-event" key={`${String(event.actionType)}-${index}`}><i /><div><strong>{String(event.detail ?? event.actionType ?? "状态更新")}</strong><span>{String(event.createdAt ?? "")}</span></div></div>)}</div>;
}
