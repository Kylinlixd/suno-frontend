import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";

export function LoginPanel({ onClose }: { onClose: () => void }) {
  const login = useAuth((state) => state.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const demoMode = import.meta.env.VITE_DEMO_MODE !== "false";
  const showTestCredentials = import.meta.env.DEV || import.meta.env.VITE_SHOW_TEST_CREDENTIALS === "true";
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setPending(true);
    try { await login(username, password); onClose(); } catch { setError("账号或密码不正确，请重试。"); } finally { setPending(false); }
  }
  return <div className="login-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title"><div className="login-panel"><button className="login-close" aria-label="关闭登录" onClick={onClose}>×</button><p className="eyebrow">Suno operations</p><h2 id="login-title">登录<br /><em>运营后台。</em></h2><form onSubmit={submit}><label>用户名<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="login-error">{error}</p>}<button className="button button-lime" type="submit" disabled={pending}>{pending ? "正在登录…" : "登录后台 ↗"}</button></form>{showTestCredentials && <div className="login-test-credentials"><div><span>开发测试账号</span><strong>admin</strong></div><div><span>测试密码</span><strong>admin123</strong></div><button className="text-button" type="button" onClick={() => { setUsername("admin"); setPassword("admin123"); }}>一键填入测试账号</button><p>{demoMode ? "当前为演示模式，任意非空账号密码均可登录。" : "Java 后端 dev seed 测试账号，仅限本地开发使用。"}</p></div>}<p className="login-hint">正式环境请使用后端分配的管理员账号，不要使用开发测试凭据。</p></div></div>;
}
