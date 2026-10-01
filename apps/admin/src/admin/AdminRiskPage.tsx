import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminReviewRiskSummary, getAdminReviewRiskTopListings, getAdminSecurityTimeline, getPaymentReplaySummary, type PaymentReplaySummary, type ReviewRiskListing, type ReviewRiskSummary } from "@suno/shared";
import { sessionApiOptions } from "../lib/auth";

type Panel = "replay" | "risk" | "security" | null;

const SECURITY_WINDOWS = [
  { minutes: 60, label: "60 分钟" },
  { minutes: 360, label: "6 小时" },
  { minutes: 1440, label: "24 小时" }
];

export function AdminRiskPage() {
  const [panel, setPanel] = useState<Panel>(null);
  const [securityWindow, setSecurityWindow] = useState(60);
  const replay = useQuery({ queryKey: ["payment-replay-summary"], queryFn: () => getPaymentReplaySummary(sessionApiOptions()) });
  const reviewRisk = useQuery({ queryKey: ["review-risk-summary"], queryFn: () => getAdminReviewRiskSummary(sessionApiOptions()) });
  const topListings = useQuery({ queryKey: ["review-risk-top-listings"], queryFn: () => getAdminReviewRiskTopListings(sessionApiOptions()) });
  const security = useQuery({ queryKey: ["security-timeline", securityWindow], queryFn: () => getAdminSecurityTimeline(securityWindow, sessionApiOptions()) });
  const replayCount = (replay.data?.pending ?? 0) + (replay.data?.dead ?? 0);
  const reviewCount = reviewRisk.data?.pendingReportCount ?? 0;
  const securityPoints = Array.isArray(security.data?.points) ? security.data.points as Array<Record<string, unknown>> : [];
  const securityCount = securityPoints.reduce((total, point) => total + Number(point.total ?? 0), 0);

  return <div className="admin-page"><div className="admin-topbar"><div><p className="eyebrow">Risk & payments</p><h1>异常需要被看见，也需要被及时处理。</h1></div><span className="admin-live"><i /> 三组实时摘要</span></div><div className="risk-grid"><article className="risk-card risk-rose"><span>支付回调等待重放</span><strong>{replay.isLoading ? "—" : replayCount}</strong><p>待处理 {replay.data?.pending ?? 0} · 死信 {replay.data?.dead ?? 0}</p><button className="button button-dark small" onClick={() => setPanel(panel === "replay" ? null : "replay")}>查看重放状态</button></article><article className="risk-card"><span>评论风险报告</span><strong>{reviewRisk.isLoading ? "—" : reviewCount}</strong><p>{reviewRisk.data?.riskLevel ?? "等待摘要"} · 最近 24 小时</p><button className="button button-light small" onClick={() => setPanel(panel === "risk" ? null : "risk")}>查看风险摘要</button></article><article className="risk-card risk-dark"><span>安全事件</span><strong>{security.isLoading ? "—" : securityCount}</strong><p>近 {SECURITY_WINDOWS.find((item) => item.minutes === securityWindow)?.label} 累计事件</p><button className="button button-lime small" onClick={() => setPanel(panel === "security" ? null : "security")}>查看时间线</button><div className="window-picker">{SECURITY_WINDOWS.map((item) => <button key={item.minutes} className={`filter-button ${securityWindow === item.minutes ? "active" : ""}`} onClick={() => setSecurityWindow(item.minutes)}>{item.label}</button>)}</div></article></div><TopListingsPanel items={topListings.data ?? []} loading={topListings.isLoading} />{panel === "replay" && <ReplayPanel data={replay.data} />}{panel === "risk" && <RiskPanel data={reviewRisk.data} />}{panel === "security" && <SecurityPanel points={securityPoints} />}{(replay.isError || reviewRisk.isError || topListings.isError || security.isError) && <div className="empty-state admin-risk-error"><p>部分风险数据加载失败，请检查权限或网络后重试。</p><button className="button button-dark" onClick={() => { void replay.refetch(); void reviewRisk.refetch(); void topListings.refetch(); void security.refetch(); }}>重新加载 ↗</button></div>}<section className="admin-panel"><div className="panel-heading"><h2>处理原则</h2></div><div className="principles"><div><strong>01</strong><span>所有异常都有稳定 code，方便追踪和重放。</span></div><div><strong>02</strong><span>每个运营动作写入审计日志，不靠口头确认。</span></div><div><strong>03</strong><span>先恢复业务，再把根因带回工程系统。</span></div></div></section></div>;
}

function TopListingsPanel({ items, loading }: { items: ReviewRiskListing[]; loading: boolean }) {
  return <section className="admin-panel risk-detail"><div className="panel-heading"><div><p className="eyebrow">Review risk</p><h2>高风险商品榜单</h2></div><span className="muted">最近 24 小时</span></div>{loading ? <p className="muted">正在加载风险榜单…</p> : items.length === 0 ? <p className="muted">当前窗口暂无高风险商品。</p> : items.map((item) => <div className="security-point" key={item.listingId}><span>商品 #{item.listingId} · {item.reviewCount} 条评论 · 敏感命中 {(item.sensitiveRate * 100).toFixed(1)}%</span><strong>风险 {item.riskScore.toFixed(1)}</strong></div>)}</section>;
}

function ReplayPanel({ data }: { data: PaymentReplaySummary | undefined }) {
  return <section className="admin-panel risk-detail"><div><p className="eyebrow">Payment replay</p><h2>重放队列状态</h2></div><div className="risk-detail-grid"><span>待消费 <b>{data?.pending ?? 0}</b></span><span>处理中 <b>{data?.processing ?? 0}</b></span><span>成功 <b>{data?.success ?? 0}</b></span><span>死信 <b>{data?.dead ?? 0}</b></span></div></section>;
}

function RiskPanel({ data }: { data: ReviewRiskSummary | undefined }) {
  return <section className="admin-panel risk-detail"><div><p className="eyebrow">Review risk</p><h2>评论风险摘要</h2></div><div className="risk-detail-grid"><span>评论数 <b>{data?.totalReviews ?? 0}</b></span><span>敏感命中 <b>{data?.sensitiveReviewCount ?? 0}</b></span><span>报告数 <b>{data?.reportCount ?? 0}</b></span><span>待处理 <b>{data?.pendingReportCount ?? 0}</b></span></div><p className="muted">{data?.recommendation || "暂无建议"}</p></section>;
}

function SecurityPanel({ points }: { points: Array<Record<string, unknown>> }) {
  return <section className="admin-panel risk-detail"><div><p className="eyebrow">Security timeline</p><h2>最近事件</h2></div>{points.slice(-8).map((point, index) => <div className="security-point" key={`${String(point.minute)}-${index}`}><span>{String(point.minute ?? "")}</span><strong>{Number(point.total ?? 0)} 件</strong></div>)}</section>;
}
