"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingDown, DollarSign, AlertTriangle, RefreshCw } from "lucide-react";
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

export default function StockPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchData, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes, budgetRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/capital-budget"),
      ]);

      const productsData = await productsRes.json();
      const ordersData = await ordersRes.json();
      const budgetData = await budgetRes.json();

      setProducts(productsData);
      setOrders(ordersData);
      setBudget(budgetData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate today's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // LINE orders stats - ALL time
  const lineOrderStats = orders
    .filter((o) => o.source === "LINE")
    .reduce(
      (acc, order) => {
        acc.total += 1;
        acc.revenue += order.amount || 0;
        return acc;
      },
      { total: 0, revenue: 0 }
    );

  // LINE orders stats - TODAY only
  const lineOrdersToday = orders
    .filter((o) => {
      if (o.source !== "LINE") return false;
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

  const ordersByType = products.map((product) => ({
    name: product.name,
    orders: orders.filter((o) => o.productType === product.productType).length,
    revenue: orders
      .filter((o) => o.productType === product.productType)
      .reduce((sum, o) => sum + (o.amount || 0), 0),
  }));

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
          <h1 className="text-4xl font-bold text-gradient-pink">สต็อกสินค้า</h1>
          <p className="text-gray-400 mt-1">ข้อมูลสินค้า ออเดอร์จาก LINE และงบประมาณ (อัพเดทอัตโนมัติทุก 30 วินาที)</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
              <Package className="w-4 h-4" />
              สินค้าทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">{products.length}</div>
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
            <div className="text-3xl font-bold text-blue-400">{lineOrdersToday.total}</div>
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
              ฿{budget?.remaining?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>ออเดอร์แยกตามประเภทสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>รายได้แยกตามประเภทสินค้า</CardTitle>
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
                    label
                  >
                    {ordersByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้าในสต็อก</CardTitle>
        </CardHeader>
        <CardContent>
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
                      ประเภท: {product.productType ?? "-"} | ต้นทุน: ฿{product.costPrice}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">สต็อก</p>
                    <p className="text-xl font-bold text-white">{product.quantity}</p>
                  </div>

                  {product.quantity < product.minStockLevel && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      ต่ำ
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
