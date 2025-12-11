"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Edit, Package, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreateProduct, setOpenCreateProduct] = useState(false);
  const [openEditProduct, setOpenEditProduct] = useState(false);
  const [openManageTypes, setOpenManageTypes] = useState(false);
  const [openEditType, setOpenEditType] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    productType: 1,
    costPrice: 0,
    quantity: 0,
    minStockLevel: 10,
  });

  const [newType, setNewType] = useState({
    typeNumber: 5,
    typeName: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, typesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/product-types"),
      ]);

      setProducts(await productsRes.json());
      setProductTypes(await typesRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async () => {
    try {
      const selectedType = productTypes.find(
        (type) => type.typeNumber === newProduct.productType
      );

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          productTypeName: selectedType?.typeName,
        }),
      });

      if (!response.ok) throw new Error("Failed to create");

      toast({ title: "สร้างสินค้าสำเร็จ" });
      setOpenCreateProduct(false);
      setNewProduct({
        name: "",
        category: "",
        productType: 1,
        costPrice: 0,
        quantity: 0,
        minStockLevel: 10,
      });
      fetchData();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const createProductType = async () => {
    try {
      const response = await fetch("/api/product-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType),
      });

      if (!response.ok) throw new Error("Failed to create");

      toast({ title: "เพิ่มประเภทสินค้าสำเร็จ" });
      setNewType({ typeNumber: productTypes.length + 1, typeName: "" });
      fetchData();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const updateProductType = async () => {
    try {
      const response = await fetch("/api/product-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingType),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast({ title: "อัพเดทสำเร็จ" });
      setOpenEditType(false);
      setEditingType(null);
      fetchData();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    try {
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct),
      });

      if (!response.ok) throw new Error("Failed to update");

      toast({ title: "✅ อัพเดทสินค้าสำเร็จ" });
      setOpenEditProduct(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการลบสินค้า "${name}"?`)) return;

    try {
      const response = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast({ title: "✅ ลบสินค้าสำเร็จ" });
      fetchData();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink">จัดการสินค้า</h1>
          <p className="text-gray-400 mt-1">
            สร้างและจัดการสินค้า รวมถึงประเภทสินค้าสำหรับ LINE
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenManageTypes(true)} variant="outline">
            จัดการประเภทสินค้า LINE
          </Button>
          <Button onClick={() => setOpenCreateProduct(true)}>
            <Plus className="w-4 h-4 mr-2" />
            สร้างสินค้าใหม่
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ประเภทสินค้า (สำหรับ LINE)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {productTypes.map((type) => (
              <Card
                key={type.id}
                className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="bg-purple-500">ประเภท {type.typeNumber}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingType(type);
                        setOpenEditType(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="font-semibold text-white">{type.typeName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    LINE: "{type.typeNumber} [จำนวน] [ราคา]"
                  </p>
                </CardContent>
              </Card>
            ))}

            <Card
              className="border-dashed border-2 border-gray-600 cursor-pointer hover:border-purple-500 transition-colors"
              onClick={() => setOpenManageTypes(true)}
            >
              <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
                <Plus className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-400">เพิ่มประเภทใหม่</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้าทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="text-sm text-gray-400">
                      หมวดหมู่: {product.category || "-"} | ประเภท: {product.productType}
                      {product.productTypeName ? ` - ${product.productTypeName}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">ต้นทุน</p>
                    <p className="font-bold text-white">฿{product.costPrice}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">สต็อก</p>
                    <p className="font-bold text-white">{product.quantity}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingProduct({ ...product });
                        setOpenEditProduct(true);
                      }}
                      className="border-purple-400 text-purple-200"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProduct(product.id, product.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openCreateProduct} onOpenChange={setOpenCreateProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>สร้างสินค้าใหม่</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ชื่อสินค้า</Label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="เช่น: ครีมนวด Premium"
              />
            </div>

            <div>
              <Label>หมวดหมู่</Label>
              <Input
                value={newProduct.category}
                onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                placeholder="เช่น: สกินแคร์"
              />
            </div>

            <div>
              <Label>รหัสประเภทสินค้า (สำหรับ LINE)</Label>
              <select
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
                value={newProduct.productType}
                onChange={(e) => setNewProduct({ ...newProduct, productType: parseInt(e.target.value) })}
              >
                {productTypes.map((type) => (
                  <option key={type.id} value={type.typeNumber}>
                    {type.typeNumber} - {type.typeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ต้นทุน (บาท)</Label>
                <Input
                  type="number"
                  value={newProduct.costPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, costPrice: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>จำนวนเริ่มต้น</Label>
                <Input
                  type="number"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>สต็อกขั้นต่ำ</Label>
              <Input
                type="number"
                value={newProduct.minStockLevel}
                onChange={(e) => setNewProduct({ ...newProduct, minStockLevel: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={createProduct}>สร้างสินค้า</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openManageTypes} onOpenChange={setOpenManageTypes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>จัดการประเภทสินค้า LINE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>หมายเลขประเภท</Label>
                      <Input
                        type="number"
                        value={newType.typeNumber}
                        onChange={(e) => setNewType({ ...newType, typeNumber: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>ชื่อประเภท</Label>
                      <Input
                        value={newType.typeName}
                        onChange={(e) => setNewType({ ...newType, typeName: e.target.value })}
                        placeholder="เช่น: ครีมนวด"
                      />
                    </div>
                  </div>
                  <Button onClick={createProductType} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มประเภทใหม่
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {productTypes.map((type) => (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">
                      ประเภท {type.typeNumber}: {type.typeName}
                    </p>
                    <p className="text-xs text-gray-400">
                      LINE command: "{type.typeNumber} [จำนวน] [ราคา]"
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingType(type);
                      setOpenManageTypes(false);
                      setOpenEditType(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditType} onOpenChange={setOpenEditType}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขประเภทสินค้า</DialogTitle>
          </DialogHeader>
          {editingType && (
            <div className="space-y-4">
              <div>
                <Label>หมายเลขประเภท</Label>
                <Input
                  type="number"
                  value={editingType.typeNumber}
                  disabled
                  className="bg-gray-800"
                />
              </div>
              <div>
                <Label>ชื่อประเภท</Label>
                <Input
                  value={editingType.typeName}
                  onChange={(e) =>
                    setEditingType({ ...editingType, typeName: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={updateProductType}>บันทึก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEditProduct} onOpenChange={setOpenEditProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขสินค้า</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label>ชื่อสินค้า</Label>
                <Input
                  value={editingProduct.name}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>หมวดหมู่</Label>
                <Input
                  value={editingProduct.category || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, category: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ต้นทุน (บาท)</Label>
                  <Input
                    type="number"
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        costPrice: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>จำนวนในสต็อก</Label>
                  <Input
                    type="number"
                    value={editingProduct.quantity}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        quantity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>สต็อกขั้นต่ำ</Label>
                <Input
                  type="number"
                  value={editingProduct.minStockLevel}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      minStockLevel: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdateProduct}>บันทึกการแก้ไข</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
