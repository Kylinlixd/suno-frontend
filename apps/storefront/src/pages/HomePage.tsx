import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getListings } from "@suno/shared";
import { apiOptions } from "../lib/auth";
import { ProductCard } from "../components/ProductCard";

gsap.registerPlugin(ScrollTrigger);

export function HomePage() {
  const { data } = useQuery({ queryKey: ["home-listings"], queryFn: () => getListings(apiOptions) });
  const chapter = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.from(".hero-copy > *", { y: 48, opacity: 0, duration: 1, stagger: 0.08, ease: "power3.out" });
      gsap.utils.toArray<HTMLElement>(".story-image").forEach((image) => gsap.fromTo(image, { scale: 0.8, opacity: 0.2 }, { scale: 1, opacity: 1, scrollTrigger: { trigger: image, start: "top 82%", end: "bottom 18%", scrub: true } }));
      ScrollTrigger.create({ trigger: chapter.current, start: "top 18%", end: "bottom 78%", pin: ".chapter-title", pinSpacing: false });
    }, chapter);
    return () => context.revert();
  }, []);
  const listings = data?.content ?? [];
  return <>
    <section className="hero editorial-split">
      <div className="hero-copy"><p className="eyebrow">Suno Mall / C2B2C 循环交易</p><h1>让好东西继续<br /><em>被认真使用。</em></h1><p className="hero-intro">从回收、估价到再次被选择，Suno 把一件物品的下一段故事交还给你。</p><div className="hero-actions"><Link className="button button-lime" to="/market">去逛好东西 <span>↗</span></Link><Link className="button button-ghost" to="/recycle">估一估我的闲置 <span>↗</span></Link></div></div>
      <div className="hero-visual"><img src="https://picsum.photos/seed/suno-hero/1600/1200" alt="桌面上被重新整理的日常物件" /><div className="hero-visual-note"><span>second life</span><strong>01 / 04</strong></div></div>
    </section>
    <section className="marquee" aria-label="Suno 服务理念"><div className="marquee-track">回收 · 估价 · 质检 · 再次上架 · 认真使用 · 回收 · 估价 · 质检 · 再次上架 · 认真使用 · </div></section>
    <section className="section-wrap bento-section"><div className="section-heading"><div><p className="eyebrow">一件物品的下一段旅程</p><h2>买得更少，<br />用得更久。</h2></div><Link className="text-link" to="/market">查看全部在售 <span>↗</span></Link></div><div className="bento-grid grid-flow-dense"><article className="bento-card bento-dark"><p className="card-kicker">循环履历</p><h3>每一次被使用，都值得留下痕迹。</h3><p>我们记录它的状态、来源与下一站，让二手不再是模糊的折价。</p><span className="card-index">01</span></article><article className="bento-card bento-image"><img src="https://picsum.photos/seed/suno-object/1200/900" alt="被重新使用的相机和书" /><div><span>物品故事</span><strong>被好好使用过的东西，更有味道。</strong></div></article><article className="bento-card bento-lime"><p className="card-kicker">不止是卖掉</p><h3>把闲置变成下一次选择。</h3><Link className="arrow-link" to="/recycle">开始回收 <span>↗</span></Link></article><article className="bento-card bento-outline"><strong>100%</strong><p>每件商品都经过人工质检，状态透明，价格有依据。</p></article><article className="bento-card bento-tall"><img src="https://picsum.photos/seed/suno-detail/900/1200" alt="极简家居细节" /><div><span>编辑精选</span><strong>旧物不是旧，<br />只是还没遇到你。</strong></div></article></div></section>
    <section className="section-wrap chapter" ref={chapter}><div className="chapter-title"><p className="eyebrow">从一件到下一件</p><h2>我们相信<br /><em>流转本身就是价值。</em></h2></div><div className="chapter-gallery"><div className="story-block"><img className="story-image" src="https://picsum.photos/seed/suno-story-1/1200/1000" alt="被整理好的物品" /><p>先被认真看见，才会被认真定价。</p></div><div className="story-block story-offset"><img className="story-image" src="https://picsum.photos/seed/suno-story-2/1200/1000" alt="正在打包的商品" /><p>每一次寄出，都是一次重新开始。</p></div><div className="story-block"><img className="story-image" src="https://picsum.photos/seed/suno-story-3/1200/1000" alt="生活中的二手物品" /><p>然后，它进入另一个人的日常。</p></div></div></section>
    <section className="section-wrap product-section"><div className="section-heading"><div><p className="eyebrow">刚刚被重新上架</p><h2>值得带回家的<br />一小部分。</h2></div><Link className="text-link" to="/market">打开市场 <span>↗</span></Link></div><div className="product-grid">{listings.slice(0, 4).map((listing, index) => <ProductCard key={listing.id} listing={listing} featured={index === 0} />)}</div></section>
  </>;
}
