"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Wallet, Package, Target, AlertTriangle, DollarSign, ShoppingCart, Activity, Loader2, Sparkles, Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { DashboardSkeleton } from "@/components/loading-states";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  costPrice: number;
  sellPrice: number;
}

interface Campaign {
  id: string;
  platform: string;
  campaignName: string;
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  roi: number;
  status: string;
  startDate: string | Date;
  endDate?: string | Date | null;
  createdAt?: string | Date;
}

interface Budget {
  id: string;
  purpose: string;
  amount: number;
  spent: number;
  startDate: string | Date;
  endDate: string | Date;
}

interface Stats {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  avgROAS: number;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    avgROAS: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch all data from APIs
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setAiError(null);

      const [productsRes, campaignsRes, budgetsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/campaigns"),
        fetch("/api/budgets"),
      ]);

      const productsData = await productsRes.json();
      const campaignsData = await campaignsRes.json();
      const budgetsData = await budgetsRes.json();

      setProducts(productsData);
      setCampaigns(campaignsData);
      setBudgets(budgetsData);

      const metrics = calculateStats(productsData, campaignsData, budgetsData);

      const budgetRemaining = budgetsData.reduce(
        (sum: number, b: Budget) => sum + (b.amount - b.spent),
        0
      );

      fetchAIInsights({
        ...metrics,
        budgetRemaining,
        campaignCount: campaignsData.length,
        budgetCount: budgetsData.length,
        lowStockCount: productsData.filter(
          (p: Product) => p.quantity < p.minStockLevel
        ).length,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล Dashboard ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch AI Insights
  const fetchAIInsights = async (
    metrics: Stats & {
      budgetRemaining: number;
      campaignCount: number;
      budgetCount: number;
      lowStockCount: number;
    }
  ) => {
    try {
      setLoadingInsights(true);
      setAiError(null);

      const prompt = `คุณเป็นนักวิเคราะห์อีคอมเมิร์ซ ช่วยสรุปสถานะธุรกิจเป็น bullet 3-5 ข้อ ภาษาไทย สั้นไม่เกิน 20 คำ โดยใช้ตัวเลขเหล่านี้:\n- รายได้รวม: ${metrics.totalRevenue.toFixed(0)}\n- กำไร: ${metrics.totalProfit.toFixed(0)}\n- ออเดอร์: ${metrics.totalOrders}\n- ROAS เฉลี่ย: ${metrics.avgROAS.toFixed(2)}\n- งบประมาณคงเหลือ: ${metrics.budgetRemaining.toFixed(0)}\n- จำนวนแคมเปญ: ${metrics.campaignCount}\n- จำนวนงบประมาณ: ${metrics.budgetCount}\n- สินค้าใกล้หมด: ${metrics.lowStockCount}`;

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn("AI insights request failed", data?.error || response.statusText);
        setAiInsights([]);
        setAiError("ไม่สามารถโหลดคำแนะนำจาก AI ได้ในขณะนี้");
        return;
      }

      const raw =
        typeof data?.response === "string"
          ? data.response
          : typeof data?.reply === "string"
          ? data.reply
          : typeof data?.message === "string"
          ? data.message
          : "";

      if (!raw) {
        setAiInsights([]);
        setAiError("ไม่สามารถโหลดคำแนะนำจาก AI ได้ในขณะนี้");
        return;
      }

      const insights = raw
        .split("\n")
        .filter(
          (line: string) =>
            line.trim().startsWith("-") || line.trim().startsWith("•")
        )
        .map((line: string) => line.replace(/^[-•]\s*/, "").trim())
        .filter((line: string) => line.length > 0)
        .slice(0, 5);

      setAiInsights(insights);

      if (typeof window !== "undefined" && insights.length > 0) {
        const summaryForAssistant =
          "สรุปภาพรวมธุรกิจจากแดชบอร์ดวันนี้:\n" +
          insights.map((t, i) => `${i + 1}. ${t}`).join("\n");

        window.localStorage.setItem("sakura_auto_insight", summaryForAssistant);
      }
      setAiError(null);
    } catch (error) {
      console.error("AI Insights error:", error);
      setAiInsights([]);
      setAiError("ไม่สามารถโหลดคำแนะนำจาก AI ได้ในขณะนี้");
    } finally {
      setLoadingInsights(false);
    }
  };

  // Calculate statistics from real data
  const calculateStats = (
    products: Product[],
    campaigns: Campaign[],
    budgets: Budget[]
  ) => {
    // Total Revenue (from campaigns ROI)
    const totalRevenue = campaigns.reduce((sum, c) => {
      const revenue = c.spent * c.roi;
      return sum + revenue;
    }, 0);

    // Total Spent
    const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);

    // Total Profit
    const totalProfit = totalRevenue - totalSpent;

    // Total Orders (from conversions)
    const totalOrders = campaigns.reduce((sum, c) => sum + c.conversions, 0);

    // Average ROAS
    const avgROAS =
      campaigns.length > 0
        ? campaigns.reduce((sum, c) => sum + c.roi, 0) / campaigns.length
        : 0;

    const computed = { totalRevenue, totalProfit, totalOrders, avgROAS };
    setStats(computed);
    return computed;
  };

  // Format currency
  const formatCurrency = (value: number) => `฿${value.toLocaleString()}`;

  // Format number
  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  // Get last 7 days data for line chart
  const getLast7DaysData = () => {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
      });

      // Calculate from campaigns active on that day
      const dayCampaigns = campaigns.filter((c) => {
        const start = new Date(c.startDate);
        const end = c.endDate ? new Date(c.endDate) : new Date();
        return date >= start && date <= end;
      });

      const revenue = dayCampaigns.reduce((sum, c) => sum + c.spent * c.roi, 0);
      const spent = dayCampaigns.reduce((sum, c) => sum + c.spent / 7, 0); // Divide by 7 to get daily average
      const profit = revenue - spent;

      data.push({
        date: dateStr,
        revenue: Math.round(revenue),
        spent: Math.round(spent),
        profit: Math.round(profit),
      });
    }

    return data;
  };

  // Get ROI by platform for bar chart
  const getPlatformROIData = () => {
    const platformStats: Record<
      string,
      { platform: string; roi: number; count: number }
    > = {};

    campaigns.forEach((c) => {
      if (!platformStats[c.platform]) {
        platformStats[c.platform] = { platform: c.platform, roi: 0, count: 0 };
      }
      platformStats[c.platform].roi += c.roi;
      platformStats[c.platform].count += 1;
    });

    return Object.values(platformStats).map((p) => ({
      platform: p.platform,
      avgROI: p.count > 0 ? p.roi / p.count : 0,
    }));
  };

  // Get budget data for pie chart
  const getBudgetChartData = () => {
    return budgets.map((b) => ({
      name: b.purpose,
      value: b.amount,
    }));
  };

  // Get low stock products
  const getLowStockProducts = () => {
    return products
      .filter((p) => p.quantity < p.minStockLevel)
      .slice(0, 5);
  };

  // Get budget remaining
  const getBudgetRemaining = () => {
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    return totalBudget - totalSpent;
  };

  const chartData = getLast7DaysData();
  const platformROIData = getPlatformROIData();
  const budgetChartData = getBudgetChartData();
  const lowStockProducts = getLowStockProducts();
  const budgetRemaining = getBudgetRemaining();
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-white mt-1">ภาพรวมธุรกิจของคุณ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* กำไรรวม */}
        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              กำไรรวม
            </CardTitle>
            <DollarSign className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-white/90 mt-1">
              {stats.totalProfit > 0 ? "+" : ""}
              {stats.totalRevenue > 0
                ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
                : 0}
              % margin
            </p>
          </CardContent>
        </Card>

        {/* รายได้ */}
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              รายได้
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-white/90 mt-1">
              จากแคมเปญทั้งหมด
            </p>
          </CardContent>
        </Card>

        {/* ออเดอร์ */}
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              ออเดอร์
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatNumber(stats.totalOrders)}
            </div>
            <p className="text-xs text-white/90 mt-1">
              Conversions ทั้งหมด
            </p>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card className="bg-gradient-to-br from-yellow-600 to-yellow-700 border-yellow-600">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              ROAS เฉลี่ย
            </CardTitle>
            <Activity className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.avgROAS.toFixed(2)}x
            </div>
            <p className="text-xs text-white/90 mt-1">
              Return on Ad Spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue vs Spent Line Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">รายได้ vs ค่าใช้จ่าย (7 วัน)</CardTitle>
            <CardDescription className="text-slate-300">
              แนวโน้มรายได้และค่าใช้จ่ายย้อนหลัง 7 วัน
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#e2e8f0"
                    style={{ fontSize: '12px', fill: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#e2e8f0"
                    style={{ fontSize: '12px', fill: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      color: "#fff"
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="รายได้"
                    fill="url(#colorRevenue)"
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#ef4444"
                    strokeWidth={3}
                    name="ค่าใช้จ่าย"
                    fill="url(#colorSpent)"
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="กำไร"
                    fill="url(#colorProfit)"
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ROI by Platform Bar Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">ROI แต่ละ Platform</CardTitle>
            <CardDescription className="text-slate-300">
              เปรียบเทียบประสิทธิภาพแต่ละแพลตฟอร์ม
            </CardDescription>
          </CardHeader>
          <CardContent>
            {platformROIData.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={platformROIData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="platform"
                    stroke="#e2e8f0"
                    style={{ fontSize: '12px', fill: '#e2e8f0' }}
                  />
                  <YAxis
                    stroke="#e2e8f0"
                    style={{ fontSize: '12px', fill: '#e2e8f0' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      color: "#fff"
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Bar
                    dataKey="avgROI"
                    fill="url(#barGradient)"
                    name="Average ROI"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Budget Pie Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">สัดส่วนงบประมาณ</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetChartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={budgetChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {budgetChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                    formatter={(value: number) => [
                      `฿${value.toLocaleString()}`,
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Products */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              สินค้าใกล้หมดสต็อก
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีสินค้าใกล้หมด
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>สินค้า</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead className="text-right">ขั้นต่ำ</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">
                        {product.minStockLevel}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.quantity === 0 ? "destructive" : "secondary"
                          }
                        >
                          {product.quantity === 0 ? "หมด" : "ใกล้หมด"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {!loading && (
        <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700 animate-fade-in hover-lift">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              AI Insights & Recommendations
            </CardTitle>
          <CardDescription className="text-blue-200">
            คำแนะนำจาก AI วิเคราะห์ธุรกิจของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInsights ? (
            <div className="flex items-center gap-2 text-blue-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              AI กำลังวิเคราะห์ข้อมูลของคุณ...
            </div>
          ) : aiInsights.length > 0 ? (
            <ul className="space-y-3">
              {aiInsights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-3 text-white">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className="flex-1">{insight}</span>
                </li>
              ))}
            </ul>
          ) : aiError ? (
            <p className="text-red-200">{aiError}</p>
          ) : (
            <p className="text-blue-200">
              เพิ่มข้อมูลสินค้าและแคมเปญเพื่อรับคำแนะนำจาก AI
            </p>
          )}

            <Button
              variant="outline"
              className="mt-4 w-full border-blue-400 text-blue-100 hover:bg-blue-800"
              onClick={() => router.push("/ai-chat")}
            >
              <Bot className="w-4 h-4 mr-2" />
              เปิด AI Assistant
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      <Card className="bg-slate-800 border-slate-700 animate-fade-in hover-lift">
        <CardHeader>
          <CardTitle className="text-white">กิจกรรมล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Campaigns */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                📢 แคมเปญล่าสุด
              </h3>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีแคมเปญ
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns
                    .sort((a, b) => {
                      const dateA = a.createdAt
                        ? new Date(a.createdAt).getTime()
                        : 0;
                      const dateB = b.createdAt
                        ? new Date(b.createdAt).getTime()
                        : 0;
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between py-2 border-b border-slate-700"
                      >
                        <div>
                          <p className="text-sm text-white font-medium">
                            {c.campaignName}
                          </p>
                          <p className="text-xs text-slate-400">
                            {c.platform} • ROI: {c.roi.toFixed(2)}x
                          </p>
                        </div>
                        <Badge
                          className={
                            c.status === "ACTIVE"
                              ? "bg-green-500"
                              : c.status === "PAUSED"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          }
                        >
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Budget Status */}
            <div>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">
                💰 สถานะงบประมาณ
              </h3>
              {budgets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีงบประมาณ
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">งบประมาณรวม</span>
                      <span className="text-lg font-bold text-white">
                        {formatCurrency(totalBudget)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">คงเหลือ</span>
                      <span
                        className={`text-lg font-bold ${
                          budgetRemaining >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatCurrency(budgetRemaining)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">จำนวนรายการ</span>
                      <span className="text-lg font-bold text-white">
                        {budgets.length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {budgets.slice(0, 4).map((b) => {
                      const remaining = b.amount - b.spent;
                      const percentage = (b.spent / b.amount) * 100;

                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between py-2 border-b border-slate-700"
                        >
                          <div className="flex-1">
                            <p className="text-sm text-white font-medium">
                              {b.purpose}
                            </p>
                            <p className="text-xs text-slate-400">
                              ใช้ไป {formatCurrency(b.spent)} /{" "}
                              {formatCurrency(b.amount)}
                            </p>
                          </div>
                          <Badge
                            className={
                              percentage > 90
                                ? "bg-red-500"
                                : percentage > 70
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }
                          >
                            {percentage.toFixed(0)}%
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
