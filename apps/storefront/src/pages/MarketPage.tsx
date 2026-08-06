import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getListings } from "@suno/shared";
import { ProductCard } from "../components/ProductCard";
import { apiOptions } from "../lib/auth";

export function MarketPage() {
  const [category, setCategory] = useState("全部");
  const { data, isLoading } = useQuery({ queryKey: ["listings"], queryFn: () => getListings(apiOptions) });
  const categories = ["全部", "数码", "鞋履", "服装", "家居", "影像"];
  const listings = useMemo(() => (data?.content ?? []).filter((item) => category === "全部" || item.category === category), [category, data]);
  return <section className="section-wrap page-section market-page"><div className="page-intro"><p className="eyebrow">Suno Market</p><h1>给下一件好东西<br /><em>留一点空间。</em></h1><p>每件商品都被认真检查、记录和定价。你看到的不是库存，是仍然有用的生活。</p></div><div className="filter-row">{categories.map((item) => <button key={item} className={`filter-button ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}<span className="filter-count">{listings.length} 件在售</span></div>{isLoading ? <div className="loading-state">正在把好东西整理出来…</div> : <div className="product-grid product-grid-market">{listings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div>}</section>;
}
