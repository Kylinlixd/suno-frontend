import { useQuery } from "@tanstack/react-query";
import { adminReportOverview } from "@suno/shared";
import { apiOptions } from "../lib/auth";

/** M3 经营报表 */
export function AdminReportsPage() {
  const reportQuery = useQuery({ queryKey: ["admin-report"], queryFn: () => adminReportOverview(14, apiOptions) });
  const data = reportQuery.data ?? {};
  const trend = Array.isArray(data.trend) ? data.trend as Array<Record<string, unknown>> : [];
  const maxOrders = Math.max(1, ...trend.map((point) => Number(point.orders)));
  const cards: Array<[string, string]> = [
    ["GMV（应付口径）", `¥${Number(data.gmv ?? 0).toLocaleString()}`],
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
      <div className="panel-heading"><h2>近 {String(data.trendDays ?? 14)} 日订单趋势</h2></div>
      <div className="report-trend">
        {trend.map((point) => <div className="trend-bar" key={String(point.date)} title={`${String(point.date)}：${Number(point.orders)} 单 / 支付 ${Number(point.paidOrders)}`}>
          <i style={{ height: `${Math.max(6, (Number(point.orders) / maxOrders) * 100)}%` }} />
        </div>)}
      </div>
      <p className="muted">柱高为当日订单数；悬停查看订单/支付明细。</p>
    </div>
  </div>;
}
