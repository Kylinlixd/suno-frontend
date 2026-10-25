import { useCallback, useState } from "react";
import { Button, Input, Navigator, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { createAddress, deleteAddress, getAddresses, setDefaultAddress, type Address } from "@suno/shared";
import { sessionApiOptions } from "../../lib/auth";

/** P2 小程序地址管理：列表/新增/设默认/删除 */
export default function Addresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });
  const load = useCallback(() => {
    getAddresses(sessionApiOptions()).then(setAddresses).catch(() => setAddresses([]));
  }, []);
  Taro.useDidShow?.(() => load());
  async function save() {
    if (Object.values(form).some((value) => !value.trim())) { Taro.showToast({ title: "请填写完整", icon: "none" }); return; }
    try {
      await createAddress({ ...form }, sessionApiOptions());
      setShowForm(false); setForm({ receiverName: "", receiverPhone: "", province: "", city: "", district: "", detailAddress: "" });
      load();
    } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "保存失败", icon: "none" }); }
  }
  async function markDefault(addressId: number) {
    try { await setDefaultAddress(addressId, sessionApiOptions()); load(); } catch { Taro.showToast({ title: "操作失败", icon: "none" }); }
  }
  async function remove(addressId: number) {
    const confirmed = await Taro.showModal({ title: "删除地址", content: "确认删除该收货地址？" });
    if (!confirmed.confirm) return;
    try { await deleteAddress(addressId, sessionApiOptions()); load(); } catch { Taro.showToast({ title: "删除失败", icon: "none" }); }
  }
  return <View className="mini-page">
    <Navigator url="/pages/account/index" className="mini-back">← 返回我的</Navigator>
    <Text className="mini-page-title">收货地址</Text>
    {addresses.map((address) => <View className={`mini-option ${address.isDefault ? "selected" : ""}`} key={address.addressId}>
      <Text className="mini-option-title">{address.receiverName} {address.receiverPhone}{address.isDefault ? "（默认）" : ""}</Text>
      <Text className="mini-muted">{address.province} {address.city} {address.district} {address.detailAddress}</Text>
      <View className="mini-cart-actions">
        {!address.isDefault && <Button size="mini" className="mini-button" onClick={() => void markDefault(address.addressId)}>设为默认</Button>}
        <Button size="mini" className="mini-button" onClick={() => void remove(address.addressId)}>删除</Button>
      </View>
    </View>)}
    {addresses.length === 0 && !showForm && <Text className="mini-muted">还没有收货地址。</Text>}
    {showForm ? <View className="mini-form">
      <Input className="mini-input" value={form.receiverName} onInput={(e: { detail: { value: string } }) => setForm({ ...form, receiverName: e.detail.value })} placeholder="收货人" />
      <Input className="mini-input" type="number" value={form.receiverPhone} onInput={(e: { detail: { value: string } }) => setForm({ ...form, receiverPhone: e.detail.value })} placeholder="手机号" />
      <View className="mini-grid-3">
        <Input className="mini-input" value={form.province} onInput={(e: { detail: { value: string } }) => setForm({ ...form, province: e.detail.value })} placeholder="省" />
        <Input className="mini-input" value={form.city} onInput={(e: { detail: { value: string } }) => setForm({ ...form, city: e.detail.value })} placeholder="市" />
        <Input className="mini-input" value={form.district} onInput={(e: { detail: { value: string } }) => setForm({ ...form, district: e.detail.value })} placeholder="区" />
      </View>
      <Input className="mini-input" value={form.detailAddress} onInput={(e: { detail: { value: string } }) => setForm({ ...form, detailAddress: e.detail.value })} placeholder="详细地址" />
      <Button size="mini" className="mini-button mini-button-dark" onClick={() => void save()}>保存</Button>
    </View> : <Button size="mini" className="mini-button" onClick={() => setShowForm(true)}>+ 新增地址</Button>}
  </View>;
}
