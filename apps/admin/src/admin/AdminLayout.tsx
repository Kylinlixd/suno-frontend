import { NavLink, Outlet, Link } from "react-router-dom";
import { apiOptions, useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";

export function AdminLayout() {
  const session = useAuth((state) => state.session);
  if (!apiOptions.demo && !session) return <LoginPanel onClose={() => undefined} />;
  const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL ?? "http://localhost:4173";
  return <div className="admin-shell"><aside className="admin-sidebar"><Link to="/" className="brand-mark admin-brand"><span>S</span> SUNO <small>OPS</small></Link><p className="admin-caption">Operations console</p><nav><NavLink end to="/">总览</NavLink><NavLink to="/recycle">回收审核</NavLink><NavLink to="/risk">风险与支付</NavLink></nav><a href={storefrontUrl} className="admin-exit">返回用户端 ↗</a></aside><main className="admin-main"><Outlet /></main></div>;
}
