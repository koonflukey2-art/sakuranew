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
import { Loader2, Check, X, Sparkles, RefreshCw, Trash2, Globe2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

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
  // RBAC: Only ADMIN can access settings
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/rbac/check-access");

        if (!response.ok) {
          console.error("Failed to check permissions");
          router.push("/");
          return;
        }

        const data = await response.json();

        if (!data.permissions.canAccessSettings) {
          console.warn("User does not have permission to access settings");
          router.push("/"); // Redirect to dashboard if no access
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("RBAC check failed:", error);
        router.push("/");
      }
    };

    checkAccess();
  }, [router]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<string>("GEMINI");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Platform Credentials State
  const [platformCreds, setPlatformCreds] = useState<any[]>([]);
  const [loadingPlatformCreds, setLoadingPlatformCreds] = useState(true);
  const [testingPlatformId, setTestingPlatformId] = useState<string | null>(null);
  const [platformForm, setPlatformForm] = useState({
    platform: "FACEBOOK_ADS",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    refreshToken: "",
  });

  useEffect(() => {
    fetchProviders();
    fetchPlatformCreds();
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

  // Platform Credentials Functions
  const fetchPlatformCreds = async () => {
    try {
      setLoadingPlatformCreds(true);
      const res = await fetch("/api/platform-credentials");
      if (res.ok) {
        const data = await res.json();
        setPlatformCreds(data);
      }
    } catch (error) {
      console.error("Failed to fetch platform credentials:", error);
    } finally {
      setLoadingPlatformCreds(false);
    }
  };

  const handleSavePlatformCred = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/platform-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(platformForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save credential");
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: "บันทึก API Key / Token ของแพลตฟอร์มแล้ว",
      });

      setPlatformForm({
        platform: platformForm.platform,
        apiKey: "",
        apiSecret: "",
        accessToken: "",
        refreshToken: "",
      });

      fetchPlatformCreds();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const handleTestPlatformCred = async (id: string) => {
    try {
      setTestingPlatformId(id);
      const res = await fetch("/api/platform-credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "✅ เชื่อมต่อสำเร็จ",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ เชื่อมต่อไม่สำเร็จ",
          description: data.message,
          variant: "destructive",
        });
      }

      fetchPlatformCreds();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบการเชื่อมต่อได้",
        variant: "destructive",
      });
    } finally {
      setTestingPlatformId(null);
    }
  };

  const handleDeletePlatformCred = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ API Credential นี้?")) return;

    try {
      const res = await fetch(`/api/platform-credentials?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete credential");

      toast({
        title: "ลบสำเร็จ",
        description: "ลบข้อมูล API Key / Token เรียบร้อยแล้ว",
      });

      fetchPlatformCreds();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  // Don't render until authorization check is complete
  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">AI Provider Settings</h1>
        <p className="text-muted-foreground mt-1">
          ตั้งค่า AI และ Model สำหรับใช้ในระบบ
        </p>
      </div>

      {/* Add New Provider */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-white">เพิ่ม AI Provider</CardTitle>
          <CardDescription className="text-muted-foreground">
            เลือก Provider และใส่ API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label className="text-white">AI Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="bg-muted border-border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
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
                className="bg-muted border-border text-white"
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
              className="bg-muted border-border text-white"
            />
            <p className="text-xs text-muted-foreground mt-1">
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

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึก API Key
          </Button>
        </CardContent>
      </Card>

      {/* Existing Providers */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-white">AI Providers ที่บันทึกไว้</CardTitle>
          <CardDescription className="text-muted-foreground">
            จัดการและทดสอบ API Keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>ยังไม่มี AI Provider</p>
              <p className="text-sm mt-2">เพิ่ม Provider ด้านบนเพื่อเริ่มใช้งาน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg"
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
                      <p className="text-sm text-muted-foreground mt-1">
                        Model: {provider.modelName}
                      </p>
                    )}
                    {provider.lastTested && (
                      <p className="text-xs text-slate-500 mt-1">
                        ทดสอบล่าสุด: {new Date(provider.lastTested).toLocaleString("th-TH")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(provider.id)}
                      disabled={testingId === provider.id}
                      className="flex-1 sm:flex-none"
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
                        className="flex-1 sm:flex-none"
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

      {/* Platform API Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg md:text-xl text-white flex items-center gap-2">
                <Globe2 className="w-5 h-5" />
                Platform API Settings
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                ตั้งค่า API Key / Access Token สำหรับแพลตฟอร์มหลัก (Facebook, TikTok, Lazada ฯลฯ)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form */}
          <form onSubmit={handleSavePlatformCred} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Platform</Label>
                <Select
                  value={platformForm.platform}
                  onValueChange={(value) =>
                    setPlatformForm((prev) => ({ ...prev, platform: value }))
                  }
                >
                  <SelectTrigger className="bg-muted border-border mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border">
                    <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                    <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
                    <SelectItem value="LAZADA">Lazada</SelectItem>
                    <SelectItem value="SHOPEE">Shopee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">API Key (ถ้ามี)</Label>
                <Input
                  type="password"
                  className="bg-muted border-border text-white mt-1"
                  value={platformForm.apiKey}
                  onChange={(e) =>
                    setPlatformForm((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  placeholder="เช่น App Key / Client ID"
                />
              </div>

              <div>
                <Label className="text-white">API Secret (ถ้ามี)</Label>
                <Input
                  type="password"
                  className="bg-muted border-border text-white mt-1"
                  value={platformForm.apiSecret}
                  onChange={(e) =>
                    setPlatformForm((prev) => ({ ...prev, apiSecret: e.target.value }))
                  }
                  placeholder="เช่น App Secret / Client Secret"
                />
              </div>

              <div>
                <Label className="text-white">Access Token (ถ้ามี)</Label>
                <Input
                  type="password"
                  className="bg-muted border-border text-white mt-1"
                  value={platformForm.accessToken}
                  onChange={(e) =>
                    setPlatformForm((prev) => ({ ...prev, accessToken: e.target.value }))
                  }
                  placeholder="เช่น Facebook / TikTok Access Token"
                />
              </div>

              <div>
                <Label className="text-white">Refresh Token (ถ้ามี)</Label>
                <Input
                  type="password"
                  className="bg-muted border-border text-white mt-1"
                  value={platformForm.refreshToken}
                  onChange={(e) =>
                    setPlatformForm((prev) => ({ ...prev, refreshToken: e.target.value }))
                  }
                  placeholder="ใช้สำหรับต่ออายุ Access Token"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="w-full sm:w-auto flex items-center justify-center sm:justify-start gap-2">
                <KeyRound className="w-4 h-4" />
                บันทึก API Settings
              </Button>
            </div>
          </form>

          {/* List of Platforms */}
          <div className="border-t border-border pt-4">
            {loadingPlatformCreds ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : platformCreds.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                ยังไม่มีการตั้งค่า Platform ใด ๆ
              </p>
            ) : (
              <div className="grid gap-3">
                {platformCreds.map((cred, index) => (
                  <motion.div
                    key={cred.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-muted border-border">
                      <CardContent className="p-4 flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-600">
                              {cred.platform}
                            </Badge>
                            {cred.isValid ? (
                              <Badge className="bg-green-600 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Connected
                              </Badge>
                            ) : cred.lastTested ? (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <X className="w-3 h-3" />
                                Invalid
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-600">Not tested</Badge>
                            )}
                          </div>
                          {cred.lastTested && (
                            <p className="text-xs text-muted-foreground">
                              Last tested:{" "}
                              {new Date(cred.lastTested).toLocaleString("th-TH")}
                            </p>
                          )}
                          {cred.testMessage && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {cred.testMessage}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestPlatformCred(cred.id)}
                            disabled={testingPlatformId === cred.id}
                            className="flex-1 sm:flex-none"
                          >
                            {testingPlatformId === cred.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "Test"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePlatformCred(cred.id)}
                            className="flex-1 sm:flex-none"
                          >
                            ลบ
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-white">วิธีใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-300 space-y-2 text-sm sm:text-base">
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
