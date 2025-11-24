"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  PieChart,
  Download,
} from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { formatDataForExport } from "@/lib/export";

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    revenueChange: number;
    totalOrders: number;
    ordersChange: number;
    totalProducts: number;
    productsChange: number;
    avgOrderValue: number;
    avgOrderChange: number;
  };
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    revenue: number;
    quantity: number;
  }>;
  topCategories: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  campaignPerformance: Array<{
    platform: string;
    spent: number;
    roi: number;
    conversions: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics?days=${dateRange}`);

      if (!res.ok) {
        console.warn("Analytics fetch failed", res.statusText);
        setError("ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้");
        setData(null);
        return;
      }

      const analytics = await res.json().catch(() => null);
      if (!analytics) {
        setError("ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้");
        setData(null);
        return;
      }

      setData(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setError("ไม่สามารถโหลดข้อมูลการวิเคราะห์ได้");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 text-slate-900 dark:text-slate-50">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">การวิเคราะห์</h1>
        </div>
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-center text-slate-600 dark:text-slate-400">กำลังโหลด...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const safeOverview = data?.overview ?? {
    totalRevenue: 0,
    revenueChange: 0,
    totalOrders: 0,
    ordersChange: 0,
    totalProducts: 0,
    productsChange: 0,
    avgOrderValue: 0,
    avgOrderChange: 0,
  };

  const topProducts = data?.topProducts ?? [];
  const topCategories = data?.topCategories ?? [];
  const revenueByMonth = data?.revenueByMonth ?? [];
  const campaignPerformance = data?.campaignPerformance ?? [];

  // Product Analysis Export Data
  const exportProducts = formatDataForExport(topProducts || [], {
    name: "สินค้า",
    category: "หมวดหมู่",
    revenue: "รายได้",
    quantity: "จำนวนที่ขาย",
  });

  // Category Analysis Export Data
  const exportCategories = formatDataForExport(topCategories || [], {
    category: "หมวดหมู่",
    revenue: "รายได้",
    percentage: "เปอร์เซ็นต์",
  });

  // Revenue Export Data
  const exportRevenue = formatDataForExport(revenueByMonth || [], {
    month: "เดือน",
    revenue: "รายได้",
  });

  // Campaign Analysis Export Data
  const exportCampaigns = formatDataForExport(campaignPerformance || [], {
    platform: "แพลตฟอร์ม",
    spent: "ค่าใช้จ่าย",
    roi: "ROI",
    conversions: "การแปลง",
  });

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">การวิเคราะห์</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">ภาพรวมธุรกิจและประสิทธิภาพ</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <SelectItem value="7">7 วันที่แล้ว</SelectItem>
              <SelectItem value="30">30 วันที่แล้ว</SelectItem>
              <SelectItem value="90">90 วันที่แล้ว</SelectItem>
              <SelectItem value="365">1 ปีที่แล้ว</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      {loading && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-center text-slate-400">กำลังโหลด...</div>
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardContent className="p-6">
            <div className="text-center text-slate-400">{error}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              รายได้รวม
            </CardTitle>
            <DollarSign className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ฿{safeOverview.totalRevenue.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                safeOverview.revenueChange >= 0
                  ? "text-green-500"
                  : "text-red-500"
            }`}
            >
              {safeOverview.revenueChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(safeOverview.revenueChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              คำสั่งซื้อ
            </CardTitle>
            <ShoppingCart className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {safeOverview.totalOrders.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                safeOverview.ordersChange >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {safeOverview.ordersChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(safeOverview.ordersChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              สินค้าทั้งหมด
            </CardTitle>
            <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {safeOverview.totalProducts.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                safeOverview.productsChange >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {safeOverview.productsChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(safeOverview.productsChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
              ค่าเฉลี่ยต่อคำสั่งซื้อ
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ฿{safeOverview.avgOrderValue.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                safeOverview.avgOrderChange >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {safeOverview.avgOrderChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(safeOverview.avgOrderChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 dark:text-white">สินค้าขายดี</CardTitle>
          <ExportButton
            data={exportProducts}
            filename={`top-products-${dateRange}days`}
            columns={[
              { header: "สินค้า", dataKey: "สินค้า" },
              { header: "หมวดหมู่", dataKey: "หมวดหมู่" },
              { header: "รายได้", dataKey: "รายได้" },
              { header: "จำนวนที่ขาย", dataKey: "จำนวนที่ขาย" },
            ]}
            title="สินค้าขายดี"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-full text-slate-900 dark:text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{product.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900 dark:text-white">
                    ฿{product.revenue.toLocaleString("th-TH")}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ขาย {product.quantity} ชิ้น
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 dark:text-white">หมวดหมู่ยอดนิยม</CardTitle>
          <ExportButton
            data={exportCategories}
            filename={`top-categories-${dateRange}days`}
            columns={[
              { header: "หมวดหมู่", dataKey: "หมวดหมู่" },
              { header: "รายได้", dataKey: "รายได้" },
              { header: "เปอร์เซ็นต์", dataKey: "เปอร์เซ็นต์" },
            ]}
            title="หมวดหมู่ยอดนิยม"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCategories.map((category) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900 dark:text-white">{category.category}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ฿{category.revenue.toLocaleString("th-TH")} (
                    {category.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 dark:text-white">ประสิทธิภาพแคมเปญ</CardTitle>
          <ExportButton
            data={exportCampaigns}
            filename={`campaigns-${dateRange}days`}
            columns={[
              { header: "แพลตฟอร์ม", dataKey: "แพลตฟอร์ม" },
              { header: "ค่าใช้จ่าย", dataKey: "ค่าใช้จ่าย" },
              { header: "ROI", dataKey: "ROI" },
              { header: "การแปลง", dataKey: "การแปลง" },
            ]}
            title="ประสิทธิภาพแคมเปญ"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaignPerformance.map((campaign) => (
              <div
                key={campaign.platform}
                className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{campaign.platform}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ค่าใช้จ่าย: ฿{campaign.spent.toLocaleString("th-TH")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-900 dark:text-white">ROI: {campaign.roi}x</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {campaign.conversions} การแปลง
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
