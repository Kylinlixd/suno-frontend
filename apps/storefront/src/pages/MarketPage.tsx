import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getListings, type ListingFilters } from "@suno/shared";
import { ProductCard } from "../components/ProductCard";
import { apiOptions } from "../lib/auth";

const GRADE_OPTIONS = [
  { value: "", label: "全部成色" },
  { value: "GOOD", label: "成色良好" },
  { value: "MEDIUM", label: "成色中等" },
  { value: "UNQUALIFIED", label: "明显使用痕迹" }
];
const SORT_OPTIONS = [
  { value: "", label: "默认排序" },
  { value: "createdAt:desc", label: "最新上架" },
  { value: "price:asc", label: "价格从低到高" },
  { value: "price:desc", label: "价格从高到低" }
];

export function MarketPage() {
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState("");
  const filters = useMemo<ListingFilters>(() => {
    const [sortBy, sortOrder] = sort.split(":");
    return { grade: grade || undefined, sortBy: (sortBy || undefined) as ListingFilters["sortBy"], sortOrder: (sortOrder || undefined) as ListingFilters["sortOrder"] };
  }, [grade, sort]);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({ queryKey: ["listings", grade, sort], queryFn: () => getListings(filters, apiOptions) });
  const listings = data?.content ?? [];
  return <section className="section-wrap page-section market-page"><div className="page-intro"><p className="eyebrow">Suno Market</p><h1>给下一件好东西<br /><em>留一点空间。</em></h1><p>每件商品都被认真检查、记录和定价。你看到的不是库存，是仍然有用的生活。</p></div><div className="filter-row">{GRADE_OPTIONS.map((option) => <button key={option.value} className={`filter-button ${grade === option.value ? "active" : ""}`} onClick={() => setGrade(option.value)}>{option.label}</button>)}<span className="filter-divider" />{SORT_OPTIONS.map((option) => <button key={option.value} className={`filter-button filter-sort ${sort === option.value ? "active" : ""}`} onClick={() => setSort(option.value)}>{option.label}</button>)}<span className="filter-count">{isFetching && !isLoading ? "刷新中…" : `${listings.length} 件在售`}</span></div>{isLoading ? <div className="loading-state">正在把好东西整理出来…</div> : isError ? <div className="empty-state"><p>商品暂时无法加载，请检查网络后重试。</p><button className="button button-dark" onClick={() => void refetch()}>重新加载 ↗</button></div> : listings.length === 0 ? <div className="empty-state"><p>这个筛选下暂时没有在售商品，换个成色看看。</p></div> : <div className="product-grid product-grid-market">{listings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div>}</section>;
}
