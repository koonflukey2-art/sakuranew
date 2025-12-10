"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  Target,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "@/contexts/theme-context";

// Product type mapping
const getProductTypeName = (type: number) => {
  const typeMap: Record<number, string> = {
    1: "สินค้าประเภท 1",
    2: "สินค้าประเภท 2",
    3: "สินค้าประเภท 3",
    4: "สินค้าประเภท 4",
    5: "สินค้าประเภท 5",
  };
  return typeMap[type] || `สินค้าประเภท ${type}`;
};

// Color scheme for product types
const PRODUCT_TYPE_COLORS = {
  1: "#ef4444", // Red
  2: "#a855f7", // Purple
  3: "#10b981", // Green
  4: "#3b82f6", // Blue
  5: "#ec4899", // Pink
};

export default function DashboardPage() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        ordersStatsRes,
        productsRes,
        budgetRes,
        adRevenueRes,
        ordersRes,
      ] = await Promise.all([
        fetch("/api/orders/stats"),
        fetch("/api/products"),
        fetch("/api/capital-budget"),
        fetch("/api/ad-revenue"),
        fetch("/api/orders?limit=10"),
      ]);

      const ordersStats = ordersStatsRes.ok ? await ordersStatsRes.json() : null;
      const products = productsRes.ok ? await productsRes.json() : [];
      const budget = budgetRes.ok ? await budgetRes.json() : null;
      const adRevenue = adRevenueRes.ok ? await adRevenueRes.json() : [];
      const recentOrders = ordersRes.ok ? await ordersRes.json() : [];

      // Calculate metrics
      const todayRevenue = ordersStats?.today?.revenue || 0;
      const weekRevenue = ordersStats?.week?.revenue || 0;
      const todayProfit = ordersStats?.today?.profit || 0;
      const weekProfit = ordersStats?.week?.profit || 0;
      const todayOrders = ordersStats?.today?.orders || 0;
      const weekOrders = ordersStats?.week?.orders || 0;

      // Calculate changes
      const revenueChange = weekRevenue > 0 ? ((todayRevenue - (weekRevenue / 7)) / (weekRevenue / 7)) * 100 : 0;
      const profitChange = weekProfit > 0 ? ((todayProfit - (weekProfit / 7)) / (weekProfit / 7)) * 100 : 0;
      const profitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

      // Calculate ROAS (Return on Ad Spend)
      const totalAdSpend = adRevenue.reduce((sum: number, r: any) => sum + r.amount, 0);
      const roas = totalAdSpend > 0 ? todayRevenue / totalAdSpend : 0;

      // Prepare chart data for 7-day sales
      const salesChartData = ordersStats?.week?.daily?.map((day: any) => ({
        date: day.date,
        revenue: day.revenue,
        profit: day.profit,
        expense: day.expense,
      })) || [];

      // Prepare pie chart data for today's sales by type
      const todayByType = ordersStats?.today?.byType || {};
      const pieChartData = Object.entries(todayByType).map(([typeName, data]: [string, any]) => ({
        name: typeName,
        value: data.revenue,
        count: data.count,
      }));

      // Get colors for pie chart
      const pieColors = pieChartData.map((item: any, index: number) => {
        const typeNum = parseInt(item.name.match(/\d+/)?.[0] || "0");
        return PRODUCT_TYPE_COLORS[typeNum as keyof typeof PRODUCT_TYPE_COLORS] || `hsl(${index * 60}, 70%, 60%)`;
      });

      setData({
        todayRevenue,
        weekRevenue,
        todayProfit,
        weekProfit,
        todayOrders,
        weekOrders,
        revenueChange,
        profitChange,
        profitMargin,
        roas,
        totalProducts: products.length,
        lowStockCount: products.filter((p: any) => p.quantity < p.minStockLevel).length,
        budgetRemaining: budget?.remaining || 0,
        budgetTotal: budget?.amount || 0,
        salesChartData,
        pieChartData,
        pieColors,
        todayByType,
        recentOrders: recentOrders.slice(0, 2),
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          <p className="text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const chartColors = {
    primary: theme === "light" ? "#8b5cf6" : "#a78bfa",
    secondary: theme === "light" ? "#ec4899" : "#f472b6",
    success: theme === "light" ? "#10b981" : "#34d399",
    warning: theme === "light" ? "#f59e0b" : "#fbbf24",
    danger: theme === "light" ? "#ef4444" : "#f87171",
    blue: theme === "light" ? "#3b82f6" : "#60a5fa",
    grid: theme === "light" ? "#e5e7eb" : "rgba(255,255,255,0.1)",
    text: theme === "light" ? "#374151" : "#9ca3af",
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🌸</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                Sakura Biotech
              </h1>
              <p className="text-sm text-gray-400">Co. Ltd</p>
            </div>
          </div>
        </div>
        <Button
          onClick={fetchDashboardData}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Row 1: Main Metrics (4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Profit */}
        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              กำไรรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ${data?.todayProfit?.toLocaleString() || "0"}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {data?.profitChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <p className="text-xs text-green-200">
                {data?.profitChange >= 0 ? "+" : ""}{data?.profitChange?.toFixed(1) || "0"}%
              </p>
            </div>
            <p className="text-xs text-green-200 mt-1">
              ~{data?.profitMargin?.toFixed(1) || "0"}% margin
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Revenue */}
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-300 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              รายได้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ${data?.todayRevenue?.toLocaleString() || "0"}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {data?.revenueChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-blue-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <p className="text-xs text-blue-200">
                {data?.revenueChange >= 0 ? "+" : ""}{data?.revenueChange?.toFixed(1) || "0"}%
              </p>
            </div>
            <p className="text-xs text-blue-200 mt-1">
              รายจ่นมีย่านยวอนงอ
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Orders */}
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-300 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              ออเดอร์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {data?.todayOrders || "0"}
            </div>
            <p className="text-xs text-purple-200 mt-2">
              Conversions ที่ยืนยัน
            </p>
          </CardContent>
        </Card>

        {/* Card 4: ROAS */}
        <Card className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 border-pink-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-pink-300 flex items-center gap-2">
              <Target className="w-4 h-4" />
              ROAS เฉลี่ย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400">
              {data?.roas?.toFixed(2) || "0.00"}x
            </div>
            <p className="text-xs text-pink-200 mt-2">
              Return on Ad Spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Large Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: 7-Day Sales Trend */}
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                ยอดขาย 7 วัน
              </CardTitle>
              <div className="text-sm text-gray-400">21-2023 - Feb. 2023</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.salesChartData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="date"
                    stroke={chartColors.text}
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    stroke={chartColors.text}
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "light" ? "#fff" : "#1f2937",
                      border: `1px solid ${theme === "light" ? "#e5e7eb" : "#374151"}`,
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={chartColors.blue}
                    strokeWidth={2}
                    dot={{ fill: chartColors.blue, r: 4 }}
                    name="รายได้"
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={chartColors.success}
                    strokeWidth={2}
                    dot={{ fill: chartColors.success, r: 4 }}
                    name="กำไร"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Legend for product types */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {Object.entries(data?.todayByType || {}).map(([typeName, typeData]: [string, any]) => {
                const typeNum = parseInt(typeName.match(/\d+/)?.[0] || "0");
                const color = PRODUCT_TYPE_COLORS[typeNum as keyof typeof PRODUCT_TYPE_COLORS] || "#888";
                return (
                  <div key={typeName} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-400">
                      {typeName}: ${typeData.revenue?.toLocaleString() || "0"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Sales by Product Type (Donut Chart) */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>ยอดขายแยกตามประเภท (วันนี้)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Donut Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.pieChartData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(data?.pieChartData || []).map((entry: any, index: number) => {
                        const typeNum = parseInt(entry.name.match(/\d+/)?.[0] || "0");
                        const color = PRODUCT_TYPE_COLORS[typeNum as keyof typeof PRODUCT_TYPE_COLORS] || data?.pieColors?.[index] || "#888";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === "light" ? "#fff" : "#1f2937",
                        border: `1px solid ${theme === "light" ? "#e5e7eb" : "#374151"}`,
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Right: Breakdown with bars */}
              <div className="space-y-3">
                {(data?.pieChartData || []).map((item: any, index: number) => {
                  const total = (data?.pieChartData || []).reduce((sum: number, i: any) => sum + i.value, 0);
                  const percentage = total > 0 ? (item.value / total) * 100 : 0;
                  const typeNum = parseInt(item.name.match(/\d+/)?.[0] || "0");
                  const color = PRODUCT_TYPE_COLORS[typeNum as keyof typeof PRODUCT_TYPE_COLORS] || data?.pieColors?.[index] || "#888";

                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">{item.name}</span>
                        <span className="text-gray-400">{item.count} วัน</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        <span className="text-sm font-bold" style={{ color }}>
                          ${item.value?.toLocaleString() || "0"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Today's Sales Summary */}
        <Card className="premium-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              ยอดขายวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-400">
              ${data?.todayRevenue?.toLocaleString() || "0"}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              {data?.todayOrders || "0"} ออเดอร์
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Recent Orders Table */}
        <Card className="premium-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ออเดอร์ (รอบทีม)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data?.recentOrders || []).slice(0, 2).map((order: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {getProductTypeName(order.productType)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.customer?.name || "ไม่ระบุ"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">
                      ${order.amount?.toLocaleString() || "0"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.orderDate).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/orders">
              <Button variant="outline" className="w-full mt-4" size="sm">
                ดูทั้งหมด
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card 3: Profit and ROAS Summary */}
        <Card className="premium-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">กำไรรวม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">
              ${data?.todayProfit?.toLocaleString() || "0"}
            </div>
            <p className="text-sm text-gray-400 mt-2">
              -- {data?.profitMargin?.toFixed(1) || "0"}% margin
            </p>
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-sm text-gray-400">ROAS เฉลี่ย</p>
              <p className="text-2xl font-bold text-pink-400 mt-1">
                {data?.roas?.toFixed(2) || "0.00"}x
              </p>
              <p className="text-xs text-gray-500 mt-1">Return on Ad Spend</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
