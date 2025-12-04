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

type AdPlatform = "facebook" | "tiktok" | "shopee" | "lazada";

interface AdAccountForm {
  id?: string;               // id ในฐานข้อมูล
  enabled: boolean;          // map -> isActive
  accountName: string;       // map -> accountName
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  pixelOrTrackingId: string; // map -> accountId (หรือ pixel id)
}

type AdAccountsState = Record<AdPlatform, AdAccountForm>;

const defaultForm: AdAccountForm = {
  id: undefined,
  enabled: false,
  accountName: "",
  apiKey: "",
  apiSecret: "",
  accessToken: "",
  pixelOrTrackingId: "",
};

const platformConfigs: Record<
  AdPlatform,
  { label: string; description: string; icon: ComponentType<any> }
> = {
  facebook: {
    label: "Facebook Ads",
    description:
      "เชื่อมต่อ Facebook Ads API เพื่อดึงข้อมูลแคมเปญ และให้ระบบช่วยวิเคราะห์ & ตั้งกฎอัตโนมัติ",
    icon: Facebook,
  },
  tiktok: {
    label: "TikTok Ads",
    description:
      "เชื่อมต่อ TikTok Ads API เพื่อดูผลโฆษณา และจัดการด้วย AI ภายในระบบ",
    icon: RadioTower,
  },
  shopee: {
    label: "Shopee Ads",
    description:
      "เชื่อมต่อโฆษณา Shopee เพื่อดูยอดขายและประสิทธิภาพแคมเปญ",
    icon: Store,
  },
  lazada: {
    label: "Lazada Ads",
    description:
      "เชื่อมต่อโฆษณา Lazada เพื่อดูยอดเข้าชม ยอดขาย และผลลัพธ์แคมเปญ",
    icon: Building2,
  },
};

// shape ที่ backend /api/ad-accounts ส่งกลับมา
interface AdAccountFromApi {
  id: string;
  platform: string;          // "FACEBOOK" | "TIKTOK" | "SHOPEE" | "LAZADA"
  accountName: string | null;
  accountId: string | null;
  isActive: boolean;
  isValid: boolean;
  isDefault: boolean;
  lastTested: string | null;
  testMessage: string | null;
}

const toBackendPlatform = (platform: AdPlatform): string => {
  switch (platform) {
    case "facebook":
      return "FACEBOOK";
    case "tiktok":
      return "TIKTOK";
    case "shopee":
      return "SHOPEE";
    case "lazada":
      return "LAZADA";
    default:
      return "FACEBOOK";
  }
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
  const [testingPlatform, setTestingPlatform] = useState<AdPlatform | null>(
    null
  );

  // ===== LOAD CONFIG จาก GET /api/ad-accounts (array) =====
  useEffect(() => {
    let mounted = true;

    const fetchConfigs = async () => {
      try {
        const res = await fetch("/api/ad-accounts");
        if (!res.ok) {
          console.warn("โหลด ad-accounts ไม่สำเร็จ");
          return;
        }

        const data = await res.json();
        if (!mounted) return;

        const list: AdAccountFromApi[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.accounts)
          ? data.accounts
          : [];

        setForms((prev) => {
          const next: AdAccountsState = { ...prev };

          list.forEach((acc) => {
            const key = acc.platform.toLowerCase() as AdPlatform;
            if (!platformConfigs[key]) return;

            next[key] = {
              ...prev[key],
              id: acc.id,
              enabled: acc.isActive,
              accountName: acc.accountName || "",
              // accountId จาก backend เก็บไว้ใน pixelOrTrackingId
              pixelOrTrackingId: acc.accountId || "",
              // apiKey / token ส่วนใหญ่ backend จะไม่ส่งกลับ
              apiKey: prev[key].apiKey,
              apiSecret: prev[key].apiSecret,
              accessToken: prev[key].accessToken,
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

  // ===== SAVE (สร้างใหม่ / แก้ไข) =====
  const handleSave = async (platform: AdPlatform) => {
    const settings = forms[platform];

    if (!settings.accountName || !settings.apiKey || !settings.accessToken) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกข้อมูลให้ครบ",
        description: "อย่างน้อยต้องใส่ชื่อบัญชี, API Key และ Access Token",
      });
      return;
    }

    try {
      setSavingPlatform(platform);

      const backendPlatform = toBackendPlatform(platform);

      const baseBody = {
        platform: backendPlatform,
        accountName: settings.accountName,
        apiKey: settings.apiKey,
        apiSecret: settings.apiSecret,
        accessToken: settings.accessToken,
        accountId: settings.pixelOrTrackingId || undefined,
        isActive: settings.enabled,
      };

      let res: Response;

      if (settings.id) {
        // อัปเดตข้อมูล (PUT /api/ad-accounts)
        res = await fetch("/api/ad-accounts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: settings.id,
            ...baseBody,
          }),
        });
      } else {
        // สร้างใหม่ (POST /api/ad-accounts)
        res = await fetch("/api/ad-accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseBody),
        });
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "บันทึกไม่สำเร็จ",
          description:
            data?.error ||
            "ไม่สามารถบันทึกการตั้งค่าได้ โปรดตรวจสอบ API และลองใหม่",
        });
        return;
      }

      // ถ้าพึ่งสร้างใหม่ให้เก็บ id กลับเข้า state
      if (!settings.id && data?.id) {
        setForms((prev) => ({
          ...prev,
          [platform]: {
            ...prev[platform],
            id: data.id,
          },
        }));
      }

      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกการตั้งค่า ${platformConfigs[platform].label} แล้ว`,
      });
    } catch (error) {
      console.error("บันทึกการตั้งค่าไม่สำเร็จ", error);
      toast({
        variant: "destructive",
        title: "บันทึกไม่สำเร็จ",
        description:
          "ไม่สามารถบันทึกการตั้งค่าได้ โปรดตรวจสอบ API และลองใหม่",
      });
    } finally {
      setSavingPlatform(null);
    }
  };

  // ===== TEST เชื่อมต่อ (POST /api/ad-accounts/test) =====
  const handleTest = async (platform: AdPlatform) => {
    const settings = forms[platform];

    if (!settings.apiKey && !settings.accessToken && !settings.id) {
      toast({
        variant: "destructive",
        title: "ยังไม่มีการตั้งค่า",
        description:
          "กรุณาบันทึก API Key / Access Token ก่อนทดสอบการเชื่อมต่อ",
      });
      return;
    }

    try {
      setTestingPlatform(platform);

      const backendPlatform = toBackendPlatform(platform);

      const res = await fetch("/api/ad-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settings.id,
          platform: backendPlatform,
          apiKey: settings.apiKey,
          accessToken: settings.accessToken,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        toast({
          variant: "destructive",
          title: "เชื่อมต่อไม่สำเร็จ",
          description:
            data?.message ||
            data?.error ||
            "ไม่สามารถเชื่อมต่อได้ โปรดตรวจสอบ API Key / Token อีกครั้ง",
        });
        return;
      }

      toast({
        title: "เชื่อมต่อสำเร็จ",
        description: `ระบบสามารถเชื่อมต่อกับ ${platformConfigs[platform].label} ได้`,
      });
    } catch (error) {
      console.error("ทดสอบการเชื่อมต่อไม่สำเร็จ", error);
      toast({
        variant: "destructive",
        title: "เชื่อมต่อไม่สำเร็จ",
        description:
          "ไม่สามารถเชื่อมต่อได้ โปรดตรวจสอบ API Key / Token อีกครั้ง",
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

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-slate-800 text-slate-100 p-2">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {config.label}
              </h2>
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
              onCheckedChange={(checked) =>
                handleFieldChange(platform, "enabled", checked)
              }
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-slate-200">ชื่อบัญชี</Label>
            <Input
              value={form.accountName}
              placeholder="เช่น Main Ad Account"
              onChange={(e) =>
                handleFieldChange(platform, "accountName", e.target.value)
              }
            />
            <p className="text-xs text-slate-400">
              ตั้งชื่อเพื่อให้จำง่ายในรายงานและหน้าโฆษณา
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">API Key</Label>
            <Input
              value={form.apiKey}
              placeholder="API Key"
              onChange={(e) =>
                handleFieldChange(platform, "apiKey", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">API Secret (ถ้ามี)</Label>
            <Input
              type="password"
              value={form.apiSecret}
              placeholder="API Secret"
              onChange={(e) =>
                handleFieldChange(platform, "apiSecret", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">
              Access Token / Refresh Token
            </Label>
            <Input
              type="password"
              value={form.accessToken}
              placeholder="Access Token"
              onChange={(e) =>
                handleFieldChange(platform, "accessToken", e.target.value)
              }
            />
            <p className="text-xs text-slate-400">
              สำหรับดึงข้อมูลแคมเปญและสถิติต่าง ๆ
            </p>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">
              Account ID / Pixel / Tracking ID (ถ้ามี)
            </Label>
            <Input
              value={form.pixelOrTrackingId}
              placeholder="เช่น act_123..., Pixel ID, TikTok Pixel ID"
              onChange={(e) =>
                handleFieldChange(platform, "pixelOrTrackingId", e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleTest(platform)}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            ทดสอบการเชื่อมต่อ
          </Button>
          <Button onClick={() => handleSave(platform)} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            บันทึกการตั้งค่า
          </Button>
          <Badge
            variant="secondary"
            className="bg-slate-800 text-slate-300 border border-slate-700"
          >
            อัปเดตล่าสุด: {form.accessToken ? "พร้อมใช้งาน" : "ยังไม่ตั้งค่า"}
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">ตั้งค่า API โฆษณา</h1>
        <p className="text-slate-400 mt-1">
          กำหนดค่าเชื่อมต่อโฆษณาสำหรับ Facebook, TikTok, Shopee และ Lazada
        </p>
      </div>

      <Card className="bg-slate-900/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">จัดการการเชื่อมต่อ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as AdPlatform)}
          >
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
