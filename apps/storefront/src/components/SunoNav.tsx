import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

export function SunoNav() {
  const userName = useAuth((state) => state.session?.username ?? "登录");
  return <header className="site-nav">
    <Link to="/" className="brand-mark" aria-label="返回 Suno 首页"><span>S</span> SUNO</Link>
    <nav className="desktop-nav" aria-label="主导航">
      <NavLink to="/market">逛逛</NavLink>
      <NavLink to="/recycle">把闲置交给我们</NavLink>
      <NavLink to="/orders">订单</NavLink>
    </nav>
    <Link className="nav-account" to="/account"><span className="status-dot" /> {userName}</Link>
  </header>;
}
