"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Pencil,
  Trash2,
  Loader2,
  TrendingUp,
  Download,
  RefreshCw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { exportToExcel } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productSchema, ProductFormData } from "@/lib/validations";
import {
  ProductsPageSkeleton,
  ButtonLoading,
} from "@/components/loading-states";
import { EmptyProducts, ErrorState } from "@/components/empty-states";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ExportButton } from "@/components/export-button";
import {
  fetchWithErrorHandling,
  handleAPIError,
} from "@/lib/error-handler";

interface Product {
  id: string;
  name: string;
  category: string;
  productType?: number | null;
  quantity: number;
  minStockLevel: number;
  costPrice: number;
  sellPrice?: number | null; // Optional - price comes from LINE orders
}

// key ของช่วงเวลา
type TimeRangeKey = "3d" | "7d" | "1m" | "3m" | "1y";

const getRangeLabel = (range: TimeRangeKey) => {
  switch (range) {
    case "3d":
      return "3 วันล่าสุด";
    case "7d":
      return "7 วันล่าสุด";
    case "1m":
      return "1 เดือนล่าสุด";
    case "3m":
      return "3 เดือนล่าสุด";
    case "1y":
      return "1 ปีล่าสุด";
  }
};

const getRangeShortLabel = (range: TimeRangeKey) => {
  switch (range) {
    case "3d":
      return "3 วัน";
    case "7d":
      return "7 วัน";
    case "1m":
      return "1 เดือน";
    case "3m":
      return "3 เดือน";
    case "1y":
      return "1 ปี";
  }
};

// แปลง key → from/to เป็น ISO string
const getDateRange = (range: TimeRangeKey) => {
  const now = new Date();
  const from = new Date(now);

  switch (range) {
    case "3d":
      from.setDate(now.getDate() - 3);
      break;
    case "7d":
      from.setDate(now.getDate() - 7);
      break;
    case "1m":
      from.setMonth(now.getMonth() - 1);
      break;
    case "3m":
      from.setMonth(now.getMonth() - 3);
      break;
    case "1y":
      from.setFullYear(now.getFullYear() - 1);
      break;
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
};

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

  // ช่วงเวลาที่เลือกสำหรับ stats (default 7 วัน)
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("7d");

  const [orderStats, setOrderStats] = useState({
    today: {
      revenue: 0,
      orders: 0,
      byType: {} as Record<string, { count: number; revenue: number }>,
    },
    week: {
      revenue: 0,
      orders: 0,
      byType: {} as Record<string, { count: number; revenue: number }>,
    },
  });

  // Add Product Form
  const addForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "Skincare",
      productType: undefined,
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
      productType: undefined,
      quantity: 0,
      minStockLevel: 10,
      costPrice: 0,
      sellPrice: 0,
      description: "",
    },
  });

  // โหลดสินค้า (ครั้งเดียวตอน mount)
  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // โหลดสถิติออเดอร์ตามช่วงเวลา
  useEffect(() => {
    fetchOrderStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

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

  const fetchOrderStats = async () => {
    try {
      const { from, to } = getDateRange(timeRange);
      const params = new URLSearchParams({ from, to });

      const res = await fetch(`/api/orders/stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // backend ควรคืน structure เดิม: { today, week } แต่ week = ตามช่วงเวลาที่เรา query
        setOrderStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch order stats:", error);
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
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      setBulkDeleting(true);
      await Promise.all(
        selectedIds.map((id) =>
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
    const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

    if (selectedProducts.length === 0) {
      toast({
        title: "กรุณาเลือกสินค้า",
        description: "เลือกสินค้าที่ต้องการ export อย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    const data = selectedProducts.map((p) => ({
      ชื่อสินค้า: p.name,
      หมวดหมู่: p.category,
      จำนวน: p.quantity,
      ราคาทุน: p.costPrice,
      รหัสประเภท: p.productType ?? "-",
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
      category: product.category as
        | "Skincare"
        | "Makeup"
        | "Haircare"
        | "Supplement"
        | "Fashion"
        | "Other",
      productType: product.productType ?? undefined,
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
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate stats
  const lowStockCount = products.filter(
    (p) => p.quantity < p.minStockLevel
  ).length;
  const totalValue = products.reduce(
    (acc, p) => acc + p.costPrice * p.quantity,
    0
  );

  if (loading) {
    return <ProductsPageSkeleton />;
  }

  if (error && !loading) {
    return <ErrorState message={error} onRetry={fetchProducts} />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header + Bulk actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
        <div>
          <h1 className="text-4xl font-bold text-gradient-pink mb-1">
            Stock Management
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            จัดการสินค้าและสต็อก
            {selectedIds.length > 0 && ` • เลือกแล้ว ${selectedIds.length} รายการ`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* ตัวเลือกช่วงเวลา */}
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value as TimeRangeKey)}
          >
            <SelectTrigger className="w-full sm:w-44 bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="ช่วงเวลา" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700 text-white">
              <SelectItem value="3d">3 วันล่าสุด</SelectItem>
              <SelectItem value="7d">7 วันล่าสุด</SelectItem>
              <SelectItem value="1m">1 เดือนล่าสุด</SelectItem>
              <SelectItem value="3m">3 เดือนล่าสุด</SelectItem>
              <SelectItem value="1y">1 ปีล่าสุด</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              fetchProducts();
              fetchOrderStats();
            }}
            className="gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4" />
            รีเฟรช
          </Button>

          {selectedIds.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleBulkExport}
                disabled={bulkDeleting}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export ({selectedIds.length})
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="w-full sm:w-auto"
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
              data={products.map((p) => ({
                ชื่อสินค้า: p.name,
                หมวดหมู่: p.category,
                รหัสประเภท: p.productType ?? "-",
                จำนวน: p.quantity,
                ระดับต่ำสุด: p.minStockLevel,
                ราคาทุน: p.costPrice,
              }))}
              filename="stock-report"
              pdfColumns={[
                { header: "ชื่อสินค้า", dataKey: "ชื่อสินค้า" },
                { header: "หมวดหมู่", dataKey: "หมวดหมู่" },
                { header: "รหัสประเภท", dataKey: "รหัสประเภท" },
                { header: "จำนวน", dataKey: "จำนวน" },
                { header: "ราคาทุน", dataKey: "ราคาทุน" },
              ]}
              pdfTitle="รายงานสต็อกสินค้า"
              className="w-full sm:w-auto"
            />
          )}

          <Dialog open={openAddDialog} onOpenChange={setOpenAddDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => addForm.reset()}
                className="w-full sm:w-auto bg-gradient-purple hover:opacity-90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มสินค้า
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>เพิ่มสินค้าใหม่</DialogTitle>
              </DialogHeader>
              <Form {...addForm}>
                <form
                  onSubmit={addForm.handleSubmit(handleCreate)}
                  className="space-y-4 py-4"
                >
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
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกหมวดหมู่" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Skincare">Skincare</SelectItem>
                            <SelectItem value="Makeup">Makeup</SelectItem>
                            <SelectItem value="Haircare">Haircare</SelectItem>
                            <SelectItem value="Supplement">
                              Supplement
                            </SelectItem>
                            <SelectItem value="Fashion">Fashion</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addForm.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>รหัสประเภทสินค้า (สำหรับ LINE)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                              <SelectValue placeholder="เลือกประเภทสินค้า" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            <SelectItem
                              value="1"
                              className="text-white hover:bg-gray-700"
                            >
                              สินค้าหมายเลข 1
                            </SelectItem>
                            <SelectItem
                              value="2"
                              className="text-white hover:bg-gray-700"
                            >
                              สินค้าหมายเลข 2
                            </SelectItem>
                            <SelectItem
                              value="3"
                              className="text-white hover:bg-gray-700"
                            >
                              สินค้าหมายเลข 3
                            </SelectItem>
                            <SelectItem
                              value="4"
                              className="text-white hover:bg-gray-700"
                            >
                              สินค้าหมายเลข 4
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 mt-1">
                          เมื่อส่งข้อความใน LINE ขึ้นต้นด้วยเลข 1-4
                          สต๊อกจะลดอัตโนมัติ
                        </p>
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
                  <FormField
                    control={addForm.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ราคาทุน (฿)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Note about pricing */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                      💡 <strong>หมายเหตุ:</strong> ราคาขายจะมาจากออเดอร์ที่รับผ่าน LINE อัตโนมัติ
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setOpenAddDialog(false)}
                    >
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
      </div>

      {/* Sales Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">
              รายได้วันนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              ฿{orderStats.today.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {orderStats.today.orders} ออเดอร์
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">
              รายได้ {getRangeLabel(timeRange)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              ฿{orderStats.week.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {orderStats.week.orders} ออเดอร์
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Product Type - TODAY */}
      {Object.keys(orderStats.today.byType).length === 0 ? (
        <Card className="mb-6 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700">
          <CardContent className="text-gray-400">
            ยังไม่มีข้อมูลยอดขายรายประเภทวันนี้
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(orderStats.today.byType).map(([type, data]) => (
            <Card
              key={type}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-300">
                  {`สินค้าหมายเลข ${type}`} (วันนี้)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-400">
                  ฿{data.revenue.toLocaleString()}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  ขายไป{" "}
                  <span className="text-white font-semibold">
                    {data.count}
                  </span>{" "}
                  ชิ้น
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product Type Performance (ช่วงเวลาที่เลือก) */}
      {Object.keys(orderStats.week.byType).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Object.entries(orderStats.week.byType).map(([type, data]) => (
            <Card
              key={type}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-purple-500 transition"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-400" />
                  {`สินค้าหมายเลข ${type}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">
                      ชนิด ({getRangeShortLabel(timeRange)})
                    </span>
                    <span className="text-lg font-bold text-white">
                      {data.count} ชิ้น
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">รายได้</span>
                    <span className="text-lg font-bold text-green-400">
                      ฿{data.revenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              สินค้าทั้งหมด
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              สินค้าใกล้หมด
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {lowStockCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              มูลค่าสินค้าคงคลัง
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

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
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredProducts.length > 0 &&
                          selectedIds.length === filteredProducts.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-slate-300">ชื่อสินค้า</TableHead>
                    <TableHead className="text-slate-300">หมวดหมู่</TableHead>
                    <TableHead className="text-right text-slate-300">
                      จำนวน
                    </TableHead>
                    <TableHead className="text-right text-slate-300">
                      ราคาทุน (฿)
                    </TableHead>
                    <TableHead className="text-slate-300">สถานะ</TableHead>
                    <TableHead className="text-right text-slate-300">
                      จัดการ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        ไม่พบสินค้า
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const isLowStock =
                        product.quantity < product.minStockLevel;

                      return (
                        <TableRow
                          key={product.id}
                          className={
                            selectedIds.includes(product.id)
                              ? "bg-slate-700/50"
                              : ""
                          }
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>{product.category}</TableCell>
                          <TableCell className="text-right">
                            {product.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            ฿{product.costPrice.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {isLowStock ? (
                              <Badge variant="destructive">สต็อกต่ำ</Badge>
                            ) : product.quantity <
                              product.minStockLevel * 1.5 ? (
                              <Badge
                                variant="secondary"
                                className="bg-orange-500/10 text-orange-500"
                              >
                                ใกล้หมด
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="bg-green-500/10 text-green-500"
                              >
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
            </div>
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
            <form
              onSubmit={editForm.handleSubmit(handleUpdate)}
              className="space-y-4 py-4"
            >
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกหมวดหมู่" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Skincare">Skincare</SelectItem>
                        <SelectItem value="Makeup">Makeup</SelectItem>
                        <SelectItem value="Haircare">Haircare</SelectItem>
                        <SelectItem value="Supplement">
                          Supplement
                        </SelectItem>
                        <SelectItem value="Fashion">Fashion</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสประเภทสินค้า (สำหรับ LINE)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="เลือกประเภทสินค้า" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem
                          value="1"
                          className="text-white hover:bg-gray-700"
                        >
                          สินค้าหมายเลข 1
                        </SelectItem>
                        <SelectItem
                          value="2"
                          className="text-white hover:bg-gray-700"
                        >
                          สินค้าหมายเลข 2
                        </SelectItem>
                        <SelectItem
                          value="3"
                          className="text-white hover:bg-gray-700"
                        >
                          สินค้าหมายเลข 3
                        </SelectItem>
                        <SelectItem
                          value="4"
                          className="text-white hover:bg-gray-700"
                        >
                          สินค้าหมายเลข 4
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      เมื่อส่งข้อความใน LINE ขึ้นต้นด้วยเลข 1-4
                      สต๊อกจะลดอัตโนมัติ
                    </p>
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
              <FormField
                control={editForm.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ราคาทุน (฿)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note about pricing */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  💡 <strong>หมายเหตุ:</strong> ราคาขายจะมาจากออเดอร์ที่รับผ่าน LINE อัตโนมัติ
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setOpenEditDialog(false)}
                >
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
