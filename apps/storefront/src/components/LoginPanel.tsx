import { FormEvent, useEffect, useRef, useState } from "react";
import { sendSmsCode } from "@suno/shared";
import { apiOptions, useAuth } from "../lib/auth";

type PanelMode = "login" | "register" | "sms";

export function LoginPanel({ onClose }: { onClose: () => void }) {
  const login = useAuth((state) => state.login);
  const register = useAuth((state) => state.register);
  const smsLogin = useAuth((state) => state.smsLogin);
  const [mode, setMode] = useState<PanelMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>("input, button"));
    focusables()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  function switchMode(next: PanelMode) {
    setMode(next);
    setError("");
  }
  async function sendCode() {
    setError("");
    try {
      const result = await sendSmsCode(phone, apiOptions) as { devCode?: string };
      setSmsSent(true);
      if (result?.devCode) {
        setSmsCode(result.devCode);
        setError("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "验证码发送失败，请稍后重试。");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else if (mode === "register") {
        await register(username, password);
      } else {
        await smsLogin(phone, smsCode);
      }
      onClose();
    } catch (cause) {
      const message = cause instanceof Error && cause.message ? cause.message : "";
      setError(mode === "login"
        ? "账号或密码不正确，请重试。"
        : mode === "register"
          ? mapRegisterError(message) ?? "注册失败，请稍后重试。"
          : mapSmsError(message) ?? "验证码登录失败，请重试。");
    } finally {
      setPending(false);
    }
  }
  return <div className="login-overlay" role="dialog" aria-modal="true" aria-labelledby="login-title"><div className="login-panel" ref={panelRef}><button className="login-close" aria-label="关闭登录" onClick={onClose}>×</button><p className="eyebrow">Suno member</p><h2 id="login-title">{mode === "register" ? <>创建你的<br /><em>循环账户。</em></> : mode === "sms" ? <>手机号<br /><em>一键循环。</em></> : <>登录你的<br /><em>循环账户。</em></>}</h2><div className="login-tabs" role="tablist" aria-label="登录或注册">
    <button type="button" role="tab" aria-selected={mode === "login"} className={`login-tab ${mode === "login" ? "active" : ""}`} onClick={() => switchMode("login")}>登录</button>
    <button type="button" role="tab" aria-selected={mode === "register"} className={`login-tab ${mode === "register" ? "active" : ""}`} onClick={() => switchMode("register")}>注册</button>
    <button type="button" role="tab" aria-selected={mode === "sms"} className={`login-tab ${mode === "sms" ? "active" : ""}`} onClick={() => switchMode("sms")}>短信登录</button>
  </div><form onSubmit={submit}>{mode === "sms" ? <>
    <label>手机号<input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="numeric" placeholder="11 位手机号" required pattern="1\d{10}" /></label>
    <label>验证码<div className="sms-row"><input value={smsCode} onChange={(event) => setSmsCode(event.target.value)} inputMode="numeric" placeholder="6 位验证码" required pattern="\d{6}" /><button type="button" className="button button-light small" disabled={pending || !/^1\d{10}$/.test(phone)} onClick={() => void sendCode()}>{smsSent ? "重新发送" : "获取验证码"}</button></div></label>
    {smsSent && !error && <p className="login-hint left">验证码已发送，5 分钟内有效；未注册手机号将自动创建账户。</p>}
  </> : <>
    <label>用户名<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required minLength={3} /></label><label>密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} /></label>
  </>}{mode === "register" && <p className="login-hint left">用户名 3-64 位字符；密码至少 8 位。注册成功即登录。</p>}{error && <p className="login-error">{error}</p>}<button className="button button-lime" type="submit" disabled={pending}>{pending ? "请稍候…" : mode === "login" ? "登录 ↗" : mode === "register" ? "创建账户 ↗" : "验证并登录 ↗"}</button></form><p className="login-hint">演示模式下填写任意非空账号和密码即可体验。</p></div></div>;
}

/** 把后端注册错误码翻译成可行动的提示 */
function mapRegisterError(message: string): string | undefined {
  if (message.includes("AUTH_USERNAME_EXISTS")) return "这个用户名已经被注册了，换一个试试。";
  if (message.includes("AUTH_USERNAME_INVALID")) return "用户名须为 3-64 位字符且不含空白。";
  if (message.includes("AUTH_PASSWORD_INVALID")) return "密码须为 8-64 位字符且不含空白。";
  return undefined;
}


function mapSmsError(message: string): string | undefined {
  if (message.includes("AUTH_BAD_CREDENTIALS")) return "验证码错误或已过期。";
  if (message.includes("PARAM_INVALID")) return "手机号或验证码格式不正确。";
  if (message.includes("AUTH_ACCOUNT_DISABLED")) return "账号已被停用。";
  return undefined;
}
