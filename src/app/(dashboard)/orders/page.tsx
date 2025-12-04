"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Edit,
  User,
  Phone,
  MapPin,
  Calendar,
  ShoppingCart,
} from "lucide-react";

interface Order {
  id: string;
  orderNumber?: string;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  productType?: number;
  productName?: string;
  amount: number;
  quantity: number;
  status: string;
  orderDate: string;
  notes?: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ใช้ "ALL" แทนค่ารวมทั้งหมด แก้ปัญหา value = ""
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("ALL");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    fetchUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, productTypeFilter]);

  const fetchUserRole = async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error("Failed to fetch user role:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      // ถ้าเป็น "ALL" ไม่ต้องส่งขึ้น API
      if (statusFilter && statusFilter !== "ALL") {
        params.append("status", statusFilter);
      }
      if (productTypeFilter && productTypeFilter !== "ALL") {
        params.append("productType", productTypeFilter);
      }

      const res = await fetch(`/api/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;

    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedOrder),
      });

      if (res.ok) {
        toast({
          title: "✅ บันทึกสำเร็จ",
          description: "อัพเดทข้อมูลออเดอร์แล้ว",
        });
        setEditDialogOpen(false);
        fetchOrders();
      } else {
        const error = await res.json();
        toast({
          title: "❌ ไม่สามารถบันทึกได้",
          description: error.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดทข้อมูลได้",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-500",
      CONFIRMED: "bg-blue-500",
      COMPLETED: "bg-green-500",
      CANCELLED: "bg-red-500",
    };
    const labels: Record<string, string> = {
      PENDING: "รอดำเนินการ",
      CONFIRMED: "ยืนยันแล้ว",
      COMPLETED: "สำเร็จ",
      CANCELLED: "ยกเลิก",
    };
    return <Badge className={colors[status]}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gradient-pink mb-2">รายการออเดอร์</h1>
        <p className="text-gray-400 text-lg">รายการออเดอร์จาก LINE Webhook</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>ค้นหา</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="เลขออเดอร์, ชื่อ, เบอร์โทร"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>สถานะ</Label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทั้งหมด</SelectItem>
                  <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
                  <SelectItem value="CONFIRMED">ยืนยันแล้ว</SelectItem>
                  <SelectItem value="COMPLETED">สำเร็จ</SelectItem>
                  <SelectItem value="CANCELLED">ยกเลิก</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ประเภทสินค้า</Label>
              <Select
                value={productTypeFilter}
                onValueChange={setProductTypeFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">ทั้งหมด</SelectItem>
                  <SelectItem value="1">สินค้าหมายเลข 1</SelectItem>
                  <SelectItem value="2">สินค้าหมายเลข 2</SelectItem>
                  <SelectItem value="3">สินค้าหมายเลข 3</SelectItem>
                  <SelectItem value="4">สินค้าหมายเลข 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">กำลังโหลด...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">ไม่พบรายการออเดอร์</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="border-2 border-gray-800 bg-gray-900 hover:border-purple-500 transition"
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    {/* Order Number & Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-purple-100 rounded-lg px-3 py-1">
                        <span className="text-sm font-bold text-purple-600">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      {getStatusBadge(order.status)}
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {order.productName || `สินค้าหมายเลข ${order.productType}`}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-100">
                        {order.quantity} ชิ้น
                      </Badge>
                    </div>

                    {/* Customer Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-white">{order.customer.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-green-500" />
                        <span className="text-gray-300">{order.customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-300">
                          {new Date(order.orderDate).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Address */}
                    {order.customer.address && (
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-gray-400 mb-1">ที่อยู่จัดส่ง</div>
                            <p className="text-sm text-white leading-relaxed">
                              {order.customer.address}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold text-green-400">
                          ฿{order.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {userRole === "ADMIN" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setEditDialogOpen(true);
                      }}
                      className="ml-4"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      แก้ไข
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog (ADMIN Only) */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              แก้ไขออเดอร์ #{selectedOrder?.orderNumber || selectedOrder?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label>สถานะ</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) =>
                    setSelectedOrder({ ...selectedOrder, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">รอดำเนินการ</SelectItem>
                    <SelectItem value="CONFIRMED">ยืนยันแล้ว</SelectItem>
                    <SelectItem value="COMPLETED">สำเร็จ</SelectItem>
                    <SelectItem value="CANCELLED">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>หมายเหตุ</Label>
                <Textarea
                  value={selectedOrder.notes || ""}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      notes: e.target.value,
                    })
                  }
                  placeholder="เพิ่มหมายเหตุ..."
                  rows={3}
                />
              </div>

              <Button onClick={handleUpdateOrder} className="w-full">
                บันทึก
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
