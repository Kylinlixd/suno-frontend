import { useCallback, useEffect, useState } from "react";
import { Button, Image, Navigator, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { addFavorite, createResaleOrder, getListing, getReviews, isFavoriteListing, removeFavorite, type Listing, type ReviewSummary } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

export default function Product() {
  const router = useRouter();
  const [listing, setListing] = useState<Listing>();
  const [reviews, setReviews] = useState<ReviewSummary>();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(() => {
    setLoadState("loading");
    getListing(router.params.id ?? "l-001", apiOptions).then((data) => { setListing(data); setLoadState("ready"); }).catch(() => setLoadState("error"));
  }, [router.params.id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getReviews(router.params.id ?? "l-001", apiOptions).then(setReviews).catch(() => undefined); }, [router.params.id]);
  // 后端列表接口不携带 favorite 字段，收藏态经收藏列表回填
  useEffect(() => {
    if (!listing) return;
    isFavoriteListing(listing.id, sessionClient.read()?.userId, sessionApiOptions()).then(setIsFavorite).catch(() => undefined);
  }, [listing]);
  if (loadState === "loading") return <View className="mini-page mini-loading">正在加载商品…</View>;
  if (loadState === "error" || !listing) return <View className="mini-page mini-loading"><Text>商品暂时无法加载，请稍后重试。</Text><Button className="mini-button mini-button-dark" onClick={load}>重新加载</Button><Navigator url="/pages/market/index" className="mini-back">← 返回市场</Navigator></View>;
  const currentListing = listing;
  async function toggleFavorite() { const session = sessionClient.read(); if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先登录", icon: "none" }); return; } try { const options = sessionApiOptions(); if (isFavorite) await removeFavorite(currentListing.id, session?.userId, options); else await addFavorite(currentListing.id, session?.userId, options); setIsFavorite((value) => !value); } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" }); } }
  async function order() { const session = sessionClient.read(); if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先登录", icon: "none" }); return; } try { await createResaleOrder(currentListing.id, session?.userId, sessionApiOptions()); Taro.showToast({ title: "订单已创建", icon: "success" }); } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "下单失败", icon: "none" }); } }
  return <View className="mini-page mini-product-detail"><Navigator url="/pages/market/index" className="mini-back">← 返回市场</Navigator><Image className="mini-detail-image" src={listing.image} mode="aspectFill" /><Text className="mini-eyebrow">{listing.brand} / {listing.category}</Text><Text className="mini-detail-title">{listing.name}</Text><Text className="mini-detail-story">{listing.story}</Text><View className="mini-detail-price"><Text>¥{listing.price.toLocaleString()}</Text>{listing.originalPrice && <Text className="mini-old-price">¥{listing.originalPrice.toLocaleString()}</Text>}</View><View className="mini-detail-actions"><Button className="mini-button mini-button-dark" onClick={order}>立即下单 ↗</Button><Button className={`mini-save-button ${isFavorite ? "saved" : ""}`} onClick={toggleFavorite}>{isFavorite ? "已收藏" : "收藏"}</Button></View>{reviews && reviews.items.length > 0 && <View className="mini-reviews"><Text className="mini-reviews-title">{reviews.reviewCount} 条评价 · 平均 {reviews.avgRating.toFixed(1)} 分</Text>{reviews.items.map((review) => <View className="mini-review" key={review.orderNo}><Text className="mini-review-stars">{"★".repeat(Math.round(review.rating))}</Text><Text className="mini-review-content">{review.content}</Text>{review.merchantReply ? <Text className="mini-review-reply">商家回复 · {review.merchantReply}</Text> : null}<Text className="mini-review-meta">{review.createdAt} · {review.usefulCount} 人觉得有用</Text></View>)}</View>}</View>;
}
