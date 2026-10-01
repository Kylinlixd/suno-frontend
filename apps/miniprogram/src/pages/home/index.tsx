import { useCallback, useEffect, useState } from "react";
import { Button, Image, Navigator, Text, View } from "@tarojs/components";
import { getListings, placeholderImage, type Listing } from "@suno/shared";
import { apiOptions } from "../../lib/auth";
import { MiniProductCard } from "../../components/MiniProductCard";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(() => {
    setLoadState("loading");
    getListings({}, apiOptions).then((page) => { setListings(page.content); setLoadState("ready"); }).catch(() => setLoadState("error"));
  }, []);
  useEffect(() => { load(); }, [load]);
  return <View className="mini-page mini-home"><View className="mini-nav"><Text className="mini-logo"><Text>S</Text> SUNO</Text><Text className="mini-nav-note">循环交易</Text></View><View className="mini-hero"><Text className="mini-eyebrow">Suno Mall</Text><Text className="mini-hero-title">让好东西继续{`\n`}被认真使用。</Text><Text className="mini-hero-copy">从回收、估价到再次被选择，把一件物品的下一段故事交还给你。</Text><Navigator url="/pages/market/index" className="mini-button mini-button-lime">去逛好东西 <Text>↗</Text></Navigator><Image className="mini-hero-image" src={placeholderImage("suno-mini-hero", "landscape")} mode="aspectFill" /></View><View className="mini-section"><View className="mini-section-head"><View><Text className="mini-eyebrow">刚刚被重新上架</Text><Text className="mini-section-title">值得带回家的{`\n`}一小部分。</Text></View><Navigator url="/pages/market/index" className="mini-link">全部 ↗</Navigator></View>{loadState === "loading" && <Text className="mini-page-copy">正在把好东西整理出来…</Text>}{loadState === "error" && <View><Text className="mini-page-copy">商品暂时无法加载，请稍后重试。</Text><Button className="mini-button mini-button-dark" onClick={load}>重新加载</Button></View>}{loadState === "ready" && <View className="mini-product-grid">{listings.slice(0, 4).map((listing) => <MiniProductCard key={listing.id} listing={listing} />)}</View>}</View><Navigator url="/pages/recycle/index" className="mini-recycle-banner"><Text>让闲置重新有用。</Text><Text>去估价 ↗</Text></Navigator></View>;
}
