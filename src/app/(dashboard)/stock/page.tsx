"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Package, AlertTriangle, Pencil, Trash2, Loader2, TrendingUp, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToExcel } from "@/lib/export";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productSchema, ProductFormData } from "@/lib/validations";
import { ProductsPageSkeleton, ButtonLoading } from "@/components/loading-states";
import { EmptyProducts, ErrorState } from "@/components/empty-states";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExportButton } from "@/components/export-button";
import { fetchWithErrorHandling, handleAPIError } from "@/lib/error-handler";

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  costPrice: number;
  sellPrice: number;
}

export default function StockPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Add Product Form
  const addForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "Skincare",
      quantity: 0,
      minStockLevel: 10,
      costPrice: 0,
      sellPrice: 0,
      description: "",
    },
  });

  // Edit Product Form
  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "Skincare",
      quantity: 0,
      minStockLevel: 10,
      costPrice: 0,
      sellPrice: 0,
      description: "",
    },
  });

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithErrorHandling<Product[]>("/api/products");
      setProducts(data);
    } catch (error) {
      setError("ไม่สามารถโหลดข้อมูลสินค้าได้");
      handleAPIError(error, "ไม่สามารถโหลดข้อมูลสินค้าได้");
    } finally {
      setLoading(false);
    }
  };

  // Create product
  const handleCreate = async (data: ProductFormData) => {
    try {
      setSubmitting(true);
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create product");

      toast({
        title: "สำเร็จ",
        description: "เพิ่มสินค้าเรียบร้อยแล้ว",
      });

      addForm.reset();
      setOpenAddDialog(false);
      fetchProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มสินค้าได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update product
  const handleUpdate = async (data: ProductFormData) => {
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      const response = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: selectedProduct.id }),
      });

      if (!response.ok) throw new Error("Failed to update product");

      toast({
        title: "สำเร็จ",
        description: "แก้ไขสินค้าเรียบร้อยแล้ว",
      });

      editForm.reset();
      setOpenEditDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขสินค้าได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete product
  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/products?id=${selectedProduct.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete product");

      toast({
        title: "สำเร็จ",
        description: "ลบสินค้าเรียบร้อยแล้ว",
      });

      setOpenDeleteDialog(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบสินค้าได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      setBulkDeleting(true);
      await Promise.all(
        selectedIds.map(id =>
          fetch(`/api/products?id=${id}`, { method: "DELETE" })
        )
      );

      toast({
        title: "สำเร็จ!",
        description: `ลบสินค้า ${selectedIds.length} รายการเรียบร้อยแล้ว`,
      });
      setSelectedIds([]);
      fetchProducts();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถลบสินค้าได้",
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkExport = () => {
    const selectedProducts = products.filter(p => selectedIds.includes(p.id));

    if (selectedProducts.length === 0) {
      toast({
        title: "กรุณาเลือกสินค้า",
        description: "เลือกสินค้าที่ต้องการ export อย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    const data = selectedProducts.map(p => ({
      ชื่อสินค้า: p.name,
      หมวดหมู่: p.category,
      จำนวน: p.quantity,
      ราคาทุน: p.costPrice,
      ราคาขาย: p.sellPrice,
      กำไร: p.sellPrice - p.costPrice,
    }));

    exportToExcel(data, `selected-products-${selectedIds.length}`);

    toast({
      title: "สำเร็จ!",
      description: `Export ${selectedIds.length} รายการเรียบร้อยแล้ว`,
    });
  };

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({
      name: product.name,
      category: product.category as "Skincare" | "Makeup" | "Haircare" | "Supplement" | "Fashion" | "Other",
      quantity: product.quantity,
      minStockLevel: product.minStockLevel,
      costPrice: product.costPrice,
      sellPrice: product.sellPrice,
      description: "",
    });
    setOpenEditDialog(true);
  };

  const openDelete = (product: Product) => {
    setSelectedProduct(product);
    setOpenDeleteDialog(true);
  };

  // Filter products
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const lowStockCount = products.filter((p) => p.quantity < p.minStockLevel).length;
  const totalValue = products.reduce((acc, p) => acc + p.costPrice * p.quantity, 0);

  // Prepare chart data (group by category)
  const chartData = products.reduce((acc: any[], product) => {
    const existing = acc.find((item) => item.category === product.category);
    if (existing) {
      existing.quantity += product.quantity;
      existing.value += product.costPrice * product.quantity;
    } else {
      acc.push({
        category: product.category,
        quantity: product.quantity,
        value: product.costPrice * product.quantity,
      });
    }
    return acc;
  }, []);

  if (loading) {
    return <ProductsPageSkeleton />;
  }

  if (error && !loading) {
    return <ErrorState message={error} onRetry={fetchProducts} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Stock Management</h1>
          <p className="text-slate-400 mt-1">
            จัดการสินค้าและสต็อก
            {selectedIds.length > 0 && ` • เลือกแล้ว ${selectedIds.length} รายการ`}
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleBulkExport}
                disabled={bulkDeleting}
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                ลบ ({selectedIds.length})
              </Button>
            </>
          )}
          {products.length > 0 && (
            <ExportButton
              data={products.map(p => ({
                ชื่อสินค้า: p.name,
                หมวดหมู่: p.category,
                จำนวน: p.quantity,
                ระดับต่ำสุด: p.minStockLevel,
                ราคาทุน: p.costPrice,
                ราคาขาย: p.sellPrice,
                กำไร: p.sellPrice - p.costPrice,
              }))}
              filename="stock-report"
              pdfColumns={[
                { header: "ชื่อสินค้า", dataKey: "ชื่อสินค้า" },
                { header: "หมวดหมู่", dataKey: "หมวดหมู่" },
                { header: "จำนวน", dataKey: "จำนวน" },
                { header: "ราคาทุน", dataKey: "ราคาทุน" },
                { header: "ราคาขาย", dataKey: "ราคาขาย" },
              ]}
              pdfTitle="รายงานสต็อกสินค้า"
            />
          )}
          <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => addForm.reset()}>
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มสินค้า
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มสินค้าใหม่</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(handleCreate)} className="space-y-4 py-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชื่อสินค้า</FormLabel>
                      <FormControl>
                        <Input placeholder="กรอกชื่อสินค้า" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>หมวดหมู่</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="เลือกหมวดหมู่" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Skincare">Skincare</SelectItem>
                          <SelectItem value="Makeup">Makeup</SelectItem>
                          <SelectItem value="Haircare">Haircare</SelectItem>
                          <SelectItem value="Supplement">Supplement</SelectItem>
                          <SelectItem value="Fashion">Fashion</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>จำนวน</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>สต็อกขั้นต่ำ</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ราคาทุน</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="sellPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ราคาขาย</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenAddDialog(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <ButtonLoading /> : "บันทึก"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สินค้าทั้งหมด</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">สินค้าใกล้หมด</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{lowStockCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">มูลค่าสินค้าคงคลัง</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{totalValue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>สต็อกตามหมวดหมู่</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity" fill="#10b981" name="จำนวน" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      {products.length === 0 ? (
        <EmptyProducts onAdd={() => setOpenAddDialog(true)} />
      ) : (
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาสินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-slate-300">ชื่อสินค้า</TableHead>
                  <TableHead className="text-slate-300">หมวดหมู่</TableHead>
                  <TableHead className="text-right text-slate-300">จำนวน</TableHead>
                  <TableHead className="text-right text-slate-300">ราคาทุน</TableHead>
                  <TableHead className="text-right text-slate-300">ราคาขาย</TableHead>
                  <TableHead className="text-slate-300">สถานะ</TableHead>
                  <TableHead className="text-right text-slate-300">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      ไม่พบสินค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const profit = product.sellPrice - product.costPrice;
                    const profitPercent = ((profit / product.costPrice) * 100).toFixed(1);
                    const isLowStock = product.quantity < product.minStockLevel;

                    return (
                      <TableRow key={product.id} className={selectedIds.includes(product.id) ? "bg-slate-700/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">฿{product.costPrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right">฿{product.sellPrice.toLocaleString()}</TableCell>
                        <TableCell>
                          {product.quantity < product.minStockLevel ? (
                            <Badge variant="destructive">สต็อกต่ำ</Badge>
                          ) : product.quantity < product.minStockLevel * 1.5 ? (
                            <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
                              ใกล้หมด
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                              ปกติ
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDelete(product)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขสินค้า</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อสินค้า</FormLabel>
                    <FormControl>
                      <Input placeholder="กรอกชื่อสินค้า" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หมวดหมู่</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกหมวดหมู่" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Skincare">Skincare</SelectItem>
                        <SelectItem value="Makeup">Makeup</SelectItem>
                        <SelectItem value="Haircare">Haircare</SelectItem>
                        <SelectItem value="Supplement">Supplement</SelectItem>
                        <SelectItem value="Fashion">Fashion</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>จำนวน</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>สต็อกขั้นต่ำ</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ราคาทุน</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sellPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ราคาขาย</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpenEditDialog(false)}>
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <ButtonLoading /> : "บันทึก"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="ยืนยันการลบ"
        description={`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${selectedProduct?.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
        onConfirm={handleDelete}
        confirmText="ลบ"
        cancelText="ยกเลิก"
        variant="destructive"
        loading={submitting}
      />
    </div>
  );
}
