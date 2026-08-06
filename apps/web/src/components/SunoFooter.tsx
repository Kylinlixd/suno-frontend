import { Link } from "react-router-dom";

export function SunoFooter() {
  return <footer className="site-footer">
    <div className="footer-cta">
      <p className="eyebrow">让物品继续流转</p>
      <h2>把下一件好东西，交给下一位认真生活的人。</h2>
      <Link to="/recycle" className="button button-dark">开始回收 <span>↗</span></Link>
    </div>
    <div className="footer-bottom"><span>© 2026 SUNO MALL</span><span>循环不是终点，是下一次使用的开始。</span><Link to="/admin">运营入口</Link></div>
  </footer>;
}
