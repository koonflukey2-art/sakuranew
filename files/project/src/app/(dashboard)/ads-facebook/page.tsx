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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  MousePointerClick,
  Target,
  ArrowUpRight,
  Loader2,
  Facebook,
  Plus,
  FileText,
} from "lucide-react";
import Link from "next/link";

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

type MetricsChartRow = {
  date: string; // expected: YYYY-MM-DD or something parseable
  revenue?: number;
  spent?: number;
  profit?: number;
};

function toDayKey(d: Date) {
  // YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseAnyDate(input: any): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function daysFromPeriod(period: string) {
  // รองรับค่าที่เจอบ่อย ๆ ในโปรเจค
  if (period === "7days") return 7;
  if (period === "30days") return 30;
  if (period === "90days") return 90;
  if (period === "1year") return 365;
  // fallback
  return 7;
}

export default function AdsFacebookPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<AdMetrics | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("7days");

  // ✅ รวมทั้งสลิป + สเตทเมนต์
  const [totalAdSpent, setTotalAdSpent] = useState(0);
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [statementsCount, setStatementsCount] = useState(0);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 นาที
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [campaignsRes, metricsRes, receiptsRes, statementsRes] =
        await Promise.all([
          fetch("/api/ads/campaigns?platform=FACEBOOK"),
          fetch(`/api/ads/metrics?platform=FACEBOOK&period=${selectedPeriod}`),
          fetch("/api/ads/receipts"), // สลิป
          fetch("/api/facebook-ads/statements"), // สเตทเมนต์
        ]);

      // 1) Campaigns
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData);
      }

      // 2) Metrics (revenue/profit per day ถ้ามี)
      let metricsChart: MetricsChartRow[] = [];
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.summary);
        metricsChart = (metricsData.chartData || []) as MetricsChartRow[];
      }

      // 3) Receipts (spent จริง)
      let sumFromReceipts = 0;
      let receiptsLen = 0;
      let receiptsList: any[] = [];
      if (receiptsRes.ok) {
        const receiptsData = await receiptsRes.json();
        sumFromReceipts = receiptsData.totalAmount || 0;
        receiptsList = receiptsData.receipts || [];
        receiptsLen = receiptsList.length || 0;
        setReceiptsCount(receiptsLen);
      }

      // 4) Statements (spent จริง)
      let sumFromStatements = 0;
      let statementsLen = 0;
      let statementsList: any[] = [];
      if (statementsRes.ok) {
        const statementsData = await statementsRes.json();
        sumFromStatements = statementsData.totalAmount || 0;
        statementsList = statementsData.statements || [];
        statementsLen = statementsList.length || 0;
        setStatementsCount(statementsLen);
      }

      // ✅ รวมสองฝั่งเป็นค่าโฆษณาทั้งหมด (ตัวเลขการ์ด)
      setTotalAdSpent(sumFromReceipts + sumFromStatements);

      // =========================
      // ✅ ทำ "กราฟจริง" ต่อวัน
      // spent = receipts + statements
      // revenue/profit = จาก metricsChart (ถ้ามี)
      // =========================

      // รวม spent ต่อวันจาก receipts + statements
      const spentByDay = new Map<string, number>();

      const addSpent = (dateLike: any, amountLike: any) => {
        const d = parseAnyDate(dateLike);
        if (!d) return;
        const key = toDayKey(d);
        const amt = Number(amountLike || 0);
        if (!Number.isFinite(amt)) return;
        spentByDay.set(key, (spentByDay.get(key) || 0) + amt);
      };

      // receipts: ลองเดาคีย์ยอด/วันแบบที่พบบ่อย ๆ
      for (const r of receiptsList) {
        addSpent(r.createdAt ?? r.date ?? r.paidAt ?? r.uploadedAt, r.amount ?? r.totalAmount ?? r.price ?? r.value);
      }

      // statements: ลองเดาคีย์ยอด/วันแบบที่พบบ่อย ๆ
      for (const s of statementsList) {
        addSpent(s.createdAt ?? s.date ?? s.statementDate ?? s.paidAt, s.amount ?? s.totalAmount ?? s.value);
      }

      // สร้าง map ของ revenue/profit ต่อวันจาก metricsChart (ถ้ามี)
      const revenueByDay = new Map<string, number>();
      const profitByDay = new Map<string, number>();

      for (const row of metricsChart || []) {
        const d = parseAnyDate(row.date);
        if (!d) continue;
        const key = toDayKey(d);
        revenueByDay.set(key, Number(row.revenue || 0));
        profitByDay.set(key, Number(row.profit || 0));
        // หมายเหตุ: ไม่ใช้ spent จาก metrics เพราะเราจะใช้ spent จริงจาก receipts+statements
      }

      // build last N days (รวมวันนี้)
      const nDays = daysFromPeriod(selectedPeriod);
      const now = new Date();
      const days: string[] = [];
      for (let i = nDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        days.push(toDayKey(d));
      }

      // final chartData
      const merged = days.map((dayKey) => ({
        date: dayKey, // ใช้ key เดิม (แกน X)
        revenue: revenueByDay.get(dayKey) ?? 0,
        spent: spentByDay.get(dayKey) ?? 0,
        profit: profitByDay.get(dayKey) ?? 0,
      }));

      setChartData(merged);
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
          <Link href="/ads-facebook/statements">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              ดูสเตทเมนต์
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchData}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button onClick={() => (window.location.href = "/upload-receipt")}>
            <Plus className="w-4 h-4 mr-2" />
            อัพโหลดสลิป
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ✅ ค่าโฆษณาทั้งหมด (รวมสลิป + สเตทเมนต์) */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-300">
              <DollarSign className="w-4 h-4" />
              ค่าโฆษณาทั้งหมด (สลิป + สเตทเมนต์)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ฿{totalAdSpent.toLocaleString()}
            </div>
            <p className="text-xs text-blue-300 mt-1">
              จาก {receiptsCount} สลิป + {statementsCount} สเตทเมนต์
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
              ฿{(metrics?.totalRevenue ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-green-300 mt-1">
              ROAS: {metrics ? metrics.avgROAS.toFixed(2) : "0.00"}x
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
              ฿{(metrics?.totalProfit ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-purple-300 mt-1">
              จาก {metrics?.totalConversions ?? 0} คอนเวอร์ชั่น
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
              ฿{metrics ? metrics.avgCPC.toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-pink-300 mt-1">
              CTR: {metrics ? metrics.avgCTR.toFixed(2) : "0.00"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Spent Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              รายได้ vs ค่าโฆษณา ({daysFromPeriod(selectedPeriod)} วันล่าสุด)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
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
                    name="ค่าโฆษณา (สลิป+สเตทเมนต์จริง)"
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
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
              <p className="text-muted-foreground">ยังไม่มีแคมเปญโฆษณา</p>
              <p className="text-sm text-muted-foreground mt-2">
                อัพโหลดสลิปหรือสเตทเมนต์เพื่อเพิ่มข้อมูลแคมเปญ
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
                        <p className="text-xs text-muted-foreground">
                          Impressions
                        </p>
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
                        <p className="font-medium">
                          ฿{campaign.cpc.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="font-medium">
                          {campaign.ctr.toFixed(2)}%
                        </p>
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
