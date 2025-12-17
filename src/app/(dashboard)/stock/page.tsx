"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/** ✅ Tooltip แบบโทนมืด */
function DarkTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: any;
  formatter?: (value: number, name?: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700 bg-[#0b1220] px-3 py-2 shadow-lg">
      {label !== undefined && label !== null && (
        <div className="text-sm font-semibold text-slate-100">
          {String(label)}
        </div>
      )}

      <div className="mt-1 space-y-1">
        {payload.map((p, idx) => {
          const name = p?.name ?? p?.dataKey ?? "";
          const value = Number(p?.value ?? 0);
          const color = p?.color ?? "#E5E7EB";

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-slate-200">{String(name)}</span>
              </div>
              <span className="text-sm font-semibold text-white">
                {formatter ? formatter(value, name) : value.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const [productsRes, ordersRes, budgetRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/capital-budget"),
      ]);

      if (!productsRes.ok || !ordersRes.ok || !budgetRes.ok) {
        console.error("Fetch error:", {
          productsStatus: productsRes.status,
          ordersStatus: ordersRes.status,
          budgetStatus: budgetRes.status,
        });
        setErrorText("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }

      const productsData = await productsRes.json().catch(() => []);
      const ordersData = await ordersRes.json().catch(() => []);
      const budgetData = await budgetRes.json().catch(() => null);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);

      // ✅ รองรับทั้งกรณีคืนมาเป็น array และ object
      if (Array.isArray(budgetData)) {
        setBudget(budgetData[0] ?? null);
      } else {
        setBudget(budgetData);
      }

      console.log("StockPage data:", {
        productsCount: Array.isArray(productsData) ? productsData.length : 0,
        ordersCount: Array.isArray(ordersData) ? ordersData.length : 0,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setErrorText("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // Today (local)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ นิยามออเดอร์จาก LINE
  const lineOrdersAll = orders.filter(
    (o) =>
      (typeof o.rawMessage === "string" && o.rawMessage.trim() !== "") ||
      o.productType !== null
  );

  const lineOrderStats = lineOrdersAll.reduce(
    (acc, order) => {
      acc.total += 1;
      acc.revenue += order.amount || 0;
      return acc;
    },
    { total: 0, revenue: 0 }
  );

  const lineOrdersToday = lineOrdersAll
    .filter((o) => {
      if (!o.orderDate) return false;
      const orderDate = new Date(o.orderDate);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    })
    .reduce(
      (acc, order) => {
        acc.total += 1;
        acc.revenue += order.amount || 0;
        return acc;
      },
      { total: 0, revenue: 0 }
    );

  // สถิติออเดอร์ตามสินค้า
  const ordersByType = products.map((product) => {
    const relatedOrders = orders.filter(
      (o) => o.productType === product.productType
    );
    return {
      name: product.name,
      orders: relatedOrders.length,
      revenue: relatedOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
    };
  });

  const COLORS = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient-pink">สต็อกสินค้า</h1>
          <p className="text-gray-400 mt-1">
            ข้อมูลสินค้า ออเดอร์จาก LINE และงบประมาณ
            (อัปเดตอัตโนมัติทุก 30 วินาที)
          </p>
          {errorText && (
            <p className="text-xs text-red-400 mt-1">{errorText}</p>
          )}
        </div>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          className="border-purple-400 text-purple-200"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
              <Package className="w-4 h-4" />
              สินค้าทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {products.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              ออเดอร์ LINE วันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {lineOrdersToday.total}
            </div>
            <p className="text-xs text-blue-300 mt-1">
              ทั้งหมด: {lineOrderStats.total} ออเดอร์
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              รายได้ LINE วันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{lineOrdersToday.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-300 mt-1">
              ทั้งหมด: ฿{lineOrderStats.revenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-900/30 to-pink-950/30 border-pink-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-pink-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              งบประมาณคงเหลือ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-pink-400">
              ฿{budget?.remaining?.toLocaleString?.() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">ออเดอร์แยกตามประเภทสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByType}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    tick={{ fill: "#E5E7EB" }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: "#E5E7EB" }}
                  />
                  <Tooltip
                    content={
                      <DarkTooltip
                        formatter={(v, name) =>
                          name === "orders"
                            ? `${v.toLocaleString()} ออเดอร์`
                            : v.toLocaleString()
                        }
                      />
                    }
                  />
                  <Bar dataKey="orders" radius={[8, 8, 0, 0]}>
                    {ordersByType.map((_, index) => (
                      <Cell
                        key={`bar-cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">
              รายได้แยกตามประเภทสินค้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByType}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: any) => {
                      const { x, y, name } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#E5E7EB"
                          textAnchor={x > 0 ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={12}
                        >
                          {name}
                        </text>
                      );
                    }}
                    labelLine={{ stroke: "rgba(255,255,255,0.25)" }}
                  >
                    {ordersByType.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    content={
                      <DarkTooltip
                        formatter={(v) => `฿${Number(v).toLocaleString()}`}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">รายการสินค้าในสต็อก</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีสินค้าในระบบ</p>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="text-sm text-gray-400">
                        ประเภท: {product.productType ?? "-"} | ต้นทุน: ฿
                        {product.costPrice}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">สต็อก</p>
                      <p className="text-xl font-bold text-white">
                        {product.quantity}
                      </p>
                    </div>

                    {product.quantity < product.minStockLevel && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        ต่ำ
                      </Badge>
                    )}
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
