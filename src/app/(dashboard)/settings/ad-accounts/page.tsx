"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Facebook,
  Link2,
  Loader2,
  RadioTower,
  Store,
} from "lucide-react";

const defaultForm = {
  id: undefined as string | undefined,
  enabled: false,
  name: "",
  apiKey: "",
  apiSecret: "",
  accessToken: "",
  refreshToken: "",
  accountId: "",
  pixelOrTrackingId: "",
  lastTestStatus: undefined as "SUCCESS" | "FAILED" | "PENDING" | null | undefined,
  lastTestedAt: undefined as string | null | undefined,
};

type AdPlatform = "facebook" | "tiktok" | "shopee" | "lazada";

interface AdAccountForm {
  id?: string;
  enabled: boolean;
  name: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  refreshToken: string;
  accountId: string;
  pixelOrTrackingId: string;
  lastTestStatus?: "SUCCESS" | "FAILED" | "PENDING" | null;
  lastTestedAt?: string | null;
}

type AdAccountsState = Record<AdPlatform, AdAccountForm>;

const platformConfigs: Record<AdPlatform, { label: string; description: string; icon: ComponentType<any> }> = {
  facebook: {
    label: "Facebook Ads",
    description:
      "เชื่อมต่อ Facebook Ads API เพื่อดึงข้อมูลแคมเปญ และให้ระบบช่วยวิเคราะห์ & ตั้งกฎอัตโนมัติ",
    icon: Facebook,
  },
  tiktok: {
    label: "TikTok Ads",
    description: "เชื่อมต่อ TikTok Ads API เพื่อดูผลโฆษณา และจัดการด้วย AI ภายในระบบ",
    icon: RadioTower,
  },
  shopee: {
    label: "Shopee Ads",
    description: "เชื่อมต่อโฆษณา Shopee เพื่อดูยอดขายและประสิทธิภาพแคมเปญ",
    icon: Store,
  },
  lazada: {
    label: "Lazada Ads",
    description: "เชื่อมต่อโฆษณา Lazada เพื่อดูยอดเข้าชม ยอดขาย และผลลัพธ์แคมเปญ",
    icon: Building2,
  },
};

export default function AdAccountsSettingsPage() {
  const { toast } = useToast();
  const [forms, setForms] = useState<AdAccountsState>({
    facebook: { ...defaultForm },
    tiktok: { ...defaultForm },
    shopee: { ...defaultForm },
    lazada: { ...defaultForm },
  });
  const [activeTab, setActiveTab] = useState<AdPlatform>("facebook");
  const [savingPlatform, setSavingPlatform] = useState<AdPlatform | null>(null);
  const [testingPlatform, setTestingPlatform] = useState<AdPlatform | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchConfigs = async () => {
      try {
        const response = await fetch("/api/ad-accounts");
        if (!response.ok) return;
        const data = await response.json();
        if (!mounted || !Array.isArray(data)) return;

        setForms((prev) => {
          const next = { ...prev } as AdAccountsState;
          data.forEach((account: any) => {
            const platformKey = (account.platform?.toLowerCase?.() ?? "") as AdPlatform;
            if (!next[platformKey]) return;
            next[platformKey] = {
              ...next[platformKey],
              id: account.id,
              enabled: account.isActive ?? false,
              name: account.name ?? "",
              apiKey: account.apiKey ?? "",
              apiSecret: account.apiSecret ?? "",
              accessToken: account.accessToken ?? "",
              refreshToken: account.refreshToken ?? "",
              accountId: account.accountId ?? "",
              pixelOrTrackingId: account.pixelOrTrackingId ?? "",
              lastTestStatus: account.lastTestStatus ?? undefined,
              lastTestedAt: account.lastTestedAt ?? undefined,
            };
          });
          return next;
        });
      } catch (error) {
        console.warn("ไม่สามารถโหลดการตั้งค่าโฆษณา", error);
      }
    };

    fetchConfigs();
    return () => {
      mounted = false;
    };
  }, []);

  const handleFieldChange = (
    platform: AdPlatform,
    field: keyof AdAccountForm,
    value: string | boolean
  ) => {
    setForms((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const handleSave = async (platform: AdPlatform) => {
    const settings = forms[platform];

    if (!settings.name || !settings.apiKey || !settings.accessToken) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูลให้ครบ",
        description: "อย่างน้อยต้องใส่ชื่อบัญชี, API Key และ Access Token",
      });
      return;
    }

    try {
      setSavingPlatform(platform);
      const response = await fetch("/api/ad-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: platform.toUpperCase(),
          name: settings.name,
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
          accessToken: settings.accessToken,
          refreshToken: settings.refreshToken,
          accountId: settings.accountId,
          pixelOrTrackingId: settings.pixelOrTrackingId,
          isActive: settings.enabled,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        toast({
          variant: "destructive",
          title: "บันทึกไม่สำเร็จ",
          description: data?.error || "ไม่สามารถบันทึกการตั้งค่าได้ โปรดตรวจสอบ API และลองใหม่",
        });
        return;
      }

      setForms((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          id: data?.id ?? prev[platform].id,
          lastTestStatus: data?.lastTestStatus ?? prev[platform].lastTestStatus,
          lastTestedAt: data?.lastTestedAt ?? prev[platform].lastTestedAt,
        },
      }));

      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกการตั้งค่า ${platformConfigs[platform].label} แล้ว`,
      });
    } catch (error) {
      console.error("บันทึกการตั้งค่าไม่สำเร็จ", error);
      toast({
        variant: "destructive",
        title: "บันทึกไม่สำเร็จ",
        description: "ไม่สามารถบันทึกการตั้งค่าได้ โปรดตรวจสอบ API และลองใหม่",
      });
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleTest = async (platform: AdPlatform) => {
    const settings = forms[platform];

    try {
      setTestingPlatform(platform);
      const response = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings.id,
          platform: platform.toUpperCase(),
          apiKey: settings.apiKey,
          apiSecret: settings.apiSecret,
          accessToken: settings.accessToken,
          refreshToken: settings.refreshToken,
          accountId: settings.accountId,
          pixelOrTrackingId: settings.pixelOrTrackingId,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.status === "FAILED" || data?.success === false) {
        toast({
          variant: "destructive",
          title: "เชื่อมต่อไม่สำเร็จ",
          description: data?.message || "ไม่สามารถเชื่อมต่อได้ โปรดตรวจสอบ API Key / Token อีกครั้ง",
        });
        setForms((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            lastTestStatus: data?.status ?? "FAILED",
            lastTestedAt: new Date().toISOString(),
          },
        }));
        return;
      }

      setForms((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          lastTestStatus: data?.status ?? "SUCCESS",
          lastTestedAt: new Date().toISOString(),
        },
      }));

      toast({
        title: "เชื่อมต่อสำเร็จ",
        description: `ระบบสามารถเชื่อมต่อกับ ${platformConfigs[platform].label} ได้`,
      });
    } catch (error) {
      console.error("ทดสอบการเชื่อมต่อไม่สำเร็จ", error);
      toast({
        variant: "destructive",
        title: "เชื่อมต่อไม่สำเร็จ",
        description: "ไม่สามารถเชื่อมต่อได้ โปรดตรวจสอบ API Key / Token อีกครั้ง",
      });
    } finally {
      setTestingPlatform(null);
    }
  };

  const renderPlatformForm = (platform: AdPlatform) => {
    const config = platformConfigs[platform];
    const Icon = config.icon;
    const form = forms[platform];
    const isSaving = savingPlatform === platform;
    const isTesting = testingPlatform === platform;
    const testedText = form.lastTestedAt
      ? new Date(form.lastTestedAt).toLocaleString("th-TH")
      : "ยังไม่เคยทดสอบ";

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-800 text-slate-100 p-2">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{config.label}</h2>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">สถานะการเชื่อมต่อ</p>
              {form.enabled ? (
                <div className="flex items-center gap-1 text-emerald-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>ใช้งานอยู่</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>ปิดการใช้งาน</span>
                </div>
              )}
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(checked) => handleFieldChange(platform, "enabled", checked)}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-200">ชื่อบัญชี</Label>
            <Input
              value={form.name}
              placeholder="เช่น Main Ad Account"
              onChange={(e) => handleFieldChange(platform, "name", e.target.value)}
            />
            <p className="text-xs text-slate-400">ตั้งชื่อเพื่อให้จำง่ายในรายงานและหน้าโฆษณา</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">API Key</Label>
            <Input
              type="password"
              value={form.apiKey}
              placeholder="API Key"
              onChange={(e) => handleFieldChange(platform, "apiKey", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">API Secret (ถ้ามี)</Label>
            <Input
              type="password"
              value={form.apiSecret}
              placeholder="API Secret"
              onChange={(e) => handleFieldChange(platform, "apiSecret", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Access Token</Label>
            <Input
              type="password"
              value={form.accessToken}
              placeholder="Access Token"
              onChange={(e) => handleFieldChange(platform, "accessToken", e.target.value)}
            />
            <p className="text-xs text-slate-400">สำหรับดึงข้อมูลแคมเปญและสถิติต่าง ๆ</p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Refresh Token (ถ้ามี)</Label>
            <Input
              type="password"
              value={form.refreshToken}
              placeholder="Refresh Token"
              onChange={(e) => handleFieldChange(platform, "refreshToken", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Account ID</Label>
            <Input
              value={form.accountId}
              placeholder="Account ID"
              onChange={(e) => handleFieldChange(platform, "accountId", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Pixel / Tracking ID (ถ้ามี)</Label>
            <Input
              value={form.pixelOrTrackingId}
              placeholder="เช่น Facebook Pixel ID, TikTok Pixel ID"
              onChange={(e) =>
                handleFieldChange(platform, "pixelOrTrackingId", e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleTest(platform)}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            ทดสอบการเชื่อมต่อ
          </Button>
          <Button onClick={() => handleSave(platform)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            บันทึกการตั้งค่า
          </Button>
          <Badge variant="secondary" className="bg-slate-800 text-slate-300 border border-slate-700">
            ทดสอบล่าสุด: {testedText}
          </Badge>
          {form.lastTestStatus ? (
            <Badge
              className={
                form.lastTestStatus === "SUCCESS"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/10 text-red-300 border border-red-500/40"
              }
            >
              สถานะ: {form.lastTestStatus === "SUCCESS" ? "สำเร็จ" : "ล้มเหลว"}
            </Badge>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">ตั้งค่า API โฆษณา</h1>
        <p className="text-slate-400 mt-1">กำหนดค่าเชื่อมต่อโฆษณาสำหรับ Facebook, TikTok, Shopee และ Lazada</p>
      </div>

      <Card className="bg-slate-900/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">จัดการการเชื่อมต่อ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdPlatform)}>
            <TabsList className="grid grid-cols-4 bg-slate-800">
              <TabsTrigger value="facebook">Facebook</TabsTrigger>
              <TabsTrigger value="tiktok">TikTok</TabsTrigger>
              <TabsTrigger value="shopee">Shopee</TabsTrigger>
              <TabsTrigger value="lazada">Lazada</TabsTrigger>
            </TabsList>
            <TabsContent value="facebook" className="mt-6">
              {renderPlatformForm("facebook")}
            </TabsContent>
            <TabsContent value="tiktok" className="mt-6">
              {renderPlatformForm("tiktok")}
            </TabsContent>
            <TabsContent value="shopee" className="mt-6">
              {renderPlatformForm("shopee")}
            </TabsContent>
            <TabsContent value="lazada" className="mt-6">
              {renderPlatformForm("lazada")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
