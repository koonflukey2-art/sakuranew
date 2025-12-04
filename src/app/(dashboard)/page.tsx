"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import {
  Loader2,
  DollarSign,
  TrendingUp,
  Wallet,
  ShoppingCart,
  Activity,
  AlertTriangle,
  Bot,
  Sparkles,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------- types ----------

type Product = any;
type Campaign = any;
type Budget = any;

interface Stats {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  avgROAS: number;
}

interface OrderStats {
  today: {
    revenue: number;
    orders: number;
    byType?: Record<string, { count: number; revenue: number }>;
  };
  week: {
    revenue: number;
    orders: number;
    byType?: Record<string, { count: number; revenue: number }>;
  };
}

const DEFAULT_STATS: Stats = {
  totalRevenue: 0,
  totalProfit: 0,
  totalOrders: 0,
  avgROAS: 0,
};

const DEFAULT_ORDER_STATS: OrderStats = {
  today: { revenue: 0, orders: 0, byType: {} },
  week: { revenue: 0, orders: 0, byType: {} },
};

const DEFAULT_DASHBOARD_STATS = {
  profit: 0,
  revenue: 0,
  cost: 0,
  orders: 0,
  conversions: 0,
  profitMargin: 0,
};

const COLORS = [
  "#ec4899",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#22c55e",
  "#3b82f6",
];

// ---------- helper ----------

function formatCurrency(value: number) {
  if (!value) return "฿0";
  return `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("th-TH");
}

function calculateStats(
  products: Product[],
  campaigns: Campaign[],
  budgets: Budget[]
): Stats {
  const totalRevenue = (campaigns || []).reduce(
    (sum: number, c: any) => sum + (c.revenue ?? c.totalRevenue ?? 0),
    0
  );
  const totalSpent = (campaigns || []).reduce(
    (sum: number, c: any) => sum + (c.spend ?? c.totalSpent ?? c.cost ?? 0),
    0
  );
  const totalOrders = (campaigns || []).reduce(
    (sum: number, c: any) =>
      sum + (c.conversions ?? c.orders ?? c.totalOrders ?? 0),
    0
  );

  const totalProfit = totalRevenue - totalSpent;
  const avgROAS = totalSpent > 0 ? totalRevenue / totalSpent : 0;

  return {
    totalRevenue,
    totalProfit,
    totalOrders,
    avgROAS,
  };
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoaded } = useUser(); // <-- เพิ่มดึง user + isLoaded

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // RBAC สำหรับ Dashboard
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/rbac/check-access");

        if (!response.ok) {
          router.push("/");
          return;
        }

        const data = await response.json();
        const canViewDashboard =
          data.permissions?.canViewDashboard ||
          data.permissions?.canAccessDashboard ||
          data.permissions?.canAccessSettings;

        if (!canViewDashboard) {
          router.push("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("RBAC check failed:", error);
        router.push("/");
      }
    };

    checkAccess();
  }, [router]);

  // toast ต้อนรับหลังล็อกอิน (safe version)
  useEffect(() => {
    if (!isLoaded || !user) return;
    if (typeof window === "undefined") return;

    try {
      const hasShownWelcome = window.sessionStorage.getItem("hasShownWelcome");
      if (!hasShownWelcome) {
        toast({
          title: "🎉 เข้าสู่ระบบสำเร็จ",
          description: `ยินดีต้อนรับ ${user.firstName || user.fullName || ""}!`,
          className: "premium-card border-green-500/50 glow-green",
          duration: 3000,
        });
        window.sessionStorage.setItem("hasShownWelcome", "true");
      }
    } catch (err) {
      console.error("welcome toast error:", err);
    }
  }, [isLoaded, user, toast]);

  // ---------- states ----------

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [orderStats, setOrderStats] =
    useState<OrderStats>(DEFAULT_ORDER_STATS);
  const [dashboardStats, setDashboardStats] =
    useState(DEFAULT_DASHBOARD_STATS);

  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [chartData, setChartData] = useState<any[]>([]);
  const [platformROIData, setPlatformROIData] = useState<any[]>([]);
  const [budgetChartData, setBudgetChartData] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // ---------- AI insights helper ----------

  const fetchAIInsights = async (payload: {
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
    avgROAS: number;
    budgetRemaining: number;
    campaignCount: number;
    budgetCount: number;
    lowStockCount: number;
  }) => {
    try {
      setLoadingInsights(true);
      setAiError(null);

      const res = await fetch("/api/ai-dashboard-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson<any>(res);

      const insights: string[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.insights)
        ? data.insights
        : [];

      setAiInsights(insights);
    } catch (error) {
      console.error("Failed to fetch AI insights", error);
      setAiError("ไม่สามารถดึงคำแนะนำจาก AI ได้");
      setAiInsights([]);
    } finally {
      setLoadingInsights(false);
    }
  };

  // ---------- main fetch ----------

  useEffect(() => {
    if (isAuthorized) {
      fetchDashboardData();
      fetchDashboardStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [productsRes, campaignsRes, budgetsRes, ordersStatsRes] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/campaigns"),
          fetch("/api/budgets"),
          fetch("/api/orders/stats"),
        ]);

      if (
        productsRes.status === 401 ||
        campaignsRes.status === 401 ||
        budgetsRes.status === 401 ||
        ordersStatsRes.status === 401
      ) {
        console.warn("Dashboard APIs returned 401 (unauthorized)");
        setProducts([]);
        setCampaigns([]);
        setBudgets([]);
        setOrderStats(DEFAULT_ORDER_STATS);
        setStats(DEFAULT_STATS);
        return;
      }

      const productsJson = await safeJson<any>(productsRes);
      const campaignsJson = await safeJson<any>(campaignsRes);
      const budgetsJson = await safeJson<any>(budgetsRes);
      const ordersStatsJson = await safeJson<OrderStats>(ordersStatsRes);

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

      setOrderStats(
        ordersStatsJson ?? {
          today: { revenue: 0, orders: 0, byType: {} },
          week: { revenue: 0, orders: 0, byType: {} },
        }
      );

      const metrics = calculateStats(productsData, campaignsData, budgetsData);
      setStats(metrics);

      const budgetRemaining = (budgetsData || []).reduce(
        (sum: number, b: any) =>
          sum + ((b.amount ?? b.budget ?? 0) - (b.spent ?? b.cost ?? 0)),
        0
      );

      // low stock
      const lowStock = (productsData || []).filter(
        (p: any) =>
          typeof p.quantity === "number" &&
          typeof p.minStockLevel === "number" &&
          p.quantity < p.minStockLevel
      );
      setLowStockProducts(lowStock);

      // budget pie
      const budgetByCategory: Record<string, number> = {};
      (budgetsData || []).forEach((b: any) => {
        const key = b.category || b.name || "อื่น ๆ";
        const amount = b.amount ?? b.budget ?? 0;
        budgetByCategory[key] = (budgetByCategory[key] || 0) + amount;
      });
      setBudgetChartData(
        Object.entries(budgetByCategory).map(([name, value]) => ({
          name,
          value,
        }))
      );

      // ROI by platform
      const roiByPlatform: Record<
        string,
        { spent: number; revenue: number }
      > = {};
      (campaignsData || []).forEach((c: any) => {
        const platform = c.platform || c.channel || "Unknown";
        const spent = c.spend ?? c.cost ?? 0;
        const revenue = c.revenue ?? c.totalRevenue ?? 0;
        if (!roiByPlatform[platform]) {
          roiByPlatform[platform] = { spent: 0, revenue: 0 };
        }
        roiByPlatform[platform].spent += spent;
        roiByPlatform[platform].revenue += revenue;
      });
      setPlatformROIData(
        Object.entries(roiByPlatform).map(([platform, v]) => ({
          platform,
          avgROI: v.spent > 0 ? v.revenue / v.spent : 0,
        }))
      );

      // line chart (ถ้าต้องการทำรายวันค่อย map เพิ่ม)
      setChartData([]);

      // AI insights
      fetchAIInsights({
        ...metrics,
        budgetRemaining,
        campaignCount: campaignsData.length,
        budgetCount: budgetsData.length,
        lowStockCount: lowStock.length,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล Dashboard ได้",
        variant: "destructive",
      });

      setProducts([]);
      setCampaigns([]);
      setBudgets([]);
      setOrderStats(DEFAULT_ORDER_STATS);
      setStats(DEFAULT_STATS);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setDashboardStats({
          profit: data.profit ?? 0,
          revenue: data.revenue ?? 0,
          cost: data.cost ?? 0,
          orders: data.orders ?? 0,
          conversions: data.conversions ?? 0,
          profitMargin: data.profitMargin ?? 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats:", error);
    }
  };

  // ---------- guards ----------

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // ---------- JSX ----------

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-4xl font-bold text-gradient-purple mb-2">
          Dashboard
        </h1>
        <p className="text-gray-400 text-lg">ภาพรวมธุรกิจของคุณ</p>
      </div>

      {/* Sales Stats (LINE / รวมออเดอร์) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              ยอดขายวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{orderStats.today.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {orderStats.today.orders} ออเดอร์
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              ยอดขาย 7 วัน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ฿{orderStats.week.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {orderStats.week.orders} ออเดอร์
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Type Sales Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="col-span-1 border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>ยอดขายแยกตามประเภท (วันนี้)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(orderStats.today.byType || {}).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ยังไม่มีข้อมูลออเดอร์วันนี้
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(orderStats.today.byType || {}).map(
                  ([type, data]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div>
                        <div className="font-medium text-gray-800">
                          {type}
                        </div>
                        <div className="text-sm text-gray-500">
                          {data.count} ชิ้น
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ฿{data.revenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Profit */}
        <Card className="stat-card-pink hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
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
              {formatCurrency(dashboardStats.profit)}
            </div>
            <p className="text-xs text-white/80 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {dashboardStats.profit > 0 ? "+" : ""}
              {dashboardStats.profitMargin.toFixed(1)}
              % margin
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="stat-card-purple hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
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
              {formatCurrency(dashboardStats.revenue)}
            </div>
            <p className="text-xs text-white/80">
              รายได้จากออเดอร์ทั้งหมด
            </p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card className="stat-card-cyan hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
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
              {formatNumber(dashboardStats.orders)}
            </div>
            <p className="text-xs text-white/80">
              Conversions: {formatNumber(dashboardStats.conversions)}
            </p>
          </CardContent>
        </Card>

        {/* ROAS */}
        <Card className="stat-card-orange hover-lift border-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
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
        {/* Revenue vs Spent */}
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

        {/* ROI by Platform */}
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
        {/* Budget Pie */}
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

        {/* Low Stock */}
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
                    {lowStockProducts.map((product: any) => (
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
                          <span
                            className={`inline-flex px-2 py-1 text-xs rounded-full ${
                              product.quantity === 0
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {product.quantity === 0 ? "หมด" : "ใกล้หมด"}
                          </span>
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
        <Card className="bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-pink-500/40 shadow-md rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg md:text-xl font-bold text-white">
                  AI Insights &amp; Recommendations
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
            <CardDescription className="text-sm md:text-base text-slate-300 mt-2">
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
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-700 hover:border-pink-400/60 hover:shadow-sm transition-all"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                      {idx + 1}
                    </span>
                    <span className="text-slate-100 flex-1">{insight}</span>
                  </li>
                ))}
              </ul>
            ) : aiError ? (
              <p className="text-slate-200">{aiError}</p>
            ) : (
              // เปลี่ยนข้อความ fallback ให้เป็นสีขาวตามที่ขอ
              <p className="text-white">
                เพิ่มข้อมูลสินค้าและแคมเปญเพื่อรับคำแนะนำจาก AI
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
