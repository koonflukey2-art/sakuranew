"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Calculator, TrendingUp } from "lucide-react";

const products = [
  { id: "1", name: "ยาสีฟัน Colgate", costPrice: 45, sellPrice: 89 },
  { id: "2", name: "สบู่เหลว Dove", costPrice: 120, sellPrice: 179 },
  { id: "3", name: "แชมพู Pantene", costPrice: 150, sellPrice: 249 },
  { id: "4", name: "โลชั่น Vaseline", costPrice: 200, sellPrice: 329 },
  { id: "5", name: "เจลล้างมือ Lifebuoy", costPrice: 35, sellPrice: 59 },
];

const profitByProduct = [
  { name: "ยาสีฟัน Colgate", profit: 22000, color: "#10b981" },
  { name: "สบู่เหลว Dove", profit: 17700, color: "#3b82f6" },
  { name: "แชมพู Pantene", profit: 14850, color: "#8b5cf6" },
  { name: "โลชั่น Vaseline", profit: 12900, color: "#f59e0b" },
  { name: "เจลล้างมือ Lifebuoy", profit: 7200, color: "#ef4444" },
];

export default function ProfitPage() {
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [quantity, setQuantity] = useState(100);
  const [adCost, setAdCost] = useState(5000);

  const product = products.find((p) => p.id === selectedProduct.id) || products[0];
  const revenue = product.sellPrice * quantity;
  const cost = product.costPrice * quantity;
  const grossProfit = revenue - cost;
  const netProfit = grossProfit - adCost;
  const margin = (netProfit / revenue) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">คำนวณกำไร</h1>
        <p className="text-muted-foreground">คำนวณกำไรจากการขายสินค้า</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Calculator */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              เครื่องคำนวณกำไร
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกสินค้า</Label>
              <Select value={selectedProduct.id} onValueChange={(v) => setSelectedProduct(products.find((p) => p.id === v) || products[0])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ราคาทุน</Label>
                <div className="text-2xl font-bold">฿{product.costPrice}</div>
              </div>
              <div className="space-y-2">
                <Label>ราคาขาย</Label>
                <div className="text-2xl font-bold">฿{product.sellPrice}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>กำไรต่อชิ้น</Label>
              <div className="text-2xl font-bold text-emerald-600">฿{product.sellPrice - product.costPrice}</div>
            </div>

            <div className="space-y-2">
              <Label>จำนวนที่ขาย</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>ค่าโฆษณา</Label>
              <Input type="number" value={adCost} onChange={(e) => setAdCost(Number(e.target.value))} />
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between">
                <span>รายได้</span>
                <span className="font-bold text-green-600">฿{revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>ต้นทุนสินค้า</span>
                <span className="font-bold text-red-600">-฿{cost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>ค่าโฆษณา</span>
                <span className="font-bold text-red-600">-฿{adCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg border-t pt-2">
                <span className="font-bold">กำไรสุทธิ</span>
                <span className={`font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  ฿{netProfit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Margin</span>
                <span className={`font-bold ${margin >= 20 ? "text-emerald-600" : "text-orange-500"}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profit Pie Chart */}
        <Card>
          <CardHeader><CardTitle>สัดส่วนกำไรแต่ละสินค้า</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={profitByProduct} cx="50%" cy="50%" outerRadius={120} dataKey="profit" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {profitByProduct.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`฿${value.toLocaleString()}`, "กำไร"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Profit Summary Table */}
      <Card>
        <CardHeader><CardTitle>สรุปกำไรต่อสินค้า</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>สินค้า</TableHead>
                <TableHead className="text-right">ราคาทุน</TableHead>
                <TableHead className="text-right">ราคาขาย</TableHead>
                <TableHead className="text-right">กำไร/ชิ้น</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">฿{p.costPrice}</TableCell>
                  <TableCell className="text-right">฿{p.sellPrice}</TableCell>
                  <TableCell className="text-right text-emerald-600">฿{p.sellPrice - p.costPrice}</TableCell>
                  <TableCell className="text-right">{(((p.sellPrice - p.costPrice) / p.sellPrice) * 100).toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
