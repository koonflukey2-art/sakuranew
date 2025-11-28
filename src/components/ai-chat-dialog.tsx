"use client";

import { useState } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      {/* ปุ่มกลมเรียก AI Assistant */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 z-50 border-0"
        size="icon"
      >
        <Bot className="h-7 w-7 text-white" />
      </Button>

      {/* Dialog หลัก */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-2xl border-2"
          style={{
            backgroundColor: "#ffffff",
            color: "#111827",
            borderColor: "#e5e7eb",
          }}
        >
          <DialogHeader
            className="border-b-2 pb-4 -mx-6 -mt-6 px-6 pt-6 mb-4"
            style={{
              borderBottomColor: "#e5e7eb",
              background: "linear-gradient(to right, #fce7f3, #f3e8ff)",
            }}
          >
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
              <div
                className="p-2 rounded-xl"
                style={{
                  background: "linear-gradient(to right, #ec4899, #a855f7)",
                }}
              >
                <Bot className="h-6 w-6 text-white" />
              </div>
              AI Assistant
              <Sparkles className="h-5 w-5 text-purple-600" />
            </DialogTitle>
          </DialogHeader>

          {/* Chat Messages */}
          <div
            className="h-96 overflow-y-auto space-y-4 px-2 rounded-xl p-4"
            style={{
              background:
                "linear-gradient(to bottom right, #fce7f3, #ffffff, #f3e8ff)",
            }}
          >
            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 font-medium mb-3">
                  คำถามแนะนำ:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(question)}
                      className="text-xs h-auto py-2 font-medium"
                      style={{
                        backgroundColor: "#ffffff",
                        border: "2px solid #d8b4fe",
                        color: "#7c3aed",
                        borderRadius: "0.5rem",
                        padding: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3e8ff";
                        e.currentTarget.style.borderColor = "#a78bfa";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.borderColor = "#d8b4fe";
                      }}
                    >
                      {question}
                    </button>
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
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(to bottom right, #ec4899, #a855f7)",
                    }}
                  >
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                <div
                  className="max-w-[75%] rounded-xl px-4 py-3 text-sm font-medium"
                  style={
                    msg.role === "user"
                      ? {
                          background:
                            "linear-gradient(to right, #ec4899, #a855f7)",
                          color: "#ffffff",
                        }
                      : {
                          backgroundColor: "#ffffff",
                          border: "2px solid #e5e7eb",
                          color: "#111827",
                        }
                  }
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                    style={{
                      background:
                        "linear-gradient(to bottom right, #06b6d4, #3b82f6)",
                    }}
                  >
                    U
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-start gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      "linear-gradient(to bottom right, #ec4899, #a855f7)",
                  }}
                >
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "2px solid #e5e7eb",
                  }}
                >
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area – พื้นหลังดำ ตัวหนังสือขาว */}
          <div
            className="flex gap-2 pt-4 border-t-2 border-gray-200"
            style={{ paddingTop: "1rem" }}
          >
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading && input.trim()) {
                  sendMessage();
                }
              }}
              placeholder="พิมพ์ข้อความ..."
              disabled={loading}
              // class tailwind: พื้นหลังดำ, ตัวหนังสือขาว, placeholder เทา
              className="bg-slate-900 text-white placeholder:text-slate-300 border-2 border-slate-900"
              // inline style เผื่อมี class อื่นมาทับ -> บังคับ text ให้ขาวแน่นอน
              style={{ color: "#ffffff" }}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md flex-shrink-0"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
