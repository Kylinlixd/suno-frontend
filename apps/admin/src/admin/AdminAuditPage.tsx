import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminPageAuditLogs } from "@suno/shared";
import { apiOptions } from "../lib/auth";

/** 运营审计日志（OPS-021 既有 API 的界面化） */
export function AdminAuditPage() {
  const [page, setPage] = useState(0);
  const logsQuery = useQuery({ queryKey: ["admin-audit", page], queryFn: () => adminPageAuditLogs(page, 30, apiOptions) });
  const rows = logsQuery.data?.content ?? [];
  const totalPages = Math.max(1, logsQuery.data?.totalPages ?? 1);
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Audit</p><h1>审计日志</h1></div></div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>操作留痕</h2><span className="admin-live"><i />{logsQuery.data?.totalElements ?? 0} 条</span></div>
      <div className="table-head admin-table-row"><span>动作</span><span>目标</span><span>详情</span><span>时间</span><span></span></div>
      {rows.map((row) => <div className="table-row admin-table-row" key={String(row.id)}>
        <span><b>{String(row.actionType)}</b></span>
        <span>{String(row.targetType)} · {String(row.targetId)}</span>
        <span className="audit-detail">{String(row.detail ?? "")}</span>
        <span>{String(row.createdAt)}</span>
        <span></span>
      </div>)}
      {rows.length === 0 && <p className="muted">暂无审计记录。</p>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>下一页 →</button></div>}
    </div>
  </div>;
}
