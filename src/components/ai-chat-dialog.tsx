"use client";

import { useState } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; content: string; }

export function AIChatDialog() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "สวัสดีครับ! ผมเป็น AI Assistant พร้อมช่วยวิเคราะห์ข้อมูลธุรกิจของคุณครับ 🤖" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: input.trim() }]);
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
      <Button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 z-50" size="icon">
        <Bot className="h-6 w-6 text-white" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20">
                <Bot className="h-5 w-5 text-emerald-500" />
              </div>
              AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="h-80 overflow-y-auto space-y-4 p-2">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-lg px-4 py-2 text-sm", msg.role === "user" ? "bg-emerald-500 text-white" : "bg-muted")}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-muted rounded-lg px-4 py-2"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
          </div>
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="พิมพ์คำถาม..." disabled={loading} />
            <Button onClick={sendMessage} disabled={loading} size="icon"><Send className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
