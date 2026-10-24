import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCart, removeFromCart, type CartEntry } from "@suno/shared";
import { CheckoutDialog } from "../components/CheckoutDialog";
import { LoginPanel } from "../components/LoginPanel";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";

/** M2 购物车：二手单件模型，逐件结算。 */
export function CartPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [checkout, setCheckout] = useState<CartEntry | null>(null);
  const [error, setError] = useState("");
  const canRead = Boolean(apiOptions.demo || session);
  const cartQuery = useQuery({ queryKey: ["cart", session?.userId], queryFn: () => getCart(sessionApiOptions()), enabled: canRead });
  const removeMutation = useMutation({
    mutationFn: (cartItemId: number) => removeFromCart(cartItemId, sessionApiOptions()),
    onSuccess: () => { setError(""); void queryClient.invalidateQueries({ queryKey: ["cart"] }); },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "移除失败，请稍后重试。")
  });
  const entries = cartQuery.data?.content ?? [];

  return <section className="section-wrap page-section cart-page">
    <div className="page-intro"><p className="eyebrow">Suno Cart</p><h1>留给自己的<em>一点余地。</em></h1><p>购物车不锁定库存，结算时以商品实时状态为准。</p></div>
    {!canRead ? <div className="empty-state"><p>登录后可把心仪的好东西先放进来。</p><button className="button button-dark" onClick={() => setShowLogin(true)}>登录账户 ↗</button></div>
      : cartQuery.isLoading ? <div className="loading-state">正在取回购物车…</div>
        : entries.length === 0 ? <div className="empty-state"><p>购物车还是空的，去逛逛吧。</p><a className="button button-dark" href="/market">去逛逛 ↗</a></div>
        : <div className="cart-list">
          {entries.map((entry) => <div className="cart-row" key={entry.cartItemId}>
            <img src={entry.image} alt="" />
            <div className="cart-info">
              <b>{entry.brand} {entry.model}</b>
              <span>成色 {entry.grade ?? "-"} · 库存 {entry.stock}</span>
              <i>加入于 {entry.addedAt}</i>
            </div>
            <strong className="cart-price">¥{entry.salePrice.toLocaleString()}</strong>
            <div className="cart-actions">
              <button className="button button-dark small" disabled={!entry.orderable} onClick={() => setCheckout(entry)}>{entry.orderable ? "去结算 ↗" : "已下架/售罄"}</button>
              <button className="text-button" disabled={removeMutation.isPending} onClick={() => removeMutation.mutate(entry.cartItemId)}>移除</button>
            </div>
          </div>)}
        </div>}
    {error && <p className="error-message">{error}</p>}
    {checkout && <CheckoutDialog listingId={String(checkout.listingId)} listingName={`${checkout.brand} ${checkout.model}`} price={checkout.salePrice} onClose={() => setCheckout(null)} />}
    {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
  </section>;
}
