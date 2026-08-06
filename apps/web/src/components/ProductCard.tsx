import { Link } from "react-router-dom";
import type { Listing } from "@suno/shared";

export function ProductCard({ listing, featured = false }: { listing: Listing; featured?: boolean }) {
  return <Link to={`/market/${listing.id}`} className={`product-card group ${featured ? "product-card-featured" : ""}`}>
    <div className="product-image-wrap"><img src={listing.image} alt={listing.name} className="product-image" /><span className="product-condition">{listing.condition}</span></div>
    <div className="product-meta"><div><p className="product-brand">{listing.brand}</p><h3>{listing.name}</h3></div><div className="product-price"><strong>¥{listing.price.toLocaleString()}</strong><del>¥{listing.originalPrice.toLocaleString()}</del></div></div>
  </Link>;
}
