import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminExportRefundsCsv, adminPageRefunds, adminProcessRefund } from "@suno/shared";
import { apiOptions } from "../lib/auth";

const STATUS_TABS = ["", "PENDING", "PROCESSED", "CANCELLED"];

/** M3/P1 售后管理：全量分页 + 处置（全额/部分自动识别） */
export function AdminRefundsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const refundsQuery = useQuery({ queryKey: ["admin-refunds", status, page], queryFn: () => adminPageRefunds(status || undefined, page, 20, apiOptions) });
  async function exportCsv() {
    try {
      const csv = await adminExportRefundsCsv(status || undefined, apiOptions);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "refunds.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch { window.alert("导出失败，请稍后重试。"); }
  }
  const processMutation = useMutation({
    mutationFn: (refundId: number) => adminProcessRefund(refundId, apiOptions),
    onSuccess: (data) => { setMessage(`售后已处置（${String(data.mode)}）。`); void queryClient.invalidateQueries({ queryKey: ["admin-refunds"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "处置失败。")
  });
  const rows = refundsQuery.data?.content ?? [];
  const totalPages = Math.max(1, refundsQuery.data?.totalPages ?? 1);
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Refunds</p><h1>售后管理</h1></div></div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>售后申请</h2><span className="admin-live"><i />{refundsQuery.data?.totalElements ?? 0} 单</span><button className="text-button" onClick={() => void exportCsv()}>导出 CSV</button></div>
      <div className="filter-row">{STATUS_TABS.map((tab) => <button key={tab} className={`filter-button ${status === tab ? "active" : ""}`} onClick={() => { setStatus(tab); setPage(0); }}>{tab || "全部状态"}</button>)}</div>
      {message && <p className="success-message">{message}</p>}
      <div className="table-head admin-table-row"><span>售后单</span><span>订单</span><span>金额</span><span>状态</span><span>操作</span></div>
      {rows.map((row) => <div className="table-row admin-table-row" key={String(row.refundId)}>
        <span className="table-item"><b>{String(row.refundNo)}</b><i>{String(row.reason ?? "")}</i></span>
        <span>{String(row.orderNo ?? "-")}<i className="muted"> · {String(row.payChannel ?? "-")}</i></span>
        <span>¥{Number(row.amount).toLocaleString()}<i className="muted"> / 应付 ¥{Number(row.payableAmount ?? 0).toLocaleString()}</i></span>
        <span>{String(row.status)}</span>
        <span>{String(row.status) === "PENDING"
          ? <button className="text-button" disabled={processMutation.isPending} onClick={() => { if (window.confirm(`确认处置 ${String(row.refundNo)}？全额将整单退款，部分将打款 ${String(row.payChannel ?? "")}。`)) processMutation.mutate(Number(row.refundId)); }}>处置</button>
          : <i className="muted">—</i>}</span>
      </div>)}
      {rows.length === 0 && <p className="muted">没有符合条件的售后单。</p>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>下一页 →</button></div>}
    </div>
  </div>;
}
