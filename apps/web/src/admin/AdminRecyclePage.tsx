import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminRecycles, publishListing, recycleStatusLabel, reviewRecycleOrder, type RecycleApplication } from "@suno/shared";
import { sessionApiOptions } from "../lib/auth";

export function AdminRecyclePage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["admin-recycles"], queryFn: () => getAdminRecycles(sessionApiOptions()) });
  const reviewMutation = useMutation({ mutationFn: ({ orderNo, action }: { orderNo: string; action: string }) => reviewRecycleOrder({ orderNo, action }, sessionApiOptions()), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-recycles"] }) });
  const publishMutation = useMutation({ mutationFn: ({ item }: { item: RecycleApplication }) => publishListing({ recycleOrderNo: item.id, salePrice: item.estimatedPrice ?? 0, stock: 1 }, sessionApiOptions()), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-recycles"] }) });
  const busy = reviewMutation.isPending || publishMutation.isPending;
  const error = reviewMutation.error ?? publishMutation.error;

  return <div className="admin-page"><div className="admin-topbar"><div><p className="eyebrow">Recycle desk</p><h1>把每一次回收，处理得更准确。</h1></div><span className="admin-live"><i /> 审核链路在线</span></div><section className="admin-panel table-panel"><div className="panel-heading"><h2>待处理回收单</h2><span className="muted">{query.data?.totalElements ?? 0} 条记录</span></div>{query.isError ? <div className="empty-state"><p>回收单暂时无法加载，请重试。</p><button className="button button-dark" onClick={() => void query.refetch()}>重新加载 ↗</button></div> : <div className="admin-table"><div className="table-row table-head"><span>物品</span><span>创建时间</span><span>状态</span><span>估价</span><span>操作</span></div>{(query.data?.content ?? []).map((item) => <RecycleRow key={item.id} item={item} busy={busy} onReview={(action) => reviewMutation.mutate({ orderNo: item.id, action })} onPublish={() => publishMutation.mutate({ item })} />)}</div>}{error && <p className="error-message admin-error">{error instanceof Error ? error.message : "操作失败，请稍后重试。"}</p>}</section></div>;
}

function RecycleRow({ item, busy, onReview, onPublish }: { item: RecycleApplication; busy: boolean; onReview: (action: string) => void; onPublish: () => void }) {
  const reviewAction = item.status === "SUBMITTED" ? "QUALITY_CHECK" : item.status === "QUALITY_CONFIRMED" ? "PRICE_REVIEW" : undefined;
  return <div className="table-row"><span className="table-item"><img src={item.image} alt="" /><b>{item.title}</b></span><span>{item.createdAt}</span><span><i className={`status-dot status-${item.status.toLowerCase()}`} /> {recycleStatusLabel[item.status]}</span><span>{item.estimatedPrice ? `¥${item.estimatedPrice.toLocaleString()}` : "待估价"}</span><span>{reviewAction && <button className="text-button" onClick={() => onReview(reviewAction)} disabled={busy}>{reviewAction === "QUALITY_CHECK" ? "质检" : "估价"}</button>}{item.status === "VALUED" && <button className="text-button" onClick={onPublish} disabled={busy || !item.estimatedPrice}>上架</button>}</span></div>;
}
