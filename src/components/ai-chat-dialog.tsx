"use client";

import { useState } from "react";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string; }

const suggestedQuestions = [
  "สันคำโต้กลับ?",
  "แคมเปญใหนดี?",
  "งบเหลือเท่าไหร่?",
  "วิเคราะห์สรีงก้อง"
];

export function AIChatDialog() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "สวัสดีครับ! ผมเป็น AI Assistant พร้อมช่วยวิเคราะห์ข้อมูลธุรกิจของคุณครับ 🤖" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message?: string) => {
    const msgToSend = message || input.trim();
    if (!msgToSend || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: msgToSend }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const responses = [
        "จากการวิเคราะห์ข้อมูล แนะนำให้เพิ่มงบโฆษณา TikTok เพราะมี ROI สูงที่สุดครับ",
        "สินค้าที่ควรเติมสต็อกตอนนี้คือ สบู่เหลว Dove และ โลชั่น Vaseline ครับ",
        "แคมเปญ Facebook มีประสิทธิภาพดีมาก CTR อยู่ที่ 3.2% ครับ",
      ];
      setMessages((prev) => [...prev, { role: "assistant", content: responses[Math.floor(Math.random() * responses.length)] }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 z-50 border-0"
        size="icon"
      >
        <Bot className="h-7 w-7 text-white" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl bg-white border-2 border-gray-200">
          <DialogHeader className="border-b-2 border-gray-200 pb-4 bg-gradient-to-r from-pink-50 to-purple-50 -mx-6 -mt-6 px-6 pt-6 mb-4">
            <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-800">
              <div className="p-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500">
                <Bot className="h-6 w-6 text-white" />
              </div>
              AI Assistant
              <Sparkles className="h-5 w-5 text-purple-600" />
            </DialogTitle>
          </DialogHeader>

          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto space-y-4 px-2 bg-gradient-to-br from-pink-50/30 via-white to-purple-50/30 rounded-xl p-4">
            {messages.length === 1 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 font-medium mb-3">คำถามแนะนำ:</p>
                <div className="grid grid-cols-2 gap-2">
                  {suggestedQuestions.map((question, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(question)}
                      className="bg-white border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 font-medium text-xs h-auto py-2"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
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
                      : "bg-white border-2 border-gray-200 text-gray-800"
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
                <div className="bg-white border-2 border-gray-200 rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                </div>
              </div>
            )}
          </div>

          {/* Input Area - HIGH CONTRAST */}
          <div className="flex gap-2 pt-4 border-t-2 border-gray-200">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
              placeholder="พิมพ์คำถาม..."
              disabled={loading}
              className="bg-white border-2 border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 font-medium"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md"
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
