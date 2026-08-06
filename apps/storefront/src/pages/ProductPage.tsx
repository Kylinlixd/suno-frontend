import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { addFavorite, createResaleOrder, getListing, removeFavorite } from "@suno/shared";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";
import { useState } from "react";

export function ProductPage() {
  const { id = "l-001" } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const { data: listing } = useQuery({ queryKey: ["listing", id], queryFn: () => getListing(id, apiOptions) });
  const [isFavorite, setIsFavorite] = useState(listing?.favorite ?? false);
  const orderMutation = useMutation({ mutationFn: () => createResaleOrder(id, session?.userId ?? 1, sessionApiOptions()), onSuccess: () => { setActionMessage("订单已创建，正在打开订单页。"); navigate("/orders"); } });
  const favoriteMutation = useMutation({ mutationFn: () => isFavorite ? removeFavorite(id, session?.userId ?? 1, sessionApiOptions()) : addFavorite(id, session?.userId ?? 1, sessionApiOptions()), onSuccess: () => setIsFavorite((value) => !value) });
  function requireSession(action: () => void) { if (!apiOptions.demo && !session) { setShowLogin(true); return; } action(); }
  if (!listing) return <div className="loading-state page-section">正在加载商品…</div>;
  return <section className="section-wrap page-section product-detail"><Link to="/market" className="back-link">← 返回市场</Link><div className="detail-layout"><div className="detail-image"><img src={listing.image} alt={listing.name} /></div><div className="detail-copy"><p className="eyebrow">{listing.brand} / {listing.category}</p><h1>{listing.name}</h1><p className="detail-story">{listing.story}</p><div className="detail-price"><strong>¥{listing.price.toLocaleString()}</strong><del>¥{listing.originalPrice.toLocaleString()}</del><span>{listing.condition}</span></div><div className="detail-actions"><button className="button button-dark" onClick={() => requireSession(() => orderMutation.mutate())} disabled={orderMutation.isPending}>{orderMutation.isPending ? "正在创建…" : "立即下单"} <span>↗</span></button><button className={`save-button ${isFavorite ? "saved" : ""}`} aria-label={isFavorite ? "取消收藏" : "收藏商品"} aria-pressed={isFavorite} onClick={() => requireSession(() => favoriteMutation.mutate())} disabled={favoriteMutation.isPending}>{isFavorite ? "♥" : "♡"}</button></div>{(actionMessage || orderMutation.isError || favoriteMutation.isError) && <p className="action-message">{actionMessage || (orderMutation.error instanceof Error ? orderMutation.error.message : favoriteMutation.error instanceof Error ? favoriteMutation.error.message : "操作失败，请稍后重试。")}</p>}<div className="detail-notes"><div><span>状态</span><strong>{listing.condition}</strong></div><div><span>库存</span><strong>{listing.stock} 件</strong></div><div><span>承诺</span><strong>7 天无理由</strong></div></div></div></div>{showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}</section>;
}
