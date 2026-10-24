import { useCallback, useState } from "react";
import { Navigator, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

/** M2/P1 小程序通知中心 */
export default function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");
  const load = useCallback(() => {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { setLoadState("empty"); return; }
    getNotifications(0, 30, sessionApiOptions())
      .then((page) => { setItems(page.content); setLoadState(page.content.length === 0 ? "empty" : "ready"); })
      .catch(() => setLoadState("empty"));
  }, []);
  Taro.useDidShow?.(() => load());
  async function read(item: NotificationItem) {
    if (item.isRead) return;
    try {
      await markNotificationRead(item.id, sessionApiOptions());
      load();
    } catch { /* 忽略单条已读失败 */ }
  }
  return <View className="mini-page">
    <Navigator url="/pages/account/index" className="mini-back">← 返回我的</Navigator>
    <Text className="mini-page-title">消息中心</Text>
    {items.length > 0 && <Text className="mini-link" onClick={() => { void markAllNotificationsRead(sessionApiOptions()).then(load); }}>全部已读</Text>}
    {loadState !== "ready" && <Text className="mini-muted">{loadState === "loading" ? "正在加载…" : "还没有消息。"}</Text>}
    {items.map((item) => <View className={`mini-notification ${item.isRead ? "read" : "unread"}`} key={item.id} onClick={() => void read(item)}>
      <Text className="mini-notification-title">{item.title}</Text>
      <Text className="mini-notification-content">{item.content}</Text>
      <Text className="mini-notification-meta">{item.createdAt}{item.isRead ? "" : " · 未读"}</Text>
    </View>)}
  </View>;
}
