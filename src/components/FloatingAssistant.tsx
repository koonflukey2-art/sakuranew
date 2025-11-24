"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Loader2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type ChatRole = "USER" | "ASSISTANT";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const autoInsight = window.localStorage.getItem("sakura_auto_insight");
    if (!autoInsight) return;

    setMessages((prev) => {
      if (prev.some((m) => m.id.startsWith("auto-insight-"))) {
        return prev;
      }

      return [
        ...prev,
        {
          id: `auto-insight-${Date.now()}`,
          role: "ASSISTANT",
          content: autoInsight,
          createdAt: new Date().toISOString(),
        },
      ];
    });

    window.localStorage.removeItem("sakura_auto_insight");
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "USER",
      content: input.trim(),
      createdAt: new Date().toISOString(),
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
        throw new Error(data.error || "Failed to get response");
      }

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const reply =
        typeof data.reply === "string"
          ? data.reply
          : typeof data.response === "string"
          ? data.response
          : "";

      if (!reply) {
        throw new Error("ไม่ได้รับคำตอบจาก AI");
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ASSISTANT",
        content: reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("AI Assistant error", error);
      const description =
        error?.message || "ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง";

      toast({
        title: "เกิดข้อผิดพลาดในการเรียก AI Assistant",
        description,
        variant: "destructive",
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          role: "ASSISTANT",
          content:
            description ||
            "ขออภัย ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setIsMinimized(false);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-110"
        >
          <Bot className="w-8 h-8" />
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="rounded-full w-16 h-16 shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Bot className="w-8 h-8" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] shadow-2xl">
      <Card className="h-full bg-slate-900 border-slate-700 flex flex-col">
        <CardHeader className="border-b border-slate-700 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5 text-blue-500" />
              AI Assistant
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(true)}
                className="h-8 w-8 p-0"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
              <Bot className="w-16 h-16 text-slate-600" />
              <p className="text-sm text-slate-400 text-center">
                ถามอะไรก็ได้เกี่ยวกับธุรกิจของคุณ
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2"
                  onClick={() => handleQuickPrompt("สินค้าใกล้หมดมีอะไรบ้าง?")}
                >
                  สินค้าใกล้หมด?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2"
                  onClick={() => handleQuickPrompt("แคมเปญไหนมี ROI ดีที่สุด?")}
                >
                  แคมเปญไหนดี?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2"
                  onClick={() => handleQuickPrompt("งบประมาณเหลือเท่าไหร่?")}
                >
                  งบเหลือเท่าไหร่?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2"
                  onClick={() => handleQuickPrompt("วิเคราะห์ธุรกิจให้หน่อย")}
                >
                  วิเคราะห์ธุรกิจ
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages
                  .filter((msg): msg is ChatMessage => !!msg && !!msg.role && !!msg.content)
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "USER" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          msg.role === "USER"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-800 text-white"
                        }`}
                      >
                        {msg.role === "ASSISTANT" && (
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="w-3 h-3" />
                            <span className="text-xs font-semibold text-blue-400">
                              AI
                            </span>
                          </div>
                        )}
                        <div className="prose prose-sm prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          <div className="p-4 border-t border-slate-700">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="พิมพ์ข้อความ..."
                disabled={loading}
                className="flex-1 bg-slate-800 border-slate-600"
              />
              <Button
                type="submit"
                disabled={loading || !input.trim()}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
