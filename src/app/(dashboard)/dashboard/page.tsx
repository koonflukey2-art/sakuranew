"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Activity,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch order stats
      const statsRes = await fetch("/api/orders/stats");
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Fetch budget
      const budgetRes = await fetch("/api/capital-budget");
      if (budgetRes.ok) {
        const data = await budgetRes.json();
        setBudget(data);
      }

      // Fetch products
      const productsRes = await fetch("/api/products");
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-gradient-pink">
          Sakura Biotech Co. Ltd
        </h1>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="text-gray-400 mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const lowStockCount = products.filter(
    (p) => p.quantity < p.minStockLevel
  ).length;

  const todayProfit = stats?.today?.profit || 0;
  const todayRevenue = stats?.today?.revenue || 0;
  const todayOrders = stats?.today?.orders || 0;
  const weekProfit = stats?.week?.profit || 0;
  const weekRevenue = stats?.week?.revenue || 0;

  // Calculate profit change percentage
  const profitChange = weekProfit > 0 ? ((todayProfit / weekProfit) * 7 - 100).toFixed(1) : 0;
  const revenueChange = weekRevenue > 0 ? ((todayRevenue / weekRevenue) * 7 - 100).toFixed(1) : 0;
  const profitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

  // Prepare chart data for 7-day trend
  const chartData = stats?.week?.daily?.map((day: any) => ({
    date: day.date,
    รายได้: day.revenue,
    กำไร: day.profit,
    ค่าใช้จ่าย: day.expense,
  })) || [];

  // Prepare pie chart data for product types
  const pieData = Object.entries(stats?.today?.byType || {}).map(([name, data]: [string, any]) => ({
    name,
    value: data.revenue,
    count: data.count,
  }));

  // Colors for pie chart
  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  // Prepare mini sparkline data (last 7 days for each metric)
  const profitSparkline = stats?.week?.daily?.slice(-7).map((d: any) => ({ value: d.profit })) || [];
  const revenueSparkline = stats?.week?.daily?.slice(-7).map((d: any) => ({ value: d.revenue })) || [];
  const ordersSparkline = stats?.week?.daily?.slice(-7).map((d: any) => ({ value: d.revenue / (d.orders || 1) })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink mb-2">
            Sakura Biotech Co. Ltd
          </h1>
          <p className="text-gray-400 text-lg">
            ระบบบริหารจัดการธุรกิจครบวงจร
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="border-purple-500/50 hover:bg-purple-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            รีเฟรช
          </Button>
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🌸</span>
          </div>
        </div>
      </div>

      {/* Top Metric Cards with Mini Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Profit Card */}
        <Card className="premium-card hover-glow border-l-4 border-l-green-500 relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className={`text-xs font-semibold ${Number(profitChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Number(profitChange) >= 0 ? '+' : ''}{profitChange}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-400">กำไรรวม</p>
              <div className="text-3xl font-bold text-green-400">
                ฿{todayProfit.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                ~{profitMargin.toFixed(1)}% margin
              </p>
            </div>
            {/* Mini Sparkline */}
            <div className="mt-3 -mb-2">
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={profitSparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="premium-card hover-glow border-l-4 border-l-blue-500 relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-400" />
              </div>
              <div className={`text-xs font-semibold ${Number(revenueChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Number(revenueChange) >= 0 ? '+' : ''}{revenueChange}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-400">รายได้</p>
              <div className="text-3xl font-bold text-blue-400">
                ฿{todayRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">
                รายได้รวมวันนี้
              </p>
            </div>
            {/* Mini Area Chart */}
            <div className="mt-3 -mb-2">
              <ResponsiveContainer width="100%" height={40}>
                <AreaChart data={revenueSparkline}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Orders Card */}
        <Card className="premium-card hover-glow border-l-4 border-l-purple-500 relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-400">ออเดอร์</p>
              <div className="text-3xl font-bold text-purple-400">
                {todayOrders}
              </div>
              <p className="text-xs text-gray-500">
                Conversions ทั้งหมด
              </p>
            </div>
            {/* Mini Line Chart */}
            <div className="mt-3 -mb-2">
              <ResponsiveContainer width="100%" height={40}>
                <LineChart data={ordersSparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ROAS / Budget Card */}
        <Card className={`premium-card hover-glow border-l-4 ${
          budget?.remaining <= 0
            ? "border-l-red-500"
            : budget?.remaining <= budget?.minThreshold
            ? "border-l-orange-500"
            : "border-l-indigo-500"
        } relative overflow-hidden`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-xs font-semibold text-indigo-400">
                {budget?.amount ? ((budget.remaining / budget.amount) * 100).toFixed(0) : 0}%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-400">งบประมาณคงเหลือ</p>
              <div className={`text-3xl font-bold ${
                budget?.remaining <= 0
                  ? "text-red-400"
                  : budget?.remaining <= budget?.minThreshold
                  ? "text-orange-400"
                  : "text-indigo-400"
              }`}>
                ฿{budget?.remaining?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-gray-500">
                {budget?.remaining <= 0
                  ? "⚠️ งบหมดแล้ว"
                  : budget?.remaining <= budget?.minThreshold
                  ? "⚠️ งบต่ำกว่าขั้นต่ำ"
                  : "Return on Ad Spend"}
              </p>
            </div>
            {/* Gradient Background */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-tl-full -mr-8 -mb-8" />
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || (budget && budget.remaining <= budget.minThreshold)) && (
        <Card className="border-2 border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">
                  ⚠️ การแจ้งเตือนสำคัญ
                </h3>
                <ul className="space-y-1 text-sm text-yellow-200">
                  {lowStockCount > 0 && (
                    <li>• มีสินค้า {lowStockCount} รายการที่ใกล้หมด - โปรดเติมสต็อก</li>
                  )}
                  {budget && budget.remaining <= 0 && (
                    <li>• งบประมาณหมดแล้ว - โปรดเติมงบก่อนซื้อสินค้าใหม่</li>
                  )}
                  {budget && budget.remaining > 0 && budget.remaining <= budget.minThreshold && (
                    <li>
                      • งบประมาณต่ำกว่าขั้นต่ำ (฿
                      {budget.minThreshold.toLocaleString()}) - โปรดวางแผนเติมงบ
                    </li>
                  )}
                </ul>
              </div>
              <div className="flex gap-2">
                {lowStockCount > 0 && (
                  <Link href="/stock">
                    <Button variant="outline" size="sm" className="border-yellow-400 text-yellow-200">
                      ดูสต็อก
                    </Button>
                  </Link>
                )}
                {budget && budget.remaining <= budget.minThreshold && (
                  <Link href="/capital-budget">
                    <Button variant="outline" size="sm" className="border-yellow-400 text-yellow-200">
                      จัดการงบ
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend Chart */}
        <Card className="premium-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                ยอดขาย 7 วัน
              </CardTitle>
              <div className="text-xs text-gray-400">
                {stats?.week?.daily && stats.week.daily.length > 0 && (
                  <>
                    {stats.week.daily[0].date} - {stats.week.daily[stats.week.daily.length - 1].date}
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6',
                  }}
                  formatter={(value: any) => [`฿${value.toLocaleString()}`, '']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  dataKey="รายได้"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="กำไร"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="ค่าใช้จ่าย"
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Product Type - Donut Chart */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              ยอดขายแยกตามประเภท (วันนี้)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F3F4F6',
                      }}
                      formatter={(value: any) => `฿${value.toLocaleString()}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {pieData.map((entry, index) => {
                    const total = pieData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';

                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-gray-300">{entry.name}</span>
                          <span className="text-gray-500">({entry.count} ชิ้น)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">{percentage}%</span>
                          <span className="font-semibold text-white min-w-[80px] text-right">
                            ฿{entry.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>ยังไม่มียอดขายวันนี้</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Sales Summary */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="text-lg">ยอดขายวันนี้</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">รายได้รวม</span>
              <span className="text-xl font-bold text-green-400">
                ฿{todayRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">กำไรสุทธิ</span>
              <span className="text-xl font-bold text-blue-400">
                ฿{todayProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <span className="text-gray-400">จำนวนออเดอร์</span>
              <span className="text-lg font-semibold text-purple-400">
                {todayOrders} รายการ
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Link href="/stock">
          <Card className="premium-card hover-glow cursor-pointer hover:border-purple-500 transition-all h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">จัดการสต็อก</h3>
                  <p className="text-sm text-gray-400">เพิ่ม/แก้ไขสินค้า</p>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/orders">
          <Card className="premium-card hover-glow cursor-pointer hover:border-purple-500 transition-all h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">ดูออเดอร์</h3>
                  <p className="text-sm text-gray-400">จัดการคำสั่งซื้อ</p>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
