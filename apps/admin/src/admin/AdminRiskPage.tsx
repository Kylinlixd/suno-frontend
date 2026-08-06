import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminReviewRiskSummary, getAdminReviewRiskTopListings, getAdminSecurityTimeline, getPaymentReplaySummary, type ReviewRiskListing } from "@suno/shared";
import { sessionApiOptions } from "../lib/auth";

type Panel = "replay" | "risk" | "security" | null;

export function AdminRiskPage() {
  const [panel, setPanel] = useState<Panel>(null);
  const replay = useQuery({ queryKey: ["payment-replay-summary"], queryFn: () => getPaymentReplaySummary(sessionApiOptions()) });
  const reviewRisk = useQuery({ queryKey: ["review-risk-summary"], queryFn: () => getAdminReviewRiskSummary(sessionApiOptions()) });
  const topListings = useQuery({ queryKey: ["review-risk-top-listings"], queryFn: () => getAdminReviewRiskTopListings(sessionApiOptions()) });
  const security = useQuery({ queryKey: ["security-timeline"], queryFn: () => getAdminSecurityTimeline(sessionApiOptions()) });
  const replayCount = Number(replay.data?.pending ?? 0) + Number(replay.data?.dead ?? 0);
  const reviewCount = Number(reviewRisk.data?.pendingReportCount ?? 0);
  const securityPoints = Array.isArray(security.data?.points) ? security.data.points as Array<Record<string, unknown>> : [];
  const securityCount = securityPoints.reduce((total, point) => total + Number(point.total ?? 0), 0);

  return <div className="admin-page"><div className="admin-topbar"><div><p className="eyebrow">Risk & payments</p><h1>异常需要被看见，也需要被及时处理。</h1></div><span className="admin-live"><i /> 三组实时摘要</span></div><div className="risk-grid"><article className="risk-card risk-rose"><span>支付回调等待重放</span><strong>{replay.isLoading ? "—" : replayCount}</strong><p>待处理 {Number(replay.data?.pending ?? 0)} · 死信 {Number(replay.data?.dead ?? 0)}</p><button className="button button-dark small" onClick={() => setPanel(panel === "replay" ? null : "replay")}>查看重放状态</button></article><article className="risk-card"><span>评论风险报告</span><strong>{reviewRisk.isLoading ? "—" : reviewCount}</strong><p>{String(reviewRisk.data?.riskLevel ?? "等待摘要")} · 最近 24 小时</p><button className="button button-light small" onClick={() => setPanel(panel === "risk" ? null : "risk")}>查看风险摘要</button></article><article className="risk-card risk-dark"><span>安全事件</span><strong>{security.isLoading ? "—" : securityCount}</strong><p>近 60 分钟累计事件</p><button className="button button-lime small" onClick={() => setPanel(panel === "security" ? null : "security")}>查看时间线</button></article></div><TopListingsPanel items={topListings.data ?? []} loading={topListings.isLoading} />{panel === "replay" && <ReplayPanel data={replay.data} />}{panel === "risk" && <RiskPanel data={reviewRisk.data} />}{panel === "security" && <SecurityPanel points={securityPoints} />}{(replay.isError || reviewRisk.isError || topListings.isError || security.isError) && <div className="empty-state admin-risk-error"><p>部分风险数据加载失败，请检查权限或网络后重试。</p></div>}<section className="admin-panel"><div className="panel-heading"><h2>处理原则</h2></div><div className="principles"><div><strong>01</strong><span>所有异常都有稳定 code，方便追踪和重放。</span></div><div><strong>02</strong><span>每个运营动作写入审计日志，不靠口头确认。</span></div><div><strong>03</strong><span>先恢复业务，再把根因带回工程系统。</span></div></div></section></div>;
}

function TopListingsPanel({ items, loading }: { items: ReviewRiskListing[]; loading: boolean }) {
  return <section className="admin-panel risk-detail"><div className="panel-heading"><div><p className="eyebrow">Review risk</p><h2>高风险商品榜单</h2></div><span className="muted">最近 24 小时</span></div>{loading ? <p className="muted">正在加载风险榜单…</p> : items.length === 0 ? <p className="muted">当前窗口暂无高风险商品。</p> : items.map((item) => <div className="security-point" key={item.listingId}><span>商品 #{item.listingId} · {item.reviewCount} 条评论 · 敏感命中 {(item.sensitiveRate * 100).toFixed(1)}%</span><strong>风险 {item.riskScore.toFixed(1)}</strong></div>)}</section>;
}

function ReplayPanel({ data }: { data: Record<string, unknown> | undefined }) {
  return <section className="admin-panel risk-detail"><div><p className="eyebrow">Payment replay</p><h2>重放队列状态</h2></div><div className="risk-detail-grid"><span>待消费 <b>{Number(data?.pending ?? 0)}</b></span><span>处理中 <b>{Number(data?.processing ?? 0)}</b></span><span>成功 <b>{Number(data?.success ?? 0)}</b></span><span>死信 <b>{Number(data?.dead ?? 0)}</b></span></div></section>;
}

function RiskPanel({ data }: { data: Record<string, unknown> | undefined }) {
  return <section className="admin-panel risk-detail"><div><p className="eyebrow">Review risk</p><h2>评论风险摘要</h2></div><div className="risk-detail-grid"><span>评论数 <b>{Number(data?.totalReviews ?? 0)}</b></span><span>敏感命中 <b>{Number(data?.sensitiveReviewCount ?? 0)}</b></span><span>报告数 <b>{Number(data?.reportCount ?? 0)}</b></span><span>待处理 <b>{Number(data?.pendingReportCount ?? 0)}</b></span></div><p className="muted">{String(data?.recommendation ?? "暂无建议")}</p></section>;
}

function SecurityPanel({ points }: { points: Array<Record<string, unknown>> }) {
  return <section className="admin-panel risk-detail"><div><p className="eyebrow">Security timeline</p><h2>最近事件</h2></div>{points.slice(-8).map((point, index) => <div className="security-point" key={`${String(point.minute)}-${index}`}><span>{String(point.minute ?? "")}</span><strong>{Number(point.total ?? 0)} 件</strong></div>)}</section>;
}
