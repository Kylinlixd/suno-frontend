import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getListings, type ListingFilters } from "@suno/shared";
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
const PAGE_SIZE = 12;

export function MarketPage() {
  const [grade, setGrade] = useState("");
  const [sort, setSort] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(0);
  const filters = useMemo<ListingFilters>(() => {
    const [sortBy, sortOrder] = sort.split(":");
    return {
      grade: grade || undefined,
      categoryId: categoryId ?? undefined,
      keyword: keyword || undefined,
      page,
      size: PAGE_SIZE,
      sortBy: (sortBy || undefined) as ListingFilters["sortBy"],
      sortOrder: (sortOrder || undefined) as ListingFilters["sortOrder"]
    };
  }, [grade, sort, categoryId, keyword, page]);
  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: () => getCategories(apiOptions) });
  const categories = categoriesQuery.data ?? [];
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["listings", grade, sort, categoryId, keyword, page],
    queryFn: () => getListings(filters, apiOptions)
  });
  const listings = data?.content ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);
  function search(event: FormEvent) {
    event.preventDefault();
    setPage(0);
    setKeyword(keywordInput.trim());
  }
  function changeCategory(next: number | null) {
    setCategoryId(next);
    setPage(0);
  }
  return <section className="section-wrap page-section market-page"><div className="page-intro"><p className="eyebrow">Suno Market</p><h1>给下一件好东西<br /><em>留一点空间。</em></h1><p>每件商品都被认真检查、记录和定价。你看到的不是库存，是仍然有用的生活。</p></div>
    <form className="market-search" onSubmit={search} role="search"><input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="搜索品牌、型号或序列号…" aria-label="搜索商品" /><button className="button button-dark" type="submit">搜索 ↗</button>{keyword && <button type="button" className="text-button" onClick={() => { setKeyword(""); setKeywordInput(""); setPage(0); }}>清除</button>}</form>
    <div className="filter-row">
      <button className={`filter-button ${categoryId === null ? "active" : ""}`} onClick={() => changeCategory(null)}>全部分类</button>
      {categories.map((category) => <button key={category.categoryId} className={`filter-button ${categoryId === category.categoryId ? "active" : ""}`} onClick={() => changeCategory(category.categoryId)}>{category.name}</button>)}
      <span className="filter-divider" />{GRADE_OPTIONS.map((option) => <button key={option.value} className={`filter-button ${grade === option.value ? "active" : ""}`} onClick={() => { setGrade(option.value); setPage(0); }}>{option.label}</button>)}<span className="filter-divider" />{SORT_OPTIONS.map((option) => <button key={option.value} className={`filter-button filter-sort ${sort === option.value ? "active" : ""}`} onClick={() => setSort(option.value)}>{option.label}</button>)}<span className="filter-count">{isFetching && !isLoading ? "刷新中…" : `${data?.totalElements ?? listings.length} 件在售`}</span></div>
    {isLoading ? <div className="loading-state">正在把好东西整理出来…</div> : isError ? <div className="empty-state"><p>商品暂时无法加载，请检查网络后重试。</p><button className="button button-dark" onClick={() => void refetch()}>重新加载 ↗</button></div> : listings.length === 0 ? <div className="empty-state"><p>这个筛选下暂时没有在售商品，换个关键词或成色看看。</p></div> : <div className="product-grid product-grid-market">{listings.map((listing) => <ProductCard key={listing.id} listing={listing} />)}</div>}
    {totalPages > 1 && <div className="market-pagination"><button className="text-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>← 上一页</button><span>第 {page + 1} / {totalPages} 页</span><button className="text-button" disabled={page >= totalPages - 1} onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}>下一页 →</button></div>}
  </section>;
}
