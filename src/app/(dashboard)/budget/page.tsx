"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Wallet, TrendingUp, PieChart } from "lucide-react";

const mockBudgets = [
  { id: "1", purpose: "โฆษณา Facebook", amount: 50000, spent: 32500 },
  { id: "2", purpose: "โฆษณา TikTok", amount: 30000, spent: 18000 },
  { id: "3", purpose: "โฆษณา Shopee", amount: 20000, spent: 12000 },
  { id: "4", purpose: "สต็อกสินค้า", amount: 100000, spent: 75000 },
  { id: "5", purpose: "ค่าดำเนินการ", amount: 15000, spent: 8500 },
];

const mockProfits = [
  { date: "จันทร์", revenue: 45000, costs: 28000, netProfit: 17000 },
  { date: "อังคาร", revenue: 52000, costs: 31000, netProfit: 21000 },
  { date: "พุธ", revenue: 38000, costs: 24000, netProfit: 14000 },
  { date: "พฤหัสบดี", revenue: 61000, costs: 35000, netProfit: 26000 },
  { date: "ศุกร์", revenue: 72000, costs: 42000, netProfit: 30000 },
  { date: "เสาร์", revenue: 85000, costs: 48000, netProfit: 37000 },
  { date: "อาทิตย์", revenue: 78000, costs: 45000, netProfit: 33000 },
];

export default function BudgetPage() {
  const [budgets] = useState(mockBudgets);
  const [profits] = useState(mockProfits);
  const totalBudget = budgets.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const weeklyProfit = profits.reduce((acc, p) => acc + p.netProfit, 0);
  const weeklyRevenue = profits.reduce((acc, p) => acc + p.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">งบประมาณ</h1>
          <p className="text-muted-foreground">จัดการงบประมาณและติดตามกำไร</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />ตั้งงบประมาณใหม่</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">งบประมาณรวม</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">฿{totalBudget.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ใช้ไปแล้ว</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{totalSpent.toLocaleString()}</div>
            <Progress value={(totalSpent / totalBudget) * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">รายได้สัปดาห์นี้</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">฿{weeklyRevenue.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">กำไรสุทธิสัปดาห์นี้</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-500">฿{weeklyProfit.toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>งบประมาณตามหมวดหมู่</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หมวดหมู่</TableHead>
                  <TableHead className="text-right">งบประมาณ</TableHead>
                  <TableHead className="text-right">ใช้ไป</TableHead>
                  <TableHead className="text-right">เหลือ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">{budget.purpose}</TableCell>
                    <TableCell className="text-right">฿{budget.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">฿{budget.spent.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-500">฿{(budget.amount - budget.spent).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>กำไรรายวัน (7 วันล่าสุด)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัน</TableHead>
                  <TableHead className="text-right">รายได้</TableHead>
                  <TableHead className="text-right">ต้นทุน</TableHead>
                  <TableHead className="text-right">กำไรสุทธิ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profits.map((profit, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{profit.date}</TableCell>
                    <TableCell className="text-right">฿{profit.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-500">฿{profit.costs.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-green-500">฿{profit.netProfit.toLocaleString()}</TableCell>
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
