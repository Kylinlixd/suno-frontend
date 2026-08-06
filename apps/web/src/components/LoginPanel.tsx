import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";

export function LoginPanel({ onClose }: { onClose: () => void }) {
  const login = useAuth((state) => state.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setPending(true);
    try { await login(username, password); onClose(); } catch { setError("账号或密码不正确，请重试。"); } finally { setPending(false); }
  }
  return <div className="login-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title"><div className="login-panel"><button className="login-close" aria-label="关闭登录" onClick={onClose}>×</button><p className="eyebrow">Suno member</p><h2 id="login-title">登录你的<br /><em>循环账户。</em></h2><form onSubmit={submit}><label>用户名<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p className="login-error">{error}</p>}<button className="button button-lime" type="submit" disabled={pending}>{pending ? "正在登录…" : "登录 ↗"}</button></form><p className="login-hint">演示模式下填写任意非空账号和密码即可体验。</p></div></div>;
}
