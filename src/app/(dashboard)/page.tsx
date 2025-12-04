"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  Wallet,
  Package,
  Target,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Activity,
  Loader2,
  Sparkles,
  Bot,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { DashboardSkeleton } from "@/components/loading-states";

// Vibrant color palette matching our pink-purple-cyan theme
const COLORS = [
  "#ec4899",
  "#a855f7",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#6366f1",
];

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

  // -------- utils --------

  // Calculate statistics from real data
  const calculateStats = (
    productsData: Product[],
    campaignsData: Campaign[],
    budgetsData: Budget[]
  ) => {
    const safeCampaigns = Array.isArray(campaignsData) ? campaignsData : [];

    // Total Revenue (from campaigns ROI)
    const totalRevenue = safeCampaigns.reduce((sum, c) => {
      const revenue = c.spent * c.roi;
      return sum + revenue;
    }, 0);

    // Total Spent
    const totalSpent = safeCampaigns.reduce((sum, c) => sum + c.spent, 0);

    // Total Profit
    const totalProfit = totalRevenue - totalSpent;

    // Total Orders (from conversions)
    const totalOrders = safeCampaigns.reduce(
      (sum, c) => sum + c.conversions,
      0
    );

    // Average ROAS
    const avgROAS =
      safeCampaigns.length > 0
        ? safeCampaigns.reduce((sum, c) => sum + c.roi, 0) /
          safeCampaigns.length
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

  // helper: parse JSON อย่างปลอดภัย
  const safeJson = async <T,>(res: Response): Promise<T | null> => {
    if (!res.ok) return null;
    try {
      return (await res.json()) as T;
    } catch {
      return null;
    }
  };

  // -------- data fetch --------

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

      const prompt = `คุณเป็นนักวิเคราะห์อีคอมเมิร์ซ ช่วยสรุปสถานะธุรกิจเป็น bullet 3-5 ข้อ ภาษาไทย สั้นไม่เกิน 20 คำ โดยใช้ตัวเลขเหล่านี้:\n- รายได้รวม: ${metrics.totalRevenue.toFixed(
        0
      )}\n- กำไร: ${metrics.totalProfit.toFixed(
        0
      )}\n- ออเดอร์: ${metrics.totalOrders}\n- ROAS เฉลี่ย: ${metrics.avgROAS.toFixed(
        2
      )}\n- งบประมาณคงเหลือ: ${metrics.budgetRemaining.toFixed(
        0
      )}\n- จำนวนแคมเปญ: ${
        metrics.campaignCount
      }\n- จำนวนงบประมาณ: ${metrics.budgetCount}\n- สินค้าใกล้หมด: ${
        metrics.lowStockCount
      }`;

      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.warn(
          "AI insights request failed",
          (data as any)?.error || response.statusText
        );
        setAiInsights([]);
        return;
      }

      const raw =
        typeof (data as any).response === "string"
          ? (data as any).response
          : typeof (data as any).message === "string"
          ? (data as any).message
          : "";

      if (!raw) {
        setAiInsights([]);
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
    } catch (error) {
      console.error("AI Insights error:", error);
      setAiInsights([]);
      setAiError("ไม่สามารถดึงคำแนะนำจาก AI ได้");
    } finally {
      setLoadingInsights(false);
    }
  };

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

      // ถ้า 401 แปลว่ายังไม่ได้ login → ให้โชว์ dashboard ว่าง ๆ แต่ไม่พัง
      if (
        productsRes.status === 401 ||
        campaignsRes.status === 401 ||
        budgetsRes.status === 401
      ) {
        console.warn("Dashboard APIs returned 401 (unauthorized)");
        setProducts([]);
        setCampaigns([]);
        setBudgets([]);
        setStats({
          totalRevenue: 0,
          totalProfit: 0,
          totalOrders: 0,
          avgROAS: 0,
        });
        return;
      }

      const productsJson = await safeJson<any>(productsRes);
      const campaignsJson = await safeJson<any>(campaignsRes);
      const budgetsJson = await safeJson<any>(budgetsRes);

      // ทำให้แน่ใจว่าทุกอันเป็น Array
      const productsData: Product[] = Array.isArray(productsJson)
        ? productsJson
        : (productsJson?.products as Product[]) ?? [];

      const campaignsData: Campaign[] = Array.isArray(campaignsJson)
        ? campaignsJson
        : (campaignsJson?.campaigns as Campaign[]) ?? [];

      const budgetsData: Budget[] = Array.isArray(budgetsJson)
        ? budgetsJson
        : (budgetsJson?.budgets as Budget[]) ?? [];

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
      setProducts([]);
      setCampaigns([]);
      setBudgets([]);
      setStats({
        totalRevenue: 0,
        totalProfit: 0,
        totalOrders: 0,
        avgROAS: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- derived data (ใช้ state campaigns/budgets แบบ safe) --------

  // Get last 7 days data for line chart
  const getLast7DaysData = () => {
    const safeCampaigns: Campaign[] = Array.isArray(campaigns) ? campaigns : [];
    const data: {
      date: string;
      revenue: number;
      spent: number;
      profit: number;
    }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("th-TH", {
        month: "short",
        day: "numeric",
      });

      // Calculate from campaigns active on that day
      const dayCampaigns = safeCampaigns.filter((c) => {
        const start = new Date(c.startDate);
        const end = c.endDate ? new Date(c.endDate) : new Date();
        return date >= start && date <= end;
      });

      const revenue = dayCampaigns.reduce(
        (sum, c) => sum + c.spent * c.roi,
        0
      );
      const spent = dayCampaigns.reduce(
        (sum, c) => sum + c.spent / 7,
        0
      ); // Divide by 7 to get daily average
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
    const safeCampaigns: Campaign[] = Array.isArray(campaigns) ? campaigns : [];

    const platformStats: Record<
      string,
      { platform: string; roi: number; count: number }
    > = {};

    safeCampaigns.forEach((c) => {
      if (!platformStats[c.platform]) {
        platformStats[c.platform] = {
          platform: c.platform,
          roi: 0,
          count: 0,
        };
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
    const safeBudgets: Budget[] = Array.isArray(budgets) ? budgets : [];
    return safeBudgets.map((b) => ({
      name: b.purpose,
      value: b.amount,
    }));
  };

  // Get low stock products
  const getLowStockProducts = () => {
    const safeProducts: Product[] = Array.isArray(products) ? products : [];
    return safeProducts.filter((p) => p.quantity < p.minStockLevel).slice(0, 5);
  };

  // Get budget remaining
  const getBudgetRemaining = () => {
    const safeBudgets: Budget[] = Array.isArray(budgets) ? budgets : [];
    const totalBudget = safeBudgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = safeBudgets.reduce((sum, b) => sum + b.spent, 0);
    return totalBudget - totalSpent;
  };

  const chartData = getLast7DaysData();
  const platformROIData = getPlatformROIData();
  const budgetChartData = getBudgetChartData();
  const lowStockProducts = getLowStockProducts();
  const budgetRemaining = getBudgetRemaining();
  const totalBudget = (Array.isArray(budgets) ? budgets : []).reduce(
    (sum, b) => sum + b.amount,
    0
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  // -------- render --------

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header - Simple & Clear */}
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">
          ภาพรวมธุรกิจของคุณ 🚀
        </p>
      </div>

      {/* Stats Cards - Vibrant */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 - Pink (Profit) */}
        <Card className="stat-card-pink hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                กำไรรวม
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-white/80 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {stats.totalProfit > 0 ? "+" : ""}
              {stats.totalRevenue > 0
                ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)
                : 0}
              % margin
            </p>
          </CardContent>
        </Card>

        {/* Card 2 - Purple (Revenue) */}
        <Card className="stat-card-purple hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                รายได้
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-white/80 mt-2">จากแคมเปญทั้งหมด</p>
          </CardContent>
        </Card>

        {/* Card 3 - Cyan (Orders) */}
        <Card className="stat-card-cyan hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                ออเดอร์
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {formatNumber(stats.totalOrders)}
            </div>
            <p className="text-xs text-white/80">Conversions ทั้งหมด</p>
          </CardContent>
        </Card>

        {/* Card 4 - Orange (ROAS) */}
        <Card className="stat-card-orange hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <CardHeader className="pb-2 relative">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white/90">
                ROAS เฉลี่ย
              </CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0 relative">
            <div className="text-3xl font-bold text-white">
              {stats.avgROAS.toFixed(2)}x
            </div>
            <p className="text-xs text-white/80">Return on Ad Spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Revenue vs Spent Line Chart */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
              รายได้ vs ค่าใช้จ่าย (7 วัน)
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600">
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="line"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ec4899"
                    strokeWidth={3}
                    name="รายได้"
                    dot={{ fill: "#ec4899", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="spent"
                    stroke="#a855f7"
                    strokeWidth={3}
                    name="ค่าใช้จ่าย"
                    dot={{ fill: "#a855f7", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#06b6d4"
                    strokeWidth={3}
                    name="กำไร"
                    dot={{ fill: "#06b6d4", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ROI by Platform Bar Chart */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
              ROI แต่ละ Platform
            </CardTitle>
            <CardDescription className="text-sm md:text-base text-gray-600">
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                  />
                  <XAxis
                    dataKey="platform"
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    className="text-muted-foreground"
                    style={{ fontSize: "12px" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar
                    dataKey="avgROI"
                    fill="#06b6d4"
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
      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
        {/* Budget Pie Chart */}
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">
              สัดส่วนงบประมาณ
            </CardTitle>
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
                    fill="#ec4899"
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
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      color: "hsl(var(--foreground))",
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
        <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-800">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-orange-500" />
              สินค้าใกล้หมดสต็อก
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีสินค้าใกล้หมด
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table className="min-w-full">
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
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.minStockLevel}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.quantity === 0
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {product.quantity === 0 ? "หมด" : "ใกล้หมด"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {!loading && (
        <Card className="bg-gradient-to-br from-white to-pink-50 border border-pink-200 shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg md:text-xl font-bold text-gray-800">
                  AI Insights & Recommendations
                </span>
              </CardTitle>
              <Button
                size="sm"
                className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md"
                onClick={() => router.push("/ai-chat")}
              >
                <Bot className="w-4 h-4 mr-2" />
                ดูทั้งหมด
              </Button>
            </div>
            <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
              คำแนะนำจาก AI วิเคราะห์ธุรกิจของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInsights ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
              </div>
            ) : aiInsights.length > 0 ? (
              <ul className="space-y-3">
                {aiInsights.map((insight, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-pink-200 hover:shadow-sm transition-all"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {idx + 1}
                    </span>
                    <span className="text-gray-700 flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : aiError ? (
              <p className="text-gray-600">{aiError}</p>
            ) : (
              <p className="text-gray-600">
                เพิ่มข้อมูลสินค้าและแคมเปญเพื่อรับคำแนะนำจาก AI
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activities */}
      <Card className="bg-white border border-gray-200 shadow-md rounded-2xl hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800">
            กิจกรรมล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Campaigns */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">
                📢 แคมเปญล่าสุด
              </h3>
              {(Array.isArray(campaigns) ? campaigns : []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีแคมเปญ
                </div>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(campaigns) ? campaigns : [])
                    .slice()
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
                        className="flex items-center justify-between py-2 border-b border-border"
                      >
                        <div>
                          <p className="text-sm text-foreground font-medium">
                            {c.campaignName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.platform} • ROI: {c.roi.toFixed(2)}x
                          </p>
                        </div>
                        <Badge
                          className={
                            c.status === "ACTIVE"
                              ? "bg-gradient-success text-white border-0"
                              : c.status === "PAUSED"
                              ? "bg-gradient-warning text-white border-0"
                              : "bg-muted text-muted-foreground"
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
              <h3 className="text-sm font-semibold text-foreground mb-2">
                💰 สถานะงบประมาณ
              </h3>
              {(Array.isArray(budgets) ? budgets : []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีงบประมาณ
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-muted">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        งบประมาณรวม
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {formatCurrency(totalBudget)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        คงเหลือ
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          budgetRemaining >= 0
                            ? "bg-gradient-success bg-clip-text text-transparent"
                            : "bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent"
                        }`}
                      >
                        {formatCurrency(budgetRemaining)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        จำนวนรายการ
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {(Array.isArray(budgets) ? budgets : []).length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {(Array.isArray(budgets) ? budgets : [])
                      .slice(0, 4)
                      .map((b) => {
                        const percentage = (b.spent / b.amount) * 100;

                        return (
                          <div
                            key={b.id}
                            className="flex items-center justify-between py-2 border-b border-border"
                          >
                            <div className="flex-1">
                              <p className="text-sm text-foreground font-medium">
                                {b.purpose}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ใช้ไป {formatCurrency(b.spent)} /{" "}
                                {formatCurrency(b.amount)}
                              </p>
                            </div>
                            <Badge
                              className={
                                percentage > 90
                                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-0"
                                  : percentage > 70
                                  ? "bg-gradient-warning text-white border-0"
                                  : "bg-gradient-success text-white border-0"
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
