import { useCallback, useMemo, useState } from "react";
import { Button, Input, Navigator, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { createAddress, createResaleOrder, getAddresses, getListing, getMyCoupons, type Address, type CouponSummary, type Listing } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

/** P2 小程序结算：选地址 + 选券 + 积分抵扣 + 金额明细（对齐网页端结算弹窗） */
export default function Checkout() {
  const router = useRouter();
  const listingId = router.params.listing ?? "";
  const [listing, setListing] = useState<Listing>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [coupons, setCoupons] = useState<CouponSummary[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);
  const [couponUserId, setCouponUserId] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pending, setPending] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [form, setForm] = useState({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });

  const load = useCallback(() => {
    getListing(listingId, apiOptions).then(setListing).catch(() => Taro.showToast({ title: "商品加载失败", icon: "none" }));
    const session = sessionClient.read();
    if (apiOptions.demo || session) {
      getAddresses(sessionApiOptions()).then((list) => {
        setAddresses(list);
        const preferred = list.find((item) => item.isDefault) ?? list[0];
        setAddressId((current) => current ?? preferred?.addressId ?? null);
      }).catch(() => undefined);
      getMyCoupons("UNUSED", sessionApiOptions()).then((page) => setCoupons(page.content)).catch(() => undefined);
    }
  }, [listingId]);
  Taro.useDidShow?.(() => load());

  const usableCoupons = useMemo(
    () => (coupons || []).filter((coupon) => coupon.minOrderAmount == null || (listing?.price ?? 0) >= coupon.minOrderAmount),
    [coupons, listing?.price]
  );
  const selectedCoupon = usableCoupons.find((coupon) => coupon.couponUserId === couponUserId);
  const discount = selectedCoupon ? Math.min(selectedCoupon.discountValue, listing?.price ?? 0) : 0;
  const payable = Math.max((listing?.price ?? 0) - discount, 0);

  async function saveAddress() {
    if (Object.values(form).some((value) => !value.trim())) {
      Taro.showToast({ title: "请填写完整地址信息", icon: "none" });
      return;
    }
    try {
      await createAddress({ ...form }, sessionApiOptions());
      setShowAddressForm(false);
      setForm({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });
      getAddresses(sessionApiOptions()).then((list) => {
        setAddresses(list);
        setAddressId(list[list.length - 1]?.addressId ?? null);
      });
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" });
    }
  }

  async function submit() {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先在「我的」登录", icon: "none" }); return; }
    if (!apiOptions.demo && !addressId) { Taro.showToast({ title: "请先选择收货地址", icon: "none" }); return; }
    setPending(true);
    try {
      await createResaleOrder(listingId, session?.userId, sessionApiOptions(), {
        addressId: addressId ?? undefined,
        couponUserId: couponUserId ?? undefined,
        usePoints
      });
      Taro.showToast({ title: "订单已创建", icon: "success" });
      setTimeout(() => Taro.redirectTo({ url: "/pages/orders/index" }), 600);
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "下单失败", icon: "none" });
    } finally {
      setPending(false);
    }
  }

  return <View className="mini-page">
    <Navigator url={`/pages/product/index?id=${listingId}`} className="mini-back">← 返回商品</Navigator>
    <Text className="mini-page-title">确认订单</Text>
    {listing && <View className="mini-order-item"><Text className="mini-cart-title">{listing.name}</Text><Text className="mini-cart-meta">¥{listing.price.toLocaleString()} · 库存 {listing.stock}</Text></View>}
    <Text className="mini-label">收货地址</Text>
    {addresses.map((address) => <View key={address.addressId} className={`mini-option ${addressId === address.addressId ? "selected" : ""}`} onClick={() => setAddressId(address.addressId)}>
      <Text className="mini-option-title">{address.receiverName} {address.receiverPhone}{address.isDefault ? "（默认）" : ""}</Text>
      <Text className="mini-muted">{address.province} {address.city} {address.district} {address.detailAddress}</Text>
    </View>)}
    {showAddressForm ? <View className="mini-form">
      <Text className="mini-label">收货人</Text><Input className="mini-input" value={form.receiverName} onInput={(e) => setForm({ ...form, receiverName: e.detail.value })} placeholder="姓名" />
      <Text className="mini-label">手机号</Text><Input className="mini-input" type="number" value={form.receiverPhone} onInput={(e) => setForm({ ...form, receiverPhone: e.detail.value })} placeholder="11 位手机号" />
      <View className="mini-grid-3">
        <Input className="mini-input" value={form.province} onInput={(e) => setForm({ ...form, province: e.detail.value })} placeholder="省" />
        <Input className="mini-input" value={form.city} onInput={(e) => setForm({ ...form, city: e.detail.value })} placeholder="市" />
        <Input className="mini-input" value={form.district} onInput={(e) => setForm({ ...form, district: e.detail.value })} placeholder="区" />
      </View>
      <Text className="mini-label">详细地址</Text><Input className="mini-input" value={form.detailAddress} onInput={(e) => setForm({ ...form, detailAddress: e.detail.value })} placeholder="街道、门牌" />
      <Button size="mini" className="mini-button mini-button-dark" onClick={() => void saveAddress()}>保存地址</Button>
    </View> : <Button size="mini" className="mini-button" onClick={() => setShowAddressForm(true)}>+ 新增地址</Button>}
    <Text className="mini-label">优惠券</Text>
    <View className={`mini-option ${couponUserId == null ? "selected" : ""}`} onClick={() => setCouponUserId(null)}><Text className="mini-option-title">不使用优惠券</Text></View>
    {usableCoupons.map((coupon) => <View key={coupon.couponUserId} className={`mini-option ${couponUserId === coupon.couponUserId ? "selected" : ""}`} onClick={() => setCouponUserId(coupon.couponUserId ?? null)}>
      <Text className="mini-option-title">-¥{coupon.discountValue} {coupon.name}</Text>
      <Text className="mini-muted">满 {coupon.minOrderAmount ?? 0} 可用 · 至 {String(coupon.expireAt ?? "").slice(0, 10)}</Text>
    </View>)}
    {usableCoupons.length === 0 && <Text className="mini-muted">暂无可用券。</Text>}
    <Text className="mini-label">积分抵扣</Text>
    <View className={`mini-option ${usePoints ? "selected" : ""}`} onClick={() => setUsePoints(!usePoints)}>
      <Text className="mini-option-title">使用循环积分抵现</Text>
      <Text className="mini-muted">100 积分 = ¥1，最多抵应付 20%（服务端计算）</Text>
    </View>
    <View className="mini-summary">
      <Text>商品金额 ¥{(listing?.price ?? 0).toLocaleString()}</Text>
      {discount > 0 && <Text>券抵扣 -¥{discount.toLocaleString()}</Text>}
      {usePoints && <Text>积分抵扣 以服务端计算为准</Text>}
      <Text className="mini-payable">应付（积分抵扣前）¥{payable.toLocaleString()}</Text>
    </View>
    <Button className="mini-button mini-button-lime" disabled={pending} onClick={() => void submit()}>{pending ? "正在创建…" : `提交订单 ¥${payable.toLocaleString()}`}</Button>
    <Text className="mini-muted" style={{ marginTop: ".6rem", fontSize: ".65rem" }}>下单即从购物车移除该商品；15 分钟未支付自动关闭并退回券与积分。</Text>
  </View>;
}
