import { useCallback, useEffect, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import { getListings, type Listing, type ListingFilters } from "@suno/shared";
import { MiniProductCard } from "../../components/MiniProductCard";
import { apiOptions } from "../../lib/auth";

const GRADE_OPTIONS = [
  { value: "", label: "全部成色" },
  { value: "GOOD", label: "良好" },
  { value: "MEDIUM", label: "中等" },
  { value: "UNQUALIFIED", label: "明显使用" }
];
const SORT_OPTIONS = [
  { value: "", label: "默认" },
  { value: "price:asc", label: "价格↑" },
  { value: "price:desc", label: "价格↓" }
];

export default function Market() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(() => {
    const filters: ListingFilters = { grade: grade || undefined, sortBy: (sort.split(":")[0] || undefined) as ListingFilters["sortBy"], sortOrder: (sort.split(":")[1] || undefined) as ListingFilters["sortOrder"] };
    setLoadState("loading");
    getListings(filters, apiOptions).then((page) => { setListings(page.content); setLoadState("ready"); }).catch(() => setLoadState("error"));
  }, [grade, sort]);
  useEffect(() => { load(); }, [load]);
  return <View className="mini-page"><View className="mini-page-head"><Text className="mini-eyebrow">Suno Market</Text><Text className="mini-page-title">给下一件好东西{`\n`}留一点空间。</Text></View><View className="mini-filters">{GRADE_OPTIONS.map((item) => <Text key={item.value} className={`mini-filter ${grade === item.value ? "active" : ""}`} onClick={() => setGrade(item.value)}>{item.label}</Text>)}</View><View className="mini-filters mini-filters-sort">{SORT_OPTIONS.map((item) => <Text key={item.value} className={`mini-filter mini-filter-sort ${sort === item.value ? "active" : ""}`} onClick={() => setSort(item.value)}>{item.label}</Text>)}</View>{loadState === "loading" && <Text className="mini-page-copy">正在把好东西整理出来…</Text>}{loadState === "error" && <View><Text className="mini-page-copy">商品暂时无法加载，请稍后重试。</Text><Button className="mini-button mini-button-dark" onClick={load}>重新加载</Button></View>}{loadState === "ready" && <View className="mini-product-grid">{listings.map((listing) => <MiniProductCard key={listing.id} listing={listing} />)}</View>}{loadState === "ready" && listings.length === 0 && <Text className="mini-page-copy">这个筛选下暂时没有在售商品。</Text>}</View>;
}
