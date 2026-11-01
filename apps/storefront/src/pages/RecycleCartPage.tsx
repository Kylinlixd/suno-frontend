import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addManualRecycleItem,
  getRecycleCart,
  removeRecycleCartItem,
  scanRecycleByIsbn,
  submitRecycleCart,
  type RecycleCartItem,
} from "@suno/shared";
import { sessionApiOptions, useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";

const CATEGORY_OPTIONS = ["图书", "衣物", "家居", "美妆", "数码", "其他"];

export function RecycleCartPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [wearScore, setWearScore] = useState(85);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState("衣物");
  const [manualWear, setManualWear] = useState(75);
  const [manualPrice, setManualPrice] = useState("");
  const [submitted, setSubmitted] = useState<{ count: number; total: number; points: number } | null>(null);
  const canRead = Boolean(sessionApiOptions().demo || session);

  const cartQuery = useQuery({
    queryKey: ["recycle-cart", session?.userId],
    queryFn: () => getRecycleCart(sessionApiOptions()),
    enabled: canRead,
  });

  const scanMutation = useMutation({
    mutationFn: () => scanRecycleByIsbn(isbn.trim(), wearScore, sessionApiOptions()),
    onSuccess: () => {
      setScanError("");
      setIsbn("");
      void queryClient.invalidateQueries({ queryKey: ["recycle-cart"] });
    },
    onError: (cause) => setScanError(cause instanceof Error ? cause.message : "扫码估价失败，请检查 ISBN 或稍后重试。"),
  });

  const manualMutation = useMutation({
    mutationFn: () =>
      addManualRecycleItem(
        {
          title: manualTitle.trim(),
          category: manualCategory,
          wearScore: manualWear,
          estimatedPrice: manualPrice ? Number(manualPrice) : undefined,
        },
        sessionApiOptions()
      ),
    onSuccess: () => {
      setManualTitle("");
      setManualPrice("");
      void queryClient.invalidateQueries({ queryKey: ["recycle-cart"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (cartItemId: number) => removeRecycleCartItem(cartItemId, sessionApiOptions()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recycle-cart"] }),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitRecycleCart(sessionApiOptions()),
    onSuccess: (result) => {
      setSubmitted({ count: result.submittedCount, total: result.totalEstimatedPrice, points: result.totalPoints });
      void queryClient.invalidateQueries({ queryKey: ["recycle-cart"] });
    },
  });

  const items: RecycleCartItem[] = cartQuery.data ?? [];
  const totalEstimated = items.reduce((sum, item) => sum + item.estimatedPrice, 0);

  function handleScan(event: FormEvent) {
    event.preventDefault();
    if (!canRead) { setShowLogin(true); return; }
    if (!isbn.trim()) { setScanError("请输入 ISBN"); return; }
    setScanning(true);
    scanMutation.mutate();
    setTimeout(() => setScanning(false), 1000);
  }

  function handleManualSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canRead) { setShowLogin(true); return; }
    if (!manualTitle.trim()) return;
    manualMutation.mutate();
  }

  function handleSubmitCart() {
    if (!canRead) { setShowLogin(true); return; }
    submitMutation.mutate();
  }

  const gradeLabel = (grade: string) => ({ GOOD: "成色良好", MEDIUM: "成色中等", UNQUALIFIED: "有明显痕迹" }[grade] ?? grade);

  return (
    <section className="section-wrap page-section recycle-cart-page">
      <div className="page-intro narrow">
        <p className="eyebrow">Suno Recycle Cart</p>
        <h1>把旧物<br /><em>一件一件送走。</em></h1>
        <p>扫码或手动添加，连续攒够一批再提交。就像购物车，不过是反着来的——你是卖方。</p>
      </div>

      <div className="recycle-cart-layout">
        {/* 左列：扫码 + 手动添加 */}
        <div className="recycle-cart-add">
          {/* 扫码估价 */}
          <form className="recycle-scan-form" onSubmit={handleScan}>
            <div className="form-head">
              <h2>扫码估价</h2>
              <span>ISBN 10 / 13 位</span>
            </div>
            <label>
              书籍条形码
              <input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="例如 9780306406157"
                maxLength={13}
                disabled={scanning}
              />
            </label>
            <label>
              成色评分：{wearScore} 分
              <input
                type="range"
                min={0}
                max={100}
                value={wearScore}
                onChange={(e) => setWearScore(Number(e.target.value))}
              />
            </label>
            <button className="button button-lime" type="submit" disabled={scanMutation.isPending || scanning}>
              {scanning || scanMutation.isPending ? "正在查询…" : "扫码估价 →"}
            </button>
            {scanError && <p className="error-message">{scanError}</p>}
          </form>

          {/* 手动添加 */}
          <form className="recycle-manual-form" onSubmit={handleManualSubmit}>
            <div className="form-head">
              <h2>手动添加旧物</h2>
              <span>衣物 / 家居 / 美妆等</span>
            </div>
            <label>
              物品名称
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="例如：旧毛衣、折叠沙发"
                disabled={manualMutation.isPending}
              />
            </label>
            <label>
              品类
              <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </label>
            <label>
              成色评分：{manualWear} 分
              <input
                type="range"
                min={0}
                max={100}
                value={manualWear}
                onChange={(e) => setManualWear(Number(e.target.value))}
              />
            </label>
            <label>
              预估价格（元，可选）
              <input
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value)}
                placeholder="留空则按成色自动估价"
                type="number"
                min={0}
                step={0.01}
                disabled={manualMutation.isPending}
              />
            </label>
            <button className="button button-dark" type="submit" disabled={manualMutation.isPending}>
              {manualMutation.isPending ? "正在添加…" : "+ 加入回收车"}
            </button>
          </form>
        </div>

        {/* 右列：回收车列表 */}
        <div className="recycle-cart-list-col">
          <div className="recycle-cart-summary">
            <div>
              <span className="muted">回收车中</span>
              <strong>{items.length} 件旧物</strong>
            </div>
            <div>
              <span className="muted">预估总价</span>
              <strong className="cart-price">¥{totalEstimated.toLocaleString()}</strong>
            </div>
          </div>

          {!canRead ? (
            <div className="empty-state">
              <p>登录后可扫码估价或手动添加旧物。</p>
              <button className="button button-dark" onClick={() => setShowLogin(true)}>登录账户 ↗</button>
            </div>
          ) : cartQuery.isLoading ? (
            <div className="loading-state">正在取回回收车…</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <p>回收车还是空的，扫码一本书或手动添加一件旧物吧。</p>
            </div>
          ) : (
            <div className="recycle-cart-list">
              {items.map((item) => (
                <div className="recycle-cart-row" key={item.cartItemId}>
                  <div className="recycle-cart-info">
                    <div className="recycle-cart-title-row">
                      <b>{item.title}</b>
                      <span className="status-pill">{gradeLabel(item.grade)}</span>
                    </div>
                    <p className="muted">
                      {item.category} · 成色 {item.wearScore} · {item.source === "SCAN" ? "扫码" : "手动"}
                    </p>
                    {item.author && <p className="muted">{item.author}{item.publisher ? ` · ${item.publisher}` : ""}{item.publishYear ? ` · ${item.publishYear}` : ""}</p>}
                    <p className="muted">加入于 {item.createdAt}</p>
                  </div>
                  <div className="recycle-cart-side">
                    <strong className="cart-price">¥{item.estimatedPrice.toLocaleString()}</strong>
                    <button
                      className="text-button"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(item.cartItemId)}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <div className="recycle-cart-submit-bar">
              <div>
                <span className="muted">提交后将生成 {items.length} 笔回收单</span>
                <strong>合计 ¥{totalEstimated.toLocaleString()}</strong>
              </div>
              <button className="button button-lime" onClick={handleSubmitCart} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "正在提交…" : "一键提交回收 ↗"}
              </button>
            </div>
          )}

          {submitted && (
            <div className="success-banner">
              <h3>回收车已提交</h3>
              <p>已生成 {submitted.count} 笔回收单，预估总价 ¥{submitted.total.toLocaleString()}，预计获得 {submitted.points} 积分。</p>
            </div>
          )}
          {submitMutation.isError && (
            <p className="error-message">{submitMutation.error instanceof Error ? submitMutation.error.message : "提交失败，请稍后重试。"}</p>
          )}
        </div>
      </div>

      {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
    </section>
  );
}
