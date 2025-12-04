"use client";

import { useState } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestedQuestions = [
  "สินค้าใกล้หมด?",
  "แคมเปญไหนดี?",
  "งบเหลือเท่าไหร่?",
  "วิเคราะห์ธุรกิจ",
];

export function AIChatDialog() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "สวัสดีครับ! ผมเป็น AI Assistant พร้อมช่วยวิเคราะห์ข้อมูลธุรกิจของคุณครับ 🤖",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message?: string) => {
    const msgToSend = message || input.trim();
    if (!msgToSend || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: msgToSend }]);
    setInput("");
    setLoading(true);

    // mock response
    setTimeout(() => {
      const responses = [
        "จากการวิเคราะห์ข้อมูล แนะนำให้เพิ่มงบโฆษณา TikTok เพราะมี ROI สูงที่สุดครับ",
        "สินค้าที่ควรเติมสต็อกตอนนี้คือ สบู่เหลว Dove และ โลชั่น Vaseline ครับ",
        "แคมเปญ Facebook มีประสิทธิภาพดีมาก CTR อยู่ที่ 3.2% ครับ",
      ];
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: responses[Math.floor(Math.random() * responses.length)],
        },
      ]);
      setLoading(false);
    }, 1500);
  };

  return (
    <>
      {/* ปุ่มลอยเปิด AI Assistant */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 z-50 border-0"
        size="icon"
      >
        <Bot className="h-7 w-7 text-white" />
      </Button>

      {/* Dialog หลัก */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl border border-purple-500/70 bg-slate-950/95 text-slate-100 shadow-[0_0_40px_rgba(168,85,247,0.7)]">
          <DialogHeader className="border-b border-slate-700 pb-4 -mx-6 -mt-6 px-6 pt-6 mb-4 bg-gradient-to-r from-purple-900/70 to-slate-950/0">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-100">
              <div className="p-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500">
                <Bot className="h-6 w-6 text-white" />
              </div>
              AI Assistant
              <Sparkles className="h-5 w-5 text-purple-300" />
            </DialogTitle>
          </DialogHeader>

          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto space-y-4 px-2 bg-slate-900/80 rounded-xl p-4">
            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-sm text-slate-300 font-medium mb-3">
                  คำถามแนะนำ:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(question)}
                      className="bg-slate-900 border border-slate-600 text-slate-100 hover:bg-slate-800 hover:border-pink-400 font-medium text-xs h-auto py-2 rounded-xl"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-xl px-4 py-3 text-sm font-medium",
                    msg.role === "user"
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      : "bg-slate-800 border border-slate-600 text-slate-100"
                  )}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                    U
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-300" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2 pt-4 border-t border-slate-700 bg-slate-950/95 p-2">
            <div className="flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && input.trim()) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="พิมพ์ข้อความ..."
                disabled={loading}
                className="flex h-10 w-full flex-1 rounded-md border-2 border-pink-500/70 bg-slate-900/90 px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  color: "#ffffff",
                  WebkitTextFillColor: "#ffffff",
                }}
              />
            </div>

            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md flex-shrink-0 rounded-xl"
              size="icon"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
