"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  Trash2,
  TestTube2,
  Check,
  X,
  Facebook,
  Sparkles,
  RefreshCw,
  Globe2,
  KeyRound,
} from "lucide-react";
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

interface PlatformCredential {
  id: string;
  platform: string;
  isValid: boolean;
  lastTested?: string | null;
  testMessage?: string | null;
}

interface AdAccount {
  id: string;
  platform: string;
  accountName: string;
  accountId?: string | null;
  isActive: boolean;
  isValid: boolean;
  isDefault: boolean;
  lastTested?: string | null;
  testMessage?: string | null;
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

        if (!data.permissions?.canAccessSettings) {
          console.warn("User does not have permission to access settings");
          router.push("/");
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
  const [platformCreds, setPlatformCreds] = useState<PlatformCredential[]>([]);
  const [loadingPlatformCreds, setLoadingPlatformCreds] = useState(true);
  const [testingPlatformId, setTestingPlatformId] = useState<string | null>(
    null
  );
  const [platformForm, setPlatformForm] = useState({
    platform: "FACEBOOK_ADS",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    refreshToken: "",
  });

  // Ad Accounts states
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loadingAdAccounts, setLoadingAdAccounts] = useState(true);
  const [testingAdAccount, setTestingAdAccount] = useState<string | null>(null);
  const [isAdAccountDialogOpen, setIsAdAccountDialogOpen] = useState(false);
  const [adAccountForm, setAdAccountForm] = useState({
    platform: "FACEBOOK",
    accountName: "",
    accountId: "",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    refreshToken: "",
  });

  useEffect(() => {
    if (isAuthorized) {
      fetchProviders();
      fetchPlatformCreds();
      fetchAdAccounts();
    }
  }, [isAuthorized]);

  // ========== AI Provider functions ==========

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-settings");

      if (!response.ok) {
        throw new Error("Failed to load providers");
      }

      const data = await response.json();

      // รองรับทั้งสองรูปแบบ:
      // 1) [ ...providers ]
      // 2) { providers: [ ... ] }
      const providersArray: AIProvider[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.providers)
        ? data.providers
        : [];

      setProviders(providersArray);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดการตั้งค่าได้",
        variant: "destructive",
      });
      setProviders([]);
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

  // ========== Platform Credentials Functions ==========

  const fetchPlatformCreds = async () => {
    try {
      setLoadingPlatformCreds(true);
      const res = await fetch("/api/platform-credentials");
      if (res.ok) {
        const data = await res.json();
        const list: PlatformCredential[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.credentials)
          ? data.credentials
          : [];
        setPlatformCreds(list);
      } else {
        setPlatformCreds([]);
      }
    } catch (error) {
      console.error("Failed to fetch platform credentials:", error);
      setPlatformCreds([]);
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

      setPlatformForm((prev) => ({
        ...prev,
        apiKey: "",
        apiSecret: "",
        accessToken: "",
        refreshToken: "",
      }));

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

  // ========== Ad Accounts Functions ==========

  const fetchAdAccounts = async () => {
    try {
      setLoadingAdAccounts(true);
      const res = await fetch("/api/ad-accounts");
      if (res.ok) {
        const data = await res.json();
        const list: AdAccount[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.accounts)
          ? data.accounts
          : [];
        setAdAccounts(list);
      } else {
        setAdAccounts([]);
      }
    } catch (error) {
      console.error("Failed to fetch ad accounts:", error);
      setAdAccounts([]);
    } finally {
      setLoadingAdAccounts(false);
    }
  };

  const handleAddAdAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adAccountForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add ad account");
      }

      toast({
        title: "✅ เพิ่มสำเร็จ",
        description: "เพิ่ม Ad Account เรียบร้อยแล้ว",
      });

      setIsAdAccountDialogOpen(false);
      setAdAccountForm({
        platform: "FACEBOOK",
        accountName: "",
        accountId: "",
        apiKey: "",
        apiSecret: "",
        accessToken: "",
        refreshToken: "",
      });

      fetchAdAccounts();
    } catch (error: any) {
      toast({
        title: "ผิดพลาด",
        description: error.message || "ไม่สามารถเพิ่ม Ad Account ได้",
        variant: "destructive",
      });
    }
  };

  const handleTestAdAccount = async (account: AdAccount) => {
    try {
      setTestingAdAccount(account.id);
      const res = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          platform: account.platform,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "✅ ทดสอบสำเร็จ",
          description: data.message,
        });
      } else {
        toast({
          title: "❌ ทดสอบไม่สำเร็จ",
          description: data.message,
          variant: "destructive",
        });
      }

      fetchAdAccounts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถทดสอบการเชื่อมต่อได้",
        variant: "destructive",
      });
    } finally {
      setTestingAdAccount(null);
    }
  };

  const handleSetDefaultAdAccount = async (id: string, platform: string) => {
    try {
      const res = await fetch("/api/ad-accounts/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, platform }),
      });

      if (!res.ok) throw new Error("Failed to set default");

      toast({
        title: "✅ ตั้งเป็น Default แล้ว",
        description: "Ad Account นี้ถูกตั้งเป็นค่าเริ่มต้นแล้ว",
      });

      fetchAdAccounts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถตั้งค่าได้",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdAccount = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบ Ad Account นี้?")) return;

    try {
      const res = await fetch(`/api/ad-accounts?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete ad account");

      toast({
        title: "✅ ลบสำเร็จ",
        description: "ลบ Ad Account เรียบร้อยแล้ว",
      });

      fetchAdAccounts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบได้",
        variant: "destructive",
      });
    }
  };

  // ========== Render Guards ==========

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

  // ========== JSX ==========

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          AI Provider Settings
        </h1>
        <p className="text-gray-600 mt-1">
          ตั้งค่า AI และ Model สำหรับใช้ในระบบ
        </p>
      </div>

      {/* Add New Provider */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-gray-800">
            เพิ่ม AI Provider
          </CardTitle>
          <CardDescription className="text-gray-600">
            เลือก Provider และใส่ API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div>
              <Label className="text-gray-700 font-semibold">
                AI Provider
              </Label>
              <Select
                value={selectedProvider}
                onValueChange={setSelectedProvider}
              >
                <SelectTrigger className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-300">
                  <SelectItem
                    value="GEMINI"
                    className="font-semibold text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Google Gemini
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="OPENAI"
                    className="font-semibold text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      OpenAI GPT
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="N8N"
                    className="font-semibold text-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      n8n Workflow
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-semibold">
                Model Name (Optional)
              </Label>
              <Input
                placeholder="เช่น gemini-pro, gpt-4"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-gray-700 font-semibold">
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
              className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
            />
            <p className="text-xs text-gray-600 mt-1">
              {selectedProvider === "GEMINI" && (
                <>
                  Get API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
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
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              )}
              {selectedProvider === "N8N" &&
                "Webhook URL จาก n8n workflow ของคุณ"}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึก API Key
          </Button>
        </CardContent>
      </Card>

      {/* Existing Providers */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-gray-800">
            AI Providers ที่บันทึกไว้
          </CardTitle>
          <CardDescription className="text-gray-600">
            จัดการและทดสอบ API Keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>ยังไม่มี AI Provider</p>
              <p className="text-sm mt-2">
                เพิ่ม Provider ด้านบนเพื่อเริ่มใช้งาน
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-800">
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
                      ) : provider.lastTested ? (
                        <Badge variant="destructive">
                          <X className="w-3 h-3 mr-1" />
                          ใช้งานไม่ได้
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <X className="w-3 h-3 mr-1" />
                          ยังไม่ทดสอบ
                        </Badge>
                      )}
                    </div>
                    {provider.modelName && (
                      <p className="text-sm text-gray-600 mt-1">
                        Model: {provider.modelName}
                      </p>
                    )}
                    {provider.lastTested && (
                      <p className="text-xs text-gray-500 mt-1">
                        ทดสอบล่าสุด:{" "}
                        {new Date(provider.lastTested).toLocaleString("th-TH")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(provider.id)}
                      disabled={testingId === provider.id}
                      className="flex-1 sm:flex-none border-2 border-purple-300"
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
                        className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-cyan-500"
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

      {/* Platform API Credentials */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl text-gray-800 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-purple-500" />
            Platform API Settings
          </CardTitle>
          <CardDescription className="text-gray-600">
            ตั้งค่า API Key / Token สำหรับเชื่อมต่อ Facebook Ads, TikTok Ads,
            Shopee, Lazada ฯลฯ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleSavePlatformCred}
          >
            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">
                Platform
              </Label>
              <Select
                value={platformForm.platform}
                onValueChange={(value) =>
                  setPlatformForm((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-300">
                  <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                  <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
                  <SelectItem value="SHOPEE">Shopee</SelectItem>
                  <SelectItem value="LAZADA">Lazada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">API Key</Label>
              <Input
                value={platformForm.apiKey}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
                placeholder="API Key"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">
                API Secret (ถ้ามี)
              </Label>
              <Input
                type="password"
                value={platformForm.apiSecret}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    apiSecret: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
                placeholder="API Secret"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-semibold">
                Access Token / Refresh Token
              </Label>
              <Input
                type="password"
                value={platformForm.accessToken}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    accessToken: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-1"
                placeholder="Access Token"
              />
              <Input
                type="password"
                value={platformForm.refreshToken}
                onChange={(e) =>
                  setPlatformForm((prev) => ({
                    ...prev,
                    refreshToken: e.target.value,
                  }))
                }
                className="bg-gray-50 border-2 border-gray-300 text-gray-800 mt-2"
                placeholder="Refresh Token (ถ้ามี)"
              />
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                บันทึก Platform API
              </Button>
            </div>
          </form>

          <div className="pt-4">
            <h3 className="font-semibold text-gray-800 mb-2">
              Platform API ที่บันทึกไว้
            </h3>
            {loadingPlatformCreds ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            ) : platformCreds.length === 0 ? (
              <p className="text-sm text-gray-500">
                ยังไม่มี Platform API ที่บันทึกไว้
              </p>
            ) : (
              <div className="space-y-3">
                {platformCreds.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-800">
                        {cred.platform}
                      </p>
                      {cred.lastTested && (
                        <p className="text-xs text-gray-500">
                          ทดสอบล่าสุด{" "}
                          {new Date(
                            cred.lastTested
                          ).toLocaleString("th-TH")}
                        </p>
                      )}
                      {cred.testMessage && (
                        <p className="text-xs text-gray-600">
                          {cred.testMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        className={
                          cred.isValid
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }
                      >
                        {cred.isValid ? "ใช้งานได้" : "เชื่อมต่อไม่สำเร็จ"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestPlatformCred(cred.id)}
                        disabled={testingPlatformId === cred.id}
                      >
                        {testingPlatformId === cred.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <TestTube2 className="w-4 h-4 mr-1" />
                        )}
                        ทดสอบ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePlatformCred(cred.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ad Accounts Section */}
      <Card className="bg-white border-2 border-gray-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg md:text-xl text-gray-800 flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              บัญชีโฆษณา (Ad Accounts)
            </CardTitle>
            <CardDescription className="text-gray-600">
              จัดการบัญชีโฆษณาสำหรับ Facebook / TikTok / Google / LINE
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAdAccountDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
          >
            <Plus className="w-4 h-4 mr-1" />
            เพิ่ม Ad Account
          </Button>
        </CardHeader>
        <CardContent>
          {loadingAdAccounts ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : adAccounts.length === 0 ? (
            <p className="text-sm text-gray-600">
              ยังไม่มีบัญชีโฆษณา เพิ่มบัญชีใหม่เพื่อเริ่มเชื่อมต่อ
            </p>
          ) : (
            <div className="space-y-3">
              {adAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800">
                        {acc.accountName || acc.accountId || "Unnamed Account"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {acc.platform}
                      </Badge>
                      {acc.isDefault && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          Default
                        </Badge>
                      )}
                      {acc.isActive ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {acc.isValid ? (
                        <Badge className="bg-green-500 text-white text-xs">
                          ใช้งานได้
                        </Badge>
                      ) : acc.lastTested ? (
                        <Badge className="bg-red-500 text-white text-xs">
                          ใช้งานไม่ได้
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          ยังไม่ทดสอบ
                        </Badge>
                      )}
                    </div>
                    {acc.accountId && (
                      <p className="text-xs text-gray-600 mt-1">
                        Account ID: {acc.accountId}
                      </p>
                    )}
                    {acc.lastTested && (
                      <p className="text-xs text-gray-500">
                        ทดสอบล่าสุด{" "}
                        {new Date(acc.lastTested).toLocaleString("th-TH")}
                      </p>
                    )}
                    {acc.testMessage && (
                      <p className="text-xs text-gray-600">
                        ผลการทดสอบ: {acc.testMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestAdAccount(acc)}
                      disabled={testingAdAccount === acc.id}
                    >
                      {testingAdAccount === acc.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <TestTube2 className="w-4 h-4 mr-1" />
                      )}
                      ทดสอบ
                    </Button>
                    {!acc.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleSetDefaultAdAccount(acc.id, acc.platform)
                        }
                      >
                        ตั้งเป็น Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteAdAccount(acc.id)}
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

      {/* Dialog: Add Ad Account */}
      <Dialog
        open={isAdAccountDialogOpen}
        onOpenChange={setIsAdAccountDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่ม Ad Account ใหม่</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddAdAccount}>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={adAccountForm.platform}
                onValueChange={(value) =>
                  setAdAccountForm((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
                  <SelectItem value="GOOGLE">Google Ads</SelectItem>
                  <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                  <SelectItem value="LINE">LINE Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ชื่อบัญชี</Label>
              <Input
                value={adAccountForm.accountName}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                placeholder="เช่น Main Facebook Ads"
              />
            </div>

            <div className="space-y-2">
              <Label>Account ID (ถ้ามี)</Label>
              <Input
                value={adAccountForm.accountId}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                placeholder="เช่น act_123456789"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key / Access Token</Label>
              <Input
                type="password"
                value={adAccountForm.apiKey}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    apiKey: e.target.value,
                  }))
                }
                placeholder="API Key (ถ้ามี)"
              />
              <Input
                type="password"
                value={adAccountForm.accessToken}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accessToken: e.target.value,
                  }))
                }
                placeholder="Access Token"
              />
            </div>

            <div className="space-y-2">
              <Label>API Secret / Refresh Token (ถ้ามี)</Label>
              <Input
                type="password"
                value={adAccountForm.apiSecret}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    apiSecret: e.target.value,
                  }))
                }
                placeholder="API Secret"
              />
              <Input
                type="password"
                value={adAccountForm.refreshToken}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    refreshToken: e.target.value,
                  }))
                }
                placeholder="Refresh Token"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdAccountDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
