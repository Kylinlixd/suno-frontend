import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminExportReportCsv, adminReportOverview, adminRunReconciliation } from "@suno/shared";
import { apiOptions } from "../lib/auth";

/** M3 经营报表 */
export function AdminReportsPage() {
  const [days, setDays] = useState(14);
  const reportQuery = useQuery({ queryKey: ["admin-report", days], queryFn: () => adminReportOverview(days, apiOptions) });
  async function exportCsv() {
    try {
      const csv = await adminExportReportCsv(days, apiOptions);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "report-overview.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch { window.alert("导出失败，请稍后重试。"); }
  }
  const reconcileMutation = useMutation({
    mutationFn: () => adminRunReconciliation(apiOptions),
    onSuccess: (data) => window.alert(`对账完成：检查 ${String(data.checked)} 单，差异 ${String(data.mismatched)} 单（差异已写审计）。`)
  });
  const data = reportQuery.data ?? {};
  const trend = Array.isArray(data.trend) ? data.trend as Array<Record<string, unknown>> : [];
  const maxOrders = Math.max(1, ...trend.map((point) => Number(point.orders)));
  const cards: Array<[string, string]> = [
    ["GMV（应付口径）", `¥${Number(data.gmv ?? 0).toLocaleString()}`],
    ["客单价", `¥${Number(data.avgPaidAmount ?? 0).toLocaleString()}`],
    ["总订单", String(data.totalOrders ?? 0)],
    ["已支付", String(data.paidOrders ?? 0)],
    ["退款率", `${Number(data.refundRate ?? 0)}%`],
    ["已完成", String(data.completedOrders ?? 0)],
    ["回收单量", String(data.recycleCount ?? 0)]
  ];
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Reports</p><h1>经营报表</h1></div></div>
    <div className="admin-panel report-cards">
      {cards.map(([label, value]) => <div className="report-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>近 {String(data.trendDays ?? 14)} 日订单趋势</h2><div className="dashboard-controls">{[7, 14, 30].map((option) => <button key={option} className={`filter-button ${days === option ? "active" : ""}`} onClick={() => setDays(option)}>{option} 天</button>)}<button className="text-button" onClick={() => void exportCsv()}>导出 CSV</button></div><button className="text-button" disabled={reconcileMutation.isPending} onClick={() => reconcileMutation.mutate()}>{reconcileMutation.isPending ? "对账中…" : "立即支付对账"}</button></div>
      <div className="report-trend">
        {trend.map((point) => <div className="trend-bar" key={String(point.date)} title={`${String(point.date)}：${Number(point.orders)} 单 / 支付 ${Number(point.paidOrders)}`}>
          <i style={{ height: `${Math.max(6, (Number(point.orders) / maxOrders) * 100)}%` }} />
        </div>)}
      </div>
      <p className="muted">柱高为当日订单数；悬停查看订单/支付明细。</p>
    </div>
  </div>;
}
