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

  // Platform Credentials State
  const [platformCreds, setPlatformCreds] = useState<any[]>([]);
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
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
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
    fetchProviders();
    fetchPlatformCreds();
    fetchAdAccounts();
  }, []);

  // AI Provider functions
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

  // Ad Accounts functions
  const fetchAdAccounts = async () => {
    try {
      setLoadingAdAccounts(true);
      const response = await fetch("/api/ad-accounts");
      if (response.ok) {
        const data = await response.json();
        setAdAccounts(data);
      }
    } catch (error) {
      console.error("Failed to fetch ad accounts:", error);
    } finally {
      setLoadingAdAccounts(false);
    }
  };

  const handleAddAdAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adAccountForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add account");
      }

      toast({
        title: "สำเร็จ!",
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
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTestAdAccount = async (id: string) => {
    try {
      setTestingAdAccount(id);
      const response = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      toast({
        title: result.success ? "✅ เชื่อมต่อสำเร็จ!" : "❌ เชื่อมต่อไม่สำเร็จ",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

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
      const response = await fetch("/api/ad-accounts/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, platform }),
      });

      if (response.ok) {
        toast({
          title: "สำเร็จ!",
          description: "ตั้งเป็น Default Account แล้ว",
        });
        fetchAdAccounts();
      }
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
      const response = await fetch(`/api/ad-accounts?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "สำเร็จ!",
          description: "ลบ Ad Account แล้ว",
        });
        fetchAdAccounts();
      }
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
        <h1 className="text-3xl font-bold text-slate-50">
          AI Provider Settings
        </h1>
        <p className="text-slate-200 mt-1">
          ตั้งค่า AI และ Model สำหรับใช้ในระบบ
        </p>
      </div>

      {/* Add New Provider */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-slate-50">เพิ่ม AI Provider</CardTitle>
          <CardDescription className="text-slate-200">
            เลือก Provider และใส่ API Key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
            <p className="text-xs text-slate-200 mt-1">
              {selectedProvider === "GEMINI" && (
                <>
                  Get API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
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
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              )}
              {selectedProvider === "N8N" &&
                "Webhook URL จาก n8n workflow ของคุณ"}
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึก API Key
          </Button>
        </CardContent>
      </Card>

      {/* Existing Providers */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-slate-50">
            AI Providers ที่บันทึกไว้
          </CardTitle>
          <CardDescription className="text-slate-200">
            จัดการและทดสอบ API Keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-200" />
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-8 text-slate-200">
              <p>ยังไม่มี AI Provider</p>
              <p className="text-sm mt-2">เพิ่ม Provider ด้านบนเพื่อเริ่มใช้งาน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-50">
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
                      <p className="text-sm text-slate-200 mt-1">
                        Model: {provider.modelName}
                      </p>
                    )}
                    {provider.lastTested && (
                      <p className="text-xs text-slate-500 mt-1">
                        ทดสอบล่าสุด:{" "}
                        {new Date(provider.lastTested).toLocaleString("th-TH")}
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

      {/* Ad Accounts Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Facebook className="w-5 h-5" />
                Ad Accounts
              </CardTitle>
              <CardDescription className="text-slate-400">
                จัดการบัญชีโฆษณาทุกแพลตฟอร์ม
              </CardDescription>
            </div>
            <Button onClick={() => setIsAdAccountDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่ม Ad Account
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAdAccounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : adAccounts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p>ยังไม่มี Ad Account</p>
              <p className="text-sm mt-2">
                เพิ่ม Ad Account เพื่อเริ่มใช้งานระบบโฆษณา
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {adAccounts.map((account: any) => (
                <Card
                  key={account.id}
                  className="bg-slate-700 border-slate-600"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-600">
                            {account.platform}
                          </Badge>
                          {account.isDefault && (
                            <Badge className="bg-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              Default
                            </Badge>
                          )}
                          {account.isValid ? (
                            <Badge className="bg-green-600">
                              <Check className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          ) : account.lastTested ? (
                            <Badge variant="destructive">
                              <X className="w-3 h-3 mr-1" />
                              Invalid
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-600">
                              Not Tested
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-white font-semibold">
                          {account.accountName}
                        </h4>
                        <p className="text-sm text-slate-400">
                          Account ID: {account.accountId}
                        </p>
                        {account.lastTested && (
                          <p className="text-xs text-slate-500 mt-1">
                            Last tested:{" "}
                            {new Date(account.lastTested).toLocaleString(
                              "th-TH"
                            )}
                          </p>
                        )}
                        {account.testMessage && (
                          <p className="text-xs text-slate-400 mt-1">
                            {account.testMessage}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestAdAccount(account.id)}
                          disabled={testingAdAccount === account.id}
                        >
                          {testingAdAccount === account.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube2 className="w-4 h-4" />
                          )}
                        </Button>

                        {!account.isDefault && account.isValid && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleSetDefaultAdAccount(
                                account.id,
                                account.platform
                              )
                            }
                          >
                            Set Default
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAdAccount(account.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Ad Account Dialog */}
      <Dialog
        open={isAdAccountDialogOpen}
        onOpenChange={setIsAdAccountDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>เพิ่ม Ad Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAdAccount} className="space-y-4">
            <div>
              <Label>Platform</Label>
              <Select
                value={adAccountForm.platform}
                onValueChange={(value) =>
                  setAdAccountForm({ ...adAccountForm, platform: value })
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

            <div>
              <Label>Account Name</Label>
              <Input
                value={adAccountForm.accountName}
                onChange={(e) =>
                  setAdAccountForm({
                    ...adAccountForm,
                    accountName: e.target.value,
                  })
                }
                placeholder="My Business Account"
                required
              />
            </div>

            <div>
              <Label>Account ID</Label>
              <Input
                value={adAccountForm.accountId}
                onChange={(e) =>
                  setAdAccountForm({
                    ...adAccountForm,
                    accountId: e.target.value,
                  })
                }
                placeholder="act_123456789"
                required
              />
            </div>

            {adAccountForm.platform === "FACEBOOK" && (
              <div>
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={adAccountForm.accessToken}
                  onChange={(e) =>
                    setAdAccountForm({
                      ...adAccountForm,
                      accessToken: e.target.value,
                    })
                  }
                  placeholder="EAAxxxx..."
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Get from{" "}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Facebook Graph API Explorer
                  </a>
                </p>
              </div>
            )}

            {adAccountForm.platform === "GOOGLE" && (
              <>
                <div>
                  <Label>Access Token</Label>
                  <Input
                    type="password"
                    value={adAccountForm.accessToken}
                    onChange={(e) =>
                      setAdAccountForm({
                        ...adAccountForm,
                        accessToken: e.target.value,
                      })
                    }
                    placeholder="Access Token"
                    required
                  />
                </div>
                <div>
                  <Label>Refresh Token (Optional)</Label>
                  <Input
                    type="password"
                    value={adAccountForm.refreshToken}
                    onChange={(e) =>
                      setAdAccountForm({
                        ...adAccountForm,
                        refreshToken: e.target.value,
                      })
                    }
                    placeholder="Refresh Token"
                  />
                </div>
              </>
            )}

            {adAccountForm.platform === "TIKTOK" && (
              <div>
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={adAccountForm.apiKey}
                  onChange={(e) =>
                    setAdAccountForm({
                      ...adAccountForm,
                      apiKey: e.target.value,
                    })
                  }
                  placeholder="Access Token"
                  required
                />
              </div>
            )}

            {adAccountForm.platform === "LINE" && (
              <div>
                <Label>Channel Access Token</Label>
                <Input
                  type="password"
                  value={adAccountForm.apiKey}
                  onChange={(e) =>
                    setAdAccountForm({
                      ...adAccountForm,
                      apiKey: e.target.value,
                    })
                  }
                  placeholder="Channel Access Token"
                  required
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdAccountDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit">เพิ่ม Ad Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Platform API Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-50 flex items-center gap-2">
                <Globe2 className="w-5 h-5" />
                Platform API Settings
              </CardTitle>
              <CardDescription className="text-slate-200">
                ตั้งค่า API Key / Access Token สำหรับแพลตฟอร์มหลัก (Facebook,
                TikTok, Lazada ฯลฯ)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form */}
          <form onSubmit={handleSavePlatformCred} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    setPlatformForm((prev) => ({
                      ...prev,
                      apiKey: e.target.value,
                    }))
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
                    setPlatformForm((prev) => ({
                      ...prev,
                      apiSecret: e.target.value,
                    }))
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
                    setPlatformForm((prev) => ({
                      ...prev,
                      accessToken: e.target.value,
                    }))
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
                    setPlatformForm((prev) => ({
                      ...prev,
                      refreshToken: e.target.value,
                    }))
                  }
                  placeholder="ใช้สำหรับต่ออายุ Access Token"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                บันทึก API Settings
              </Button>
            </div>
          </form>

          {/* List of Platforms */}
          <div className="border-t border-border pt-4">
            {loadingPlatformCreds ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-slate-200" />
              </div>
            ) : platformCreds.length === 0 ? (
              <p className="text-slate-200 text-sm">
                ยังไม่มีการตั้งค่า Platform ใด ๆ
              </p>
            ) : (
              <div className="grid gap-3">
                {platformCreds.map((cred: any, index: number) => (
                  <motion.div
                    key={cred.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-muted border-border">
                      <CardContent className="p-4 flex items-start justify-between gap-4">
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
                              <Badge
                                variant="destructive"
                                className="flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Invalid
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-600">
                                Not tested
                              </Badge>
                            )}
                          </div>
                          {cred.lastTested && (
                            <p className="text-xs text-slate-300">
                              Last tested:{" "}
                              {new Date(
                                cred.lastTested
                              ).toLocaleString("th-TH")}
                            </p>
                          )}
                          {cred.testMessage && (
                            <p className="text-xs text-slate-200 mt-1">
                              {cred.testMessage}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestPlatformCred(cred.id)}
                            disabled={testingPlatformId === cred.id}
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
          <CardTitle className="text-slate-50">วิธีใช้งาน</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-200 space-y-2">
          <p>1. เลือก AI Provider ที่ต้องการ (Gemini, OpenAI, หรือ n8n)</p>
          <p>2. ใส่ API Key หรือ Webhook URL</p>
          <p>3. คลิก "บันทึก API Key"</p>
          <p>4. คลิก "ทดสอบ" เพื่อตรวจสอบการเชื่อมต่อ</p>
          <p>5. ถ้าผ่าน ให้คลิก "ตั้งเป็นค่าเริ่มต้น"</p>
          <p>6. ตั้งค่า Platform API และ Ad Accounts ให้พร้อม</p>
          <p>7. ไปที่หน้า Dashboard แล้วเปิด AI Assistant เพื่อใช้งาน!</p>
        </CardContent>
      </Card>
    </div>
  );
}
