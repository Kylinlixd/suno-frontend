import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminCreateCoupon, adminDisableCoupon, adminListCoupons } from "@suno/shared";
import { apiOptions } from "../lib/auth";

/** M3 优惠券管理：创建/停用 */
export function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", minOrderAmount: "", discountValue: "", totalCount: "100", perUserLimit: "1", effectiveDays: "30" });
  const couponsQuery = useQuery({ queryKey: ["admin-coupons"], queryFn: () => adminListCoupons(undefined, apiOptions) });
  const createMutation = useMutation({
    mutationFn: () => adminCreateCoupon({
      name: form.name, minOrderAmount: Number(form.minOrderAmount), discountValue: Number(form.discountValue),
      totalCount: Number(form.totalCount), perUserLimit: Number(form.perUserLimit), effectiveDays: Number(form.effectiveDays)
    }, apiOptions),
    onSuccess: (data) => { setMessage(`券「${String(data.name)}」已创建。`); setForm({ ...form, name: "", minOrderAmount: "", discountValue: "" }); void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "创建失败。")
  });
  const disableMutation = useMutation({
    mutationFn: (couponId: number) => adminDisableCoupon(couponId, apiOptions),
    onSuccess: () => { setMessage("券已停用。"); void queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (error) => setMessage(error instanceof Error ? error.message : "停用失败。")
  });
  const rows = couponsQuery.data ?? [];
  const formReady = form.name.trim() && Number(form.minOrderAmount) > 0 && Number(form.discountValue) > 0 && Number(form.totalCount) > 0 && Number(form.perUserLimit) > 0 && Number(form.effectiveDays) > 0;
  return <div className="admin-page">
    <div className="admin-topbar"><div><p className="eyebrow">Marketing</p><h1>优惠券管理</h1></div></div>
    <div className="admin-columns">
      <div className="admin-panel">
        <div className="panel-heading"><h2>创建满减券</h2></div>
        {message && <p className="success-message">{message}</p>}
        <div className="coupon-admin-form">
          <label>券名称<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="如：循环生活满 1000 减 80" /></label>
          <div className="coupon-admin-grid">
            <label>门槛 ¥<input type="number" min="0" value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} /></label>
            <label>抵扣 ¥<input type="number" min="0" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} /></label>
            <label>总量<input type="number" min="1" value={form.totalCount} onChange={(event) => setForm({ ...form, totalCount: event.target.value })} /></label>
            <label>每人限领<input type="number" min="1" value={form.perUserLimit} onChange={(event) => setForm({ ...form, perUserLimit: event.target.value })} /></label>
            <label>有效天数<input type="number" min="1" max="365" value={form.effectiveDays} onChange={(event) => setForm({ ...form, effectiveDays: event.target.value })} /></label>
          </div>
          <button className="button button-dark" disabled={!formReady || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? "创建中…" : "创建优惠券"}</button>
        </div>
      </div>
      <div className="admin-panel">
        <div className="panel-heading"><h2>券模板</h2><span className="admin-live"><i />{rows.length} 张</span></div>
        <div className="table-head admin-table-row"><span>券</span><span>库存</span><span>状态</span><span></span></div>
        {rows.map((row) => <div className="table-row admin-table-row" key={String(row.couponId)}>
          <span className="table-item"><b>{String(row.name)}</b><i>满 {Number(row.minOrderAmount ?? 0).toLocaleString()} 减 {Number(row.discountValue).toLocaleString()} · 限领 {String(row.perUserLimit)}</i></span>
          <span>{Number(row.remainingCount)} / {Number(row.totalCount)}</span>
          <span>{String(row.status)}</span>
          <span>{String(row.status) === "ACTIVE" ? <button className="text-button" disabled={disableMutation.isPending} onClick={() => disableMutation.mutate(Number(row.couponId))}>停用</button> : <i className="muted">—</i>}</span>
        </div>)}
        {rows.length === 0 && <p className="muted">还没有优惠券。</p>}
      </div>
    </div>
  </div>;
}
