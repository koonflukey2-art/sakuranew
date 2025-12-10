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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Loader2,
  Save,
  Clock,
  MessageSquare,
  Bell,
  Shield,
  Info,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function SystemSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Auto-generate webhook URL
  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/line`
      : settings.lineWebhookUrl || "https://your-domain.com/api/webhooks/line";

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
        fetchSettings();
      } catch (error) {
        console.error("RBAC check failed:", error);
        router.push("/");
      }
    };

    checkAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

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
        description: "บันทึกการตั้งค่าเรียบร้อยแล้ว",
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

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
          System Settings
        </h1>
        <p className="text-gray-400">
          ตั้งค่าระบบ (เฉพาะแอดมิน)
        </p>
      </div>

      <Tabs defaultValue="cutoff" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cutoff">ตัดยอดรายวัน</TabsTrigger>
          <TabsTrigger value="line">LINE Integration</TabsTrigger>
          <TabsTrigger value="notifications">การแจ้งเตือน</TabsTrigger>
          <TabsTrigger value="admin">ผู้ดูแลระบบ</TabsTrigger>
        </TabsList>

        {/* Daily Cut-off Tab */}
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

        {/* LINE Integration Tab */}
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

        {/* Notifications Tab */}
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

        {/* Admin Tab */}
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
              บันทึกการตั้งค่า
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
