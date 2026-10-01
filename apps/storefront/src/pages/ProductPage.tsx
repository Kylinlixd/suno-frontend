import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { addFavorite, createResaleOrder, getListing, getReviews, isFavoriteListing, removeFavorite, reportReview, voteReviewUseful } from "@suno/shared";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";
import { useEffect, useState } from "react";

export function ProductPage() {
  const { id = "l-001" } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [reportTarget, setReportTarget] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportTip, setReportTip] = useState("");
  const listingQuery = useQuery({ queryKey: ["listing", id], queryFn: () => getListing(id, apiOptions) });
  const { data: listing, isLoading: listingLoading, isError: listingError } = listingQuery;
  const reviewsQuery = useQuery({ queryKey: ["reviews", id], queryFn: () => getReviews(id, apiOptions), enabled: Boolean(listing) });
  const [isFavorite, setIsFavorite] = useState(false);
  // 后端列表接口不携带 favorite 字段，收藏态经收藏列表回填
  useEffect(() => {
    if (!listing) return;
    let cancelled = false;
    isFavoriteListing(listing.id, session?.userId, sessionApiOptions()).then((value) => { if (!cancelled) setIsFavorite(value); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [listing, session?.userId]);
  const orderMutation = useMutation({ mutationFn: () => createResaleOrder(id, session?.userId, sessionApiOptions()), onSuccess: () => { setActionMessage("订单已创建，正在打开订单页。"); navigate("/orders"); } });
  const favoriteMutation = useMutation({ mutationFn: () => isFavorite ? removeFavorite(id, session?.userId, sessionApiOptions()) : addFavorite(id, session?.userId, sessionApiOptions()), onSuccess: () => setIsFavorite((value) => !value) });
  const usefulMutation = useMutation({ mutationFn: (orderNo: string) => voteReviewUseful({ orderNo, voterUserId: session?.userId }, sessionApiOptions()), onSuccess: () => void reviewsQuery.refetch(), onError: (error) => setReportTip(error instanceof Error ? error.message : "操作失败，请稍后重试。") });
  const reportMutation = useMutation({ mutationFn: () => reportReview({ orderNo: reportTarget ?? "", reporterUserId: session?.userId, reason: reportReason }, sessionApiOptions()), onSuccess: () => { setReportTip("举报已提交，我们会尽快核实。"); setReportTarget(null); setReportReason(""); }, onError: (error) => setReportTip(error instanceof Error ? error.message : "举报提交失败，请稍后重试。") });
  function requireSession(action: () => void) { if (!apiOptions.demo && !session) { setShowLogin(true); return; } action(); }
  if (listingLoading) return <div className="loading-state page-section">正在加载商品…</div>;
  if (listingError || !listing) return <div className="empty-state page-section"><p>{listingError ? "商品暂时无法加载，请稍后重试。" : "商品不存在或已下架。"}</p><Link className="button button-dark" to="/market">返回市场 ↗</Link></div>;
  const reviews = reviewsQuery.data;
  return <section className="section-wrap page-section product-detail"><Link to="/market" className="back-link">← 返回市场</Link><div className="detail-layout"><div className="detail-image"><img src={listing.image} alt={listing.name} /></div><div className="detail-copy"><p className="eyebrow">{listing.brand} / {listing.category}</p><h1>{listing.name}</h1><p className="detail-story">{listing.story}</p><div className="detail-price"><strong>¥{listing.price.toLocaleString()}</strong>{listing.originalPrice && <del>¥{listing.originalPrice.toLocaleString()}</del>}<span>{listing.condition}</span></div><div className="detail-actions"><button className="button button-dark" onClick={() => requireSession(() => orderMutation.mutate())} disabled={orderMutation.isPending}>{orderMutation.isPending ? "正在创建…" : "立即下单"} <span>↗</span></button><button className={`save-button ${isFavorite ? "saved" : ""}`} aria-label={isFavorite ? "取消收藏" : "收藏商品"} aria-pressed={isFavorite} onClick={() => requireSession(() => favoriteMutation.mutate())} disabled={favoriteMutation.isPending}>{isFavorite ? "♥" : "♡"}</button></div>{(actionMessage || orderMutation.isError || favoriteMutation.isError) && <p className="action-message">{actionMessage || (orderMutation.error instanceof Error ? orderMutation.error.message : favoriteMutation.error instanceof Error ? favoriteMutation.error.message : "操作失败，请稍后重试。")}</p>}<div className="detail-notes"><div><span>状态</span><strong>{listing.condition}</strong></div><div><span>库存</span><strong>{listing.stock} 件</strong></div><div><span>承诺</span><strong>7 天无理由</strong></div></div></div></div>{reviews && reviews.items.length > 0 && <div className="detail-reviews"><div className="reviews-head"><p className="eyebrow">Reviews</p><h2>{reviews.reviewCount} 条评价<em> · 平均 {reviews.avgRating.toFixed(1)} 分</em></h2></div><div className="review-list">{reviews.items.map((review) => <div className="review-row" key={review.orderNo}><div className="review-stars" aria-label={`${review.rating} 分`}>{"★".repeat(Math.round(review.rating))}<span>{"☆".repeat(Math.max(0, 5 - Math.round(review.rating)))}</span></div><p className="review-content">{review.content}</p>{review.appendContent ? <p className="review-append">追评 · {review.appendContent}</p> : null}{review.merchantReply ? <p className="review-reply">商家回复 · {review.merchantReply}</p> : null}<div className="review-meta-row"><span className="review-meta">{review.createdAt} · {review.usefulCount} 人觉得有用</span><span className="review-actions"><button className="text-button" onClick={() => requireSession(() => usefulMutation.mutate(review.orderNo))} disabled={usefulMutation.isPending}>有用 +1</button><button className="text-button" onClick={() => { setReportTip(""); setReportTarget(reportTarget === review.orderNo ? null : review.orderNo); }}>举报</button></span></div>{reportTarget === review.orderNo && <div className="report-form"><input value={reportReason} onChange={(event) => setReportReason(event.target.value)} placeholder="请描述举报原因（如：虚假评价、违规内容）" /><button className="button button-light small" disabled={reportMutation.isPending || !reportReason.trim()} onClick={() => reportMutation.mutate()}>{reportMutation.isPending ? "提交中…" : "提交举报"}</button></div>}</div>)}</div>{reportTip && <p className={reportTip.includes("失败") ? "error-message" : "success-message"}>{reportTip}</p>}</div>}{showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}</section>;
}
