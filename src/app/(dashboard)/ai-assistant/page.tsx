"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Send,
  Settings as SettingsIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);
  const [checkingProvider, setCheckingProvider] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    checkProvider();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkProvider = async () => {
    try {
      const response = await fetch("/api/ai-settings");
      const providers = await response.json();
      const hasDefault = providers.some((p: any) => p.isDefault && p.isValid);
      setHasProvider(hasDefault);
    } catch (error) {
      console.error("Check provider error:", error);
    } finally {
      setCheckingProvider(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเรียก AI Assistant");
      }

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage: Message = {
        role: "assistant",
        content: data.reply || data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("AI Assistant error", error);
      const description =
        error?.message || "เกิดข้อผิดพลาดในการเรียก AI Assistant";

      toast({
        title: "เกิดข้อผิดพลาดในการเรียก AI Assistant",
        description,
        variant: "destructive",
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            description ||
            "ขออภัย ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "สินค้าอะไรใกล้หมดบ้าง?",
    "แคมเปญไหน ROI ดีที่สุด?",
    "งบประมาณเหลือเท่าไหร่?",
    "ควรสั่งสินค้าเพิ่มอะไร?",
    "วิเคราะห์ประสิทธิภาพโฆษณา",
    "สรุปภาพรวมธุรกิจ",
  ];

  if (checkingProvider) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!hasProvider) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Assistant</h1>
          <p className="text-slate-400 mt-1">ผู้ช่วยอัจฉริยะสำหรับธุรกิจของคุณ</p>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-slate-700 p-4 mb-4">
              <Bot className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              ยังไม่ได้ตั้งค่า AI Provider
            </h3>
            <p className="text-slate-400 text-center max-w-md mb-6">
              กรุณาไปที่หน้า Settings เพื่อเพิ่ม AI Provider และทดสอบการเชื่อมต่อ
              <br />
              จากนั้นตั้งเป็น Default Provider เพื่อเริ่มใช้งาน AI Assistant
            </p>
            <Button onClick={() => router.push("/settings")}>
              <SettingsIcon className="w-4 h-4 mr-2" />
              ไปที่ Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-blue-500" />
            AI Assistant
          </h1>
          <p className="text-slate-400 mt-1">
            ถามอะไรก็ได้เกี่ยวกับธุรกิจของคุณ
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/settings")}>
          <SettingsIcon className="w-4 h-4 mr-2" />
          ตั้งค่า AI
        </Button>
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">คำถามที่ถามบ่อย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickPrompts.map((prompt, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4 text-left bg-white border-2 border-gray-300 text-gray-800 hover:bg-gray-50 hover:border-pink-300 rounded-xl font-medium transition-all"
                  onClick={() => {
                    setInput(prompt);
                    setTimeout(() => {
                      const form = document.getElementById(
                        "ai-assistant-form"
                      ) as HTMLFormElement | null;
                      form?.dispatchEvent(
                        new Event("submit", {
                          bubbles: true,
                          cancelable: true,
                        })
                      );
                    }, 100);
                  }}
                >
                  <span className="text-sm">{prompt}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="h-[500px] overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Bot className="w-16 h-16 mb-4" />
                <p className="text-lg font-semibold mb-2">
                  เริ่มต้นการสนทนากับ AI
                </p>
                <p className="text-sm text-center">
                  ถามเกี่ยวกับสินค้า, แคมเปญโฆษณา, งบประมาณ,
                  <br />
                  หรือให้ AI วิเคราะห์และแนะนำธุรกิจของคุณ
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs font-semibold">
                          AI Assistant
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <p className="text-[10px] opacity-70 mt-2 text-right">
                      {msg.timestamp.toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span className="text-sm text-white">AI กำลังคิด...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            id="ai-assistant-form"
            onSubmit={handleSend}
            className="flex gap-3 items-center"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ถามอะไรก็ได้เกี่ยวกับธุรกิจของคุณ..."
              disabled={loading}
              className="
                flex-1
                rounded-full
                bg-white
                text-slate-900
                placeholder:text-slate-500
                border border-slate-300
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-sky-500
                focus-visible:ring-offset-0
                px-5 py-3
                text-sm
              "
              style={{
                color: "#020617",
                caretColor: "#020617",
              }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-lg rounded-xl px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-300">
              <p className="font-semibold mb-1">AI Assistant สามารถ:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>
                  ตอบคำถามเกี่ยวกับข้อมูลในระบบ (สินค้า, โฆษณา, งบประมาณ)
                </li>
                <li>วิเคราะห์และแนะนำกลยุทธ์ธุรกิจ</li>
                <li>คำนวณและสรุปข้อมูลต่างๆ</li>
                <li>แนะนำการจัดการสต็อกและงบประมาณ</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
