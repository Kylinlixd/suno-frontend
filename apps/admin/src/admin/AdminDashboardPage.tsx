import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminReportOverview } from "@suno/shared";
import { apiOptions, sessionApiOptions } from "../lib/auth";

const DAY_OPTIONS = [7, 14, 30];

/** P3 经营看板第一屏：核心指标 + 环比 + 漏斗 + 回收/券/用户维度 */
export function AdminDashboardPage() {
  const [days, setDays] = useState(14);
  const reportQuery = useQuery({ queryKey: ["admin-report", days], queryFn: () => adminReportOverview(days, sessionApiOptions()) });
  const data = reportQuery.data;
  const delta = (data?.delta ?? {}) as Record<string, unknown>;
  const recycle = (data?.recycle ?? {}) as Record<string, unknown>;
  const coupons = (data?.coupons ?? {}) as Record<string, unknown>;
  const users = (data?.users ?? {}) as Record<string, unknown>;
  const funnel = (data?.funnel ?? {}) as Record<string, unknown>;
  const trend = Array.isArray(data?.trend) ? data.trend as Array<Record<string, unknown>> : [];
  const maxOrders = Math.max(1, ...trend.map((point) => Number(point.orders)));
  return <div className="admin-page">
    <div className="admin-topbar">
      <div><p className="eyebrow">Suno operations</p><h1>今天，系统流转得很好。</h1></div>
      <div className="dashboard-controls">
        {DAY_OPTIONS.map((option) => <button key={option} className={`filter-button ${days === option ? "active" : ""}`} onClick={() => setDays(option)}>{option} 天</button>)}
        <span className="admin-live"><i /> {apiOptions.demo ? "Demo data" : "Live"}</span>
      </div>
    </div>
    {reportQuery.isError ? <div className="empty-state"><p>看板数据暂时无法加载，请检查权限或网络后重试。</p><button className="button button-dark" onClick={() => void reportQuery.refetch()}>重新加载 ↗</button></div> : <>
      <div className="metric-grid">
        <Metric label="GMV（应付）" value={fmt(data?.gmv)} prefix="¥" delta={delta.gmv} tone="lime" loading={reportQuery.isLoading} />
        <Metric label="订单" value={fmt(data?.totalOrders)} suffix="单" delta={delta.totalOrders} tone="blue" loading={reportQuery.isLoading} />
        <Metric label="支付转化" value={pct(data?.payRate)} suffix="%" tone="lime" loading={reportQuery.isLoading} />
        <Metric label="客单价" value={fmt(data?.avgPaidAmount)} prefix="¥" delta={delta.avgPaidAmount} tone="blue" loading={reportQuery.isLoading} />
        <Metric label="退款率" value={pct(data?.refundRate)} suffix="%" delta={delta.refundRate} invert tone="rose" loading={reportQuery.isLoading} />
        <Metric label="回收单" value={fmt(recycle.total)} suffix="单" tone="amber" loading={reportQuery.isLoading} />
        <Metric label="券核销率" value={pct(coupons.redeemRate)} suffix="%" sub={`领 ${fmt(coupons.claimed)} · 用 ${fmt(coupons.redeemed)}`} tone="amber" loading={reportQuery.isLoading} />
        <Metric label="活跃买家" value={fmt(users.activeBuyers)} suffix="人" sub={`注册 ${fmt(users.total)}`} tone="lime" loading={reportQuery.isLoading} />
      </div>
      <div className="admin-columns">
        <section className="admin-panel">
          <div className="panel-heading"><h2>订单趋势（{String(data?.days ?? days)} 日）</h2></div>
          <div className="report-trend">{trend.map((point) => <div className="trend-bar" key={String(point.date)} title={`${String(point.date)}：${Number(point.orders)} 单 / 支付 ${Number(point.paidOrders)}`}><i style={{ height: `${Math.max(6, (Number(point.orders) / maxOrders) * 100)}%` }} /></div>)}</div>
        </section>
        <section className="admin-panel">
          <div className="panel-heading"><h2>转化漏斗</h2><span className="muted">下单 → 支付 → 完成 → 退款</span></div>
          <div className="funnel-rows">
            <FunnelRow label="下单" value={funnel.ordered} loading={reportQuery.isLoading} />
            <FunnelRow label="支付" value={funnel.paid} loading={reportQuery.isLoading} />
            <FunnelRow label="完成" value={funnel.completed} loading={reportQuery.isLoading} />
            <FunnelRow label="退款" value={funnel.refunded} loading={reportQuery.isLoading} tone="rose" />
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}>回收上架率 {pct(recycle.listedRate)}%（{fmt(recycle.listed)}/{fmt(recycle.total)}），回收估价总额 ¥{fmt(recycle.estimatedTotal)}。</p>
        </section>
      </div>
    </>}
  </div>;
}

function Metric({ label, value, prefix, suffix, delta, invert, sub, tone, loading }: { label: string; value: string; prefix?: string; suffix?: string; delta?: unknown; invert?: boolean; sub?: string; tone: string; loading?: boolean }) {
  const deltaValue = typeof delta === "number" ? delta : undefined;
  return <div className={`metric-card metric-${tone}`}>
    <span>{label}</span>
    <strong>{loading ? "—" : `${prefix ?? ""}${value}${suffix ?? ""}`}</strong>
    {sub ? <p>{sub}</p> : deltaValue !== undefined && !loading
      ? <p className={deltaTone(deltaValue, invert)}>{deltaValue > 0 ? "▲" : deltaValue < 0 ? "▼" : "•"} {Math.abs(deltaValue)}% 环比</p>
      : <p>{loading ? "同步中…" : "实时同步后端"}</p>}
  </div>;
}

function FunnelRow({ label, value, tone, loading }: { label: string; value: unknown; tone?: string; loading?: boolean }) {
  const numeric = Number(value ?? 0);
  return <div className={`funnel-row ${tone ?? ""}`}><span>{label}</span><strong>{loading ? "—" : numeric.toLocaleString()}</strong></div>;
}

function deltaTone(value: number, invert?: boolean): string {
  const good = invert ? value <= 0 : value >= 0;
  return good ? "delta-good" : "delta-bad";
}

function fmt(value: unknown): string {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString() : "0";
}

function pct(value: unknown): string {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? String(numeric) : "0";
}
