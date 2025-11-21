"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Package, AlertTriangle } from "lucide-react";

const mockProducts = [
  { id: "1", name: "ยาสีฟัน Colgate", category: "ดูแลช่องปาก", quantity: 150, minStockLevel: 20, costPrice: 45, sellPrice: 89 },
  { id: "2", name: "สบู่เหลว Dove", category: "ดูแลผิว", quantity: 8, minStockLevel: 30, costPrice: 120, sellPrice: 179 },
  { id: "3", name: "แชมพู Pantene", category: "ดูแลผม", quantity: 100, minStockLevel: 15, costPrice: 150, sellPrice: 249 },
  { id: "4", name: "โลชั่น Vaseline", category: "ดูแลผิว", quantity: 5, minStockLevel: 20, costPrice: 200, sellPrice: 329 },
  { id: "5", name: "เจลล้างมือ Lifebuoy", category: "ดูแลสุขภาพ", quantity: 300, minStockLevel: 50, costPrice: 35, sellPrice: 59 },
];

export default function StockPage() {
  const [search, setSearch] = useState("");
  const [products] = useState(mockProducts);
  const filteredProducts = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const lowStockCount = products.filter((p) => p.quantity < p.minStockLevel).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการสินค้า</h1>
          <p className="text-muted-foreground">จัดการสต็อกและสินค้าคงคลัง</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />เพิ่มสินค้า</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>เพิ่มสินค้าใหม่</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>ชื่อสินค้า</Label><Input placeholder="กรอกชื่อสินค้า" /></div>
              <div className="space-y-2"><Label>หมวดหมู่</Label><Input placeholder="กรอกหมวดหมู่" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>ราคาทุน</Label><Input type="number" placeholder="0" /></div>
                <div className="space-y-2"><Label>ราคาขาย</Label><Input type="number" placeholder="0" /></div>
              </div>
              <Button className="w-full">บันทึก</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สินค้าทั้งหมด</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สินค้าใกล้หมด</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-500">{lowStockCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">มูลค่าสินค้าคงคลัง</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">฿{products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0).toLocaleString()}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ค้นหาสินค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อสินค้า</TableHead>
                <TableHead>หมวดหมู่</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
                <TableHead className="text-right">ราคาทุน</TableHead>
                <TableHead className="text-right">ราคาขาย</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell className="text-right">{product.quantity}</TableCell>
                  <TableCell className="text-right">฿{product.costPrice}</TableCell>
                  <TableCell className="text-right">฿{product.sellPrice}</TableCell>
                  <TableCell>
                    {product.quantity < product.minStockLevel ? <Badge variant="destructive">สต็อกต่ำ</Badge> : <Badge variant="secondary">ปกติ</Badge>}
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
