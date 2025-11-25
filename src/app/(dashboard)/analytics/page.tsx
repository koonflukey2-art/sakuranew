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

interface AdAnalytics {
  summary: {
    totalCampaigns: number;
    totalBudget: number;
    totalSpent: number;
    totalReach: number;
    totalClicks: number;
    totalConversions: number;
    avgROI: number;
    ctr: number;
    cpc: number;
    cpa: number;
    conversionRate: number;
    budgetRemaining: number;
    budgetUsedPercent: number;
  };
  byPlatform: Array<{
    platform: string;
    campaigns: number;
    spent: number;
    roi: number;
    conversions: number;
  }>;
  topPerforming: Array<{
    id: string;
    name: string;
    platform: string;
    roi: number;
    spent: number;
    conversions: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [adData, setAdData] = useState<AdAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, adAnalyticsRes] = await Promise.all([
        fetch(`/api/analytics?days=${dateRange}`),
        fetch(`/api/ad-analytics`).catch(() => null), // Gracefully handle if user doesn't have access
      ]);

      const analytics = await analyticsRes.json();
      setData(analytics);

      if (adAnalyticsRes && adAnalyticsRes.ok) {
        const adAnalytics = await adAnalyticsRes.json();
        setAdData(adAnalytics);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">การวิเคราะห์</h1>
        </div>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="text-center text-slate-400">กำลังโหลด...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overview, topProducts, topCategories, revenueByMonth, campaignPerformance } = data;

  const exportProducts = formatDataForExport(topProducts, {
    name: "สินค้า",
    category: "หมวดหมู่",
    revenue: "รายได้",
    quantity: "จำนวนที่ขาย",
  });

  const exportCategories = formatDataForExport(topCategories, {
    category: "หมวดหมู่",
    revenue: "รายได้",
    percentage: "เปอร์เซ็นต์",
  });

  const exportRevenue = formatDataForExport(revenueByMonth, {
    month: "เดือน",
    revenue: "รายได้",
  });

  const exportCampaigns = formatDataForExport(campaignPerformance, {
    platform: "แพลตฟอร์ม",
    spent: "ค่าใช้จ่าย",
    roi: "ROI",
    conversions: "การแปลง",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">การวิเคราะห์</h1>
          <p className="text-slate-400 mt-1">ภาพรวมธุรกิจและประสิทธิภาพ</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="7">7 วันที่แล้ว</SelectItem>
              <SelectItem value="30">30 วันที่แล้ว</SelectItem>
              <SelectItem value="90">90 วันที่แล้ว</SelectItem>
              <SelectItem value="365">1 ปีที่แล้ว</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              รายได้รวม
            </CardTitle>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ฿{overview.totalRevenue.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                overview.revenueChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {overview.revenueChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(overview.revenueChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              คำสั่งซื้อ
            </CardTitle>
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview.totalOrders.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                overview.ordersChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {overview.ordersChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(overview.ordersChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              สินค้าทั้งหมด
            </CardTitle>
            <Package className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {overview.totalProducts.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                overview.productsChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {overview.productsChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(overview.productsChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              ค่าเฉลี่ยต่อคำสั่งซื้อ
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ฿{overview.avgOrderValue.toLocaleString("th-TH")}
            </div>
            <p
              className={`text-xs flex items-center mt-1 ${
                overview.avgOrderChange >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {overview.avgOrderChange >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              {Math.abs(overview.avgOrderChange).toFixed(1)}% จากช่วงก่อนหน้า
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">สินค้าขายดี</CardTitle>
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
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center bg-slate-600 rounded-full text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-sm text-slate-400">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    ฿{product.revenue.toLocaleString("th-TH")}
                  </p>
                  <p className="text-sm text-slate-400">
                    ขาย {product.quantity} ชิ้น
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Categories */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">หมวดหมู่ยอดนิยม</CardTitle>
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
                  <p className="font-medium text-white">{category.category}</p>
                  <p className="text-sm text-slate-400">
                    ฿{category.revenue.toLocaleString("th-TH")} (
                    {category.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
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
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">ประสิทธิภาพแคมเปญ</CardTitle>
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
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-white">{campaign.platform}</p>
                  <p className="text-sm text-slate-400">
                    ค่าใช้จ่าย: ฿{campaign.spent.toLocaleString("th-TH")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">ROI: {campaign.roi}x</p>
                  <p className="text-sm text-slate-400">
                    {campaign.conversions} การแปลง
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ad Analytics Overview */}
      {adData && (
        <>
          <div className="border-t border-slate-700 pt-6">
            <h2 className="text-2xl font-bold text-white mb-4">ภาพรวมโฆษณา</h2>
          </div>

          {/* Ad Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  งบประมาณทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ฿{adData.summary.totalBudget.toLocaleString("th-TH")}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  ใช้ไป {adData.summary.budgetUsedPercent.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  ค่าใช้จ่ายจริง
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  ฿{adData.summary.totalSpent.toLocaleString("th-TH")}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  เหลือ ฿{adData.summary.budgetRemaining.toLocaleString("th-TH")}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  ROI เฉลี่ย
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {adData.summary.avgROI.toFixed(2)}x
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  CPA: ฿{adData.summary.cpa.toFixed(0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  Conversions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {adData.summary.totalConversions.toLocaleString("th-TH")}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  อัตรา {adData.summary.conversionRate.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ad Performance by Platform */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">ประสิทธิภาพตาม Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adData.byPlatform.map((platform) => (
                  <div
                    key={platform.platform}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">{platform.platform}</p>
                      <p className="text-sm text-slate-400">
                        {platform.campaigns} แคมเปญ • ฿
                        {platform.spent.toLocaleString("th-TH")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        ROI: {platform.roi.toFixed(2)}x
                      </p>
                      <p className="text-sm text-slate-400">
                        {platform.conversions} Conversions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Campaigns */}
          {adData.topPerforming.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">แคมเปญที่ดีที่สุด (ROI)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adData.topPerforming.map((campaign, index) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-600 rounded-full text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-white">{campaign.name}</p>
                          <p className="text-sm text-slate-400">{campaign.platform}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">
                          ROI: {campaign.roi.toFixed(2)}x
                        </p>
                        <p className="text-sm text-slate-400">
                          {campaign.conversions} Conversions
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
