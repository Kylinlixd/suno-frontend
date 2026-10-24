import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAddress, createResaleOrder, getAddresses, getMyCoupons, type Address } from "@suno/shared";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";

/** M2 结算弹窗：选收货地址 + 选满减券 + 金额明细 → 下单。二手单件模型，逐件结算。 */
export function CheckoutDialog({ listingId, listingName, price, onClose }: {
  listingId: string;
  listingName: string;
  price: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [selectedCouponUserId, setSelectedCouponUserId] = useState<number | null>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [error, setError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });

  const addressesQuery = useQuery({
    queryKey: ["addresses", session?.userId],
    queryFn: () => getAddresses(sessionApiOptions()),
    enabled: apiOptions.demo || Boolean(session)
  });
  const couponsQuery = useQuery({
    queryKey: ["my-coupons", session?.userId],
    queryFn: () => getMyCoupons("UNUSED", sessionApiOptions()),
    enabled: apiOptions.demo || Boolean(session)
  });

  const addresses = addressesQuery.data ?? [];
  const effectiveAddressId = selectedAddressId ?? addresses.find((address) => address.isDefault)?.addressId ?? addresses[0]?.addressId ?? null;
  const usableCoupons = useMemo(
    () => (couponsQuery.data?.content ?? []).filter((coupon) => coupon.minOrderAmount == null || price >= coupon.minOrderAmount),
    [couponsQuery.data, price]
  );
  const selectedCoupon = usableCoupons.find((coupon) => coupon.couponUserId === selectedCouponUserId);
  const discount = selectedCoupon ? Math.min(selectedCoupon.discountValue, price) : 0;
  const payable = Math.max(price - discount, 0);
  const pointsHint = usePoints ? "结算按服务端规则抵扣（100 积分 = ¥1，最多抵应付的 20%）" : undefined;

  const orderMutation = useMutation({
    mutationFn: () => createResaleOrder(listingId, session?.userId, sessionApiOptions(), {
      addressId: effectiveAddressId ?? undefined,
      couponUserId: selectedCouponUserId ?? undefined,
      usePoints
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      void queryClient.invalidateQueries({ queryKey: ["my-coupons"] });
      onClose();
      navigate("/orders");
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "下单失败，请稍后重试。")
  });
  const addressMutation = useMutation({
    mutationFn: () => createAddress({ ...addressForm, isDefault: addresses.length === 0 }, sessionApiOptions()),
    onSuccess: () => {
      setShowAddressForm(false);
      setAddressForm({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });
      void queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "地址保存失败，请稍后重试。")
  });

  function submit() {
    if (!apiOptions.demo && !effectiveAddressId) {
      setError("请先添加收货地址。");
      return;
    }
    setError("");
    orderMutation.mutate();
  }

  return <div className="login-overlay checkout-overlay" role="dialog" aria-modal="true" aria-label="结算">
    <div className="checkout-panel">
      <button className="login-close" aria-label="关闭结算" onClick={onClose}>×</button>
      <p className="eyebrow">Checkout</p>
      <h2>确认你的<em>下一件好东西。</em></h2>
      <p className="checkout-item">{listingName} · ¥{price.toLocaleString()}</p>

      <div className="checkout-section">
        <div className="checkout-section-head">
          <h3>收货地址</h3>
          <button className="text-button" onClick={() => setShowAddressForm((value) => !value)}>{showAddressForm ? "取消" : "新增地址"}</button>
        </div>
        {addresses.length === 0 && !showAddressForm && <p className="muted">还没有收货地址，先添加一个。</p>}
        <div className="address-options">
          {addresses.map((address: Address) => (
            <label key={address.addressId} className={`address-option ${effectiveAddressId === address.addressId ? "selected" : ""}`}>
              <input type="radio" name="checkout-address" checked={effectiveAddressId === address.addressId} onChange={() => setSelectedAddressId(address.addressId)} />
              <span><b>{address.receiverName} {address.receiverPhone}</b><i>{address.province} {address.city} {address.district} {address.detailAddress}</i>{address.isDefault && <em>默认</em>}</span>
            </label>
          ))}
        </div>
        {showAddressForm && <div className="address-quick-form">
          <input placeholder="收货人" value={addressForm.receiverName} onChange={(event) => setAddressForm({ ...addressForm, receiverName: event.target.value })} />
          <input placeholder="手机号" value={addressForm.receiverPhone} onChange={(event) => setAddressForm({ ...addressForm, receiverPhone: event.target.value })} />
          <input placeholder="省" value={addressForm.province} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} />
          <input placeholder="市" value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} />
          <input placeholder="区" value={addressForm.district} onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })} />
          <input placeholder="详细地址" value={addressForm.detailAddress} onChange={(event) => setAddressForm({ ...addressForm, detailAddress: event.target.value })} />
          <button className="button button-dark small" disabled={addressMutation.isPending || Object.values(addressForm).some((value) => !value.trim())} onClick={() => addressMutation.mutate()}>{addressMutation.isPending ? "保存中…" : "保存地址"}</button>
        </div>}
      </div>

      <div className="checkout-section">
        <h3>优惠券</h3>
        {usableCoupons.length === 0 ? <p className="muted">暂无可用满减券。</p> : <div className="coupon-options">
          <label className={`coupon-option ${selectedCouponUserId == null ? "selected" : ""}`}>
            <input type="radio" name="checkout-coupon" checked={selectedCouponUserId == null} onChange={() => setSelectedCouponUserId(null)} />
            <span>不使用优惠券</span>
          </label>
          {usableCoupons.map((coupon) => (
            <label key={coupon.couponUserId} className={`coupon-option ${selectedCouponUserId === coupon.couponUserId ? "selected" : ""}`}>
              <input type="radio" name="checkout-coupon" checked={selectedCouponUserId === coupon.couponUserId} onChange={() => setSelectedCouponUserId(coupon.couponUserId ?? null)} />
              <span><b>-¥{coupon.discountValue}</b> {coupon.name}<i>满 {coupon.minOrderAmount ?? 0} 可用 · 有效期至 {String(coupon.expireAt ?? "").slice(0, 10)}</i></span>
            </label>
          ))}
        </div>}
      </div>

      <div className="checkout-section">
        <h3>积分抵扣</h3>
        <label className="coupon-option" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={usePoints} onChange={(event) => setUsePoints(event.target.checked)} />
          <span>使用循环积分抵现<i>{pointsHint ?? "勾选后按积分余额自动抵扣"}</i></span>
        </label>
      </div>
      <div className="checkout-summary">
        <div><span>商品金额</span><strong>¥{price.toLocaleString()}</strong></div>
        {discount > 0 && <div><span>券抵扣</span><strong>-¥{discount.toLocaleString()}</strong></div>}
        {usePoints && <div><span>积分抵扣</span><strong>以服务端计算为准</strong></div>}
        <div className="payable"><span>应付（积分抵扣前）</span><strong>¥{payable.toLocaleString()}</strong></div>
      </div>
      {error && <p className="login-error">{error}</p>}
      <button className="button button-lime" onClick={submit} disabled={orderMutation.isPending}>
        {orderMutation.isPending ? "正在创建订单…" : `提交订单 ¥${payable.toLocaleString()} ↗`}
      </button>
    </div>
  </div>;
}
