import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminAdjustListingPrice, adminAttachListingImage, adminPageListings, adminSetListingShelf } from "@suno/shared";
import { apiOptions } from "../lib/auth";

const STATUS_TABS = ["", "ON_SHELF", "OFF_SHELF", "SOLD_OUT"];

/** M3 商品管理：改价/上下架 */
export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const listingsQuery = useQuery({ queryKey: ["admin-listings", status, page], queryFn: () => adminPageListings(status || undefined, page, 20, apiOptions) });
  const priceMutation = useMutation({
    mutationFn: (payload: { listingId: number; salePrice: number }) => adminAdjustListingPrice(payload.listingId, payload.salePrice, apiOptions),
    onSuccess: (data) => { setMessage(`改价成功：¥${Number(data.salePrice).toLocaleString()}`); void queryClient.invalidateQueries({ queryKey: ["admin-listings"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "改价失败。")
  });
  const attachMutation = useMutation({
    mutationFn: (payload: { listingId: number; imageUrl: string }) => adminAttachListingImage(payload.listingId, payload.imageUrl, apiOptions),
    onSuccess: () => { setMessage("图片已挂载到商品图库。"); void queryClient.invalidateQueries({ queryKey: ["admin-listings"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "挂图失败。")
  });
  const shelfMutation = useMutation({
    mutationFn: (payload: { listingId: number; onShelf: boolean }) => adminSetListingShelf(payload.listingId, payload.onShelf, apiOptions),
    onSuccess: (data) => { setMessage(`状态已更新：${String(data.status)}`); void queryClient.invalidateQueries({ queryKey: ["admin-listings"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "操作失败。")
  });
  const rows = listingsQuery.data?.content ?? [];
  const totalPages = Math.max(1, listingsQuery.data?.totalPages ?? 1);
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Catalog</p><h1>商品管理</h1></div></div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>全部二销商品</h2><span className="admin-live"><i />{listingsQuery.data?.totalElements ?? 0} 件</span></div>
      <div className="filter-row">{STATUS_TABS.map((tab) => <button key={tab} className={`filter-button ${status === tab ? "active" : ""}`} onClick={() => { setStatus(tab); setPage(0); }}>{tab || "全部状态"}</button>)}</div>
      {message && <p className="success-message">{message}</p>}
      <div className="table-head admin-table-row"><span>商品</span><span>价格</span><span>库存/状态</span><span>操作</span></div>
      {rows.map((row) => <div className="table-row admin-table-row" key={String(row.listingId)}>
        <span className="table-item"><b>{String(row.brand)} {String(row.model)}</b><i>{String(row.grade ?? "-")} · {String(row.listingId)}</i></span>
        <span>¥{Number(row.salePrice).toLocaleString()}</span>
        <span>{Number(row.stock)} 件 · {String(row.status)}</span>
        <span className="admin-row-actions">
          <button className="text-button" onClick={() => { const input = window.prompt("输入新价格", String(row.salePrice)); const price = Number(input); if (Number.isFinite(price) && price > 0) priceMutation.mutate({ listingId: Number(row.listingId), salePrice: price }); }}>改价</button>
          <button className="text-button" disabled={attachMutation.isPending} onClick={() => { const url = window.prompt("图片地址（可经用户端 /api/uploads 或图床获取）"); if (url && url.trim()) attachMutation.mutate({ listingId: Number(row.listingId), imageUrl: url.trim() }); }}>挂图</button>
          {row.status === "ON_SHELF"
            ? <button className="text-button" disabled={shelfMutation.isPending} onClick={() => shelfMutation.mutate({ listingId: Number(row.listingId), onShelf: false })}>下架</button>
            : <button className="text-button" disabled={shelfMutation.isPending} onClick={() => shelfMutation.mutate({ listingId: Number(row.listingId), onShelf: true })}>上架</button>}
        </span>
      </div>)}
      {rows.length === 0 && <p className="muted">没有符合条件的商品。</p>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>下一页 →</button></div>}
    </div>
  </div>;
}
