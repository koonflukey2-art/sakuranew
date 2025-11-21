"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Webhook, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [n8nUrl, setN8nUrl] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, "success" | "error" | null>>({
    gemini: null,
    openai: null,
    n8n: null,
  });

  const testConnection = async (type: string) => {
    setTesting(type);
    // Simulate API test
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStatus((prev) => ({ ...prev, [type]: Math.random() > 0.3 ? "success" : "error" }));
    setTesting(null);
  };

  const handleSave = () => {
    // Save to database via API
    alert("บันทึกการตั้งค่าเรียบร้อย");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        <p className="text-muted-foreground">กำหนดค่า API และการเชื่อมต่อ</p>
      </div>

      <div className="grid gap-6">
        {/* Gemini API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              Gemini API Key
            </CardTitle>
            <CardDescription>API Key สำหรับ Google Gemini AI</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input type="password" placeholder="AIza..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={() => testConnection("gemini")} disabled={testing === "gemini" || !geminiKey}>
                {testing === "gemini" ? <Loader2 className="h-4 w-4 animate-spin" /> : "ทดสอบ"}
              </Button>
            </div>
            {status.gemini && (
              <Badge variant={status.gemini === "success" ? "default" : "destructive"} className="flex items-center gap-1 w-fit">
                {status.gemini === "success" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {status.gemini === "success" ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อล้มเหลว"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* OpenAI API */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-green-500" />
              OpenAI API Key
            </CardTitle>
            <CardDescription>API Key สำหรับ OpenAI GPT (Optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input type="password" placeholder="sk-..." value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={() => testConnection("openai")} disabled={testing === "openai" || !openaiKey}>
                {testing === "openai" ? <Loader2 className="h-4 w-4 animate-spin" /> : "ทดสอบ"}
              </Button>
            </div>
            {status.openai && (
              <Badge variant={status.openai === "success" ? "default" : "destructive"} className="flex items-center gap-1 w-fit">
                {status.openai === "success" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {status.openai === "success" ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อล้มเหลว"}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* N8N Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-orange-500" />
              N8N Webhook URL
            </CardTitle>
            <CardDescription>URL สำหรับ Automation Workflows (Optional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input type="url" placeholder="https://n8n.example.com/webhook/..." value={n8nUrl} onChange={(e) => setN8nUrl(e.target.value)} className="flex-1" />
              <Button variant="outline" onClick={() => testConnection("n8n")} disabled={testing === "n8n" || !n8nUrl}>
                {testing === "n8n" ? <Loader2 className="h-4 w-4 animate-spin" /> : "ทดสอบ"}
              </Button>
            </div>
            {status.n8n && (
              <Badge variant={status.n8n === "success" ? "default" : "destructive"} className="flex items-center gap-1 w-fit">
                {status.n8n === "success" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {status.n8n === "success" ? "เชื่อมต่อสำเร็จ" : "เชื่อมต่อล้มเหลว"}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-gradient-to-r from-emerald-500 to-cyan-500">
          <Settings className="h-4 w-4 mr-2" />
          บันทึกการตั้งค่า
        </Button>
      </div>
    </div>
  );
}
