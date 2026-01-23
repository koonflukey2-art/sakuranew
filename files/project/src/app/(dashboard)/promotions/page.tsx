"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift, Edit, Trash2, Plus, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  costPrice: number;
}

interface Promotion {
  id: string;
  productId: string;
  name: string;
  description?: string | null;
  buyQuantity: number;
  freeQuantity: number;
  discountPercent?: number | null;
  discountAmount?: number | null;
  isActive: boolean;
}

export default function PromotionsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const [form, setForm] = useState({
    productId: "",
    name: "",
    description: "",
    buyQuantity: 5,
    freeQuantity: 1,
    discountPercent: "",
    discountAmount: "",
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, promotionsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/promotions"),
      ]);

      if (productsRes.ok) {
        setProducts(await productsRes.json());
      }
      if (promotionsRes.ok) {
        setPromotions(await promotionsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch promotions data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      productId: "",
      name: "",
      description: "",
      buyQuantity: 5,
      freeQuantity: 1,
      discountPercent: "",
      discountAmount: "",
      isActive: true,
    });
  };

  const createPromotion = async () => {
    try {
      const response = await fetch("/api/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("Failed to create promotion");

      toast({ title: "สร้างโปรโมชั่นสำเร็จ" });
      setOpenCreate(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const openEditDialog = (promotion: Promotion) => {
    setEditing(promotion);
    setForm({
      productId: promotion.productId,
      name: promotion.name,
      description: promotion.description || "",
      buyQuantity: promotion.buyQuantity,
      freeQuantity: promotion.freeQuantity,
      discountPercent: promotion.discountPercent?.toString() ?? "",
      discountAmount: promotion.discountAmount?.toString() ?? "",
      isActive: promotion.isActive,
    });
    setOpenEdit(true);
  };

  const updatePromotion = async () => {
    if (!editing) return;
    try {
      const response = await fetch("/api/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, ...form }),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast({ title: "อัพเดทสำเร็จ" });
      setOpenEdit(false);
      setEditing(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("ยืนยันการลบโปรโมชั่นนี้?")) return;

    try {
      const response = await fetch(`/api/promotions?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast({ title: "ลบสำเร็จ" });
      fetchData();
    } catch (error) {
      console.error(error);
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const calculateEffectiveCost = useMemo(
    () =>
      (product: Product | undefined, _promotion: Promotion | undefined) => {
        // ✅ โปรร้านแถมเอง: ต้นทุนต่อชิ้น “ไม่ลดลง”
        return product?.costPrice ?? 0;
      },
    []
  );

  const activePromotions = promotions.filter((p) => p.isActive);
  const inactivePromotions = promotions.filter((p) => !p.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink">โปรโมชั่น</h1>
          <p className="text-gray-400 mt-1">
            จัดการโปรโมชั่นสินค้าและคำนวณต้นทุนจริงจากดีล เช่น ซื้อ 5 แถม 1
          </p>
        </div>
        <Button onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          สร้างโปรโมชั่น
        </Button>
      </div>

      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Gift className="w-6 h-6 text-blue-400 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-300 mb-1">
                การคำนวณต้นทุนจากโปรโมชั่น
              </h3>
              <p className="text-sm text-blue-200">
                ตัวอย่าง "ซื้อ 2 แถม 1" = ลูกค้าจ่าย 2 ได้ 3 (ร้านเป็นคนแถมเอง)
              </p>
              <p className="text-sm text-blue-200 mt-1">
                ระบบจะคำนวณ “ต้นทุนของแถม” เพิ่มเข้าไปในหน้ากำไร/รายงาน
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> โปรโมชั่นที่ใช้งานอยู่
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePromotions.length === 0 ? (
            <p className="text-center text-gray-400 py-6">
              ยังไม่มีโปรโมชั่นที่เปิดใช้งาน
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePromotions.map((promotion) => {
                const product = products.find((p) => p.id === promotion.productId);
                const effectiveCost = calculateEffectiveCost(product, promotion);

// ✅ โปรร้านแถมเอง: ร้าน “เสียต้นทุนของแถม”
const freeCostPerDeal = product ? product.costPrice * promotion.freeQuantity : 0;
const extraCostPerPaidUnit = product
  ? (product.costPrice * promotion.freeQuantity) / Math.max(1, promotion.buyQuantity)
  : 0;
                const discountPercent = Number(promotion.discountPercent ?? 0);
                const discountAmount = Number(promotion.discountAmount ?? 0);

                return (
                  <Card
                    key={promotion.id}
                    className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40"
                  >
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{promotion.name}</p>
                            <p className="text-sm text-gray-300">{product?.name}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-500">เปิดใช้งาน</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm text-gray-300">
                        <div className="flex items-center justify-between">
                          <span>ซื้อ</span>
                          <span className="text-white font-semibold">
                            {promotion.buyQuantity} ชิ้น
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>แถม</span>
                          <span className="text-white font-semibold">
                            {promotion.freeQuantity} ชิ้น
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>ต้นทุนเดิม</span>
                          <span className="line-through">
                            ฿{product?.costPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>ต้นทุนจริง</span>
                          <span className="text-green-400 font-semibold">
                            ฿{effectiveCost.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between col-span-2">
                          <span>ต้นทุนของแถม/ชิ้นขาย</span>
                          <span className="text-green-300">
                            ฿{extraCostPerPaidUnit.toFixed(2)}
                          </span>
                        </div>
                        {(discountPercent > 0 || discountAmount > 0) && (
                          <div className="flex items-center justify-between col-span-2">
                            <span>ส่วนลดหน้าร้าน</span>
                            <span className="text-amber-300">
                              {discountPercent > 0 ? `${discountPercent}%` : "-"}{" "}
                              {discountAmount > 0
                                ? `+ ฿${discountAmount.toFixed(2)}`
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openEditDialog(promotion)}
                        >
                          <Edit className="w-4 h-4 mr-1" /> แก้ไข
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deletePromotion(promotion.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {inactivePromotions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>โปรโมชั่นที่ปิดใช้งาน</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactivePromotions.map((promotion) => {
                const product = products.find((p) => p.id === promotion.productId);
                return (
                  <div
                    key={promotion.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-white">{promotion.name}</p>
                      <p className="text-sm text-gray-400">
                        {product?.name} - ซื้อ {promotion.buyQuantity} แถม{" "}
                        {promotion.freeQuantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">ปิดใช้งาน</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(promotion)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>สร้างโปรโมชั่นใหม่</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Label>เลือกสินค้า</Label>

              {/* ✅ FIX: select/option ไม่ให้เป็นตัวหนังสือดำทับพื้นดำ */}
              <select
                className="w-full h-10 px-3 rounded-md bg-slate-900 text-slate-100 border border-slate-700
                           focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                <option
                  value=""
                  disabled
                  className="bg-slate-900 text-slate-100"
                >
                  -- เลือกสินค้า --
                </option>

                {products.map((product) => (
                  <option
                    key={product.id}
                    value={product.id}
                    className="bg-slate-900 text-slate-100"
                  >
                    {product.name} (ต้นทุน: ฿{product.costPrice})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>ชื่อโปรโมชั่น</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น ซื้อ 5 แถม 1"
              />
            </div>

            <div>
              <Label>รายละเอียด</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>จำนวนที่ซื้อ</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.buyQuantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      buyQuantity: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
              <div>
                <Label>จำนวนที่แถม</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.freeQuantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      freeQuantity: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ส่วนลด (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm({ ...form, discountPercent: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>ส่วนลดคงที่ (฿/ออเดอร์)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.discountAmount}
                  onChange={(e) =>
                    setForm({ ...form, discountAmount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <Label>เปิดใช้งานทันที</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
            </div>

            {form.productId && (
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-sm">ตัวอย่างการคำนวณ</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const product = products.find((p) => p.id === form.productId);
                    if (!product) return null;
                    const effectiveCost = product.costPrice;

// ✅ โปรร้านแถมเอง: ต้นทุนของแถม
const freeCostPerDeal = product.costPrice * form.freeQuantity;
const extraCostPerPaidUnit =
  freeCostPerDeal / Math.max(1, form.buyQuantity);
                    const discountPercent = Number(form.discountPercent || 0);
                    const discountAmount = Number(form.discountAmount || 0);

                    return (
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>สินค้า:</strong> {product.name}
                        </p>
                        <p>
                          <strong>ต้นทุนเดิม:</strong> ฿{product.costPrice.toFixed(2)} / ชิ้น
                        </p>
                        <p>
                          <strong>โปรโมชั่น:</strong> ซื้อ {form.buyQuantity} แถม {form.freeQuantity}
                        </p>
                        <p className="text-purple-300">
                          <strong>ต้นทุนจริง:</strong> ฿{effectiveCost.toFixed(2)} / ชิ้น
                        </p>
                        <p className="text-green-300">
                          <strong>ประหยัด:</strong> ฿{extraCostPerPaidUnit.toFixed(2)} / ชิ้น
                        </p>
                        {(discountPercent > 0 || discountAmount > 0) && (
                          <p className="text-amber-300">
                            <strong>ส่วนลดหน้าร้าน:</strong>{" "}
                            {discountPercent > 0 ? `${discountPercent}%` : "-"}
                            {discountAmount > 0
                              ? ` + ฿${discountAmount.toFixed(2)}`
                              : ""}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </DialogBody>
          <DialogFooter>
            <Button onClick={createPromotion} disabled={!form.productId}>
              สร้างโปรโมชั่น
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขโปรโมชั่น</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <Label>สินค้า</Label>
              <Input
                value={products.find((p) => p.id === form.productId)?.name || ""}
                disabled
                className="bg-gray-800"
              />
            </div>

            <div>
              <Label>ชื่อโปรโมชั่น</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>รายละเอียด</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>จำนวนที่ซื้อ</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.buyQuantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      buyQuantity: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
              <div>
                <Label>จำนวนที่แถม</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.freeQuantity}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      freeQuantity: parseInt(e.target.value, 10),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ส่วนลด (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent}
                  onChange={(e) =>
                    setForm({ ...form, discountPercent: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>ส่วนลดคงที่ (฿/ออเดอร์)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.discountAmount}
                  onChange={(e) =>
                    setForm({ ...form, discountAmount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <Label>เปิดใช้งาน</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={updatePromotion}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
