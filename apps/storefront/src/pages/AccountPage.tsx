import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getFavorites, listSessions, revokeAllSessions, revokeDeviceSession } from "@suno/shared";
import { useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";
import { useState } from "react";
import { apiOptions, sessionApiOptions } from "../lib/auth";

export function AccountPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { session, logout } = useAuth();
  const { data: favorites } = useQuery({ queryKey: ["favorites", session?.userId], queryFn: () => getFavorites(session?.userId, sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: () => listSessions(sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const [sessionMessage, setSessionMessage] = useState("");
  const revokeDeviceMutation = useMutation({ mutationFn: (deviceId: string) => revokeDeviceSession(deviceId, sessionApiOptions()), onSuccess: () => { setSessionMessage("该设备已下线。"); void sessionsQuery.refetch(); }, onError: (error) => setSessionMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。") });
  const revokeAllMutation = useMutation({ mutationFn: () => revokeAllSessions(sessionApiOptions()), onSuccess: () => { setSessionMessage("已撤销全部登录会话，请重新登录。"); setTimeout(() => void logout(), 800); }, onError: (error) => setSessionMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。") });
  const sessions = sessionsQuery.data?.sessions.filter((item) => !item.revoked) ?? [];
  return <section className="section-wrap page-section account-page"><div className="account-head"><div className="avatar">{(session?.username ?? "A").slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">Suno member</p><h1>{session?.username ?? "你的"}<em> 循环账户</em></h1><p>{session ? "你已登录，所有流转记录都会被保存。" : "登录后，回收和购买记录会跟着你走。"}</p></div><button className="text-button" onClick={() => session ? void logout() : setShowLogin(true)}>{session ? "退出登录" : "登录账户"}</button></div><div className="account-links"><Link to="/orders"><span>订单与物流</span><strong>查看全部 ↗</strong></Link><Link to="/recycle"><span>回收记录</span><strong>估价新物品 ↗</strong></Link><Link to="/market"><span>我的收藏</span><strong>{favorites?.totalElements ?? 0} 件商品</strong></Link></div><div className="account-sessions"><div className="section-heading compact"><div><p className="eyebrow">Security</p><h2>登录设备</h2></div><button className="text-button" onClick={() => revokeAllMutation.mutate()} disabled={revokeAllMutation.isPending}>{revokeAllMutation.isPending ? "撤销中…" : "撤销全部会话"}</button></div>{sessionMessage && <p className="success-message">{sessionMessage}</p>}{sessionsQuery.isLoading ? <p className="muted">正在获取登录设备…</p> : sessions.length === 0 ? <p className="muted">当前没有活跃会话。</p> : <div className="session-list">{sessions.map((item) => <div className="session-row" key={item.deviceId}><i /><div><strong>{item.deviceId}</strong><span>登录于 {item.createdAt} · 有效期至 {item.expireAt}</span></div><button className="text-button" onClick={() => revokeDeviceMutation.mutate(item.deviceId)} disabled={revokeDeviceMutation.isPending}>下线</button></div>)}</div>}</div><div className="account-note"><p className="eyebrow">Suno promise</p><h2>你不需要拥有更多，<br />只需要让拥有的继续有用。</h2></div>{showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}</section>;
}
