import { Link, NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getUnreadNotificationCount } from "@suno/shared";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";

export function SunoNav() {
  const userName = useAuth((state) => state.session?.username ?? "登录");
  const session = useAuth((state) => state.session);
  const canRead = Boolean(apiOptions.demo || session);
  const unreadQuery = useQuery({
    queryKey: ["notification-unread", session?.userId],
    queryFn: () => getUnreadNotificationCount(sessionApiOptions()),
    enabled: canRead,
    refetchInterval: 30_000
  });
  const unread = unreadQuery.data ?? 0;
  return <header className="site-nav">
    <Link to="/" className="brand-mark" aria-label="返回 Suno 首页"><span>S</span> SUNO</Link>
    <nav className="desktop-nav" aria-label="主导航">
      <NavLink to="/market">逛逛</NavLink>
      <NavLink to="/recycle">把闲置交给我们</NavLink>
      <NavLink to="/orders">订单</NavLink><NavLink to="/support">客服</NavLink>
      <NavLink to="/cart">购物车</NavLink>
    </nav>
    <div className="nav-tools">
      <Link to="/notifications" className="nav-bell" aria-label={`通知${unread > 0 ? `，${unread} 条未读` : ""}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        {unread > 0 && <span className="bell-badge">{unread > 99 ? "99+" : unread}</span>}
      </Link>
      <Link className="nav-account" to="/account"><span className="status-dot" /> {userName}</Link>
    </div>
  </header>;
}