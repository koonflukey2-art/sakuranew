"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Plus,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIConfig {
  id: string;
  provider: "GEMINI" | "OPENAI" | "N8N";
  isActive: boolean;
  isDefault: boolean;
  isValid: boolean;
  hasApiKey: boolean;
  lastTested?: string | null;
  modelName?: string | null;
}

type ChatRole = "USER" | "ASSISTANT";

interface Message {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  provider: string;
  updatedAt: string;
  _count: { messages: number };
  messages?: Message[];
}

export default function AIChatPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
    fetchSessions();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConfigs = async () => {
    try {
      const response = await fetch("/api/ai-settings");
      if (!response.ok) throw new Error("Failed to fetch AI configs");
      const data = await response.json();

      const list: AIConfig[] = Array.isArray(data)
        ? data.map((item: any) => ({
            id: item.id,
            provider: item.provider as "GEMINI" | "OPENAI" | "N8N",
            isActive: item.isDefault ?? false,
            isDefault: item.isDefault ?? false,
            isValid: item.isValid ?? false,
            hasApiKey: item.hasApiKey ?? Boolean(item.apiKey),
            lastTested: item.lastTested ?? null,
            modelName: item.modelName ?? null,
          }))
        : [];

      setConfigs(list);

      const firstValid = list.find((c) => c.isValid && c.hasApiKey);
      if (firstValid && !selectedProvider) {
        setSelectedProvider(firstValid.provider);
      }
    } catch (error) {
      console.error("Failed to fetch AI configs", error);
      setConfigs([]);
      toast({
        title: "Error",
        description: "Failed to fetch AI configs",
        variant: "destructive",
      });
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/ai/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setSessions(data);
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const loadSession = async (session: ChatSession) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/sessions/${session.id}`);

      if (response.status === 404) {
        toast({
          title: "ไม่พบ Session",
          description: "Session นี้ถูกลบไปแล้ว",
          variant: "destructive",
        });
        fetchSessions();
        return;
      }

      if (!response.ok) throw new Error("Failed to load session");

      const data = await response.json();
      setSessionId(session.id);

      const loadedMessages: Message[] = (data.messages || []).map((msg: any) => ({
        id: msg.id,
        role: (msg.role as ChatRole) || "ASSISTANT",
        content: msg.content || "",
        createdAt: msg.createdAt || new Date().toISOString(),
      }));

      setMessages(loadedMessages);

      toast({
        title: "Session loaded",
        description: `Loaded ${loadedMessages.length} messages`,
      });
    } catch (error: any) {
      console.error("Failed to load session:", error);
      toast({
        title: "Error",
        description: "Failed to load chat session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validConfig =
    Array.isArray(configs)
      ? configs.find(
          (c) =>
            c.provider === (selectedProvider as any) &&
            c.isValid &&
            c.hasApiKey
        )
      : undefined;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const messageText = input.trim();
    if (!messageText || !selectedProvider || !validConfig) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "USER",
      content: messageText,
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
          message: messageText,
          provider: selectedProvider,
          model: validConfig.modelName || undefined,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ASSISTANT",
        content: data.reply || data.response || "ไม่สามารถตอบได้",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      fetchSessions();
    } catch (error: any) {
      console.error("Send message error:", error);
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถส่งข้อความได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([]);
  };

  const handleDeleteSession = async (delSessionId: string) => {
    try {
      const res = await fetch(`/api/ai/sessions?id=${delSessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete session");
      }

      toast({ title: "ลบสำเร็จ!" });
      fetchSessions();
      if (delSessionId === sessionId) {
        handleNewChat();
      }
    } catch (error: any) {
      console.error("Delete session error:", error);
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถลบ session ได้",
        variant: "destructive",
      });
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "เมื่อสักครู่";
      if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
      if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
      if (days < 7) return `${days} วันที่แล้ว`;
      return date.toLocaleDateString("th-TH");
    } catch {
      return "";
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar - Chat History */}
      <Card className="w-80 bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Chat History</CardTitle>
            <Button size="sm" onClick={handleNewChat} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <CardContent className="p-4 space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">ยังไม่มีประวัติการแชท</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    sessionId === session.id
                      ? "bg-slate-700 ring-2 ring-blue-500"
                      : "bg-slate-800/50 hover:bg-slate-700"
                  }`}
                  onClick={() => loadSession(session)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-medium">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">
                          {session._count?.messages ?? 0} messages
                        </p>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-400">
                          {formatTime(session.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-400" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select
                  value={selectedProvider}
                  onValueChange={setSelectedProvider}
                >
                  <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="เลือก AI Model" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="GEMINI">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Google Gemini
                      </div>
                    </SelectItem>
                    <SelectItem value="OPENAI">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        OpenAI GPT
                      </div>
                    </SelectItem>
                    <SelectItem value="N8N">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        n8n Workflow
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {validConfig ? (
                  <Badge className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="flex-1 bg-slate-800 border-slate-700 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Bot className="w-16 h-16 mb-4" />
                  <p className="text-lg font-semibold mb-2">
                    เริ่มแชทกับ AI Assistant
                  </p>
                  <p className="text-sm text-center">
                    ถามเกี่ยวกับสต็อก, โฆษณา, งบประมาณ, หรือวิเคราะห์ธุรกิจ
                  </p>
                </div>
              ) : (
                messages
                  .filter(
                    (msg): msg is Message =>
                      !!msg && !!msg.role && !!msg.content
                  )
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === "USER" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          msg.role === "USER"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        {msg.role === "ASSISTANT" && (
                          <div className="flex items-center gap-2 mb-2">
                            <Bot className="w-4 h-4" />
                            <span className="text-xs font-semibold">
                              {selectedProvider}
                            </span>
                          </div>
                        )}
                        <div className="prose prose-invert max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-700 rounded-lg p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </Card>

        {/* Input */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ถามอะไรก็ได้เกี่ยวกับธุรกิจของคุณ..."
                disabled={!validConfig || loading}
                className="flex-1 bg-slate-900 border-slate-600 text-white"
              />
              <Button
                type="submit"
                disabled={!validConfig || loading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
