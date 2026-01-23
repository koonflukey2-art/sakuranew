"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw,
  Target,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KPI {
  id: string;
  date: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  productsSold: number;
  avgOrderValue: number;
  stockTurnover: number;
  costEfficiency: number;
}

interface ProfitTarget {
  id: string;
  productType: number | null;
  targetMargin: number;
  minMargin: number;
  alertThreshold: number;
  isActive: boolean;
}

export default function AnalysisPage() {
  const { toast } = useToast();
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [targets, setTargets] = useState<ProfitTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [orderStats, setOrderStats] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch KPIs
      const kpiRes = await fetch(`/api/kpi?period=${period}&limit=30`);
      if (kpiRes.ok) {
        const kpiData = await kpiRes.json();
        setKpis(kpiData);
      }

      // Fetch profit targets
      const targetsRes = await fetch("/api/profit-targets?active=true");
      if (targetsRes.ok) {
        const targetsData = await targetsRes.json();
        setTargets(targetsData);
      }

      // Fetch order stats
      const statsRes = await fetch("/api/orders/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setOrderStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch analysis data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลวิเคราะห์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateKPI = async () => {
    try {
      const res = await fetch("/api/kpi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "daily" }),
      });

      if (res.ok) {
        toast({
          title: "✅ คำนวณ KPI สำเร็จ",
          description: "KPI ประจำวันถูกคำนวณและบันทึกแล้ว",
        });
        fetchData();
      } else {
        throw new Error("Failed to calculate KPI");
      }
    } catch (error) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถคำนวณ KPI ได้",
        variant: "destructive",
      });
    }
  };

  // Calculate summary from recent KPIs
  const latestKPI = kpis[0];
  const avgProfit = kpis.length > 0
    ? kpis.reduce((sum, k) => sum + k.totalProfit, 0) / kpis.length
    : 0;
  const avgMargin = kpis.length > 0
    ? kpis.reduce((sum, k) => sum + k.profitMargin, 0) / kpis.length
    : 0;

  // Check profit targets
  const overallTarget = targets.find((t) => t.productType === null);
  const currentMargin = latestKPI?.profitMargin || 0;
  const marginStatus =
    overallTarget && currentMargin < overallTarget.minMargin
      ? "danger"
      : overallTarget && currentMargin < overallTarget.alertThreshold
      ? "warning"
      : "success";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gradient-pink">
            Sakura Biotech - ต้นทุนและกำไร
          </h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="text-gray-400 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink mb-2">
            Sakura Biotech - ต้นทุนและกำไร
          </h1>
          <p className="text-gray-400">
            วิเคราะห์ต้นทุน กำไร และ KPI ของธุรกิจ
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={period}
            onValueChange={(value: any) => setPeriod(value)}
          >
            <SelectTrigger className="w-[150px] bg-white/5 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="daily">รายวัน</SelectItem>
              <SelectItem value="weekly">รายสัปดาห์</SelectItem>
              <SelectItem value="monthly">รายเดือน</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={fetchData}
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <Button
            onClick={handleCalculateKPI}
            className="bg-gradient-purple hover:opacity-90"
          >
            <Activity className="w-4 h-4 mr-2" />
            คำนวณ KPI
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="premium-card hover-glow border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              รายได้รวม (วันนี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{orderStats?.today?.revenue?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {orderStats?.today?.orders || 0} ออเดอร์
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover-glow border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-400" />
              ต้นทุนรวม (วันนี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">
              ฿{orderStats?.today?.expense?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {orderStats?.today?.orders || 0} รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card hover-glow border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              กำไรสุทธิ (วันนี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ฿{orderStats?.today?.profit?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {latestKPI?.profitMargin?.toFixed(1) || "0"}% margin
            </p>
          </CardContent>
        </Card>

        <Card
          className={`premium-card hover-glow border-l-4 ${
            marginStatus === "danger"
              ? "border-l-red-500"
              : marginStatus === "warning"
              ? "border-l-yellow-500"
              : "border-l-purple-500"
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                marginStatus === "danger"
                  ? "text-red-400"
                  : marginStatus === "warning"
                  ? "text-yellow-400"
                  : "text-purple-400"
              }`}
            >
              {currentMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {overallTarget
                ? `เป้าหมาย: ${overallTarget.targetMargin}%`
                : "ยังไม่ตั้งเป้าหมาย"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Target Alerts */}
      {overallTarget && currentMargin < overallTarget.alertThreshold && (
        <Card className="border-2 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-yellow-300 mb-1">
                  ⚠️ Profit Margin ต่ำกว่าเป้าหมาย
                </h3>
                <p className="text-yellow-200 text-sm mb-2">
                  Profit Margin ปัจจุบัน ({currentMargin.toFixed(1)}%) ต่ำกว่าเกณฑ์เตือน (
                  {overallTarget.alertThreshold}%)
                </p>
                <ul className="text-sm text-yellow-100 space-y-1 ml-4">
                  <li>• เป้าหมาย: {overallTarget.targetMargin}%</li>
                  <li>• ขั้นต่ำ: {overallTarget.minMargin}%</li>
                  <li>• แนะนำ: ตรวจสอบต้นทุนสินค้าและกลยุทธ์การตั้งราคา</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7-Day Trend */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            แนวโน้มกำไร 7 วันล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orderStats?.week?.daily && orderStats.week.daily.length > 0 ? (
            <div className="space-y-3">
              {orderStats.week.daily.map((day: any, index: number) => {
                const profitMarginDay =
                  day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-gray-400">{day.date}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium text-white">
                          ฿{day.profit.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          ({profitMarginDay.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            day.profit > 0
                              ? "bg-gradient-to-r from-green-500 to-blue-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (Math.abs(day.profit) /
                                Math.max(
                                  ...orderStats.week.daily.map((d: any) =>
                                    Math.abs(d.profit)
                                  )
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {day.profit >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              ยังไม่มีข้อมูลแนวโน้ม
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Type Breakdown */}
      {orderStats?.week?.byType &&
        Object.keys(orderStats.week.byType).length > 0 && (
          <Card className="premium-card">
            <CardHeader>
              <CardTitle>รายได้แยกตามประเภทสินค้า (7 วันล่าสุด)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(orderStats.week.byType).map(([type, data]: any) => (
                  <div
                    key={type}
                    className="border border-purple-500/30 rounded-lg p-4 bg-purple-500/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-300">สินค้าหมายเลข {type}</div>
                      <ShoppingCart className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      ฿{data.revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {data.count} ชิ้น
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Efficiency Metrics */}
      {latestKPI && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm">ค่าเฉลี่ยต่อออเดอร์</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                ฿{latestKPI.avgOrderValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm">ประสิทธิภาพต้นทุน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {latestKPI.costEfficiency.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-400 mt-1">กำไรต่อต้นทุน</p>
            </CardContent>
          </Card>

          <Card className="premium-card">
            <CardHeader>
              <CardTitle className="text-sm">อัตราหมุนเวียนสต็อก</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {latestKPI.stockTurnover.toFixed(2)}
              </div>
              <p className="text-xs text-gray-400 mt-1">เท่า/วัน</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
