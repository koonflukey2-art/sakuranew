"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Bot, Send, Settings, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface AIConfig {
  id: string;
  provider: string;
  isActive: boolean;
  isValid: boolean;
  hasApiKey: boolean;
  lastTested?: string;
}

interface Message {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

export default function AIChatPage() {
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConfigs = async () => {
    try {
      const response = await fetch("/api/ai/config");
      const data = await response.json();
      setConfigs(data);

      // เลือก provider แรกที่ valid
      const validConfig = data.find((c: AIConfig) => c.isValid);
      if (validConfig && !selectedProvider) {
        setSelectedProvider(validConfig.provider);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch AI configs",
        variant: "destructive",
      });
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

      toast({ title: "Saved!", description: "API key saved successfully" });
      e.currentTarget.reset();
      setIsConfigOpen(false);
      fetchConfigs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API key",
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
        title: data.isValid ? "Success!" : "Failed",
        description: data.message,
        variant: data.isValid ? "default" : "destructive",
      });

      fetchConfigs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test API key",
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedProvider) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "USER",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          provider: selectedProvider,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, data.message]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validConfig = configs.find(
    (c) => c.provider === selectedProvider && c.isValid
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Chat Assistant</h1>
          <p className="text-slate-400 mt-1">
            Chat with AI about your business data
          </p>
        </div>
        <Button onClick={() => setIsConfigOpen(true)} variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Configure AI
        </Button>
      </div>

      {/* AI Provider Selector */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-white">Select AI Model:</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-64 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Choose AI Model" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="GEMINI">Google Gemini</SelectItem>
                <SelectItem value="OPENAI">OpenAI GPT</SelectItem>
                <SelectItem value="N8N">n8n Workflow</SelectItem>
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
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="h-[500px] overflow-y-auto space-y-4 mb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Bot className="w-16 h-16 mb-4" />
                <p>Start chatting with AI about your business!</p>
                <p className="text-sm mt-2">
                  Ask about products, campaigns, budgets, or analytics
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "USER" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
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
                    <p className="whitespace-pre-wrap">{msg.content}</p>
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

          {/* Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your business..."
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

      {/* Config Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Configure AI Models</DialogTitle>
          </DialogHeader>

          {/* Current Configs */}
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

          {/* Add/Update Form */}
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
              <Textarea
                name="apiKey"
                placeholder="Enter your API key or webhook URL"
                required
                rows={3}
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
