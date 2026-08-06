import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRecycleApplication, getRecycles, recycleStatusLabel } from "@suno/shared";
import { sessionApiOptions, useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";

export function RecyclePage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { session } = useAuth();
  const options = sessionApiOptions();
  const canRead = options.demo;
  const { data } = useQuery({ queryKey: ["recycles", session?.userId], queryFn: () => getRecycles(options), enabled: canRead });
  const mutation = useMutation({ mutationFn: () => createRecycleApplication({ title, image: "https://picsum.photos/seed/new-recycle/960/1200", snCode: title }, sessionApiOptions()), onSuccess: () => { setTitle(""); setSubmitted(true); queryClient.invalidateQueries({ queryKey: ["recycles"] }); } });
  function submit(event: FormEvent) { event.preventDefault(); if (!options.demo && !session) { setShowLogin(true); return; } if (title.trim()) mutation.mutate(); }
  return <section className="section-wrap page-section recycle-page"><div className="page-intro narrow"><p className="eyebrow">Suno Recycle</p><h1>让闲置<br /><em>重新有用。</em></h1><p>拍下它现在的样子，告诉我们它是谁。我们负责审核、估价、物流和下一次遇见。</p></div><div className="recycle-layout"><form className="recycle-form" onSubmit={submit}><div className="form-head"><h2>提交一件闲置</h2><span>预计 2 分钟</span></div><label>它是什么？<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：iPhone 15 Pro Max 256G" required /></label><label>补充描述<textarea placeholder="使用多久、有什么瑕疵、配件是否齐全…" rows={5} /></label><button className="button button-lime" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "正在提交…" : "提交回收申请 ↗"}</button>{submitted && <p className="success-message">已收到，我们会尽快完成初步审核。</p>}{mutation.isError && <p className="error-message">{mutation.error instanceof Error ? mutation.error.message : "提交失败，请稍后重试。"}</p>}</form><div className="recycle-side"><div className="recycle-photo"><img src="https://picsum.photos/seed/suno-recycle/1200/1000" alt="正在被整理的闲置物品" /></div><div className="recycle-steps"><div><span>01</span><strong>拍照与描述</strong><p>让我们先认识它。</p></div><div><span>02</span><strong>审核与估价</strong><p>价格透明，有据可查。</p></div><div><span>03</span><strong>寄出与流转</strong><p>它会进入下一段日常。</p></div></div></div></div><div className="recycle-history"><div className="section-heading compact"><div><p className="eyebrow">你的回收记录</p><h2>每一次流转，都有回音。</h2></div></div>{!canRead ? <div className="empty-state"><p>登录后提交回收申请；用户历史接口将在后端提供后显示。</p><button className="button button-dark" type="button" onClick={() => setShowLogin(true)}>登录账户 ↗</button></div> : <div className="recycle-list">{(data?.content ?? []).map((item) => <div className="recycle-row" key={item.id}><img src={item.image} alt="" /><div><strong>{item.title}</strong><p>{item.createdAt} · {item.logisticsStatus}</p></div><span className="status-pill">{recycleStatusLabel[item.status]}</span>{item.estimatedPrice && <b>¥{item.estimatedPrice.toLocaleString()}</b>}</div>)}</div>}</div>{showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}</section>;
}
