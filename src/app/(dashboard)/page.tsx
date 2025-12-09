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
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
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
  const weekProfit = stats?.week?.profit || 0;
  const profitChange = weekProfit > 0 ? ((todayProfit / weekProfit) * 100).toFixed(1) : 0;

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
        <div className="flex items-center gap-2">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-4xl">🌸</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Revenue */}
        <Card className="premium-card hover-glow border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              รายได้วันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{stats?.today?.revenue?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {stats?.today?.orders || 0} ออเดอร์
            </p>
          </CardContent>
        </Card>

        {/* Today Profit */}
        <Card className="premium-card hover-glow border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              กำไรวันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              ฿{todayProfit.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {todayProfit >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <p className="text-xs text-gray-400">
                {stats?.today?.revenue > 0
                  ? `${((todayProfit / stats.today.revenue) * 100).toFixed(1)}% margin`
                  : "0% margin"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Remaining */}
        <Card
          className={`premium-card hover-glow border-l-4 ${
            budget?.remaining <= 0
              ? "border-l-red-500"
              : budget?.remaining <= budget?.minThreshold
              ? "border-l-orange-500"
              : "border-l-purple-500"
          }`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              งบประมาณคงเหลือ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                budget?.remaining <= 0
                  ? "text-red-400"
                  : budget?.remaining <= budget?.minThreshold
                  ? "text-orange-400"
                  : "text-purple-400"
              }`}
            >
              ฿{budget?.remaining?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {budget?.remaining <= 0
                ? "⚠️ งบหมดแล้ว"
                : budget?.remaining <= budget?.minThreshold
                ? "⚠️ งบต่ำกว่าขั้นต่ำ"
                : `${budget?.amount ? ((budget.remaining / budget.amount) * 100).toFixed(0) : 0}% ของงบทั้งหมด`}
            </p>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="premium-card hover-glow border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-400" />
              สินค้าใกล้หมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {lowStockCount}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              จากทั้งหมด {products.length} รายการ
            </p>
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

      {/* 7-Day Profit Trend */}
      {stats?.week?.daily && (
        <Card className="premium-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                แนวโน้มกำไร 7 วัน
              </CardTitle>
              <Link href="/analysis">
                <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                  ดูทั้งหมด
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.week.daily.slice(-7).map((day: any, index: number) => {
                const profitMargin = day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-16 text-xs text-gray-400">{day.date}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-medium">
                          ฿{day.profit.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          ({profitMargin.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            day.profit > 0
                              ? "bg-gradient-to-r from-green-500 to-blue-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              (Math.abs(day.profit) /
                                Math.max(...stats.week.daily.map((d: any) => Math.abs(d.profit)))) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/stock">
          <Card className="premium-card hover-glow cursor-pointer hover:border-purple-500 transition-all">
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
          <Card className="premium-card hover-glow cursor-pointer hover:border-purple-500 transition-all">
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

        <Link href="/analysis">
          <Card className="premium-card hover-glow cursor-pointer hover:border-purple-500 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white">วิเคราะห์กำไร</h3>
                  <p className="text-sm text-gray-400">ดู KPI และรายงาน</p>
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
