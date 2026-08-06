import { useEffect, useState } from "react";
import { Image, Navigator, Text, View } from "@tarojs/components";
import { getListings, type Listing } from "@suno/shared";
import { apiOptions } from "../../lib/auth";
import { MiniProductCard } from "../../components/MiniProductCard";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  useEffect(() => { getListings(apiOptions).then((page) => setListings(page.content)); }, []);
  return <View className="mini-page mini-home"><View className="mini-nav"><Text className="mini-logo"><Text>S</Text> SUNO</Text><Text className="mini-nav-note">循环交易</Text></View><View className="mini-hero"><Text className="mini-eyebrow">Suno Mall</Text><Text className="mini-hero-title">让好东西继续{`\n`}被认真使用。</Text><Text className="mini-hero-copy">从回收、估价到再次被选择，把一件物品的下一段故事交还给你。</Text><Navigator url="/pages/market/index" className="mini-button mini-button-lime">去逛好东西 <Text>↗</Text></Navigator><Image className="mini-hero-image" src="https://picsum.photos/seed/suno-mini-hero/1200/1000" mode="aspectFill" /></View><View className="mini-section"><View className="mini-section-head"><View><Text className="mini-eyebrow">刚刚被重新上架</Text><Text className="mini-section-title">值得带回家的{`\n`}一小部分。</Text></View><Navigator url="/pages/market/index" className="mini-link">全部 ↗</Navigator></View><View className="mini-product-grid">{listings.slice(0, 4).map((listing) => <MiniProductCard key={listing.id} listing={listing} />)}</View></View><Navigator url="/pages/recycle/index" className="mini-recycle-banner"><Text>让闲置重新有用。</Text><Text>去估价 ↗</Text></Navigator></View>;
}
