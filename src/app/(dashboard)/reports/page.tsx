"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, Download, TrendingUp, Bot } from "lucide-react";

const profitData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  revenue: Math.floor(Math.random() * 50000) + 30000,
  costs: Math.floor(Math.random() * 30000) + 15000,
  profit: Math.floor(Math.random() * 25000) + 10000,
}));

const detailedData = [
  { date: "15 พ.ย.", revenue: 85000, costs: 48000, profit: 37000 },
  { date: "16 พ.ย.", revenue: 72000, costs: 42000, profit: 30000 },
  { date: "17 พ.ย.", revenue: 91000, costs: 52000, profit: 39000 },
  { date: "18 พ.ย.", revenue: 68000, costs: 38000, profit: 30000 },
  { date: "19 พ.ย.", revenue: 95000, costs: 55000, profit: 40000 },
  { date: "20 พ.ย.", revenue: 110000, costs: 62000, profit: 48000 },
  { date: "21 พ.ย.", revenue: 98000, costs: 58000, profit: 40000 },
];

export default function ReportsPage() {
  const totalRevenue = detailedData.reduce((acc, d) => acc + d.revenue, 0);
  const totalCosts = detailedData.reduce((acc, d) => acc + d.costs, 0);
  const totalProfit = detailedData.reduce((acc, d) => acc + d.profit, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">รายงาน</h1>
          <p className="text-muted-foreground">วิเคราะห์ผลประกอบการ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Calendar className="h-4 w-4 mr-2" />เลือกช่วงเวลา</Button>
          <Button><Download className="h-4 w-4 mr-2" />Export PDF</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">รายได้รวม</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">฿{totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600">+18% จากสัปดาห์ก่อน</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">ค่าใช้จ่ายรวม</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">฿{totalCosts.toLocaleString()}</div>
            <p className="text-xs text-red-600">+8% จากสัปดาห์ก่อน</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10">
          <CardHeader className="pb-2"><CardTitle className="text-sm">กำไรสุทธิ</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">฿{totalProfit.toLocaleString()}</div>
            <p className="text-xs text-emerald-600">+25% จากสัปดาห์ก่อน</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            กำไรเดือนนี้เพิ่มขึ้น 15% เมื่อเทียบกับเดือนก่อน
          </p>
          <p className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            วันเสาร์-อาทิตย์ มียอดขายสูงสุด แนะนำเพิ่มงบโฆษณาช่วงสุดสัปดาห์
          </p>
          <p className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            สินค้า "สบู่เหลว Dove" ขายดีที่สุด ควรเพิ่มสต็อก 50%
          </p>
        </CardContent>
      </Card>

      {/* Profit Trend Chart */}
      <Card>
        <CardHeader><CardTitle>แนวโน้มกำไร (30 วัน)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={profitData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(v) => `฿${(v/1000)}k`} />
              <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, ""]} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="รายได้" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="costs" name="ค่าใช้จ่าย" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" name="กำไร" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader><CardTitle>รายละเอียด 7 วันล่าสุด</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead className="text-right">รายได้</TableHead>
                <TableHead className="text-right">ค่าใช้จ่าย</TableHead>
                <TableHead className="text-right">กำไรสุทธิ</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailedData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="text-right text-green-600">฿{row.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-red-600">฿{row.costs.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">฿{row.profit.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{((row.profit / row.revenue) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
