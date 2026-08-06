import { useEffect, useState } from "react";
import { Text, View } from "@tarojs/components";
import { getListings, type Listing } from "@suno/shared";
import { MiniProductCard } from "../../components/MiniProductCard";
import { apiOptions } from "../../lib/auth";

export default function Market() {
  const [listings, setListings] = useState<Listing[]>([]); const [category, setCategory] = useState("全部");
  useEffect(() => { getListings(apiOptions).then((page) => setListings(page.content)); }, []);
  return <View className="mini-page"><View className="mini-page-head"><Text className="mini-eyebrow">Suno Market</Text><Text className="mini-page-title">给下一件好东西{`\n`}留一点空间。</Text></View><View className="mini-filters">{["全部", "数码", "鞋履", "服装", "家居"].map((item) => <Text key={item} className={`mini-filter ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</Text>)}</View><View className="mini-product-grid">{listings.filter((item) => category === "全部" || item.category === category).map((listing) => <MiniProductCard key={listing.id} listing={listing} />)}</View></View>;
}
