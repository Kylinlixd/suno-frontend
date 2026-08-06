import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFavorites } from "@suno/shared";
import { apiOptions, sessionApiOptions } from "../lib/auth";

export function AccountPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { session, logout } = useAuth();
  const { data: favorites } = useQuery({ queryKey: ["favorites", session?.userId], queryFn: () => getFavorites(session?.userId ?? 1, sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  return <section className="section-wrap page-section account-page"><div className="account-head"><div className="avatar">A</div><div><p className="eyebrow">Suno member</p><h1>{session?.username ?? "你的"}<em> 循环账户</em></h1><p>{session ? "你已登录，所有流转记录都会被保存。" : "登录后，回收和购买记录会跟着你走。"}</p></div><button className="text-button" onClick={() => session ? void logout() : setShowLogin(true)}>{session ? "退出登录" : "登录账户"}</button></div><div className="account-links"><Link to="/orders"><span>订单与物流</span><strong>查看全部 ↗</strong></Link><Link to="/recycle"><span>回收记录</span><strong>估价新物品 ↗</strong></Link><Link to="/market"><span>我的收藏</span><strong>{favorites?.totalElements ?? (apiOptions.demo ? 6 : 0)} 件商品</strong></Link></div><div className="account-note"><p className="eyebrow">Suno promise</p><h2>你不需要拥有更多，<br />只需要让拥有的继续有用。</h2></div>{showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}</section>;
}
