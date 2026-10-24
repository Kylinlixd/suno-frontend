import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminGetOrderDetail, adminPageOrders } from "@suno/shared";
import { apiOptions } from "../lib/auth";

const PAY_TABS = ["", "UNPAID", "PAID", "REFUNDED"];

/** M3 订单管理：全量分页 + 详情 */
export function AdminOrdersPage() {
  const [payStatus, setPayStatus] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);
  const ordersQuery = useQuery({ queryKey: ["admin-orders", payStatus, keyword, page], queryFn: () => adminPageOrders({ payStatus: payStatus || undefined, keyword: keyword || undefined, page, size: 20 }, apiOptions) });
  const detailQuery = useQuery({ queryKey: ["admin-order-detail", detail], queryFn: () => adminGetOrderDetail(detail as string), enabled: Boolean(detail) });
  const rows = ordersQuery.data?.content ?? [];
  const totalPages = Math.max(1, ordersQuery.data?.totalPages ?? 1);
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Orders</p><h1>订单管理</h1></div></div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>全量订单</h2><span className="admin-live"><i />{ordersQuery.data?.totalElements ?? 0} 单</span></div>
      <div className="filter-row">
        {PAY_TABS.map((tab) => <button key={tab} className={`filter-button ${payStatus === tab ? "active" : ""}`} onClick={() => { setPayStatus(tab); setPage(0); }}>{tab || "全部支付态"}</button>)}
        <input className="admin-keyword" placeholder="订单号 / 买家用户名" value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") setPage(0); }} />
      </div>
      <div className="table-head admin-table-row"><span>订单</span><span>买家</span><span>金额</span><span>状态</span><span></span></div>
      {rows.map((row) => <div className="table-row admin-table-row" key={String(row.orderNo)}>
        <span className="table-item"><b>{String(row.orderNo)}</b><i>{String(row.productBrand)} {String(row.productModel)}</i></span>
        <span>{String(row.buyerUsername)}（{String(row.buyerUserId)}）</span>
        <span>¥{Number(row.payableAmount ?? row.amount).toLocaleString()}</span>
        <span>{String(row.payStatus)} / {String(row.fulfillStatus)}</span>
        <span><button className="text-button" onClick={() => setDetail(String(row.orderNo))}>详情</button></span>
      </div>)}
      {rows.length === 0 && <p className="muted">没有符合条件的订单。</p>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>下一页 →</button></div>}
    </div>
    {detail && <div className="login-overlay" role="dialog" aria-modal="true"><div className="admin-panel admin-detail-panel">
      <div className="panel-heading"><h2>订单 {detail}</h2><button className="text-button" onClick={() => setDetail(null)}>关闭</button></div>
      {detailQuery.isLoading ? <p className="muted">加载中…</p> : (() => { const data = detailQuery.data ?? {}; return <dl className="admin-detail">
        <div><dt>买家</dt><dd>{String(data.buyerUsername ?? "-")}（{String(data.buyerUserId ?? "-")}）</dd></div>
        <div><dt>商品</dt><dd>{String(data.productBrand ?? "")} {String(data.productModel ?? "")}</dd></div>
        <div><dt>金额</dt><dd>¥{Number(data.amount ?? 0).toLocaleString()}（券抵扣 ¥{Number(data.discountAmount ?? 0).toLocaleString()}，应付 ¥{Number(data.payableAmount ?? 0).toLocaleString()}）</dd></div>
        <div><dt>状态</dt><dd>{String(data.payStatus ?? "")} / {String(data.fulfillStatus ?? "")}</dd></div>
        <div><dt>收货人</dt><dd>{String(data.receiverName ?? "-")} {String(data.receiverPhone ?? "")}</dd></div>
        <div><dt>地址</dt><dd>{String(data.receiverAddress ?? "-")}</dd></div>
        <div><dt>支付渠道</dt><dd>{String(data.payChannel ?? "-")} {String(data.tradeNo ?? "")}</dd></div>
        <div><dt>下单时间</dt><dd>{String(data.createdAt ?? "-")}</dd></div>
      </dl>; })()}
    </div></div>}
  </div>;
}
