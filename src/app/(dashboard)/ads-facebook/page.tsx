"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  ArrowUpRight,
  Loader2,
  Facebook,
  Plus,
} from "lucide-react";

interface Campaign {
  id: string;
  campaignName: string;
  budget: number;
  spent: number;
  remaining: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  status: string;
}

interface AdMetrics {
  totalSpent: number;
  totalRevenue: number;
  totalProfit: number;
  totalClicks: number;
  totalImpressions: number;
  totalConversions: number;
  avgCPC: number;
  avgCTR: number;
  avgROAS: number;
}

const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];

export default function AdsFacebookPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<AdMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("7days");

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [campaignsRes, metricsRes] = await Promise.all([
        fetch("/api/ads/campaigns?platform=FACEBOOK"),
        fetch(`/api/ads/metrics?platform=FACEBOOK&period=${selectedPeriod}`),
      ]);

      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.summary);
        setChartData(metricsData.chartData || []);
      }
    } catch (error) {
      console.error("Failed to fetch ads data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลโฆษณาได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Facebook Ads Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            วิเคราะห์ประสิทธิภาพการยิงโฆษณาและคำนวณกำไร
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={() => window.location.href = "/upload-receipt"}>
            <Plus className="w-4 h-4 mr-2" />
            อัพโหลดสลิป
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-300">
              <DollarSign className="w-4 h-4" />
              ค่าโฆษณาทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ฿{metrics?.totalSpent.toLocaleString() || 0}
            </div>
            <p className="text-xs text-blue-300 mt-1">
              จาก {campaigns.length} แคมเปญ
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-green-300">
              <TrendingUp className="w-4 h-4" />
              รายได้ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{metrics?.totalRevenue.toLocaleString() || 0}
            </div>
            <p className="text-xs text-green-300 mt-1">
              ROAS: {metrics?.avgROAS.toFixed(2)}x
            </p>
          </CardContent>
        </Card>

        {/* Total Profit */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-300">
              <Target className="w-4 h-4" />
              กำไรสุทธิ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              ฿{metrics?.totalProfit.toLocaleString() || 0}
            </div>
            <p className="text-xs text-purple-300 mt-1">
              จาก {metrics?.totalConversions || 0} คอนเวอร์ชั่น
            </p>
          </CardContent>
        </Card>

        {/* Avg CPC */}
        <Card className="bg-gradient-to-br from-pink-900/30 to-pink-950/30 border-pink-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-pink-300">
              <MousePointerClick className="w-4 h-4" />
              ค่าคลิกเฉลี่ย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400">
              ฿{metrics?.avgCPC.toFixed(2) || 0}
            </div>
            <p className="text-xs text-pink-300 mt-1">
              CTR: {metrics?.avgCTR.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Spent Chart */}
        <Card>
          <CardHeader>
            <CardTitle>รายได้ vs ค่าโฆษณา (7 วันล่าสุด)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="รายได้"
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="ค่าโฆษณา"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="กำไร"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>ประสิทธิภาพแคมเปญ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaigns.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="campaignName" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="clicks" fill="#3b82f6" name="คลิก" />
                  <Bar dataKey="conversions" fill="#10b981" name="คอนเวอร์ชั่น" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>รายการแคมเปญ</CardTitle>
          <CardDescription>
            แสดงข้อมูลแคมเปญทั้งหมดพร้อมการคำนวณกำไร
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Facebook className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                ยังไม่มีแคมเปญโฆษณา
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                อัพโหลดสลิปเพื่อเพิ่มข้อมูลแคมเปญ
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-start justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {campaign.campaignName}
                      </h3>
                      <Badge
                        className={
                          campaign.status === "ACTIVE"
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">งบประมาณ</p>
                        <p className="font-semibold">
                          ฿{campaign.budget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ใช้ไป</p>
                        <p className="font-semibold text-red-500">
                          ฿{campaign.spent.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">รายได้</p>
                        <p className="font-semibold text-green-500">
                          ฿{campaign.revenue.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">กำไร</p>
                        <p className="font-semibold text-purple-500">
                          ฿{campaign.profit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Impressions</p>
                        <p className="font-medium">
                          {campaign.impressions.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="font-medium">
                          {campaign.clicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPC</p>
                        <p className="font-medium">฿{campaign.cpc.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="font-medium">{campaign.ctr.toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ROAS</p>
                        <p className="font-medium text-green-500">
                          {campaign.roas.toFixed(2)}x
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
