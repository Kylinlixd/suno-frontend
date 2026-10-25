import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPageSupportTickets, adminReplySupportTicket, type SupportTicket } from "@suno/shared";
import { apiOptions } from "../lib/auth";

const STATUS_TABS = ["", "OPEN", "PROCESSING", "CLOSED"];

/** P2 工单管理：按状态分页 + 回复/关闭 */
export function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [replyTarget, setReplyTarget] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [closeAfter, setCloseAfter] = useState(false);
  const [message, setMessage] = useState("");
  const ticketsQuery = useQuery({ queryKey: ["admin-tickets", status, page], queryFn: () => adminPageSupportTickets(status || undefined, page, 20, apiOptions) });
  const replyMutation = useMutation({
    mutationFn: () => adminReplySupportTicket(replyTarget?.ticketId ?? 0, replyText, closeAfter, apiOptions),
    onSuccess: () => { setMessage("回复已发送并通知买家。"); setReplyTarget(null); setReplyText(""); void queryClient.invalidateQueries({ queryKey: ["admin-tickets"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "回复失败。")
  });
  const rows = ticketsQuery.data?.content ?? [];
  const totalPages = Math.max(1, ticketsQuery.data?.totalPages ?? 1);
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Support</p><h1>工单管理</h1></div></div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>客服工单</h2><span className="admin-live"><i />{ticketsQuery.data?.totalElements ?? 0} 单</span></div>
      <div className="filter-row">{STATUS_TABS.map((tab) => <button key={tab} className={`filter-button ${status === tab ? "active" : ""}`} onClick={() => { setStatus(tab); setPage(0); }}>{tab || "全部状态"}</button>)}</div>
      {message && <p className="success-message">{message}</p>}
      <div className="table-head admin-table-row"><span>工单</span><span>类型</span><span>状态</span><span>最近动态</span><span>操作</span></div>
      {rows.map((ticket) => <div className="table-row admin-table-row" key={ticket.ticketId}>
        <span className="table-item"><b>{ticket.ticketNo}</b><i>{ticket.content}</i>{ticket.orderNo && <i>订单 {ticket.orderNo}</i>}</span>
        <span>{ticket.ticketType}</span>
        <span>{ticket.status}</span>
        <span>{ticket.reply ? `已回复 · ${ticket.repliedAt ?? ""}` : ticket.createdAt}</span>
        <span>{ticket.status !== "CLOSED"
          ? <button className="text-button" onClick={() => { setReplyTarget(ticket); setReplyText(""); setMessage(""); }}>回复</button>
          : <i className="muted">已关闭</i>}</span>
      </div>)}
      {rows.length === 0 && <p className="muted">没有符合条件的工单。</p>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>下一页 →</button></div>}
    </div>
    {replyTarget && <div className="login-overlay" role="dialog" aria-modal="true"><div className="admin-panel admin-detail-panel">
      <div className="panel-heading"><h2>回复 {replyTarget.ticketNo}</h2><button className="text-button" onClick={() => setReplyTarget(null)}>关闭</button></div>
      <p className="muted">{replyTarget.content}</p>
      <div className="coupon-admin-form">
        <label>回复内容<textarea rows={4} value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder="写给买家的回复…" /></label>
        <label className="coupon-option" style={{ cursor: "pointer" }}><input type="checkbox" checked={closeAfter} onChange={(event) => setCloseAfter(event.target.checked)} /><span>回复后关闭工单</span></label>
        <button className="button button-dark" disabled={replyMutation.isPending || replyText.trim().length < 2} onClick={() => replyMutation.mutate()}>{replyMutation.isPending ? "发送中…" : "发送回复"}</button>
      </div>
    </div></div>}
  </div>;
}
