"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Activity,
  BarChart3,
  RefreshCw,
  MoreHorizontal,
  Calendar,
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
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch logic (Simulated for safety if APIs are missing in this context)
      const statsRes = await fetch("/api/orders/stats");
      if (statsRes.ok) setStats(await statsRes.json());
      
      const budgetRes = await fetch("/api/capital-budget");
      if (budgetRes.ok) setBudget(await budgetRes.json());
      
      const productsRes = await fetch("/api/products");
      if (productsRes.ok) setProducts(await productsRes.json());

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Data Calculations ---
  const lowStockCount = products.filter((p) => p.quantity < p.minStockLevel).length;
  const todayProfit = stats?.today?.profit || 0;
  const todayRevenue = stats?.today?.revenue || 0;
  const todayOrders = stats?.today?.orders || 0;
  const weekProfit = stats?.week?.profit || 0;
  const weekRevenue = stats?.week?.revenue || 0;

  const profitChange = weekProfit > 0 ? ((todayProfit / weekProfit) * 7 - 100).toFixed(1) : 0;
  const revenueChange = weekRevenue > 0 ? ((todayRevenue / weekRevenue) * 7 - 100).toFixed(1) : 0;
  const profitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

  const chartData = stats?.week?.daily?.map((day: any) => ({
    date: day.date,
    รายได้: day.revenue,
    กำไร: day.profit,
    ค่าใช้จ่าย: day.expense,
  })) || [];

  const pieData = Object.entries(stats?.today?.byType || {}).map(([name, data]: [string, any]) => ({
    name,
    value: data.revenue,
    count: data.count,
  }));

  const profitSparkline = stats?.week?.daily?.slice(-7).map((d: any) => ({ value: d.profit })) || [];
  const revenueSparkline = stats?.week?.daily?.slice(-7).map((d: any) => ({ value: d.revenue })) || [];
  const ordersSparkline = stats?.week?.daily?.slice(-7).map((d: any) => ({ value: d.orders || 0 })) || [];

  // Theme Colors aligned with your CSS gradients
  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F472B6', '#F59E0B'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 font-sans text-foreground">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient-pink mb-1">
              Sakura Biotech Co. Ltd
            </h1>
            <p className="text-muted-foreground text-sm">ภาพรวมธุรกิจประจำวัน</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={fetchDashboardData}
              className="bg-card border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              รีเฟรช
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-pink flex items-center justify-center shadow-lg shadow-pink-500/20">
              <span className="text-lg">🌸</span>
            </div>
          </div>
        </div>

        {/* --- Metric Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Profit Card */}
          <div className="premium-card hover-glow rounded-xl p-5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted-foreground text-sm font-medium">กำไรรวม</span>
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-3xl font-bold text-white">
                ฿{todayProfit.toLocaleString()}
              </h2>
              <span className={`text-xs font-medium ${Number(profitChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Number(profitChange) >= 0 ? '+' : ''}{profitChange}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">~ {profitMargin.toFixed(0)}% margin</p>
            {/* Sparkline */}
            <div className="h-[40px] w-full opacity-50 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={profitSparkline}>
                  <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="premium-card hover-glow rounded-xl p-5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted-foreground text-sm font-medium">รายได้</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-3xl font-bold text-white">
                ฿{todayRevenue.toLocaleString()}
              </h2>
              <span className={`text-xs font-medium ${Number(revenueChange) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {Number(revenueChange) >= 0 ? '+' : ''}{revenueChange}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">เปรียบเทียบกับสัปดาห์ก่อน</p>
            <div className="h-[40px] w-full opacity-50 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSparkline}>
                    <defs>
                    <linearGradient id="colorRevSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" fill="url(#colorRevSpark)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders Card */}
          <div className="premium-card hover-glow rounded-xl p-5 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted-foreground text-sm font-medium">ออเดอร์</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className="text-3xl font-bold text-white">
                {todayOrders}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Conversions ทั้งหมด</p>
            <div className="h-[40px] w-full opacity-50 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersSparkline}>
                    <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ROAS/Budget Card */}
          <div className={`premium-card hover-glow rounded-xl p-5 relative overflow-hidden group ${budget?.remaining <= 0 ? 'border-red-500/50' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-muted-foreground text-sm font-medium">งบโฆษณา</span>
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <h2 className={`text-3xl font-bold ${budget?.remaining <= 0 ? 'text-red-400' : 'text-white'}`}>
                ฿{budget?.remaining?.toLocaleString() || "0"}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
                 {budget?.remaining <= 0 ? "⚠️ งบหมดแล้ว" : "งบประมาณคงเหลือ"}
            </p>
            {/* Decorative blob instead of chart for variety */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-pink opacity-20 blur-2xl rounded-full" />
          </div>
        </div>

        {/* --- Alerts --- */}
        {(lowStockCount > 0 || (budget && budget.remaining <= budget.minThreshold)) && (
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
             <div className="p-2 bg-yellow-500/10 rounded-full">
                <AlertTriangle className="text-yellow-500 w-5 h-5" />
             </div>
             <div className="text-sm text-yellow-200/90 flex-1">
                {lowStockCount > 0 && <span className="block">• มีสินค้า {lowStockCount} รายการสินค้าใกล้หมด</span>}
                {budget && budget.remaining <= budget.minThreshold && <span className="block">• งบประมาณโฆษณาต่ำกว่าเกณฑ์ที่กำหนด</span>}
             </div>
             <Link href="/stock">
                <Button size="sm" variant="ghost" className="text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10">
                    ตรวจสอบ
                    <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
             </Link>
          </div>
        )}

        {/* --- Main Charts Section --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Sales Trend Chart */}
          <div className="premium-card lg:col-span-2 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                ยอดขาย 7 วันล่าสุด
              </h3>
              <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-1 text-xs text-muted-foreground border border-white/5">
                <Calendar className="w-3 h-3" />
                <span>
                    {stats?.week?.daily?.[0]?.date} - {stats?.week?.daily?.[stats?.week?.daily?.length - 1]?.date}
                </span>
              </div>
            </div>
            
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenueMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfitMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    tickFormatter={(value) => `฿${(value/1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                        backgroundColor: '#111', 
                        borderColor: 'rgba(255,255,255,0.1)', 
                        borderRadius: '12px', 
                        color: '#fff',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ padding: 0 }}
                    formatter={(value: number) => [`฿${value.toLocaleString()}`, '']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="รายได้" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRevenueMain)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="กำไร" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProfitMain)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Sales by Type */}
          <div className="premium-card rounded-xl p-6 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6">สัดส่วนยอดขาย (วันนี้)</h3>
            
            <div className="flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                    {/* Donut Chart */}
                    <div className="w-[140px] h-[140px] relative mx-auto">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value:any) => `฿${value.toLocaleString()}`}
                                contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                            />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-gray-500">ทั้งหมด</span>
                            <span className="text-lg font-bold text-white">{pieData.length}</span>
                        </div>
                    </div>
                </div>

                {/* Custom Legend Bars (Matching Screenshot) */}
                <div className="space-y-4 px-2">
                  {pieData.map((entry, index) => {
                     const total = pieData.reduce((a, b) => a + b.value, 0);
                     const percent = total > 0 ? (entry.value / total) * 100 : 0;
                     return (
                        <div key={index} className="w-full">
                           <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                              <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                {entry.name}
                              </span>
                              <span className="font-medium text-foreground">฿{entry.value.toLocaleString()}</span>
                           </div>
                           <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                style={{ width: `${percent}%`, backgroundColor: COLORS[index % COLORS.length] }} 
                                className="h-full rounded-full transition-all duration-500 ease-out"
                              />
                           </div>
                        </div>
                     )
                  })}
                  {pieData.length === 0 && <p className="text-gray-500 text-sm text-center py-4">ไม่มีข้อมูลยอดขายวันนี้</p>}
                </div>
            </div>
          </div>
        </div>

        {/* --- Bottom Section: Summaries & Actions --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           
           {/* Daily Summary */}
           <div className="premium-card rounded-xl p-6">
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-bold text-white">สรุปยอดวันนี้</h3>
               <MoreHorizontal className="text-gray-500 w-4 h-4 cursor-pointer hover:text-white" />
             </div>
             <div className="space-y-4">
                <div className="p-4 rounded-lg bg-black/20 border border-white/5 flex justify-between items-center">
                    <span className="text-sm text-gray-400">รายได้สุทธิ</span>
                    <span className="text-lg font-bold text-blue-400">฿{todayRevenue.toLocaleString()}</span>
                </div>
                <div className="p-4 rounded-lg bg-black/20 border border-white/5 flex justify-between items-center">
                    <span className="text-sm text-gray-400">กำไรสุทธิ</span>
                    <span className="text-lg font-bold text-green-400">฿{todayProfit.toLocaleString()}</span>
                </div>
             </div>
           </div>

           {/* Quick Actions Links */}
           <Link href="/orders" className="premium-card hover-glow rounded-xl p-6 group cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-purple-500">
                <div className="flex items-center gap-4 h-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-purple flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white group-hover:text-purple-300 transition-colors">จัดการออเดอร์</h3>
                        <p className="text-sm text-gray-400">ตรวจสอบสถานะและจัดส่งสินค้า</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 ml-auto group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                </div>
           </Link>

           <Link href="/stock" className="premium-card hover-glow rounded-xl p-6 group cursor-pointer transition-all border-l-4 border-l-transparent hover:border-l-pink-500">
                <div className="flex items-center gap-4 h-full">
                    <div className="w-12 h-12 rounded-full bg-gradient-pink flex items-center justify-center shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform">
                        <RefreshCw className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white group-hover:text-pink-300 transition-colors">จัดการสต็อก</h3>
                        <p className="text-sm text-gray-400">อัปเดตจำนวนสินค้าและราคา</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-600 ml-auto group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
                </div>
           </Link>

        </div>

      </div>
    </div>
  );
}