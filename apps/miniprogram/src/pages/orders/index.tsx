import { useEffect, useState } from "react";
import { Button, Image, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { cancelOrder, confirmReceipt, getOrders, orderStatusLabel, payOrder, type Order, type OrderStatus } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

const STATUS_TABS: Array<{ value: "ALL" | OrderStatus; label: string; payStatus?: string; fulfillStatus?: string }> = [
  { value: "ALL", label: "全部" },
  { value: "WAIT_PAY", label: "待支付", payStatus: "UNPAID" },
  { value: "PAID", label: "已支付", payStatus: "PAID" },
  { value: "SHIPPED", label: "运输中", fulfillStatus: "DELIVERED" },
  { value: "RECEIVED", label: "已收货", fulfillStatus: "COMPLETED" },
  { value: "CANCELLED", label: "已取消", fulfillStatus: "CANCELLED" }
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [resolved, setResolved] = useState<Record<string, OrderStatus>>({});
  const [message, setMessage] = useState("正在同步订单…");
  const [authNeeded, setAuthNeeded] = useState(false);
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["value"]>("ALL");
  useEffect(() => {
    const session = sessionClient.read();
    const activeTab = STATUS_TABS.find((item) => item.value === tab) ?? STATUS_TABS[0];
    getOrders(session?.userId, sessionApiOptions(), { payStatus: activeTab.payStatus, fulfillStatus: activeTab.fulfillStatus }).then((page) => { setOrders(page.content); setMessage(""); }).catch((error: unknown) => {
      const text = error instanceof Error ? error.message : "请先登录查看订单";
      setMessage(text);
      if (!apiOptions.demo && !session) setAuthNeeded(true);
    });
  }, [tab]);
  async function updateOrder(order: Order) {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先登录", icon: "none" }); return; }
    try {
      if (order.status === "SHIPPED") await confirmReceipt(order.orderNo, session?.userId, sessionApiOptions());
      else await cancelOrder(order.orderNo, session?.userId, sessionApiOptions());
      setResolved((value) => ({ ...value, [order.orderNo]: order.status === "SHIPPED" ? "RECEIVED" : "CANCELLED" }));
      Taro.showToast({ title: order.status === "SHIPPED" ? "已确认收货" : "订单已取消", icon: "success" });
    } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "操作失败", icon: "none" }); }
  }
  async function pay(order: Order) {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先登录", icon: "none" }); return; }
    try { await payOrder(order.orderNo, sessionApiOptions()); setResolved((value) => ({ ...value, [order.orderNo]: "PAID" })); Taro.showToast({ title: "支付成功", icon: "success" }); } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "支付失败", icon: "none" }); }
  }
  return <View className="mini-page"><Text className="mini-eyebrow">Your flow</Text><Text className="mini-page-title">每一次{`\n`}选择都算数。</Text>{message && <Text className="mini-page-copy">{message}</Text>}{authNeeded && <Button className="mini-button mini-button-lime" onClick={() => Taro.switchTab({ url: "/pages/account/index" })}>去登录 ↗</Button>}<View className="mini-filters">{STATUS_TABS.map((item) => <Text key={item.value} className={`mini-filter ${tab === item.value ? "active" : ""}`} onClick={() => setTab(item.value)}>{item.label}</Text>)}</View><View className="mini-orders">{orders.map((order) => { const status = resolved[order.orderNo] ?? order.status; return <View className="mini-order" key={order.orderNo}><View className="mini-order-head"><Text>{order.orderNo}</Text><Text className="mini-order-status">{order.statusText ?? orderStatusLabel[status]}</Text></View><View className="mini-order-body"><Image src={order.listing.image} mode="aspectFill" lazyLoad /><View><Text>{order.listing.name}</Text><Text>{order.createdAt}</Text></View><Text>¥{order.amount.toLocaleString()}</Text></View><View className="mini-order-actions">{status === "WAIT_PAY" && <Button className="mini-order-action mini-order-action-lime" onClick={() => pay(order)}>去支付</Button>}{status === "WAIT_PAY" && <Button className="mini-order-action" onClick={() => updateOrder(order)}>取消订单</Button>}{status === "SHIPPED" && <Button className="mini-order-action mini-order-action-lime" onClick={() => updateOrder(order)}>确认收货</Button>}</View></View>; })}</View></View>;
}
