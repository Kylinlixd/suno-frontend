import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSupportTicket, getMySupportTickets, type SupportTicket } from "@suno/shared";
import { LoginPanel } from "../components/LoginPanel";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";

const TYPE_OPTIONS = [
  { value: "QUESTION", label: "咨询" },
  { value: "AFTER_SALE", label: "售后" },
  { value: "COMPLAINT", label: "投诉" },
  { value: "OTHER", label: "其他" }
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map((option) => [option.value, option.label]));
const STATUS_LABELS: Record<string, string> = { OPEN: "待处理", PROCESSING: "处理中", CLOSED: "已关闭" };

/** P2 客服工单：提交 + 我的工单 */
export function SupportPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [ticketType, setTicketType] = useState("QUESTION");
  const [content, setContent] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [message, setMessage] = useState("");
  const canRead = Boolean(apiOptions.demo || session);
  const ticketsQuery = useQuery({ queryKey: ["support-tickets", session?.userId], queryFn: () => getMySupportTickets(0, 20, sessionApiOptions()), enabled: canRead });
  const createMutation = useMutation({
    mutationFn: () => createSupportTicket({ ticketType, content, orderNo: orderNo || undefined }, sessionApiOptions()),
    onSuccess: () => { setMessage("已收到你的工单，客服会尽快回复（可在通知中心关注进展）。"); setContent(""); setOrderNo(""); void queryClient.invalidateQueries({ queryKey: ["support-tickets"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "提交失败，请稍后重试。")
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!apiOptions.demo && !session) { setShowLogin(true); return; }
    if (content.trim().length >= 5) createMutation.mutate();
  }
  return <section className="section-wrap page-section support-page">
    <div className="page-intro"><p className="eyebrow">Suno Care</p><h1>有问题，<em>随时说。</em></h1><p>工单默认 24 小时内响应；售后类工单会优先关联你的订单处理。</p></div>
    <div className="support-layout">
      <form className="support-form" onSubmit={submit}>
        <div className="form-head"><h2>提交工单</h2><span>预计 1 分钟</span></div>
        <label>类型<div className="filter-row compact">{TYPE_OPTIONS.map((option) => <button type="button" key={option.value} className={`filter-button ${ticketType === option.value ? "active" : ""}`} onClick={() => setTicketType(option.value)}>{option.label}</button>)}</div></label>
        <label>问题描述<textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} placeholder="遇到什么问题？期望怎么解决？（至少 5 个字）" required /></label>
        <label>关联订单号（可选）<input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} placeholder="如 SN202608050018" /></label>
        <button className="button button-lime" type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "正在提交…" : "提交工单 ↗"}</button>
        {message && <p className={message.includes("失败") ? "error-message" : "success-message"}>{message}</p>}
      </form>
      <div className="support-list">
        <div className="section-heading compact"><div><p className="eyebrow">My tickets</p><h2>我的工单</h2></div></div>
        {!canRead ? <p className="muted">登录后可查看工单记录与客服回复。</p>
          : ticketsQuery.isLoading ? <p className="muted">正在加载…</p>
            : (ticketsQuery.data?.content ?? []).length === 0 ? <p className="muted">还没有工单记录。</p>
              : (ticketsQuery.data?.content ?? []).map((ticket: SupportTicket) => <div className={`support-row ${ticket.status === "CLOSED" ? "closed" : ""}`} key={ticket.ticketId}>
                <div className="support-row-head"><b>{ticket.ticketNo}</b><span className="status-pill">{STATUS_LABELS[ticket.status] ?? ticket.status}</span><i>{TYPE_LABELS[ticket.ticketType] ?? ticket.ticketType}</i></div>
                <p className="support-content">{ticket.content}</p>
                {ticket.orderNo && <p className="muted">订单 {ticket.orderNo}</p>}
                {ticket.reply && <p className="support-reply">客服 · {ticket.reply}</p>}
                <p className="muted small">{ticket.repliedAt ? `回复于 ${ticket.repliedAt}` : `提交于 ${ticket.createdAt}`}</p>
              </div>)}
      </div>
    </div>
    {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
  </section>;
}
