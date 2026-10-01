import { Image, Navigator, Text, View } from "@tarojs/components";
import type { Listing } from "@suno/shared";

export function MiniProductCard({ listing }: { listing: Listing }) {
  return <Navigator url={`/pages/product/index?id=${listing.id}`} className="mini-product-card"><View className="mini-product-image"><Image src={listing.image} mode="aspectFill" lazyLoad /><Text>{listing.condition}</Text></View><View className="mini-product-meta"><View><Text className="mini-brand">{listing.brand}</Text><Text className="mini-product-name">{listing.name}</Text></View><View className="mini-price-group"><Text className="mini-price">¥{listing.price.toLocaleString()}</Text>{listing.originalPrice && <Text className="mini-price-old">¥{listing.originalPrice.toLocaleString()}</Text>}</View></View></Navigator>;
}
