"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bot,
  Play,
  Pause,
  Settings as SettingsIcon,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Loader2,
  Facebook,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface PlatformCredential {
  id: string;
  platform: string;
  isValid: boolean;
  lastTested?: string | null;
}

interface AdAccount {
  id: string;
  platform: string;
  accountName: string;
  isActive: boolean;
  isValid: boolean;
  isDefault: boolean;
}

interface CampaignStats {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export default function FacebookAdsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isAutomationActive, setIsAutomationActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [credsRes, accountsRes] = await Promise.all([
        fetch("/api/platform-credentials"),
        fetch("/api/ad-accounts"),
      ]);

      if (credsRes.ok) {
        const credsData = await credsRes.json();
        const fbCreds = (Array.isArray(credsData) ? credsData : []).filter(
          (c: any) => c.platform === "FACEBOOK_ADS"
        );
        setCredentials(fbCreds);
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        const fbAccounts = (
          Array.isArray(accountsData) ? accountsData : []
        ).filter((a: any) => a.platform === "FACEBOOK");
        setAdAccounts(fbAccounts);
      }

      // Simulate stats (in real implementation, fetch from Facebook API)
      setStats({
        impressions: 125000,
        clicks: 3200,
        spend: 4500,
        conversions: 89,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = () => {
    if (!hasValidSetup) {
      toast({
        title: "ไม่สามารถเปิดได้",
        description: "กรุณาตั้งค่า Facebook API และ Ad Account ก่อน",
        variant: "destructive",
      });
      return;
    }

    setIsAutomationActive(!isAutomationActive);
    toast({
      title: isAutomationActive
        ? "หยุดการทำงานอัตโนมัติ"
        : "เปิดการทำงานอัตโนมัติ",
      description: isAutomationActive
        ? "ระบบหยุดยิงแอดอัตโนมัติแล้ว"
        : "ระบบเริ่มยิงแอดอัตโนมัติแล้ว",
    });
  };

  const hasValidCredentials = credentials.some((c) => c.isValid);
  const hasValidAccount = adAccounts.some((a) => a.isValid && a.isActive);
  const hasValidSetup = hasValidCredentials && hasValidAccount;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink mb-2 flex items-center gap-3">
            <Facebook className="w-10 h-10 text-blue-500" />
            Facebook Ads Automation
          </h1>
          <p className="text-gray-300">
            ระบบยิงแอด Facebook อัตโนมัติด้วย AI
          </p>
        </div>
        <Link href="/settings">
          <Button
            variant="outline"
            className="border-purple-400 text-purple-200 hover:bg-purple-500/10"
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            ตั้งค่า API
          </Button>
        </Link>
      </div>

      {/* Setup Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">สถานะการตั้งค่า</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credentials Status */}
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              {hasValidCredentials ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className="font-medium text-white">Facebook API Keys</p>
                <p className="text-sm text-gray-400">
                  {hasValidCredentials
                    ? "เชื่อมต่อสำเร็จ"
                    : "ยังไม่ได้ตั้งค่า"}
                </p>
              </div>
            </div>
            {hasValidCredentials ? (
              <Badge className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Link href="/settings">
                <Button size="sm" variant="outline">
                  ตั้งค่าเลย
                </Button>
              </Link>
            )}
          </div>

          {/* Ad Account Status */}
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div className="flex items-center gap-3">
              {hasValidAccount ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <div>
                <p className="font-medium text-white">Facebook Ad Account</p>
                <p className="text-sm text-gray-400">
                  {hasValidAccount
                    ? `${adAccounts.find((a) => a.isDefault)?.accountName || "Connected"}`
                    : "ยังไม่ได้เพิ่มบัญชีโฆษณา"}
                </p>
              </div>
            </div>
            {hasValidAccount ? (
              <Badge className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Link href="/settings">
                <Button size="sm" variant="outline">
                  เพิ่มบัญชี
                </Button>
              </Link>
            )}
          </div>

          {/* Automation Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-700 rounded-lg border-2 border-purple-500">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-purple-400" />
              <div>
                <p className="font-medium text-white">
                  การทำงานอัตโนมัติ (AI-Powered)
                </p>
                <p className="text-sm text-gray-400">
                  {isAutomationActive ? "กำลังทำงาน" : "ปิดอยู่"}
                </p>
              </div>
            </div>
            <Button
              onClick={toggleAutomation}
              disabled={!hasValidSetup}
              className={
                isAutomationActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {isAutomationActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  หยุด
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  เริ่ม
                </>
              )}
            </Button>
          </div>

          {!hasValidSetup && (
            <Alert className="bg-orange-950/40 border-orange-500/50">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <AlertDescription className="text-orange-100">
                <strong>ต้องตั้งค่าก่อนใช้งาน:</strong> กรุณาเพิ่ม Facebook API
                Keys และ Ad Account ในหน้า Settings ก่อนเปิดใช้งานระบบอัตโนมัติ
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Campaign Stats */}
      {hasValidSetup && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Impressions</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.impressions.toLocaleString()}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Clicks</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.clicks.toLocaleString()}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Spend</p>
                  <p className="text-2xl font-bold text-white">
                    ฿{stats.spend.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Conversions</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.conversions.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {hasValidSetup && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bot className="w-5 h-5 text-purple-400" />
              AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-purple-950/40 border border-purple-500/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-green-400 mt-1" />
                  <div>
                    <p className="font-medium text-white">
                      Campaign Performance is Good
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      CTR อยู่ที่ 2.56% ซึ่งสูงกว่าค่าเฉลี่ย
                      แนะนำให้เพิ่มงบประมาณในแคมเปญนี้
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-950/40 border border-blue-500/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-400 mt-1" />
                  <div>
                    <p className="font-medium text-white">
                      Audience Optimization
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      กลุ่มเป้าหมายอายุ 25-34 ปี มี Conversion Rate สูงที่สุด
                      (6.8%)
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-950/40 border border-orange-500/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-orange-400 mt-1" />
                  <div>
                    <p className="font-medium text-white">
                      Budget Recommendation
                    </p>
                    <p className="text-sm text-gray-300 mt-1">
                      CPA ปัจจุบัน ฿50.56
                      แนะนำให้ปรับงบเป็นรายวันที่ ฿200-300 เพื่อเพิ่ม
                      Conversion
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isAutomationActive && (
              <Alert className="mt-4 bg-green-950/40 border-green-500/50">
                <Bot className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-green-100">
                  <strong>AI กำลังทำงาน:</strong> ระบบกำลังวิเคราะห์ข้อมูล
                  และปรับ Bid Strategies อัตโนมัติตาม AI Insights
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Getting Started */}
      {!hasValidSetup && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">เริ่มต้นใช้งาน</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-300 space-y-3">
              <p>
                <strong>ขั้นตอนการเชื่อมต่อ Facebook Ads:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-4">
                <li>
                  ไปที่{" "}
                  <a
                    href="https://developers.facebook.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 underline"
                  >
                    Facebook Developers
                  </a>{" "}
                  สร้าง App และ Access Token
                </li>
                <li>
                  คัดลอก App ID, App Secret และ Access Token ไปวางในหน้า{" "}
                  <Link href="/settings" className="text-purple-400 underline">
                    Settings
                  </Link>
                </li>
                <li>เพิ่ม Facebook Ad Account ของคุณ</li>
                <li>ทดสอบการเชื่อมต่อ</li>
                <li>กลับมาที่หน้านี้เพื่อเปิดใช้งาน Automation</li>
              </ol>
            </div>
            <Link href="/settings">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500">
                <SettingsIcon className="w-4 h-4 mr-2" />
                ไปหน้า Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
