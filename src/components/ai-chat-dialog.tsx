"use client";

import { useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
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

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const text = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: text }]);
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
      {/* Floating button เรียก AI */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 z-50"
        size="icon"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "sm:max-w-md bg-white text-slate-900",
            "border border-slate-200 shadow-xl",
            // ทำให้ปุ่ม X (close) มองเห็นชัดตลอด
            "[&>button]:opacity-100 [&>button]:visible",
            "[&>button]:flex [&>button]:items-center [&>button]:justify-center",
            "[&>button]:w-8 [&>button]:h-8 [&>button]:rounded-full",
            "[&>button]:bg-slate-100 [&>button]:text-slate-700",
            "[&>button:hover]:bg-slate-200 [&>button:hover]:text-slate-900",
            "[&>button]:shadow-sm"
          )}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20">
                <Bot className="h-5 w-5 text-emerald-500" />
              </div>
              AI Assistant
            </DialogTitle>
          </DialogHeader>

          {/* พื้นที่แชท */}
          <div className="h-80 overflow-y-auto space-y-4 p-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-100 text-slate-900"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-600" />
                </div>
              </div>
            )}
          </div>

          {/* แถบพิมพ์ข้อความ */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="พิมพ์คำถาม..."
              disabled={loading}
              className="
                flex-1
                bg-slate-900
                text-white
                placeholder:text-slate-400
                border border-slate-700
                rounded-full
                focus-visible:ring-2
                focus-visible:ring-emerald-500
                focus-visible:ring-offset-0
                focus-visible:outline-none
              "
              style={{
                color: "#ffffff",     // สีตัวอักษรขาว
                caretColor: "#ffffff" // เคอร์เซอร์สีขาว
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              size="icon"
              className="
                rounded-full
                bg-gradient-to-r from-emerald-500 to-cyan-500
                hover:from-emerald-600 hover:to-cyan-600
                disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center
              "
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
