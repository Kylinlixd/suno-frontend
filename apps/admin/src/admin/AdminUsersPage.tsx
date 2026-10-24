import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminPageUsers, adminSetUserStatus } from "@suno/shared";
import { apiOptions } from "../lib/auth";

/** M3 用户管理：搜索 + 封禁/解封 */
export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const usersQuery = useQuery({ queryKey: ["admin-users", keyword, page], queryFn: () => adminPageUsers(keyword || undefined, undefined, page, 20, apiOptions) });
  const statusMutation = useMutation({
    mutationFn: (payload: { userId: number; accountStatus: "ACTIVE" | "BANNED" }) => adminSetUserStatus(payload.userId, payload.accountStatus, apiOptions),
    onSuccess: (data) => { setMessage(`用户 ${String(data.userId)} 已${String(data.accountStatus) === "BANNED" ? "封禁" : "解封"}。`); void queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "操作失败。")
  });
  const rows = usersQuery.data?.content ?? [];
  const totalPages = Math.max(1, usersQuery.data?.totalPages ?? 1);
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Accounts</p><h1>用户管理</h1></div></div>
    <div className="admin-panel">
      <div className="panel-heading"><h2>注册用户</h2><span className="admin-live"><i />{usersQuery.data?.totalElements ?? 0} 人</span></div>
      <div className="filter-row"><input className="admin-keyword" placeholder="用户名搜索" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(0); }} /></div>
      {message && <p className="success-message">{message}</p>}
      <div className="table-head admin-table-row"><span>用户</span><span>角色</span><span>状态</span><span>积分</span><span>操作</span></div>
      {rows.map((row) => <div className="table-row admin-table-row" key={String(row.userId)}>
        <span className="table-item"><b>{String(row.username)}</b><i>#{String(row.userId)} · {String(row.level)}</i></span>
        <span>{String(row.role)}</span>
        <span>{String(row.accountStatus)}</span>
        <span>{Number(row.points).toLocaleString()}</span>
        <span>{String(row.role) === "ADMIN" ? <i className="muted">管理员不可封禁</i> : String(row.accountStatus) === "BANNED"
          ? <button className="text-button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ userId: Number(row.userId), accountStatus: "ACTIVE" })}>解封</button>
          : <button className="text-button" disabled={statusMutation.isPending} onClick={() => { if (window.confirm(`确认封禁 ${String(row.username)}？其全部会话将被撤销。`)) statusMutation.mutate({ userId: Number(row.userId), accountStatus: "BANNED" }); }}>封禁</button>}</span>
      </div>)}
      {rows.length === 0 && <p className="muted">没有符合条件的用户。</p>}
      {totalPages > 1 && <div className="pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((v) => v - 1)}>← 上一页</button><span className="muted">第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((v) => v + 1)}>下一页 →</button></div>}
    </div>
  </div>;
}
