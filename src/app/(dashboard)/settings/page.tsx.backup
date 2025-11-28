"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, X, Sparkles, RefreshCw, Trash2 } from "lucide-react";

interface AIProvider {
  id: string;
  provider: string;
  modelName?: string;
  isActive: boolean;
  isDefault: boolean;
  isValid: boolean;
  lastTested?: string;
  hasApiKey: boolean;
}

export default function SettingsPage() {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>("GEMINI");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-settings");
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดการตั้งค่าได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "กรุณากรอก API Key",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
          modelName,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast({ title: "✅ บันทึกสำเร็จ!" });
      setApiKey("");
      setModelName("");
      fetchProviders();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถบันทึกได้",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (providerId: string) => {
    try {
      setTestingId(providerId);
      const response = await fetch(`/api/ai-settings?id=${providerId}`, {
        method: "PUT",
      });

      const data = await response.json();

      toast({
        title: data.success ? "✅ สำเร็จ!" : "❌ ล้มเหลว",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });

      fetchProviders();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบได้",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (providerId: string) => {
    try {
      await fetch("/api/ai-settings/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId }),
      });

      toast({ title: "✅ ตั้งเป็น Default แล้ว" });
      fetchProviders();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถตั้งค่าได้",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm("ยืนยันการลบ?")) return;

    try {
      await fetch(`/api/ai-settings?id=${providerId}`, {
        method: "DELETE",
      });

      toast({ title: "✅ ลบสำเร็จ" });
      fetchProviders();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">AI Provider Settings</h1>
        <p className="text-slate-400 mt-1">
          ตั้งค่า AI และ Model สำหรับใช้ในระบบ
        </p>
      </div>

      {/* Add New Provider */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">เพิ่ม AI Provider</CardTitle>
          <CardDescription className="text-slate-400">
            เลือก Provider และใส่ API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-white">AI Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="GEMINI">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Google Gemini
                    </div>
                  </SelectItem>
                  <SelectItem value="OPENAI">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      OpenAI GPT
                    </div>
                  </SelectItem>
                  <SelectItem value="N8N">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      n8n Workflow
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Model Name (Optional)</Label>
              <Input
                placeholder="เช่น gemini-pro, gpt-4"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-white">
              {selectedProvider === "N8N" ? "Webhook URL" : "API Key"}
            </Label>
            <Input
              type="password"
              placeholder={
                selectedProvider === "N8N"
                  ? "https://n8n.example.com/webhook/..."
                  : "AIza... หรือ sk-..."
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-400 mt-1">
              {selectedProvider === "GEMINI" && (
                <>
                  Get API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    className="text-blue-400 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </>
              )}
              {selectedProvider === "OPENAI" && (
                <>
                  Get API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    className="text-blue-400 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              )}
              {selectedProvider === "N8N" && "Webhook URL จาก n8n workflow ของคุณ"}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึก API Key
          </Button>
        </CardContent>
      </Card>

      {/* Existing Providers */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">AI Providers ที่บันทึกไว้</CardTitle>
          <CardDescription className="text-slate-400">
            จัดการและทดสอบ API Keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>ยังไม่มี AI Provider</p>
              <p className="text-sm mt-2">เพิ่ม Provider ด้านบนเพื่อเริ่มใช้งาน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">
                        {provider.provider === "GEMINI" && "Google Gemini"}
                        {provider.provider === "OPENAI" && "OpenAI GPT"}
                        {provider.provider === "N8N" && "n8n Workflow"}
                      </h3>
                      {provider.isDefault && (
                        <Badge className="bg-blue-500">ค่าเริ่มต้น</Badge>
                      )}
                      {provider.isValid ? (
                        <Badge className="bg-green-500">
                          <Check className="w-3 h-3 mr-1" />
                          ใช้งานได้
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="w-3 h-3 mr-1" />
                          ยังไม่ทดสอบ
                        </Badge>
                      )}
                    </div>
                    {provider.modelName && (
                      <p className="text-sm text-slate-400 mt-1">
                        Model: {provider.modelName}
                      </p>
                    )}
                    {provider.lastTested && (
                      <p className="text-xs text-slate-500 mt-1">
                        ทดสอบล่าสุด: {new Date(provider.lastTested).toLocaleString("th-TH")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(provider.id)}
                      disabled={testingId === provider.id}
                    >
                      {testingId === provider.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-2">ทดสอบ</span>
                    </Button>

                    {provider.isValid && !provider.isDefault && (
                      <Button
                        size="sm"
                        onClick={() => handleSetDefault(provider.id)}
                      >
                        ตั้งเป็นค่าเริ่มต้น
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">วิธีใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-300 space-y-2">
          <p>1. เลือก AI Provider ที่ต้องการ (Gemini, OpenAI, หรือ n8n)</p>
          <p>2. ใส่ API Key หรือ Webhook URL</p>
          <p>3. คลิก "บันทึก API Key"</p>
          <p>4. คลิก "ทดสอบ" เพื่อตรวจสอบการเชื่อมต่อ</p>
          <p>5. ถ้าผ่าน ให้คลิก "ตั้งเป็นค่าเริ่มต้น"</p>
          <p>6. ไปที่หน้า Dashboard แล้วเปิด AI Assistant เพื่อใช้งาน!</p>
        </CardContent>
      </Card>
    </div>
  );
}
