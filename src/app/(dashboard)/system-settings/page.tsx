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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Loader2,
  Save,
  Clock,
  MessageSquare,
  Bell,
  Shield,
  Info,
  Bot,
  Globe2,
  Facebook,
  Plus,
  Trash2,
  TestTube2,
  Check,
  X,
  RefreshCw,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ========== INTERFACES ==========

interface SystemSettings {
  id?: string;
  organizationId?: string;
  dailyCutOffHour: number;
  dailyCutOffMinute: number;
  lineNotifyToken: string;
  lineChannelAccessToken: string;
  lineChannelSecret: string;
  lineWebhookUrl: string;
  adminEmails: string;
  notifyOnOrder: boolean;
  notifyOnLowStock: boolean;
  notifyDailySummary: boolean;
}

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

export default function SystemSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // System Settings State
  const [settings, setSettings] = useState<SystemSettings>({
    dailyCutOffHour: 23,
    dailyCutOffMinute: 59,
    lineNotifyToken: "",
    lineChannelAccessToken: "",
    lineChannelSecret: "",
    lineWebhookUrl: "",
    adminEmails: "",
    notifyOnOrder: true,
    notifyOnLowStock: true,
    notifyDailySummary: true,
  });

  const [showTokens, setShowTokens] = useState({
    notify: false,
    channelAccess: false,
    channelSecret: false,
  });

  // AI Provider State
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("GEMINI");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  const [savingAI, setSavingAI] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Platform Credentials State
  const [platformCreds, setPlatformCreds] = useState<PlatformCredential[]>([]);
  const [loadingPlatformCreds, setLoadingPlatformCreds] = useState(true);
  const [testingPlatformId, setTestingPlatformId] = useState<string | null>(null);
  const [platformForm, setPlatformForm] = useState({
    platform: "FACEBOOK_ADS",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    refreshToken: "",
  });

  // Ad Accounts State
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

  // Auto-generate webhook URL
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/line`
      : settings.lineWebhookUrl || "https://your-domain.com/api/webhooks/line";

  // ========== AUTHORIZATION CHECK ==========

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
        // Fetch all settings
        fetchSettings();
        fetchProviders();
        fetchPlatformCreds();
        fetchAdAccounts();
      } catch (error) {
        console.error("RBAC check failed:", error);
        router.push("/");
      }
    };

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // ========== SYSTEM SETTINGS FUNCTIONS ==========

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/system-settings");
      if (!res.ok) {
        throw new Error("Failed to fetch settings");
      }

      const data = await res.json();
      setSettings({
        ...data,
        lineNotifyToken: data.lineNotifyToken || "",
        lineChannelAccessToken: data.lineChannelAccessToken || "",
        lineChannelSecret: data.lineChannelSecret || "",
        lineWebhookUrl: data.lineWebhookUrl || webhookUrl,
        adminEmails: data.adminEmails || "",
      });
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดการตั้งค่าได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/system-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          lineWebhookUrl: webhookUrl,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save settings");
      }

      toast({
        title: "✅ บันทึกสำเร็จ",
        description: "บันทึกการตั้งค่าระบบเรียบร้อยแล้ว",
      });

      // Refresh settings to get masked tokens
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถบันทึกการตั้งค่าได้",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ========== AI PROVIDER FUNCTIONS ==========

  const fetchProviders = async () => {
    try {
      const response = await fetch("/api/ai-settings");

      if (!response.ok) {
        throw new Error("Failed to load providers");
      }

      const data = await response.json();

      const providersArray: AIProvider[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.providers)
        ? data.providers
        : [];

      setProviders(providersArray);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
      setProviders([]);
    }
  };

  const handleSaveAI = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "กรุณากรอก API Key",
        variant: "destructive",
      });
      return;
    }

    try {
      setSavingAI(true);
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

      toast({ title: "✅ บันทึก AI Provider สำเร็จ!" });
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
      setSavingAI(false);
    }
  };

  const handleTestAI = async (providerId: string) => {
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

  const handleSetDefaultAI = async (providerId: string) => {
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

  const handleDeleteAI = async (providerId: string) => {
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

  // ========== PLATFORM CREDENTIALS FUNCTIONS ==========

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
        title: "✅ บันทึกสำเร็จ",
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
        title: "✅ ลบสำเร็จ",
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

  // ========== AD ACCOUNTS FUNCTIONS ==========

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

  const handleTestAdAccount = async (id: string) => {
    try {
      setTestingAdAccount(id);
      const res = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
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

  // ========== RENDER GUARDS ==========

  if (isAuthorized === null || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // ========== MAIN RENDER ==========

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          System Settings
        </h1>
        <p className="text-gray-400">
          ตั้งค่าระบบทั้งหมด - AI, LINE, Platform APIs, Daily Cut-off และอื่นๆ (เฉพาะแอดมิน)
        </p>
      </div>

      <Tabs defaultValue="cutoff" className="w-full">
        <TabsList className="grid w-full grid-cols-7 overflow-x-auto">
          <TabsTrigger value="cutoff">ตัดยอดรายวัน</TabsTrigger>
          <TabsTrigger value="line">LINE</TabsTrigger>
          <TabsTrigger value="notifications">การแจ้งเตือน</TabsTrigger>
          <TabsTrigger value="ai">AI Provider</TabsTrigger>
          <TabsTrigger value="platforms">Platform APIs</TabsTrigger>
          <TabsTrigger value="adaccounts">Ad Accounts</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        {/* ========== DAILY CUT-OFF TAB ========== */}
        <TabsContent value="cutoff">
          <Card className="border border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                ตั้งเวลาตัดยอดรายวัน
              </CardTitle>
              <CardDescription>
                กำหนดเวลาที่ระบบจะสรุปยอดขายอัตโนมัติทุกวัน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cutoff-hour" className="text-gray-200">
                    ชั่วโมง (0-23)
                  </Label>
                  <Input
                    id="cutoff-hour"
                    type="number"
                    min="0"
                    max="23"
                    value={settings.dailyCutOffHour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyCutOffHour: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-black/40 border-white/15 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="cutoff-minute" className="text-gray-200">
                    นาที (0-59)
                  </Label>
                  <Input
                    id="cutoff-minute"
                    type="number"
                    min="0"
                    max="59"
                    value={settings.dailyCutOffMinute}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyCutOffMinute: parseInt(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-black/40 border-white/15 text-white"
                  />
                </div>
              </div>

              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-blue-300">
                  💡 ระบบจะตัดยอดรายวันอัตโนมัติเวลา{" "}
                  {settings.dailyCutOffHour.toString().padStart(2, "0")}:
                  {settings.dailyCutOffMinute.toString().padStart(2, "0")} น.
                  ทุกวัน
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== LINE INTEGRATION TAB ========== */}
        <TabsContent value="line">
          <Card className="border border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-green-400" />
                LINE Integration
              </CardTitle>
              <CardDescription>
                เชื่อมต่อกับ LINE เพื่อรับออเดอร์และส่งการแจ้งเตือน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-200">LINE Notify Token</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type={showTokens.notify ? "text" : "password"}
                    value={settings.lineNotifyToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineNotifyToken: e.target.value,
                      })
                    }
                    placeholder="Paste your LINE Notify token here"
                    className="bg-black/40 border-white/15 text-white placeholder:text-gray-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setShowTokens({ ...showTokens, notify: !showTokens.notify })
                    }
                  >
                    {showTokens.notify ? "Hide" : "Show"}
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  รับ token จาก:{" "}
                  <a
                    href="https://notify-bot.line.me/my/"
                    target="_blank"
                    className="text-blue-400 underline"
                    rel="noreferrer"
                  >
                    https://notify-bot.line.me/my/
                  </a>
                </p>
              </div>

              <div>
                <Label className="text-gray-200">
                  LINE Channel Access Token
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type={showTokens.channelAccess ? "text" : "password"}
                    value={settings.lineChannelAccessToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineChannelAccessToken: e.target.value,
                      })
                    }
                    placeholder="Paste your Channel Access Token here"
                    className="bg-black/40 border-white/15 text-white placeholder:text-gray-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        channelAccess: !showTokens.channelAccess,
                      })
                    }
                  >
                    {showTokens.channelAccess ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-gray-200">LINE Channel Secret</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type={showTokens.channelSecret ? "text" : "password"}
                    value={settings.lineChannelSecret}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineChannelSecret: e.target.value,
                      })
                    }
                    placeholder="Paste your Channel Secret here"
                    className="bg-black/40 border-white/15 text-white placeholder:text-gray-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        channelSecret: !showTokens.channelSecret,
                      })
                    }
                  >
                    {showTokens.channelSecret ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-gray-200">Webhook URL</Label>
                <Input
                  value={webhookUrl}
                  readOnly
                  className="mt-1 bg-black/60 border-white/15 text-gray-200"
                />
                <p className="text-xs text-gray-400 mt-1">
                  ใช้ URL นี้ใน LINE Developers Console
                </p>
              </div>

              <Alert className="bg-purple-500/10 border-purple-500/30">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-purple-200">
                  <p className="font-semibold mb-2">📝 วิธีตั้งค่า LINE:</p>
                  <ol className="text-sm space-y-1 list-decimal list-inside">
                    <li>
                      ไปที่{" "}
                      <a
                        href="https://developers.line.biz/"
                        target="_blank"
                        className="text-blue-400 underline"
                        rel="noreferrer"
                      >
                        LINE Developers Console
                      </a>
                    </li>
                    <li>สร้าง Messaging API Channel</li>
                    <li>ไปที่แท็บ "Messaging API"</li>
                    <li>
                      ตั้ง Webhook URL เป็น:{" "}
                      <code className="bg-black/30 px-1 rounded text-xs">
                        {webhookUrl}
                      </code>
                    </li>
                    <li>เปิด "Use webhook"</li>
                    <li>Copy Channel Access Token และ Channel Secret มาใส่ด้านบน</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== NOTIFICATIONS TAB ========== */}
        <TabsContent value="notifications">
          <Card className="border border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-yellow-400" />
                การแจ้งเตือน
              </CardTitle>
              <CardDescription>
                เลือกประเภทการแจ้งเตือนที่ต้องการรับทาง LINE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <Label className="text-gray-200 font-medium">
                    แจ้งเตือนเมื่อมีออเดอร์ใหม่
                  </Label>
                  <p className="text-sm text-gray-400 mt-1">
                    รับการแจ้งเตือนทาง LINE เมื่อมีออเดอร์เข้ามาใหม่
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnOrder}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifyOnOrder: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <Label className="text-gray-200 font-medium">
                    แจ้งเตือนเมื่อสต็อกต่ำ
                  </Label>
                  <p className="text-sm text-gray-400 mt-1">
                    รับการแจ้งเตือนเมื่อสินค้าใกล้หมด
                  </p>
                </div>
                <Switch
                  checked={settings.notifyOnLowStock}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifyOnLowStock: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <Label className="text-gray-200 font-medium">
                    ส่งสรุปยอดรายวัน
                  </Label>
                  <p className="text-sm text-gray-400 mt-1">
                    รับสรุปยอดขายทุกวันหลังตัดยอด
                  </p>
                </div>
                <Switch
                  checked={settings.notifyDailySummary}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, notifyDailySummary: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== AI PROVIDER TAB ========== */}
        <TabsContent value="ai">
          <div className="space-y-4">
            {/* Add New AI Provider */}
            <Card className="bg-white/5 border border-white/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl text-white">
                  เพิ่ม AI Provider
                </CardTitle>
                <CardDescription className="text-gray-400">
                  เลือก Provider และใส่ API Key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <Label className="text-gray-200 font-semibold">
                      AI Provider
                    </Label>
                    <Select
                      value={selectedProvider}
                      onValueChange={setSelectedProvider}
                    >
                      <SelectTrigger className="bg-white/5 border border-white/15 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border border-white/15">
                        <SelectItem
                          value="GEMINI"
                          className="font-semibold text-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Google Gemini
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="OPENAI"
                          className="font-semibold text-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            OpenAI GPT
                          </div>
                        </SelectItem>
                        <SelectItem
                          value="N8N"
                          className="font-semibold text-gray-100"
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
                    <Label className="text-gray-200 font-semibold">
                      Model Name (Optional)
                    </Label>
                    <Input
                      placeholder="เช่น gemini-pro, gpt-4"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="bg-white/5 border border-white/15 text-white mt-1 placeholder:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-200 font-semibold">
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
                    className="bg-white/5 border border-white/15 text-white mt-1 placeholder:text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
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

                <Button
                  onClick={handleSaveAI}
                  disabled={savingAI}
                  className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  {savingAI && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึก AI Provider
                </Button>
              </CardContent>
            </Card>

            {/* Existing Providers */}
            <Card className="bg-white/5 border border-white/10 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg md:text-xl text-white">
                  AI Providers ที่บันทึกไว้
                </CardTitle>
                <CardDescription className="text-gray-400">
                  จัดการและทดสอบ API Keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                {providers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
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
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
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
                            <p className="text-sm text-gray-400 mt-1">
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
                            onClick={() => handleTestAI(provider.id)}
                            disabled={testingId === provider.id}
                            className="flex-1 sm:flex-none border border-purple-300 text-purple-200 hover:bg-purple-950/40"
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
                              onClick={() => handleSetDefaultAI(provider.id)}
                              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-cyan-500"
                            >
                              ตั้งเป็นค่าเริ่มต้น
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAI(provider.id)}
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
          </div>
        </TabsContent>

        {/* ========== PLATFORM APIs TAB ========== */}
        <TabsContent value="platforms">
          <Card className="bg-white/5 border border-white/10 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl text-white flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-purple-400" />
                Platform API Settings
              </CardTitle>
              <CardDescription className="text-gray-400">
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
                  <Label className="text-gray-200 font-semibold">Platform</Label>
                  <Select
                    value={platformForm.platform}
                    onValueChange={(value) =>
                      setPlatformForm((prev) => ({ ...prev, platform: value }))
                    }
                  >
                    <SelectTrigger className="bg-white/5 border border-white/15 text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border border-white/15">
                      <SelectItem value="FACEBOOK_ADS">Facebook Ads</SelectItem>
                      <SelectItem value="TIKTOK_ADS">TikTok Ads</SelectItem>
                      <SelectItem value="SHOPEE">Shopee</SelectItem>
                      <SelectItem value="LAZADA">Lazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-200 font-semibold">API Key</Label>
                  <Input
                    value={platformForm.apiKey}
                    onChange={(e) =>
                      setPlatformForm((prev) => ({
                        ...prev,
                        apiKey: e.target.value,
                      }))
                    }
                    className="bg-white/5 border border-white/15 text-white mt-1 placeholder:text-gray-500"
                    placeholder="API Key"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-200 font-semibold">
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
                    className="bg-white/5 border border-white/15 text-white mt-1 placeholder:text-gray-500"
                    placeholder="API Secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-200 font-semibold">
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
                    className="bg-white/5 border border-white/15 text-white mt-1 placeholder:text-gray-500"
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
                    className="bg-white/5 border border-white/15 text-white mt-2 placeholder:text-gray-500"
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
                <h3 className="font-semibold text-white mb-2">
                  Platform API ที่บันทึกไว้
                </h3>
                {loadingPlatformCreds ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  </div>
                ) : platformCreds.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    ยังไม่มี Platform API ที่บันทึกไว้
                  </p>
                ) : (
                  <div className="space-y-3">
                    {platformCreds.map((cred) => (
                      <div
                        key={cred.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-white/5 border-white/10"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {cred.platform}
                          </p>
                          {cred.lastTested && (
                            <p className="text-xs text-gray-400">
                              ทดสอบล่าสุด{" "}
                              {new Date(
                                cred.lastTested
                              ).toLocaleString("th-TH")}
                            </p>
                          )}
                          {cred.testMessage && (
                            <p className="text-xs text-gray-300">
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
                            className="border border-purple-300 text-purple-200"
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
        </TabsContent>

        {/* ========== AD ACCOUNTS TAB ========== */}
        <TabsContent value="adaccounts">
          <Card className="bg-white/5 border border-white/10 backdrop-blur">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg md:text-xl text-white flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-500" />
                  บัญชีโฆษณา (Ad Accounts)
                </CardTitle>
                <CardDescription className="text-gray-400">
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
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : adAccounts.length === 0 ? (
                <p className="text-sm text-gray-400">
                  ยังไม่มีบัญชีโฆษณา เพิ่มบัญชีใหม่เพื่อเริ่มเชื่อมต่อ
                </p>
              ) : (
                <div className="space-y-3">
                  {adAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-white/5 border-white/10"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">
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
                          <p className="text-xs text-gray-300 mt-1">
                            Account ID: {acc.accountId}
                          </p>
                        )}
                        {acc.lastTested && (
                          <p className="text-xs text-gray-400">
                            ทดสอบล่าสุด{" "}
                            {new Date(acc.lastTested).toLocaleString("th-TH")}
                          </p>
                        )}
                        {acc.testMessage && (
                          <p className="text-xs text-gray-300">
                            ผลการทดสอบ: {acc.testMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestAdAccount(acc.id)}
                          disabled={testingAdAccount === acc.id}
                          className="border border-blue-300 text-blue-200"
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
                            className="border border-purple-300 text-purple-200"
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
        </TabsContent>

        {/* ========== ADMIN TAB ========== */}
        <TabsContent value="admin">
          <Card className="border border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                ผู้ดูแลระบบ
              </CardTitle>
              <CardDescription>
                กำหนดอีเมลของผู้ดูแลระบบ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-200">
                  Admin Emails (คั่นด้วยเครื่องหมายจุลภาค)
                </Label>
                <Input
                  value={settings.adminEmails}
                  onChange={(e) =>
                    setSettings({ ...settings, adminEmails: e.target.value })
                  }
                  placeholder="admin1@email.com, admin2@email.com"
                  className="mt-1 bg-black/40 border-white/15 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  ผู้ใช้ที่มีอีเมลในรายการนี้จะมีสิทธิ์แอดมิน
                </p>
              </div>

              <Alert className="bg-red-500/10 border-red-500/30">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-red-200">
                  ⚠️ ระวัง: ผู้ดูแลระบบสามารถแก้ไข/ลบข้อมูลสำคัญได้
                  ให้เพิ่มเฉพาะคนที่เชื่อถือได้เท่านั้น
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              บันทึกการตั้งค่าทั้งหมด
            </>
          )}
        </Button>
      </div>

      {/* Dialog: Add Ad Account */}
      <Dialog
        open={isAdAccountDialogOpen}
        onOpenChange={setIsAdAccountDialogOpen}
      >
        <DialogContent className="bg-slate-950 border border-white/15 text-white">
          <DialogHeader>
            <DialogTitle>เพิ่ม Ad Account ใหม่</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAddAdAccount}>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                Platform
              </Label>
              <Select
                value={adAccountForm.platform}
                onValueChange={(value) =>
                  setAdAccountForm((prev) => ({ ...prev, platform: value }))
                }
              >
                <SelectTrigger className="bg-white/5 border border-white/15 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border border-white/15">
                  <SelectItem value="FACEBOOK">Facebook Ads</SelectItem>
                  <SelectItem value="GOOGLE">Google Ads</SelectItem>
                  <SelectItem value="TIKTOK">TikTok Ads</SelectItem>
                  <SelectItem value="LINE">LINE Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                ชื่อบัญชี
              </Label>
              <Input
                value={adAccountForm.accountName}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                placeholder="เช่น Main Facebook Ads"
                className="bg-white/5 border border-white/15 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                Account ID (ถ้ามี)
              </Label>
              <Input
                value={adAccountForm.accountId}
                onChange={(e) =>
                  setAdAccountForm((prev) => ({
                    ...prev,
                    accountId: e.target.value,
                  }))
                }
                placeholder="เช่น act_123456789"
                className="bg-white/5 border border-white/15 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                API Key / Access Token
              </Label>
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
                className="bg-white/5 border border-white/15 text-white placeholder:text-gray-500"
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
                className="bg-white/5 border border-white/15 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                API Secret / Refresh Token (ถ้ามี)
              </Label>
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
                className="bg-white/5 border border-white/15 text-white placeholder:text-gray-500"
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
                className="bg-white/5 border border-white/15 text-white placeholder:text-gray-500"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAdAccountDialogOpen(false)}
                className="border border-white/20"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
              >
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
