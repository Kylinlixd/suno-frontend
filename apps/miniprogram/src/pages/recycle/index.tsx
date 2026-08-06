import { useState } from "react";
import { Button, Input, Text, Textarea, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { createRecycleApplication } from "@suno/shared";
import { sessionApiOptions } from "../../lib/auth";

export default function Recycle() {
  const [title, setTitle] = useState("");
  async function submit() { if (!title.trim()) return; try { await createRecycleApplication({ title, image: "https://picsum.photos/seed/mini-recycle/960/1200", snCode: title }, sessionApiOptions()); setTitle(""); Taro.showToast({ title: "申请已提交", icon: "success" }); } catch (error) { Taro.showToast({ title: error instanceof Error ? error.message : "请先登录", icon: "none" }); } }
  return <View className="mini-page mini-recycle"><Text className="mini-eyebrow">Suno Recycle</Text><Text className="mini-page-title">让闲置{`\n`}重新有用。</Text><Text className="mini-page-copy">拍下它现在的样子，告诉我们它是谁。我们负责审核、估价和下一次遇见。</Text><View className="mini-form"><Text className="mini-label">它是什么？</Text><Input className="mini-input" value={title} onInput={(event) => setTitle(event.detail.value)} placeholder="例如：iPhone 15 Pro Max" /><Text className="mini-label">补充描述</Text><Textarea className="mini-textarea" placeholder="使用多久、有什么瑕疵、配件是否齐全…" /><Button className="mini-button mini-button-lime" onClick={submit}>提交回收申请 ↗</Button></View><View className="mini-steps"><View><Text>01</Text><Text>拍照与描述</Text></View><View><Text>02</Text><Text>审核与估价</Text></View><View><Text>03</Text><Text>寄出与流转</Text></View></View></View>;
}
