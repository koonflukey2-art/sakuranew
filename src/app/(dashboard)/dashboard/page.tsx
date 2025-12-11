"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type TypeBreakdown = {
  count: number;
  revenue: number;
};

type DailyStat = {
  date: string;
  revenue: number;
  expense: number;
  profit: number;
};

type StatsResponse = {
  today: {
    revenue: number;
    orders: number;
    profit: number;
    expense: number;
    byType: Record<string, TypeBreakdown>;
  };
  week: {
    revenue: number;
    orders: number;
    profit: number;
    expense: number;
    byType: Record<string, TypeBreakdown>;
    daily: DailyStat[];
  };
};

type Budget = {
  amount: number;
  remaining: number;
  minThreshold?: number;
};

type Product = {
  id: string;
  name: string;
  quantity: number;
  minStockLevel: number;
};

type Order = {
  id: string;
  orderNumber: string;
  amount: number;
  orderDate: string;
  status: string;
  productType?: number | null;
  quantity: number;
  customer?: {
    name?: string | null;
  } | null;
};

const DONUT_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];

const formatCurrency = (value: number) => `฿${value.toLocaleString()}`;

const calculateChange = (today: number, weekTotal: number) => {
  const baseline = weekTotal / 7;
  if (baseline === 0) return 0;
  return ((today - baseline) / baseline) * 100;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [statsRes, budgetRes, productsRes, ordersRes] = await Promise.all([
        fetch("/api/orders/stats"),
        fetch("/api/capital-budget"),
        fetch("/api/products"),
        fetch("/api/orders"),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setBudget(budgetData);
      }

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const lowStockCount = products.filter(
    (p) => p.quantity < p.minStockLevel
  ).length;

  const todayProfit = stats?.today?.profit ?? 0;
  const todayRevenue = stats?.today?.revenue ?? 0;
  const todayOrders = stats?.today?.orders ?? 0;
  const weekProfit = stats?.week?.profit ?? 0;
  const weekRevenue = stats?.week?.revenue ?? 0;
  const weekExpense = stats?.week?.expense ?? 0;

  const profitChange = calculateChange(todayProfit, weekProfit);
  const revenueChange = calculateChange(todayRevenue, weekRevenue);
  const ordersChange = calculateChange(todayOrders, stats?.week?.orders ?? 0);
  const profitMargin = todayRevenue > 0 ? (todayProfit / todayRevenue) * 100 : 0;

  const totalBudget = budget?.amount ?? 0;
  const remainingBudget = budget?.remaining ?? 0;
  const spentBudget = Math.max(totalBudget - remainingBudget, 0);
  const roas = spentBudget > 0 ? todayRevenue / spentBudget : 0;

  const chartData = useMemo(() => {
    return (
      stats?.week?.daily?.map((day) => ({
        name: day.date,
        revenue: day.revenue,
        profit: day.profit,
        expense: day.expense,
      })) ?? []
    );
  }, [stats?.week?.daily]);

  const profitSparkline = chartData.slice(-7).map((d) => ({ value: d.profit }));
  const revenueSparkline = chartData.slice(-7).map((d) => ({ value: d.revenue }));
  const ordersSparkline = chartData.slice(-7).map((d) => ({ value: d.revenue }));
  const budgetSparkline = chartData.slice(-7).map((d) => ({ value: d.expense }));

  const pieData = Object.entries(stats?.today?.byType || {}).map(
    ([name, data]) => ({
      name,
      value: data.revenue,
      count: data.count,
    })
  );

  const latestOrders = orders.slice(0, 5);

  const rangeLabel = useMemo(() => {
    if (!stats?.week?.daily?.length) return "";
    const first = stats.week.daily[0].date;
    const last = stats.week.daily[stats.week.daily.length - 1].date;
    return `${first} → ${last}`;
  }, [stats?.week?.daily]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink">Sakura Biotech Co. Ltd</h1>
          <p className="text-gray-400">ระบบบริหารจัดการธุรกิจครบวงจร</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            className="border-purple-500/50 hover:bg-purple-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> รีเฟรช
          </Button>
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🌸</span>
          </div>
        </div>
      </div>
    );
  }

      {(lowStockCount > 0 || (budget && remainingBudget <= (budget.minThreshold ?? 0))) && (
        <Card className="border border-yellow-500/40 bg-yellow-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-300 mt-1" />
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-yellow-200">การแจ้งเตือน</h3>
                <ul className="space-y-1 text-sm text-yellow-100/90">
                  {lowStockCount > 0 && (
                    <li>• มีสินค้า {lowStockCount} รายการที่ต่ำกว่าระดับสต็อกขั้นต่ำ</li>
                  )}
                  {budget && remainingBudget <= 0 && <li>• งบประมาณหมดแล้ว - โปรดเติมงบ</li>}
                  {budget && remainingBudget > 0 && remainingBudget <= (budget.minThreshold ?? 0) && (
                    <li>
                      • งบประมาณใกล้ถึงขีดจำกัด ({formatCurrency(budget.minThreshold ?? 0)})
                    </li>
                  )}
                </ul>
              </div>
              <div className="flex gap-2">
                {lowStockCount > 0 && (
                  <Link href="/stock">
                    <Button variant="outline" size="sm" className="border-yellow-400 text-yellow-100">
                      ดูสต็อก
                    </Button>
                  </Link>
                )}
                {budget && remainingBudget <= (budget.minThreshold ?? 0) && (
                  <Link href="/capital-budget">
                    <Button variant="outline" size="sm" className="border-yellow-400 text-yellow-100">
                      จัดการงบ
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="กำไรรวม"
          value={formatCurrency(todayProfit)}
          subtitle={`~${profitMargin.toFixed(1)}% margin`}
          change={profitChange}
          icon={<DollarSign className="w-5 h-5 text-green-300" />}
          tone="green"
          sparkline={profitSparkline}
        />
        <MetricCard
          title="รายได้"
          value={formatCurrency(todayRevenue)}
          subtitle="รายได้รวมวันนี้"
          change={revenueChange}
          icon={<ShoppingCart className="w-5 h-5 text-blue-300" />}
          tone="blue"
          sparkline={revenueSparkline}
          variant="area"
        />
        <MetricCard
          title="ออเดอร์"
          value={`${todayOrders} Conversions`}
          subtitle="จำนวนคำสั่งซื้อวันนี้"
          change={ordersChange}
          icon={<Package className="w-5 h-5 text-purple-200" />}
          tone="purple"
          sparkline={ordersSparkline}
        />
        <MetricCard
          title="งบ & ROAS"
          value={remainingBudget > 0 ? formatCurrency(remainingBudget) : formatCurrency(0)}
          subtitle={`ROAS ${roas.toFixed(2)}x`}
          icon={<Wallet className="w-5 h-5 text-indigo-200" />}
          tone="indigo"
          sparkline={budgetSparkline}
          badge={totalBudget > 0 ? `${Math.round((remainingBudget / totalBudget) * 100)}%` : "0%"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="premium-card xl:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <BarChart3 className="w-5 h-5 text-blue-400" /> ยอดขาย 7 วัน
                </CardTitle>
                <CardDescription className="text-sm text-gray-400">{rangeLabel}</CardDescription>
              </div>
              <div className="flex gap-3 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> Revenue
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" /> Profit
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> Expense
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ left: 4, right: 8, top: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1220",
                    border: "1px solid #1f2937",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} iconType="circle" />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="w-5 h-5 text-purple-400" /> ยอดขายตามประเภท (วันนี้)
            </CardTitle>
            <CardDescription className="text-gray-400">
              แสดงสัดส่วนรายได้และจำนวนชิ้นตามประเภทสินค้า
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1220",
                        border: "1px solid #1f2937",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={pieData} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 12 }} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0b1220",
                        border: "1px solid #1f2937",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]}>
                      {pieData.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {pieData.map((entry, index) => {
                    const total = pieData.reduce((sum, item) => sum + item.value, 0);
                    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                          />
                          <span className="text-gray-200">{entry.name}</span>
                          <span className="text-gray-500">({entry.count} ชิ้น)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs">{pct}%</span>
                          <span className="font-semibold text-white min-w-[90px] text-right">
                            {formatCurrency(entry.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {pieData.length === 0 && <p className="text-gray-500 text-sm text-center py-4">ไม่มีข้อมูลยอดขายวันนี้</p>}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">ยังไม่มียอดขายวันนี้</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="premium-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">ยอดขายวันนี้</CardTitle>
            <CardDescription className="text-gray-400">สรุปผลการขายประจำวัน</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatRow label="รายได้รวม" value={formatCurrency(todayRevenue)} tone="green" />
            <StatRow label="กำไรสุทธิ" value={formatCurrency(todayProfit)} tone="blue" />
            <StatRow label="ค่าใช้จ่าย" value={formatCurrency(stats?.today.expense ?? 0)} tone="red" />
            <div className="border-t border-white/5 pt-4">
              <StatRow label="จำนวนออเดอร์" value={`${todayOrders} รายการ`} tone="purple" />
            </div>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">ออเดอร์ล่าสุด</CardTitle>
            <CardDescription className="text-gray-400">ติดตามสถานะคำสั่งซื้อ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestOrders.length > 0 ? (
              <div className="space-y-3">
                {latestOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-gray-200 font-semibold">#{order.orderNumber || order.id.slice(0, 6)}</p>
                      <p className="text-xs text-gray-400">
                        {order.customer?.name || "ลูกค้าไม่ระบุ"} • {new Date(order.orderDate).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(order.amount)}</p>
                      <p className="text-xs text-gray-400">{order.status}</p>
                    </div>
                  </div>
                ))}
                <Link href="/orders" className="text-sm text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
                  ดูทั้งหมด <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">ยังไม่มีคำสั่งซื้อล่าสุด</div>
            )}
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">ภาพรวมผลตอบแทน</CardTitle>
            <CardDescription className="text-gray-400">กำไรสะสมและ ROAS</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400">งบประมาณคงเหลือ</p>
                <p className="text-2xl font-bold text-indigo-300">{formatCurrency(remainingBudget)}</p>
                <p className="text-xs text-gray-500">จากงบทั้งหมด {formatCurrency(totalBudget)}</p>
              </div>
              <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-indigo-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SmallBadge label="ROAS" value={`${roas.toFixed(2)}x`} tone="indigo" />
              <SmallBadge
                label="ค่าใช้จ่ายรวม"
                value={formatCurrency(weekExpense)}
                tone="red"
              />
              <SmallBadge label="กำไรสัปดาห์" value={formatCurrency(weekProfit)} tone="green" />
              <SmallBadge label="รายได้สัปดาห์" value={formatCurrency(weekRevenue)} tone="blue" />
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={budgetSparkline} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="budgetGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0b1220",
                      border: "1px solid #1f2937",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#budgetGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  change?: number;
  icon: React.ReactNode;
  tone: "green" | "blue" | "purple" | "indigo";
  sparkline: { value: number }[];
  variant?: "line" | "area";
  badge?: string;
};

type StatTone = "green" | "blue" | "red" | "purple";
type BadgeTone = "indigo" | "red" | "green" | "blue";

function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon,
  tone,
  sparkline,
  variant = "line",
  badge,
}: MetricCardProps) {
  const toneStyles: Record<MetricCardProps["tone"], string> = {
    green: "from-emerald-500/10 to-emerald-500/0",
    blue: "from-blue-500/10 to-blue-500/0",
    purple: "from-purple-500/10 to-purple-500/0",
    indigo: "from-indigo-500/10 to-indigo-500/0",
  };

  const changePositive = (change ?? 0) >= 0;
  const gradientId = `area-${title.replace(/\s+/g, "-")}`;

  return (
    <Card className="premium-card relative overflow-hidden">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${toneStyles[tone]} opacity-60 pointer-events-none`}
      />
      <CardHeader className="pb-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">{icon}</div>
          {badge && (
            <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 border border-white/10">{badge}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <p className="text-sm text-gray-400">{title}</p>
        <div className="text-3xl font-bold text-white mt-1">{value}</div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
          {change !== undefined && (
            <span className={`flex items-center gap-1 ${changePositive ? "text-green-400" : "text-red-400"}`}>
              {changePositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {changePositive ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          )}
          <span className="text-gray-500">{subtitle}</span>
        </div>
        <div className="mt-3 -mb-2 h-12">
          <ResponsiveContainer width="100%" height="100%">
            {variant === "area" ? (
              <AreaChart data={sparkline} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="value" stroke="#60a5fa" strokeWidth={2} fill={`url(#${gradientId})`} />
              </AreaChart>
            ) : (
              <LineChart data={sparkline} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value, tone }: { label: string; value: string; tone: StatTone }) {
  const tones: Record<StatTone, string> = {
    green: "text-green-300",
    blue: "text-blue-300",
    red: "text-red-300",
    purple: "text-purple-300",
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300 text-sm">{label}</span>
      <span className={`font-semibold ${tones[tone]}`}>{value}</span>
    </div>
  );
}

function SmallBadge({ label, value, tone }: { label: string; value: string; tone: BadgeTone }) {
  const backgrounds: Record<BadgeTone, string> = {
    indigo: "from-indigo-500/20 to-indigo-500/5",
    red: "from-red-500/20 to-red-500/5",
    green: "from-emerald-500/20 to-emerald-500/5",
    blue: "from-blue-500/20 to-blue-500/5",
  };

  return (
    <div className={`rounded-lg border border-white/5 bg-gradient-to-br ${backgrounds[tone]} p-3`}> 
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
