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
  Globe2,
  Facebook,
  Trash2,
  TestTube2,
  Check,
  X,
  RefreshCw,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
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
      ? `${window.location.origin}/api/line/webhook`
      : settings.lineWebhookUrl || "https://your-domain.com/api/line/webhook";

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

      // ถ้า token เป็น masked (มี "...") ให้ใช้ค่าว่างแทน
      setSettings({
        dailyCutOffHour: data.dailyCutOffHour ?? 23,
        dailyCutOffMinute: data.dailyCutOffMinute ?? 59,
        lineNotifyToken: data.lineNotifyToken?.includes("...")
          ? ""
          : data.lineNotifyToken || "",
        lineChannelAccessToken: data.lineChannelAccessToken?.includes("...")
          ? ""
          : data.lineChannelAccessToken || "",
        lineChannelSecret: data.lineChannelSecret?.includes("...")
          ? ""
          : data.lineChannelSecret || "",
        lineWebhookUrl: data.lineWebhookUrl || webhookUrl,
        adminEmails: data.adminEmails || "",
        notifyOnOrder: data.notifyOnOrder ?? true,
        notifyOnLowStock: data.notifyOnLowStock ?? true,
        notifyDailySummary: data.notifyDailySummary ?? true,
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

      // payload ส่งเฉพาะค่าที่จำเป็น + token ที่กรอกใหม่
      const payload: any = {
        dailyCutOffHour: settings.dailyCutOffHour,
        dailyCutOffMinute: settings.dailyCutOffMinute,
        lineWebhookUrl: webhookUrl,
        adminEmails: settings.adminEmails,
        notifyOnOrder: settings.notifyOnOrder,
        notifyOnLowStock: settings.notifyOnLowStock,
        notifyDailySummary: settings.notifyDailySummary,
      };

      if (settings.lineNotifyToken.trim()) {
        payload.lineNotifyToken = settings.lineNotifyToken.trim();
      }
      if (settings.lineChannelAccessToken.trim()) {
        payload.lineChannelAccessToken =
          settings.lineChannelAccessToken.trim();
      }
      if (settings.lineChannelSecret.trim()) {
        payload.lineChannelSecret = settings.lineChannelSecret.trim();
      }

      const res = await fetch("/api/system-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      // อัปเดต state ด้วยค่าที่มาจากเซิร์ฟเวอร์ทันที (แสดงค่าที่บันทึกแล้ว)
      setSettings((prev) => ({
        ...prev,
        dailyCutOffHour: data.dailyCutOffHour ?? prev.dailyCutOffHour,
        dailyCutOffMinute: data.dailyCutOffMinute ?? prev.dailyCutOffMinute,
        lineWebhookUrl: data.lineWebhookUrl || webhookUrl,
        adminEmails: data.adminEmails ?? "",
        notifyOnOrder:
          typeof data.notifyOnOrder === "boolean"
            ? data.notifyOnOrder
            : prev.notifyOnOrder,
        notifyOnLowStock:
          typeof data.notifyOnLowStock === "boolean"
            ? data.notifyOnLowStock
            : prev.notifyOnLowStock,
        notifyDailySummary:
          typeof data.notifyDailySummary === "boolean"
            ? data.notifyDailySummary
            : prev.notifyDailySummary,
        // token จาก API จะเป็น masked/null เพื่อความปลอดภัย
        // ฝั่ง UI ให้เคลียร์ไว้รอกรอกใหม่เวลาจะเปลี่ยน
        lineNotifyToken: "",
        lineChannelAccessToken: "",
        lineChannelSecret: "",
      }));

      toast({
        title: "✅ บันทึกสำเร็จ",
        description: "บันทึกการตั้งค่าระบบเรียบร้อยแล้ว",
      });
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
      const response = await fetch(`/api/ai-settings/test?id=${providerId}`, {
        method: "POST",
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // ========== MAIN RENDER ==========

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          System Settings
        </h1>
        <p className="text-gray-400">
          ตั้งค่าระบบทั้งหมด - AI, LINE, Platform APIs, Daily Cut-off และอื่นๆ
        </p>
      </div>

      <Tabs defaultValue="cutoff" className="w-full">
        <TabsList className="grid w-full grid-cols-7 lg:grid-cols-7">
          <TabsTrigger value="cutoff">ตัดยอด</TabsTrigger>
          <TabsTrigger value="line">LINE</TabsTrigger>
          <TabsTrigger value="notifications">แจ้งเตือน</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="platforms">Platform</TabsTrigger>
          <TabsTrigger value="adaccounts">Ad Accounts</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        {/* Daily Cut-off Tab */}
        <TabsContent value="cutoff">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                ตั้งเวลาตัดยอดรายวัน
              </CardTitle>
              <CardDescription>
                กำหนดเวลาที่ระบบจะสรุปยอดขายอัตโนมัติทุกวัน
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ชั่วโมง (0-23)</Label>
                  <Input
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
                  />
                </div>
                <div>
                  <Label>นาที (0-59)</Label>
                  <Input
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
                  />
                </div>
              </div>

              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  💡 ระบบจะตัดยอดอัตโนมัติเวลา{" "}
                  {settings.dailyCutOffHour.toString().padStart(2, "0")}:
                  {settings.dailyCutOffMinute.toString().padStart(2, "0")} น.
                  ทุกวัน
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINE Integration Tab */}
        <TabsContent value="line">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                LINE Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>LINE Notify Token</Label>
                <div className="flex gap-2">
                  <Input
                    type={showTokens.notify ? "text" : "password"}
                    value={settings.lineNotifyToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineNotifyToken: e.target.value,
                      })
                    }
                    placeholder="ใส่ token ใหม่เพื่ออัพเดท"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        notify: !showTokens.notify,
                      })
                    }
                  >
                    {showTokens.notify ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label>LINE Channel Access Token</Label>
                <div className="flex gap-2">
                  <Input
                    type={showTokens.channelAccess ? "text" : "password"}
                    value={settings.lineChannelAccessToken}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineChannelAccessToken: e.target.value,
                      })
                    }
                    placeholder="ใส่ token ใหม่เพื่ออัพเดท"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        channelAccess: !showTokens.channelAccess,
                      })
                    }
                  >
                    {showTokens.channelAccess ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label>LINE Channel Secret</Label>
                <div className="flex gap-2">
                  <Input
                    type={showTokens.channelSecret ? "text" : "password"}
                    value={settings.lineChannelSecret}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineChannelSecret: e.target.value,
                      })
                    }
                    placeholder="ใส่ secret ใหม่เพื่ออัพเดท"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setShowTokens({
                        ...showTokens,
                        channelSecret: !showTokens.channelSecret,
                      })
                    }
                  >
                    {showTokens.channelSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Webhook URL</Label>
                <Input value={webhookUrl} readOnly className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">
                  ใช้ URL นี้ใน LINE Developers Console
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                การแจ้งเตือน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>แจ้งเตือนเมื่อมีออเดอร์ใหม่</Label>
                  <p className="text-sm text-muted-foreground">
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

              <div className="flex items-center justify-between">
                <div>
                  <Label>แจ้งเตือนเมื่อสต็อกต่ำ</Label>
                  <p className="text-sm text-muted-foreground">
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

              <div className="flex items-center justify-between">
                <div>
                  <Label>ส่งสรุปยอดรายวัน</Label>
                  <p className="text-sm text-muted-foreground">
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

        {/* AI Tab */}
        <TabsContent value="ai">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>เพิ่ม AI Provider</CardTitle>
                <CardDescription>
                  เลือก Provider และใส่ API Key / Webhook URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>AI Provider</Label>
                    <Select
                      value={selectedProvider}
                      onValueChange={setSelectedProvider}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                    <Label>Model Name (Optional)</Label>
                    <Input
                      placeholder="เช่น gemini-pro, gpt-4"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>
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
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedProvider === "GEMINI" && (
                      <>
                        Get API key from{" "}
                        <a
                          href="https://makersuite.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 underline"
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
                          className="text-blue-500 underline"
                        >
                          OpenAI Platform
                        </a>
                      </>
                    )}
                    {selectedProvider === "N8N" &&
                      "ใส่ Webhook URL จาก workflow n8n ของคุณ"}
                  </p>
                </div>

                <Button onClick={handleSaveAI} disabled={savingAI}>
                  {savingAI && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  บันทึก AI Provider
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Providers ที่บันทึกไว้</CardTitle>
              </CardHeader>
              <CardContent>
                {providers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ยังไม่มี AI Provider
                  </p>
                ) : (
                  <div className="space-y-3">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 border rounded-lg"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {provider.provider === "GEMINI" && "Google Gemini"}
                              {provider.provider === "OPENAI" && "OpenAI GPT"}
                              {provider.provider === "N8N" && "n8n Workflow"}
                            </h3>
                            {provider.isDefault && <Badge>ค่าเริ่มต้น</Badge>}
                            {provider.isValid ? (
                              <Badge
                                variant="default"
                                className="bg-green-500"
                              >
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
                            <p className="text-sm text-muted-foreground">
                              Model: {provider.modelName}
                            </p>
                          )}
                          {provider.lastTested && (
                            <p className="text-xs text-muted-foreground">
                              ทดสอบล่าสุด:{" "}
                              {new Date(
                                provider.lastTested
                              ).toLocaleString("th-TH")}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTestAI(provider.id)}
                            disabled={testingId === provider.id}
                          >
                            {testingId === provider.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>

                          {!provider.isDefault && provider.isValid && (
                            <Button
                              size="sm"
                              onClick={() => handleSetDefaultAI(provider.id)}
                            >
                              ตั้งเป็น Default
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

        {/* Platform APIs Tab - แบบย่อ (Coming soon) */}
        <TabsContent value="platforms">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="w-5 h-5" />
                Platform API Settings
              </CardTitle>
              <CardDescription>
                ตั้งค่า API Key / Token สำหรับแพลตฟอร์มโฆษณา / มาร์เก็ตเพลส
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                ฟีเจอร์ UI เต็ม ๆ สำหรับจัดการ Platform APIs กำลังพัฒนา
                แต่ระบบหลังบ้าน (API) พร้อมใช้งานแล้ว
              </p>

              {loadingPlatformCreds ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : platformCreds.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มี Platform API ที่บันทึกไว้
                </p>
              ) : (
                <div className="space-y-3">
                  {platformCreds.map((cred) => (
                    <div
                      key={cred.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{cred.platform}</p>
                        {cred.lastTested && (
                          <p className="text-xs text-muted-foreground">
                            ทดสอบล่าสุด{" "}
                            {new Date(
                              cred.lastTested
                            ).toLocaleString("th-TH")}
                          </p>
                        )}
                        {cred.testMessage && (
                          <p className="text-xs text-muted-foreground">
                            {cred.testMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={
                            cred.isValid ? "bg-green-500" : "bg-red-500"
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
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ad Accounts Tab - แบบย่อ (Coming soon) */}
        <TabsContent value="adaccounts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="w-5 h-5" />
                Ad Accounts
              </CardTitle>
              <CardDescription>
                จัดการบัญชีโฆษณาสำหรับ Facebook / TikTok / Google / LINE
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAdAccounts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : adAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  ยังไม่มี Ad Account เชื่อมต่อ
                </p>
              ) : (
                <div className="space-y-3">
                  {adAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">
                            {acc.accountName || acc.accountId || "Unnamed"}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {acc.platform}
                          </Badge>
                          {acc.isDefault && (
                            <Badge className="bg-blue-500 text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        {acc.accountId && (
                          <p className="text-xs text-muted-foreground">
                            Account ID: {acc.accountId}
                          </p>
                        )}
                        {acc.lastTested && (
                          <p className="text-xs text-muted-foreground">
                            ทดสอบล่าสุด{" "}
                            {new Date(
                              acc.lastTested
                            ).toLocaleString("th-TH")}
                          </p>
                        )}
                        {acc.testMessage && (
                          <p className="text-xs text-muted-foreground">
                            ผลการทดสอบ: {acc.testMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className={
                            acc.isValid ? "bg-green-500" : "bg-red-500"
                          }
                        >
                          {acc.isValid ? "ใช้งานได้" : "มีปัญหา"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestAdAccount(acc.id)}
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

              <p className="text-xs text-muted-foreground mt-4">
                UI สำหรับเพิ่ม / แก้ไข Ad Account แบบเต็มกำลังปรับปรุง
                แต่คุณสามารถเพิ่มผ่าน API ได้แล้ว
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                ผู้ดูแลระบบ
              </CardTitle>
              <CardDescription>
                กำหนดอีเมลของผู้ดูแลระบบ (ADMIN) ที่สามารถแก้ไขการตั้งค่าระบบได้
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Admin Emails (คั่นด้วยเครื่องหมายจุลภาค)</Label>
                <Input
                  value={settings.adminEmails}
                  onChange={(e) =>
                    setSettings({ ...settings, adminEmails: e.target.value })
                  }
                  placeholder="admin1@email.com, admin2@email.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ผู้ใช้ที่มีอีเมลในรายการนี้จะมีสิทธิ์แอดมิน
                </p>
              </div>

              <Alert variant="destructive">
                <Info className="w-4 h-4" />
                <AlertDescription>
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
        <Button onClick={handleSaveSettings} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              บันทึกการตั้งค่า
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
