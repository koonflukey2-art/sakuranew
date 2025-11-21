"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Wallet, Package, Target, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Mock data
const revenueData = [
  { day: "จันทร์", revenue: 45000, costs: 28000 },
  { day: "อังคาร", revenue: 52000, costs: 31000 },
  { day: "พุธ", revenue: 38000, costs: 24000 },
  { day: "พฤหัสบดี", revenue: 61000, costs: 35000 },
  { day: "ศุกร์", revenue: 72000, costs: 42000 },
  { day: "เสาร์", revenue: 85000, costs: 48000 },
  { day: "อาทิตย์", revenue: 78000, costs: 45000 },
];

const roiData = [
  { platform: "Facebook", roi: 2.5 },
  { platform: "TikTok", roi: 3.2 },
  { platform: "Lazada", roi: 1.8 },
  { platform: "Shopee", roi: 2.8 },
];

const budgetData = [
  { name: "โฆษณา Facebook", value: 50000, color: "#3b82f6" },
  { name: "โฆษณา TikTok", value: 30000, color: "#000000" },
  { name: "โฆษณา Shopee", value: 20000, color: "#f97316" },
  { name: "สต็อกสินค้า", value: 100000, color: "#10b981" },
];

const lowStockProducts = [
  { id: "1", name: "สบู่เหลว Dove", quantity: 8, minStockLevel: 30, status: "critical" },
  { id: "2", name: "โลชั่น Vaseline", quantity: 5, minStockLevel: 20, status: "critical" },
  { id: "3", name: "แป้งฝุ่น Pond's", quantity: 12, minStockLevel: 15, status: "warning" },
  { id: "4", name: "ครีมอาบน้ำ Nivea", quantity: 18, minStockLevel: 25, status: "warning" },
  { id: "5", name: "ดีโอ Rexona", quantity: 22, minStockLevel: 30, status: "warning" },
];

export default function DashboardPage() {
  const totalRevenue = revenueData.reduce((acc, d) => acc + d.revenue, 0);
  const totalCosts = revenueData.reduce((acc, d) => acc + d.costs, 0);
  const totalProfit = totalRevenue - totalCosts;
  const avgRoi = roiData.reduce((acc, d) => acc + d.roi, 0) / roiData.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">ภาพรวมธุรกิจของคุณ</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">กำไรสัปดาห์นี้</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">฿{totalProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">+12.5% จากสัปดาห์ก่อน</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">งบประมาณคงเหลือ</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">฿69,000</div>
            <p className="text-xs text-muted-foreground mt-1">จาก ฿215,000</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สินค้าใกล้หมด</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">ต้องเติมสต็อก</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ROI เฉลี่ย</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{avgRoi.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground mt-1">ทุกแพลตฟอร์ม</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue vs Costs Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>รายได้ vs ค่าใช้จ่าย (7 วัน)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `฿${(v/1000)}k`} />
                <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, ""]} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="รายได้" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                <Line type="monotone" dataKey="costs" name="ค่าใช้จ่าย" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROI Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>ROI แต่ละแพลตฟอร์ม</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roiData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="platform" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value: number) => [`${value}x`, "ROI"]} />
                <Bar dataKey="roi" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {roiData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.roi >= 2.5 ? "#10b981" : entry.roi >= 2 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Budget Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนงบประมาณ</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={budgetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {budgetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Low Stock Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              สินค้าใกล้หมดสต็อก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
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
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">{product.minStockLevel}</TableCell>
                    <TableCell>
                      <Badge variant={product.status === "critical" ? "destructive" : "secondary"}>
                        {product.status === "critical" ? "วิกฤต" : "เตือน"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
