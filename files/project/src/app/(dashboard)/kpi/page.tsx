"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "@/contexts/theme-context";

interface KPIData {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  profitMargin: number;
}

export default function KPIPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    avgMargin: 0,
    totalOrders: 0,
  });

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    try {
      setLoading(true);

      // Fetch orders stats
      const response = await fetch("/api/orders/stats");

      if (!response.ok) throw new Error("Failed to fetch KPI data");

      const data = await response.json();

      // Process data for charts
      const processedData: KPIData[] = [];
      let totalRevenue = 0;
      let totalProfit = 0;
      let totalOrders = 0;

      // Use weekly daily data if available
      if (data.week && data.week.daily) {
        const dailyData = data.week.daily.slice(-7); // Last 7 days

        dailyData.forEach((day: any) => {
          const revenue = day.revenue || 0;
          const profit = day.profit || 0;
          const orders = day.orders || 0;
          const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

          processedData.push({
            date: day.date,
            revenue,
            profit,
            orders,
            profitMargin,
          });

          totalRevenue += revenue;
          totalProfit += profit;
          totalOrders += orders;
        });
      }

      // Calculate overall stats
      const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      setKpiData(processedData);
      setSummary({
        totalRevenue,
        totalProfit,
        avgMargin,
        totalOrders,
      });
    } catch (error) {
      console.error("Failed to fetch KPI data:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartColors = {
    line: theme === "light" ? "#8b5cf6" : "#c084fc",
    bar: theme === "light" ? "#ec4899" : "#f472b6",
    grid: theme === "light" ? "#e5e7eb" : "rgba(255,255,255,0.1)",
    text: theme === "light" ? "#374151" : "#9ca3af",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gradient-pink mb-2">
          Sakura Biotech - KPI Dashboard
        </h1>
        <p className="text-gray-400">
          ตัวชี้วัดประสิทธิภาพหลัก (Key Performance Indicators)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/40 light:from-green-50 light:to-green-100 light:border-green-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-300 flex items-center gap-2 light:text-green-700">
              <DollarSign className="w-4 h-4" />
              รายได้รวม (7 วัน)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 light:text-green-600">
              ฿{summary.totalRevenue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border border-blue-500/40 light:from-blue-50 light:to-blue-100 light:border-blue-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-300 flex items-center gap-2 light:text-blue-700">
              <TrendingUp className="w-4 h-4" />
              กำไรรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400 light:text-blue-600">
              ฿{summary.totalProfit.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/40 light:from-purple-50 light:to-purple-100 light:border-purple-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2 light:text-purple-700">
              <Package className="w-4 h-4" />
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400 light:text-purple-600">
              {summary.avgMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-900/30 to-pink-950/30 border border-pink-500/40 light:from-pink-50 light:to-pink-100 light:border-pink-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-pink-300 flex items-center gap-2 light:text-pink-700">
              <ShoppingCart className="w-4 h-4" />
              ออเดอร์ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400 light:text-pink-600">
              {summary.totalOrders}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-white/5 border border-white/10 light:bg-white light:border-gray-200">
        <CardHeader>
          <CardTitle className="text-white light:text-black">รายได้ย้อนหลัง 7 วัน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="date"
                  stroke={chartColors.text}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis stroke={chartColors.text} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? "#fff" : "#1f2937",
                    border: `1px solid ${theme === "light" ? "#e5e7eb" : "#374151"}`,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={chartColors.line}
                  strokeWidth={2}
                  name="รายได้"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Profit Chart */}
      <Card className="bg-white/5 border border-white/10 light:bg-white light:border-gray-200">
        <CardHeader>
          <CardTitle className="text-white light:text-black">กำไรย้อนหลัง 7 วัน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="date"
                  stroke={chartColors.text}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis stroke={chartColors.text} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? "#fff" : "#1f2937",
                    border: `1px solid ${theme === "light" ? "#e5e7eb" : "#374151"}`,
                  }}
                />
                <Bar dataKey="profit" fill={chartColors.bar} name="กำไร" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Orders Chart */}
      <Card className="bg-white/5 border border-white/10 light:bg-white light:border-gray-200">
        <CardHeader>
          <CardTitle className="text-white light:text-black">ออเดอร์ย้อนหลัง 7 วัน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis
                  dataKey="date"
                  stroke={chartColors.text}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("th-TH", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis stroke={chartColors.text} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "light" ? "#fff" : "#1f2937",
                    border: `1px solid ${theme === "light" ? "#e5e7eb" : "#374151"}`,
                  }}
                />
                <Bar dataKey="orders" fill="#10b981" name="ออเดอร์" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
