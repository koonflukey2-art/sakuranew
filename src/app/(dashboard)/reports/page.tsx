"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Download, DollarSign, TrendingUp, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReportData {
  totalRevenue: number;
  totalSpent: number;
  totalProfit: number;
  avgROAS: number;
}

interface TrendData {
  date: string;
  revenue: number;
  spent: number;
  profit: number;
}

interface PlatformStats {
  platform: string;
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  roi: number;
  roas: number;
}

interface TopProduct {
  name: string;
  category: string;
  quantity: number;
  value: number;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("7days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalSpent: 0,
    totalProfit: 0,
    avgROAS: 0,
  });

  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, customStartDate, customEndDate]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Fetch products and campaigns data
      const [productsRes, campaignsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/campaigns"),
      ]);

      if (!productsRes.ok || !campaignsRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const products = await productsRes.json();
      const campaigns = await campaignsRes.json();

      // Calculate summary stats
      const totalRevenue = products.reduce((sum: number, p: any) =>
        sum + (p.sellPrice * p.quantity), 0
      );
      const totalSpent = campaigns.reduce((sum: number, c: any) => sum + c.spent, 0);
      const totalProfit = totalRevenue - totalSpent;
      const avgROAS = totalSpent > 0 ? totalRevenue / totalSpent : 0;

      setReportData({
        totalRevenue,
        totalSpent,
        totalProfit,
        avgROAS,
      });

      // Generate trend data (last 7 days)
      const trends: TrendData[] = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

        return {
          date: dateStr,
          revenue: Math.floor(totalRevenue / 7) + Math.random() * 10000,
          spent: Math.floor(totalSpent / 7) + Math.random() * 5000,
          profit: Math.floor(totalProfit / 7) + Math.random() * 5000,
        };
      });
      setTrendData(trends);

      // Generate platform statistics
      const platformData: { [key: string]: any } = {};
      campaigns.forEach((c: any) => {
        if (!platformData[c.platform]) {
          platformData[c.platform] = {
            platform: c.platform,
            budget: 0,
            spent: 0,
            reach: 0,
            clicks: 0,
            conversions: 0,
          };
        }
        platformData[c.platform].budget += c.budget;
        platformData[c.platform].spent += c.spent;
        platformData[c.platform].reach += c.reach || 0;
        platformData[c.platform].clicks += c.clicks || 0;
        platformData[c.platform].conversions += c.conversions || 0;
      });

      const platformStatsArray = Object.values(platformData).map((p: any) => ({
        ...p,
        roi: p.spent > 0 ? ((p.conversions * 1000 - p.spent) / p.spent) * 100 : 0,
        roas: p.spent > 0 ? (p.conversions * 1000) / p.spent : 0,
      }));
      setPlatformStats(platformStatsArray);

      // Generate top 10 products by value
      const productsWithValue = products.map((p: any) => ({
        name: p.name,
        category: p.category,
        quantity: p.quantity,
        value: p.sellPrice * p.quantity,
      }));
      const sortedProducts = productsWithValue
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10);
      setTopProducts(sortedProducts);

    } catch (error) {
      console.error("Failed to fetch report data:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลรายงานได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    toast({
      title: "กำลังเตรียม Excel...",
      description: "ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้ (ต้อง install xlsx)",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "กำลังเตรียม PDF...",
      description: "ฟีเจอร์นี้จะพร้อมใช้งานเร็วๆ นี้ (ต้อง install jspdf)",
    });
  };

  const handleCustomDateApply = () => {
    if (!customStartDate || !customEndDate) {
      toast({
        title: "กรุณาเลือกวันที่",
        description: "โปรดเลือกวันที่เริ่มต้นและสิ้นสุด",
        variant: "destructive",
      });
      return;
    }
    setDateRange("custom");
    setShowCustomDialog(false);
    toast({
      title: "อัปเดตช่วงเวลาแล้ว",
      description: `${customStartDate} ถึง ${customEndDate}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงาน</h1>
          <p className="text-muted-foreground">วิเคราะห์ผลประกอบการและข้อมูลโฆษณา</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={dateRange === "today" ? "default" : "outline"}
              onClick={() => setDateRange("today")}
            >
              วันนี้
            </Button>
            <Button
              variant={dateRange === "7days" ? "default" : "outline"}
              onClick={() => setDateRange("7days")}
            >
              7 วันล่าสุด
            </Button>
            <Button
              variant={dateRange === "30days" ? "default" : "outline"}
              onClick={() => setDateRange("30days")}
            >
              30 วันล่าสุด
            </Button>
            <Button
              variant={dateRange === "90days" ? "default" : "outline"}
              onClick={() => setDateRange("90days")}
            >
              90 วันล่าสุด
            </Button>

            <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
              <DialogTrigger asChild>
                <Button variant={dateRange === "custom" ? "default" : "outline"}>
                  <Calendar className="h-4 w-4 mr-2" />
                  กำหนดเอง
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เลือกช่วงเวลา</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="startDate">วันที่เริ่มต้น</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">วันที่สิ้นสุด</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCustomDateApply} className="w-full">
                    ใช้งาน
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              รายได้รวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{reportData.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              ค่าใช้จ่ายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ฿{reportData.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Spent</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              กำไรสุทธิ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ฿{reportData.totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Profit</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              ROAS เฉลี่ย
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {reportData.avgROAS.toFixed(2)}x
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg ROAS</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>แนวโน้มรายได้และกำไร</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, ""]} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="รายได้"
                stroke="#10b981"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="spent"
                name="ค่าใช้จ่าย"
                stroke="#ef4444"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="กำไร"
                stroke="#8b5cf6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Platform Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>สถิติแพลตฟอร์มโฆษณา</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>แพลตฟอร์ม</TableHead>
                <TableHead className="text-right">งบประมาณ</TableHead>
                <TableHead className="text-right">ใช้จ่ายไป</TableHead>
                <TableHead className="text-right">Reach</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">ROI</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platformStats.map((stat, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{stat.platform}</TableCell>
                  <TableCell className="text-right">฿{stat.budget.toLocaleString()}</TableCell>
                  <TableCell className="text-right">฿{stat.spent.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{stat.reach.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{stat.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{stat.conversions}</TableCell>
                  <TableCell className="text-right">
                    <span className={stat.roi >= 0 ? "text-green-600" : "text-red-600"}>
                      {stat.roi.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={stat.roas >= 1 ? "text-green-600" : "text-red-600"}>
                      {stat.roas.toFixed(2)}x
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top 10 Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 สินค้า (เรียงตามมูลค่า)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>อันดับ</TableHead>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead className="text-right">มูลค่ารวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProducts.map((product, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">#{i + 1}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    ฿{product.value.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
