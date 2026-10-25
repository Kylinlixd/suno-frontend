import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelRefund, claimCoupon, createAddress, deleteAddress, getAddresses, getClaimableCoupons,
  getFavorites, getMyCoupons, getMyPointsLedger, getMyRefunds, listSessions, revokeAllSessions,
  revokeDeviceSession, setDefaultAddress, type Address
} from "@suno/shared";
import { useAuth } from "../lib/auth";
import { LoginPanel } from "../components/LoginPanel";
import { useState } from "react";
import { apiOptions, sessionApiOptions } from "../lib/auth";

export function AccountPage() {
  const queryClient = useQueryClient();
  const [showLogin, setShowLogin] = useState(false);
  const { session, logout } = useAuth();
  const { data: favorites } = useQuery({ queryKey: ["favorites", session?.userId], queryFn: () => getFavorites(session?.userId, sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const pointsQuery = useQuery({ queryKey: ["points-ledger", session?.userId], queryFn: () => getMyPointsLedger(sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const points = pointsQuery.data;
  const addressesQuery = useQuery({ queryKey: ["addresses", session?.userId], queryFn: () => getAddresses(sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const claimableQuery = useQuery({ queryKey: ["claimable-coupons", session?.userId], queryFn: () => getClaimableCoupons(sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const myCouponsQuery = useQuery({ queryKey: ["my-coupons", session?.userId], queryFn: () => getMyCoupons(undefined, sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const refundsQuery = useQuery({ queryKey: ["my-refunds", session?.userId], queryFn: () => getMyRefunds(sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const [addressForm, setAddressForm] = useState({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });
  const [addressMessage, setAddressMessage] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const createAddressMutation = useMutation({
    mutationFn: () => createAddress({ ...addressForm }, sessionApiOptions()),
    onSuccess: () => { setAddressMessage("地址已保存。"); setAddressForm({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" }); void queryClient.invalidateQueries({ queryKey: ["addresses"] }); },
    onError: (error) => setAddressMessage(error instanceof Error ? error.message : "地址保存失败。")
  });
  const addressActionMutation = useMutation({
    mutationFn: (payload: { type: "default" | "delete"; addressId: number }) => payload.type === "default"
      ? setDefaultAddress(payload.addressId, sessionApiOptions())
      : deleteAddress(payload.addressId, sessionApiOptions()),
    onSuccess: () => { setAddressMessage(""); void queryClient.invalidateQueries({ queryKey: ["addresses"] }); },
    onError: (error) => setAddressMessage(error instanceof Error ? error.message : "操作失败。")
  });
  const claimMutation = useMutation({
    mutationFn: (couponId: number) => claimCoupon(couponId, sessionApiOptions()),
    onSuccess: () => { setCouponMessage("领取成功，下单时可用。"); void queryClient.invalidateQueries({ queryKey: ["my-coupons"] }); void queryClient.invalidateQueries({ queryKey: ["claimable-coupons"] }); },
    onError: (error) => setCouponMessage(error instanceof Error ? error.message : "领取失败。")
  });
  const cancelRefundMutation = useMutation({
    mutationFn: (refundId: number) => cancelRefund(refundId, sessionApiOptions()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["my-refunds"] })
  });
  const sessionsQuery = useQuery({ queryKey: ["sessions"], queryFn: () => listSessions(sessionApiOptions()), enabled: apiOptions.demo || Boolean(session) });
  const [sessionMessage, setSessionMessage] = useState("");
  const revokeDeviceMutation = useMutation({ mutationFn: (deviceId: string) => revokeDeviceSession(deviceId, sessionApiOptions()), onSuccess: () => { setSessionMessage("该设备已下线。"); void sessionsQuery.refetch(); }, onError: (error) => setSessionMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。") });
  const revokeAllMutation = useMutation({ mutationFn: () => revokeAllSessions(sessionApiOptions()), onSuccess: () => { setSessionMessage("已撤销全部登录会话，请重新登录。"); setTimeout(() => void logout(), 800); }, onError: (error) => setSessionMessage(error instanceof Error ? error.message : "操作失败，请稍后重试。") });
  const sessions = sessionsQuery.data?.sessions.filter((item) => !item.revoked) ?? [];
  return <section className="section-wrap page-section account-page"><div className="account-head"><div className="avatar">{(session?.username ?? "A").slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">Suno member</p><h1>{session?.username ?? "你的"}<em> 循环账户</em></h1><p>{session ? "你已登录，所有流转记录都会被保存。" : "登录后，回收和购买记录会跟着你走。"}</p></div><button className="text-button" onClick={() => session ? void logout() : setShowLogin(true)}>{session ? "退出登录" : "登录账户"}</button></div><div className="account-links"><Link to="/orders"><span>订单与物流</span><strong>查看全部 ↗</strong></Link><Link to="/recycle"><span>回收记录</span><strong>估价新物品 ↗</strong></Link><Link to="/market"><span>我的收藏</span><strong>{favorites?.totalElements ?? 0} 件商品</strong></Link><Link to="/support"><span>客服工单</span><strong>提交 / 查看回复 ↗</strong></Link></div>
      {points && <div className="points-panel"><div className="section-heading compact"><div><p className="eyebrow">Suno Points</p><h2>循环积分</h2></div></div><div className="points-head"><p className="points-balance"><span>当前余额</span>{points.balance.toLocaleString()}</p><p className="muted">回收闲置即可累积积分</p></div>{points.content.length === 0 ? <p className="muted">还没有积分记录，从一次回收开始。</p> : <div className="points-list">{points.content.map((entry) => <div className="points-row" key={entry.id}><div><strong>{pointsReasonLabel(entry.reason)}</strong><p className="points-meta">{entry.createdAt}</p></div><span className={`points-delta ${entry.pointsDelta >= 0 ? "plus" : ""}`}>{entry.pointsDelta >= 0 ? "+" : ""}{entry.pointsDelta}</span></div>)}</div>}</div>}{session && <div className="account-addresses"><div className="section-heading compact"><div><p className="eyebrow">Addresses</p><h2>收货地址</h2></div></div>
          <div className="address-list">{(addressesQuery.data ?? []).map((address: Address) => <div className={`address-row ${address.isDefault ? "default" : ""}`} key={address.addressId}>
            <div><b>{address.receiverName} · {address.receiverPhone}</b><span>{address.province} {address.city} {address.district} {address.detailAddress}</span></div>
            <div className="address-row-actions">{!address.isDefault && <button className="text-button" onClick={() => addressActionMutation.mutate({ type: "default", addressId: address.addressId })} disabled={addressActionMutation.isPending}>设为默认</button>}<button className="text-button" onClick={() => addressActionMutation.mutate({ type: "delete", addressId: address.addressId })} disabled={addressActionMutation.isPending}>删除</button></div>
          </div>)}</div>
          <div className="address-quick-form">
            <input placeholder="收货人" value={addressForm.receiverName} onChange={(event) => setAddressForm({ ...addressForm, receiverName: event.target.value })} />
            <input placeholder="手机号" value={addressForm.receiverPhone} onChange={(event) => setAddressForm({ ...addressForm, receiverPhone: event.target.value })} />
            <input placeholder="省" value={addressForm.province} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} />
            <input placeholder="市" value={addressForm.city} onChange={(event) => setAddressForm({ ...addressForm, city: event.target.value })} />
            <input placeholder="区" value={addressForm.district} onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })} />
            <input placeholder="详细地址" value={addressForm.detailAddress} onChange={(event) => setAddressForm({ ...addressForm, detailAddress: event.target.value })} />
            <button className="button button-dark small" disabled={createAddressMutation.isPending || Object.values(addressForm).some((value) => !value.trim())} onClick={() => createAddressMutation.mutate()}>{createAddressMutation.isPending ? "保存中…" : "新增地址"}</button>
          </div>
          {addressMessage && <p className="success-message">{addressMessage}</p>}
        </div>}
      {session && <div className="account-coupons"><div className="section-heading compact"><div><p className="eyebrow">Coupons</p><h2>优惠券</h2></div></div>
          <div className="coupon-claim-row">{(claimableQuery.data ?? []).map((coupon) => <div className="coupon-card" key={coupon.couponId}><b>-¥{coupon.discountValue}</b><div><strong>{coupon.name}</strong><span>满 {coupon.minOrderAmount ?? 0} 可用</span></div><button className="button button-light small" onClick={() => claimMutation.mutate(coupon.couponId)} disabled={claimMutation.isPending}>领取</button></div>)}</div>
          {couponMessage && <p className="success-message">{couponMessage}</p>}
          <p className="muted account-coupon-mine-title">我的券</p>
          <div className="coupon-mine-list">{(myCouponsQuery.data?.content ?? []).length === 0 ? <p className="muted">还没有优惠券。</p> : (myCouponsQuery.data?.content ?? []).map((coupon) => <div className={`coupon-mine ${coupon.status === "USED" ? "used" : ""}`} key={coupon.couponUserId}><b>-¥{coupon.discountValue}</b><div><strong>{coupon.name}</strong><span>{coupon.status === "USED" ? "已使用" : `满 ${coupon.minOrderAmount ?? 0} 可用 · 至 ${String(coupon.expireAt ?? "").slice(0, 10)}`}</span></div></div>)}</div>
        </div>}
      {session && <div className="account-refunds"><div className="section-heading compact"><div><p className="eyebrow">Refunds</p><h2>售后记录</h2></div></div>
          {(refundsQuery.data?.content ?? []).length === 0 ? <p className="muted">暂无售后记录。</p> : <div className="refund-list">{(refundsQuery.data?.content ?? []).map((refund) => <div className="refund-row" key={refund.refundId}>
            <div><b>{refund.refundNo}</b>{refund.orderNo && <span>订单 {refund.orderNo}</span>}<p>{refund.reason}</p></div>
            <div className="refund-side"><strong>¥{refund.amount.toLocaleString()}</strong><span className="status-pill">{refund.status === "PENDING" ? "待处理" : refund.status === "PROCESSED" ? "已退款" : refund.status === "CANCELLED" ? "已撤销" : refund.status}</span>{refund.status === "PENDING" && <button className="text-button" onClick={() => cancelRefundMutation.mutate(refund.refundId)} disabled={cancelRefundMutation.isPending}>撤销</button>}</div>
          </div>)}</div>}
        </div>}<div className="account-sessions"><div className="section-heading compact"><div><p className="eyebrow">Security</p><h2>登录设备</h2></div><button className="text-button" onClick={() => revokeAllMutation.mutate()} disabled={revokeAllMutation.isPending}>{revokeAllMutation.isPending ? "撤销中…" : "撤销全部会话"}</button></div>{sessionMessage && <p className="success-message">{sessionMessage}</p>}{sessionsQuery.isLoading ? <p className="muted">正在获取登录设备…</p> : sessions.length === 0 ? <p className="muted">当前没有活跃会话。</p> : <div className="session-list">{sessions.map((item) => <div className="session-row" key={item.deviceId}><i /><div><strong>{item.deviceId}</strong><span>登录于 {item.createdAt} · 有效期至 {item.expireAt}</span></div><button className="text-button" onClick={() => revokeDeviceMutation.mutate(item.deviceId)} disabled={revokeDeviceMutation.isPending}>下线</button></div>)}</div>}</div><div className="account-note"><p className="eyebrow">Suno promise</p><h2>你不需要拥有更多，<br />只需要让拥有的继续有用。</h2></div>{showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}</section>;
}

/** 积分原因的展示文案：RECYCLE_ORDER:{orderNo} → 回收入账 */
function pointsReasonLabel(reason: string): string {
  if (reason.startsWith("RECYCLE_ORDER:")) return "回收入账";
  if (reason.includes("注册")) return "注册礼遇";
  return reason || "积分变动";
}
