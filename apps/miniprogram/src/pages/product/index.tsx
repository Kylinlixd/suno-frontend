import { useEffect, useState } from "react";
import { Button, Image, Navigator, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { addFavorite, createResaleOrder, getListing, removeFavorite, type Listing } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

export default function Product() {
  const router = useRouter(); const [listing, setListing] = useState<Listing>(); const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => { getListing(router.params.id ?? "l-001", apiOptions).then(setListing); }, [router.params.id]);
  if (!listing) return <View className="mini-page mini-loading">正在加载商品…</View>;
  const currentListing = listing;
  async function toggleFavorite() { const session = sessionClient.read(); if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先登录", icon: "none" }); return; } try { const options = sessionApiOptions(); if (isFavorite) await removeFavorite(currentListing.id, session?.userId ?? 1, options); else await addFavorite(currentListing.id, session?.userId ?? 1, options); setIsFavorite((value) => !value); } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" }); } }
  async function order() { const session = sessionClient.read(); if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先登录", icon: "none" }); return; } try { await createResaleOrder(currentListing.id, session?.userId ?? 1, sessionApiOptions()); Taro.showToast({ title: "订单已创建", icon: "success" }); } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "下单失败", icon: "none" }); } }
  return <View className="mini-page mini-product-detail"><Navigator url="/pages/market/index" className="mini-back">← 返回市场</Navigator><Image className="mini-detail-image" src={listing.image} mode="aspectFill" /><Text className="mini-eyebrow">{listing.brand} / {listing.category}</Text><Text className="mini-detail-title">{listing.name}</Text><Text className="mini-detail-story">{listing.story}</Text><View className="mini-detail-price"><Text>¥{listing.price.toLocaleString()}</Text><Text className="mini-old-price">¥{listing.originalPrice.toLocaleString()}</Text></View><View className="mini-detail-actions"><Button className="mini-button mini-button-dark" onClick={order}>立即下单 ↗</Button><Button className={`mini-save-button ${isFavorite ? "saved" : ""}`} onClick={toggleFavorite}>{isFavorite ? "已收藏" : "收藏"}</Button></View></View>;
}
