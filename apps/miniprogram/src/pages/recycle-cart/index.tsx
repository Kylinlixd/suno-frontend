import { useCallback, useState } from "react";
import { Button, Input, Picker, ScrollView, Text, Textarea, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import {
  addManualRecycleItem,
  getRecycleCart,
  removeRecycleCartItem,
  scanRecycleByIsbn,
  submitRecycleCart,
  type RecycleCartItem,
} from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

const CATEGORIES = ["图书", "衣物", "家居", "美妆", "数码", "其他"];

/** R5 小程序回收车：扫码估价 + 手动添加 + 列表 + 提交 */
export default function RecycleCart() {
  const [items, setItems] = useState<RecycleCartItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  // 扫码表单
  const [isbn, setIsbn] = useState("");
  const [wearScore, setWearScore] = useState(85);
  const [scanning, setScanning] = useState(false);
  // 手动表单
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("衣物");
  const [manualWear, setManualWear] = useState(75);
  const [manualPrice, setManualPrice] = useState("");
  // 提交结果
  const [submitResult, setSubmitResult] = useState<{ count: number; total: number; points: number } | null>(null);

  const requireSession = () => {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) {
      Taro.showToast({ title: "请先在「我的」登录", icon: "none" });
      return false;
    }
    return true;
  };

  const load = useCallback(() => {
    setLoadState("loading");
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { setLoadState("empty"); return; }
    getRecycleCart(sessionApiOptions()).then((list) => {
      setItems(list);
      setLoadState(list.length === 0 ? "empty" : "ready");
    }).catch(() => setLoadState("error"));
  }, []);

  Taro.useDidShow?.(() => load());

  async function scanAndAdd() {
    if (!isbn.trim()) { Taro.showToast({ title: "请输入 ISBN", icon: "none" }); return; }
    if (!requireSession()) return;
    setScanning(true);
    try {
      await scanRecycleByIsbn(isbn.trim(), wearScore, sessionApiOptions());
      setIsbn("");
      Taro.showToast({ title: "已加入回收车", icon: "success" });
      load();
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "扫码失败", icon: "none" });
    } finally { setScanning(false); }
  }

  async function addManual() {
    if (!title.trim()) { Taro.showToast({ title: "请填写物品名称", icon: "none" }); return; }
    if (!requireSession()) return;
    try {
      await addManualRecycleItem({
        title: title.trim(),
        category,
        wearScore: manualWear,
        estimatedPrice: manualPrice ? Number(manualPrice) : undefined,
      }, sessionApiOptions());
      setTitle("");
      setManualPrice("");
      Taro.showToast({ title: "已加入回收车", icon: "success" });
      load();
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "添加失败", icon: "none" });
    }
  }

  async function removeItem(cartItemId: number) {
    try {
      await removeRecycleCartItem(cartItemId, sessionApiOptions());
      load();
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "移除失败", icon: "none" });
    }
  }

  async function submitCart() {
    if (!requireSession()) return;
    try {
      const result = await submitRecycleCart(sessionApiOptions());
      setSubmitResult({ count: result.submittedCount, total: result.totalEstimatedPrice, points: result.totalPoints });
      Taro.showToast({ title: "回收车已提交", icon: "success" });
      load();
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "提交失败", icon: "none" });
    }
  }

  const total = items.reduce((sum, item) => sum + item.estimatedPrice, 0);
  const gradeLabel = (grade: string) => ({ GOOD: "成色良好", MEDIUM: "成色中等", UNQUALIFIED: "有明显痕迹" }[grade] ?? grade);

  return <View className="mini-page mini-recycle-cart">
    <Text className="mini-back" onClick={() => Taro.navigateBack()}>← 返回</Text>
    <Text className="mini-page-title">卖闲置</Text>
    <Text className="mini-page-copy">扫码或手动添加旧物，攒够一批再提交。</Text>

    {/* 扫码估价 */}
    <View className="mini-form">
      <Text className="mini-label">书籍条形码（ISBN）</Text>
      <Input className="mini-input" value={isbn} onInput={(e) => setIsbn(e.detail.value)} placeholder="例如 9780306406157" maxlength={13} />
      <Text className="mini-label">成色评分：{wearScore} 分</Text>
      <Picker mode="selector" range={Array.from({ length: 101 }, (_, i) => i)} value={wearScore} onChange={(e) => setWearScore(Number(e.detail.value))}>
        <View className="mini-picker-row">拖动选择 {wearScore} 分</View>
      </Picker>
      <Button className="mini-button mini-button-lime" disabled={scanning} onClick={scanAndAdd}>{scanning ? "正在查询…" : "扫码估价 →"}</Button>
    </View>

    {/* 手动添加 */}
    <View className="mini-form" style={{ marginTop: "32rpx" }}>
      <Text className="mini-label">物品名称</Text>
      <Input className="mini-input" value={title} onInput={(e) => setTitle(e.detail.value)} placeholder="例如：旧毛衣、折叠沙发" />
      <Text className="mini-label">品类</Text>
      <Picker mode="selector" range={CATEGORIES} value={CATEGORIES.indexOf(category)} onChange={(e) => setCategory(CATEGORIES[Number(e.detail.value)])}>
        <View className="mini-picker-row">{category}</View>
      </Picker>
      <Text className="mini-label">成色评分：{manualWear} 分</Text>
      <Picker mode="selector" range={Array.from({ length: 101 }, (_, i) => i)} value={manualWear} onChange={(e) => setManualWear(Number(e.detail.value))}>
        <View className="mini-picker-row">拖动选择 {manualWear} 分</View>
      </Picker>
      <Text className="mini-label">预估价格（元，可选）</Text>
      <Input className="mini-input" value={manualPrice} onInput={(e) => setManualPrice(e.detail.value)} placeholder="留空自动估价" type="digit" />
      <Button className="mini-button mini-button-dark" onClick={addManual}>+ 加入回收车</Button>
    </View>

    {/* 回收车列表 */}
    <View style={{ marginTop: "40rpx" }}>
      <View className="mini-recycle-summary">
        <Text>{items.length} 件旧物 · 预估 ¥{total.toFixed(2)}</Text>
      </View>
      {loadState === "loading" && <Text className="mini-muted">正在加载…</Text>}
      {loadState === "error" && <Text className="mini-muted">加载失败，请稍后重试。</Text>}
      {loadState === "empty" && items.length === 0 && <Text className="mini-muted">回收车还是空的。</Text>}
      {items.map((item) => <View className="mini-recycle-cart-row" key={item.cartItemId}>
        <View className="mini-recycle-cart-info">
          <Text className="mini-recycle-cart-title">{item.title}</Text>
          <Text className="mini-recycle-cart-meta">{item.category} · 成色 {item.wearScore} · {gradeLabel(item.grade)} · ¥{item.estimatedPrice.toFixed(2)}</Text>
        </View>
        <Button size="mini" className="mini-button" onClick={() => removeItem(item.cartItemId)}>移除</Button>
      </View>)}
    </View>

    {/* 提交 */}
    {items.length > 0 && <View className="mini-recycle-submit-bar" onClick={submitCart}>
      <Text>提交 {items.length} 件 · 合计 ¥{total.toFixed(2)}</Text>
      <Text className="mini-button mini-button-lime" style={{ width: "auto", padding: "0 32rpx", height: "72rpx", lineHeight: "72rpx", fontSize: "22rpx" }}>一键提交 ↗</Text>
    </View>}

    {submitResult && <View className="mini-recycle-success">
      <Text>已提交 {submitResult.count} 件</Text>
      <Text>预估 ¥{submitResult.total.toFixed(2)} · {submitResult.points} 积分</Text>
    </View>}
  </View>;
}
