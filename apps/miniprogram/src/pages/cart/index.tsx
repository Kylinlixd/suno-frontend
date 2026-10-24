import { useCallback, useState } from "react";
import { Button, Image, Navigator, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { addToCart, createResaleOrder, getCart, removeFromCart, type CartEntry } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

/** M2/P1 小程序购物车：逐件结算（二手单件模型） */
export default function Cart() {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const requireSession = () => {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) {
      Taro.showToast({ title: "请先在「我的」登录", icon: "none" });
      return null;
    }
    return session;
  };
  const load = useCallback(() => {
    setLoadState("loading");
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { setLoadState("empty"); return; }
    getCart(sessionApiOptions()).then((page) => {
      setEntries(page.content);
      setLoadState(page.content.length === 0 ? "empty" : "ready");
    }).catch(() => setLoadState("error"));
  }, []);
  // Taro 页面每次显示刷新（onShow 语义由 useDidShow 提供）
  Taro.useDidShow?.(() => load());
  async function remove(cartItemId: number) {
    try {
      await removeFromCart(cartItemId, sessionApiOptions());
      load();
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "移除失败", icon: "none" });
    }
  }
  async function checkout(entry: CartEntry) {
    if (!requireSession()) return;
    if (!entry.orderable) { Taro.showToast({ title: "已下架或售罄", icon: "none" }); return; }
    try {
      await createResaleOrder(String(entry.listingId), sessionClient.read()?.userId, sessionApiOptions());
      Taro.showToast({ title: "订单已创建", icon: "success" });
      setTimeout(() => Taro.navigateTo({ url: "/pages/orders/index" }), 600);
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "下单失败", icon: "none" });
    }
  }
  return <View className="mini-page">
    <Navigator url="/pages/market/index" className="mini-back">← 返回市场</Navigator>
    <Text className="mini-page-title">购物车</Text>
    {loadState === "loading" && <Text className="mini-muted">正在加载…</Text>}
    {loadState === "error" && <Text className="mini-muted">加载失败，请稍后重试。</Text>}
    {loadState === "empty" && <View><Text className="mini-muted">购物车还是空的。</Text><Button className="mini-button mini-button-dark" onClick={() => Taro.navigateTo({ url: "/pages/market/index" })}>去逛逛</Button></View>}
    {entries.map((entry) => <View className="mini-cart-row" key={entry.cartItemId}>
      <Image className="mini-cart-image" src={entry.image} mode="aspectFill" />
      <View className="mini-cart-info">
        <Text className="mini-cart-title">{entry.brand} {entry.model}</Text>
        <Text className="mini-cart-meta">¥{entry.salePrice.toLocaleString()} · {entry.orderable ? "可结算" : "已下架/售罄"}</Text>
        <View className="mini-cart-actions">
          <Button size="mini" className="mini-button mini-button-dark" disabled={!entry.orderable} onClick={() => void checkout(entry)}>去结算</Button>
          <Button size="mini" className="mini-button" onClick={() => void remove(entry.cartItemId)}>移除</Button>
        </View>
      </View>
    </View>)}
  </View>;
}
