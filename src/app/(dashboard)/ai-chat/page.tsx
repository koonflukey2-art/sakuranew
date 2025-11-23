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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
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
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string;
  provider: string;
  updatedAt: string;
  _count: { messages: number };
}

interface QuickPrompt {
  id: number;
  category: string;
  prompts: string[];
}

export default function AIChatPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [quickPrompts, setQuickPrompts] = useState<QuickPrompt[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
    fetchSessions();
    fetchQuickPrompts();
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
            provider: item.provider,
            isActive: item.isDefault ?? false,
            isDefault: item.isDefault ?? false,
            isValid: item.isValid ?? false,
            hasApiKey: item.hasApiKey ?? false,
            lastTested: item.lastTested ?? null,
          }))
        : [];

      setConfigs(list);

      // If no selectedProvider yet, pick the first valid config as default
      const firstValid = list.find((c) => c.isValid);
      if (firstValid && !selectedProvider) {
        setSelectedProvider(firstValid.provider);
      }
    } catch (error) {
      console.error("Failed to fetch AI configs", error);
      setConfigs([]); // keep it an array to avoid configs.find error
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
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  const fetchQuickPrompts = async () => {
    try {
      const response = await fetch("/api/ai/quick-prompts");
      const data = await response.json();
      setQuickPrompts(data);
    } catch (error) {
      console.error("Failed to fetch quick prompts:", error);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const provider = formData.get("provider") as string;
    const apiKey = formData.get("apiKey") as string;

    try {
      const response = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast({ title: "บันทึกสำเร็จ!", description: "API key ถูกบันทึกแล้ว" });
      e.currentTarget.reset();
      setIsConfigOpen(false);
      fetchConfigs();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถบันทึก API key ได้",
        variant: "destructive",
      });
    }
  };

  const handleTestConfig = async (configId: string) => {
    try {
      setTesting(configId);
      const response = await fetch(`/api/ai/config?id=${configId}`, {
        method: "PUT",
      });

      const data = await response.json();

      toast({
        title: data.isValid ? "สำเร็จ!" : "ล้มเหลว",
        description: data.message,
        variant: data.isValid ? "default" : "destructive",
      });

      fetchConfigs();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบ API key ได้",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, quickPrompt?: string) => {
    if (e) e.preventDefault();

    const messageText = quickPrompt || input;
    if (!messageText.trim() || !selectedProvider) return;

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
        body: JSON.stringify({ message: messageText }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      // Create assistant message from response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "ASSISTANT",
        content: data.response || "ไม่สามารถตอบได้",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      fetchSessions();
    } catch (error: any) {
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

  const handleLoadSession = async (session: ChatSession) => {
    setSessionId(session.id);
    // Load messages ของ session นั้น
    // TODO: สร้าง API endpoint สำหรับดึง messages ของ session
  };

  const handleDeleteSession = async (delSessionId: string) => {
    try {
      await fetch(`/api/ai/sessions?id=${delSessionId}`, {
        method: "DELETE",
      });
      toast({ title: "ลบสำเร็จ!" });
      fetchSessions();
      if (delSessionId === sessionId) {
        handleNewChat();
      }
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบ session ได้",
        variant: "destructive",
      });
    }
  };

  const handleExportChat = () => {
    const chatText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const blob = new Blob([chatText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-${new Date().toISOString()}.txt`;
    a.click();

    toast({ title: "Export สำเร็จ!" });
  };

  const validConfig =
    Array.isArray(configs)
      ? configs.find(
          (c) =>
            c.provider === selectedProvider &&
            c.isValid &&
            c.hasApiKey
        )
      : undefined;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar - Sessions */}
      {showSessions && (
        <Card className="w-80 bg-slate-800 border-slate-700">
          <CardHeader className="border-b border-slate-700">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Chat History</CardTitle>
              <Button size="sm" onClick={handleNewChat}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <ScrollArea className="h-full">
            <CardContent className="p-4 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    sessionId === session.id
                      ? "bg-slate-700"
                      : "bg-slate-800 hover:bg-slate-700"
                  }`}
                  onClick={() => handleLoadSession(session)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {session._count.messages} messages • {session.provider}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
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

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleExportChat}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setIsConfigOpen(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Prompts */}
        {messages.length === 0 && quickPrompts.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">คำถามที่ถามบ่อย</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {quickPrompts.map((category) => (
                  <div key={category.id}>
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">
                      {category.category}
                    </h3>
                    <div className="space-y-2">
                      {category.prompts.slice(0, 3).map((prompt, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3"
                          onClick={() => handleSendMessage(undefined, prompt)}
                          disabled={!validConfig}
                        >
                          <span className="text-xs">{prompt}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <Card className="flex-1 bg-slate-800 border-slate-700 overflow-hidden">
          <ScrollArea className="h-full p-6">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
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
                  .filter((msg): msg is Message => !!msg && !!msg.role && !!msg.content)
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
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!validConfig || loading || !input.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Config Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Configure AI Models</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <h3 className="font-semibold">Current Configurations:</h3>
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
              >
                <div>
                  <p className="font-medium">{config.provider}</p>
                  <p className="text-xs text-slate-400">
                    {config.hasApiKey ? "API Key configured" : "No API key"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {config.isValid ? (
                    <Badge className="bg-green-500">Valid</Badge>
                  ) : (
                    <Badge variant="destructive">Invalid</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConfig(config.id)}
                    disabled={!config.hasApiKey || testing === config.id}
                  >
                    {testing === config.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <Label>AI Provider</Label>
              <Select name="provider" required>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="GEMINI">Google Gemini</SelectItem>
                  <SelectItem value="OPENAI">OpenAI GPT</SelectItem>
                  <SelectItem value="N8N">n8n Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>API Key / Webhook URL</Label>
              <Input
                name="apiKey"
                placeholder="Enter your API key or webhook URL"
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfigOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
