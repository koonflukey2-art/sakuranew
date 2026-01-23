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

// Dynamic color palette for unlimited products
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#6366f1", // indigo
];

interface ProductType {
  productType: number;
  name: string;
  currentStock: number;
  costPrice: number;
  sellingPrice: number;
  totalRevenue: number;
  totalOrders: number;
  totalQuantitySold: number;
}

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
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
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

      const [productTypesRes, budgetRes] = await Promise.all([
        fetch("/api/products/types"),
        fetch("/api/capital-budget/available"),
      ]);

      if (!productTypesRes.ok || !budgetRes.ok) {
        console.error("Fetch error:", {
          productTypesStatus: productTypesRes.status,
          budgetStatus: budgetRes.status,
        });
        setErrorText("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      }

      const productTypesData = await productTypesRes.json().catch(() => []);
      const budgetData = budgetRes.ok ? await budgetRes.json().catch(() => null) : null;

      setProductTypes(Array.isArray(productTypesData) ? productTypesData : []);

      // ✅ รองรับทั้งกรณีคืนมาเป็น array และ object
      if (Array.isArray(budgetData)) {
        setBudget(budgetData[0] ?? null);
      } else {
        setBudget(budgetData);
      }

      console.log("StockPage data:", {
        productTypesCount: Array.isArray(productTypesData)
          ? productTypesData.length
          : 0,
      });
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setErrorText("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get top 5 products by revenue
  const top5ByRevenue = [...productTypes]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)
    .map((p, index) => ({
      name: p.name,
      revenue: p.totalRevenue,
      color: COLORS[index % COLORS.length],
    }));

  // ✅ Get top 5 products by orders
  const top5ByOrders = [...productTypes]
    .sort((a, b) => b.totalOrders - a.totalOrders)
    .slice(0, 5)
    .map((p, index) => ({
      name: p.name,
      orders: p.totalOrders,
      color: COLORS[index % COLORS.length],
    }));

  // Calculate total LINE orders from all products
  const totalLineOrders = productTypes.reduce(
    (sum, p) => sum + p.totalOrders,
    0
  );
  const totalLineRevenue = productTypes.reduce(
    (sum, p) => sum + p.totalRevenue,
    0
  );

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
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient-pink">
            สต็อกสินค้า
          </h1>
          <p className="text-gray-400 mt-1">
            ข้อมูลสินค้า ออเดอร์ และงบประมาณ (อัปเดตอัตโนมัติทุก 30 วินาที)
          </p>
          {errorText && <p className="text-xs text-red-400 mt-1">{errorText}</p>}
        </div>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          className="border-purple-400 text-purple-200"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
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
              {productTypes.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              ออเดอร์ทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {totalLineOrders}
            </div>
            <p className="text-xs text-blue-300 mt-1">รวมทุกสินค้า</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              รายได้รวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{totalLineRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-green-300 mt-1">รวมทุกสินค้า</p>
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
              ฿{Number((budget as any)?.available ?? (budget as any)?.remaining ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts - TOP 5 ONLY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-white">
              ออเดอร์แยกตามประเภทสินค้า (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5ByOrders}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.1)"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    tick={{ fill: "#E5E7EB" }}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: "#E5E7EB" }} />
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
                    {top5ByOrders.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
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
              รายได้แยกตามประเภทสินค้า (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={top5ByRevenue}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: any) => {
                      const { x, y, name, percent } = props;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#E5E7EB"
                          textAnchor={x > 0 ? "start" : "end"}
                          dominantBaseline="central"
                          fontSize={12}
                        >
                          {name} ({(percent * 100).toFixed(0)}%)
                        </text>
                      );
                    }}
                    labelLine={{ stroke: "rgba(255,255,255,0.25)" }}
                  >
                    {top5ByRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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

      {/* Products List - ALL PRODUCTS with Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white">รายการสินค้าในสต็อก</CardTitle>
        </CardHeader>
        <CardContent>
          {productTypes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              ยังไม่มีสินค้าในระบบ
            </p>
          ) : (
            <div className="space-y-3">
              {productTypes.map((product) => (
                <Card key={product.productType} className="bg-white/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-white">
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            ประเภท {product.productType}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">สต็อก</p>
                          <p className="font-bold text-white">
                            {product.currentStock}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">รายได้</p>
                          <p className="font-bold text-green-400">
                            ฿{product.totalRevenue.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">ออเดอร์</p>
                          <p className="font-bold text-blue-400">
                            {product.totalOrders}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">ขายไป</p>
                          <p className="font-bold text-purple-400">
                            {product.totalQuantitySold}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
