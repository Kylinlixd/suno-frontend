import { Image, Navigator, Text, View } from "@tarojs/components";
import type { Listing } from "@suno/shared";

export function MiniProductCard({ listing }: { listing: Listing }) {
  return <Navigator url={`/pages/product/index?id=${listing.id}`} className="mini-product-card"><View className="mini-product-image"><Image src={listing.image} mode="aspectFill" /><Text>{listing.condition}</Text></View><View className="mini-product-meta"><View><Text className="mini-brand">{listing.brand}</Text><Text className="mini-product-name">{listing.name}</Text></View><Text className="mini-price">¥{listing.price.toLocaleString()}</Text></View></Navigator>;
}
