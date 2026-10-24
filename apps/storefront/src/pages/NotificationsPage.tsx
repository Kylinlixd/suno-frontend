import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNotifications, markAllNotificationsRead, markNotificationRead, type NotificationItem } from "@suno/shared";
import { LoginPanel } from "../components/LoginPanel";
import { apiOptions, sessionApiOptions, useAuth } from "../lib/auth";
import { useState } from "react";

const TYPE_LABELS: Record<string, string> = {
  ORDER_CREATED: "订单",
  ORDER_PAID: "支付",
  ORDER_DELIVERED: "物流",
  ORDER_COMPLETED: "完成",
  ORDER_CANCELLED: "订单",
  ORDER_AUTO_CLOSED: "订单",
  ORDER_REFUNDED: "退款",
  REFUND_APPLIED: "售后"
};

/** M2 通知中心。 */
export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const canRead = Boolean(apiOptions.demo || session);
  const query = useQuery({ queryKey: ["notifications", session?.userId], queryFn: () => getNotifications(0, 30, sessionApiOptions()), enabled: canRead });
  const readMutation = useMutation({
    mutationFn: (id: number) => markNotificationRead(id, sessionApiOptions()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(sessionApiOptions()),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] })
  });
  const items = query.data?.content ?? [];

  return <section className="section-wrap page-section notifications-page">
    <div className="section-heading compact">
      <div><p className="eyebrow">Notifications</p><h1>消息<em>中心</em></h1></div>
      {canRead && items.length > 0 && <button className="text-button" disabled={readAllMutation.isPending} onClick={() => readAllMutation.mutate()}>全部已读</button>}
    </div>
    {!canRead ? <div className="empty-state"><p>登录后查看订单与售后动态。</p><button className="button button-dark" onClick={() => setShowLogin(true)}>登录账户 ↗</button></div>
      : query.isLoading ? <div className="loading-state">正在加载消息…</div>
        : items.length === 0 ? <div className="empty-state"><p>还没有消息，安静也是一种好状态。</p></div>
        : <div className="notification-list">
          {items.map((item: NotificationItem) => <div className={`notification-row ${item.isRead ? "read" : "unread"}`} key={item.id} onClick={() => !item.isRead && readMutation.mutate(item.id)}>
            <span className="notification-type">{TYPE_LABELS[item.notificationType] ?? "通知"}</span>
            <div><b>{item.title}</b><p>{item.content}</p><i>{item.createdAt}</i></div>
            {!item.isRead && <em className="notification-badge">未读</em>}
          </div>)}
        </div>}
    {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
  </section>;
}
