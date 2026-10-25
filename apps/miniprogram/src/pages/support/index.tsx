import { useCallback, useState } from "react";
import { Button, Navigator, Text, Textarea, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { createSupportTicket, getMySupportTickets, type SupportTicket } from "@suno/shared";
import { apiOptions, sessionApiOptions, sessionClient } from "../../lib/auth";

const TYPES = [["QUESTION", "咨询"], ["AFTER_SALE", "售后"], ["COMPLAINT", "投诉"], ["OTHER", "其他"]] as const;
const STATUS_LABELS: Record<string, string> = { OPEN: "待处理", PROCESSING: "处理中", CLOSED: "已关闭" };

/** P2 小程序工单：提交 + 我的工单 */
export default function Support() {
  const [ticketType, setTicketType] = useState<string>("QUESTION");
  const [content, setContent] = useState("");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "empty">("loading");
  const load = useCallback(() => {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { setLoadState("empty"); return; }
    getMySupportTickets(0, 20, sessionApiOptions())
      .then((page) => { setTickets(page.content); setLoadState(page.content.length === 0 ? "empty" : "ready"); })
      .catch(() => setLoadState("empty"));
  }, []);
  Taro.useDidShow?.(() => load());
  async function submit() {
    const session = sessionClient.read();
    if (!apiOptions.demo && !session) { Taro.showToast({ title: "请先在「我的」登录", icon: "none" }); return; }
    if (content.trim().length < 5) { Taro.showToast({ title: "描述至少 5 个字", icon: "none" }); return; }
    try {
      await createSupportTicket({ ticketType, content }, sessionApiOptions());
      Taro.showToast({ title: "已提交", icon: "success" });
      setContent("");
      load();
    } catch (error) {
      Taro.showToast({ title: error instanceof Error ? error.message : "提交失败", icon: "none" });
    }
  }
  return <View className="mini-page">
    <Navigator url="/pages/account/index" className="mini-back">← 返回我的</Navigator>
    <Text className="mini-page-title">客服工单</Text>
    <View className="mini-type-row">{TYPES.map(([value, label]) => <Button key={value} size="mini" className={`mini-button ${ticketType === value ? "mini-button-dark" : ""}`} onClick={() => setTicketType(value)}>{label}</Button>)}</View>
    <Textarea className="mini-textarea" value={content} onInput={(event) => setContent(event.detail.value)} placeholder="遇到什么问题？期望怎么解决？（至少 5 个字）" maxlength={500} />
    <Button className="mini-button mini-button-dark" onClick={() => void submit()}>提交工单 ↗</Button>
    <Text className="mini-reviews-title">我的工单</Text>
    {loadState !== "ready" && <Text className="mini-muted">{loadState === "loading" ? "正在加载…" : "还没有工单。"}</Text>}
    {tickets.map((ticket) => <View className="mini-notification" key={ticket.ticketId}>
      <Text className="mini-notification-title">{ticket.ticketNo} · {STATUS_LABELS[ticket.status] ?? ticket.status}</Text>
      <Text className="mini-notification-content">{ticket.content}</Text>
      {ticket.reply && <Text className="mini-review-reply">客服 · {ticket.reply}</Text>}
      <Text className="mini-notification-meta">{ticket.repliedAt ? `回复于 ${ticket.repliedAt}` : `提交于 ${ticket.createdAt}`}</Text>
    </View>)}
  </View>;
}
