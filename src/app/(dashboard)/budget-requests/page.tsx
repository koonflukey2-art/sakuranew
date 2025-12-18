"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2, Check, X, Clock, DollarSign } from "lucide-react";
import { getUserRole, hasPermission } from "@/lib/rbac-core";

interface BudgetRequestItem {
  name: string;
  amount: number;
  quantity: number;
  notes: string;
}

interface BudgetRequest {
  id: string;
  title: string;
  description: string;
  amount: number;
  reason: string;
  requesterName: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  items: BudgetRequestItem[];
  createdAt: string;
  approvedAt?: string;
  rejectedReason?: string;
}

export default function BudgetRequestsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Get user role from Clerk metadata or default to EMPLOYEE
  const userRole = (user?.publicMetadata?.role as string) || "EMPLOYEE";
  const isAdmin = userRole === "ADMIN";
  const canAccessBudget = hasPermission(userRole as any, "canAccessBudget");

  // Create request form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<BudgetRequestItem[]>([
    { name: "", amount: 0, quantity: 1, notes: "" },
  ]);

  // Approval dialog
  const [approvingRequest, setApprovingRequest] = useState<BudgetRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<BudgetRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchRequests();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/budget-requests");
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch budget requests:", error);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount * item.quantity, 0);
  };

  const addItem = () => {
    setItems([...items, { name: "", amount: 0, quantity: 1, notes: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof BudgetRequestItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleCreateRequest = async () => {
    if (!title.trim() || !reason.trim()) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        variant: "destructive",
      });
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && i.amount > 0);
    if (validItems.length === 0) {
      toast({
        title: "กรุณาระบุรายการขอเงินอย่างน้อย 1 รายการ",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/budget-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          reason,
          items: validItems,
        }),
      });

      if (!response.ok) throw new Error("Failed to create request");

      toast({
        title: "✅ ส่งคำขอเรียบร้อย",
        description: "รอแอดมินอนุมัติ",
      });

      // Reset form
      setTitle("");
      setDescription("");
      setReason("");
      setItems([{ name: "", amount: 0, quantity: 1, notes: "" }]);
      setCreateDialogOpen(false);

      fetchRequests();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingRequest) return;

    try {
      setLoading(true);

      const response = await fetch(
        `/api/budget-requests/${approvingRequest.id}/approve`,
        { method: "POST" }
      );

      if (!response.ok) throw new Error("Failed to approve");

      toast({
        title: "✅ อนุมัติคำขอแล้ว",
        description: "งบถูกเพิ่มเข้าระบบแล้ว",
      });

      setApprovingRequest(null);
      fetchRequests();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest || !rejectReason.trim()) {
      toast({
        title: "กรุณาระบุเหตุผลที่ปฏิเสธ",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `/api/budget-requests/${rejectingRequest.id}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: rejectReason }),
        }
      );

      if (!response.ok) throw new Error("Failed to reject");

      toast({
        title: "ปฏิเสธคำขอแล้ว",
      });

      setRejectingRequest(null);
      setRejectReason("");
      fetchRequests();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const approvedRequests = requests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = requests.filter((r) => r.status === "REJECTED");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
            คำขออนุมัติงบประมาณ
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "อนุมัติคำขอของบจากพนักงาน"
              : "ขอเงินงบประมาณจากแอดมิน"}
          </p>
        </div>

        {!canAccessBudget && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            ขอเงินงบ
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-yellow-300">
              รออนุมัติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {pendingRequests.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-300">
              อนุมัติแล้ว
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {approvedRequests.length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-red-300">ปฏิเสธ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {rejectedRequests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>คำขอที่รออนุมัติ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="bg-yellow-500/5">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {request.title}
                          </h3>
                          <Badge className="bg-yellow-500">
                            <Clock className="w-3 h-3 mr-1" />
                            รออนุมัติ
                          </Badge>
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {request.description}
                          </p>
                        )}
                        {request.reason && (
                          <p className="text-sm mb-2">
                            <strong>เหตุผล:</strong> {request.reason}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          ขอโดย: {request.requesterName} •{" "}
                          {new Date(request.createdAt).toLocaleString("th-TH")}
                        </p>

                        {/* Items */}
                        {request.items && request.items.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {request.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between p-2 bg-muted/50 rounded text-sm"
                              >
                                <span>
                                  {item.name} {item.notes && `(${item.notes})`}
                                </span>
                                <span className="font-semibold">
                                  ฿{item.amount.toLocaleString()} × {item.quantity} =
                                  ฿{(item.amount * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 text-lg font-bold text-green-500">
                          ยอดรวม: ฿{request.amount.toLocaleString()}
                        </div>
                      </div>

                      {/* Actions (Admin Only) */}
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setApprovingRequest(request)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            อนุมัติ
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectingRequest(request)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            ปฏิเสธ
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved & Rejected Requests */}
      {(approvedRequests.length > 0 || rejectedRequests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>ประวัติคำขอ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...approvedRequests, ...rejectedRequests].map((request) => (
                <Card
                  key={request.id}
                  className={
                    request.status === "APPROVED"
                      ? "bg-green-500/5"
                      : "bg-red-500/5"
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{request.title}</h3>
                          <Badge
                            className={
                              request.status === "APPROVED"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }
                          >
                            {request.status === "APPROVED" ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                อนุมัติ
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                ปฏิเสธ
                              </>
                            )}
                          </Badge>
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground">
                            {request.description}
                          </p>
                        )}
                        <p className="text-sm font-semibold mt-2">
                          ฿{request.amount.toLocaleString()}
                        </p>
                        {request.rejectedReason && (
                          <p className="text-sm text-red-400 mt-2">
                            เหตุผล: {request.rejectedReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Request Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ขอเงินงบประมาณ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>หัวข้อคำขอ *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น ค่ากล่องพัสดุประจำเดือน"
              />
            </div>

            <div>
              <Label>รายละเอียด</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                rows={3}
              />
            </div>

            <div>
              <Label>เหตุผลที่ขอ *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="อธิบายว่าทำไมต้องการเงินงบนี้"
                rows={3}
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>รายการค่าใช้จ่าย *</Label>
                <Button size="sm" onClick={addItem} variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  เพิ่มรายการ
                </Button>
              </div>

              {items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <Label className="text-xs">ชื่อรายการ</Label>
                        <Input
                          value={item.name}
                          onChange={(e) =>
                            updateItem(index, "name", e.target.value)
                          }
                          placeholder="ค่ากล่อง"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs">ราคา/หน่วย</Label>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "amount",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">จำนวน</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 1
                            )
                          }
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">หมายเหตุ</Label>
                        <Input
                          value={item.notes}
                          onChange={(e) =>
                            updateItem(index, "notes", e.target.value)
                          }
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2 text-right text-sm">
                      รวม: ฿{(item.amount * item.quantity).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total */}
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">ยอดรวมทั้งหมด:</span>
                  <span className="text-2xl font-bold text-green-400">
                    ฿{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateRequest}
                disabled={loading}
                className="flex-1"
              >
                ส่งคำขอ
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <AlertDialog
        open={!!approvingRequest}
        onOpenChange={() => setApprovingRequest(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการอนุมัติ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการอนุมัติคำขอนี้ใช่หรือไม่?
              <br />
              <br />
              <div className="bg-muted p-3 rounded space-y-1">
                <p>
                  <strong>หัวข้อ:</strong> {approvingRequest?.title}
                </p>
                <p>
                  <strong>จำนวนเงิน:</strong> ฿
                  {approvingRequest?.amount.toLocaleString()}
                </p>
                <p>
                  <strong>ขอโดย:</strong> {approvingRequest?.requesterName}
                </p>
              </div>
              <br />
              งบจะถูกเพิ่มเข้าระบบโดยอัตโนมัติ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700"
            >
              อนุมัติ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog
        open={!!rejectingRequest}
        onOpenChange={() => {
          setRejectingRequest(null);
          setRejectReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ปฏิเสธคำขอ</AlertDialogTitle>
            <AlertDialogDescription>
              กรุณาระบุเหตุผลที่ปฏิเสธ:
              <div className="mt-4">
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="เหตุผล..."
                  rows={4}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-red-600">
              ปฏิเสธ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
