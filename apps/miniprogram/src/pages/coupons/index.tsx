import { useCallback, useState } from "react";
import { Button, Navigator, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { claimCoupon, getClaimableCoupons, getMyCoupons, type CouponSummary } from "@suno/shared";
import { sessionApiOptions } from "../../lib/auth";

/** P2 小程序优惠券：可领取 + 我的券 */
export default function Coupons() {
  const [claimable, setClaimable] = useState<CouponSummary[]>([]);
  const [mine, setMine] = useState<CouponSummary[]>([]);
  const [tab, setTab] = useState<"claim" | "mine">("claim");
  const load = useCallback(() => {
    getClaimableCoupons(sessionApiOptions()).then(setClaimable).catch(() => undefined);
    getMyCoupons(undefined, sessionApiOptions()).then((page) => setMine(page.content)).catch(() => undefined);
  }, []);
  Taro.useDidShow?.(() => load());
  async function claim(couponId: number) {
    try { await claimCoupon(couponId, sessionApiOptions()); Taro.showToast({ title: "领取成功", icon: "success" }); load(); }
    catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "领取失败", icon: "none" }); }
  }
  return <View className="mini-page">
    <Navigator url="/pages/account/index" className="mini-back">← 返回我的</Navigator>
    <Text className="mini-page-title">优惠券</Text>
    <View className="mini-type-row">
      <Button size="mini" className={`mini-button ${tab === "claim" ? "mini-button-dark" : ""}`} onClick={() => setTab("claim")}>可领取</Button>
      <Button size="mini" className={`mini-button ${tab === "mine" ? "mini-button-dark" : ""}`} onClick={() => setTab("mine")}>我的券</Button>
    </View>
    {tab === "claim" ? <>
      {claimable.map((coupon) => <View className="mini-option" key={coupon.couponId}>
        <Text className="mini-option-title">-¥{coupon.discountValue} {coupon.name}</Text>
        <Text className="mini-muted">满 {coupon.minOrderAmount ?? 0} 可用 · 限领 {coupon.perUserLimit ?? 1} 张 · 剩 {coupon.remainingCount ?? 0} 张</Text>
        <View className="mini-cart-actions"><Button size="mini" className="mini-button mini-button-dark" onClick={() => void claim(coupon.couponId)}>领取</Button></View>
      </View>)}
      {claimable.length === 0 && <Text className="mini-muted">暂无可领取的券。</Text>}
    </> : <>
      {mine.map((coupon) => <View className={`mini-option ${coupon.status === "USED" ? "closed" : ""}`} key={coupon.couponUserId}>
        <Text className="mini-option-title">-¥{coupon.discountValue} {coupon.name}</Text>
        <Text className="mini-muted">{coupon.status === "USED" ? "已使用" : `满 ${coupon.minOrderAmount ?? 0} 可用 · 至 ${String(coupon.expireAt ?? "").slice(0, 10)}`}</Text>
      </View>)}
      {mine.length === 0 && <Text className="mini-muted">还没有优惠券。</Text>}
    </>}
  </View>;
}
