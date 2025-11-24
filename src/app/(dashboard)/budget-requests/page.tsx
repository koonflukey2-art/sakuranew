"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { TableSkeleton } from "@/components/loading-states";
import { ErrorState } from "@/components/empty-states";

interface BudgetRequest {
  id: string;
  purpose: string;
  amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
    email?: string;
  };
}

export default function BudgetRequestsPage() {
  const [requests, setRequests] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    purpose: "",
    amount: 0,
    reason: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/budget-requests");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setRequests(data || []);
    } catch (error) {
      setError("ไม่สามารถโหลดข้อมูลได้");
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถโหลดคำขอได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.purpose || !formData.amount || !formData.reason) {
      toast({
        title: "กรุณากรอกข้อมูลให้ครบ",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/budget-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.error || "Failed to create");

      toast({
        title: "สำเร็จ!",
        description: "ส่งคำของบประมาณเรียบร้อยแล้ว",
      });

      setIsDialogOpen(false);
      setFormData({ purpose: "", amount: 0, reason: "" });
      fetchRequests();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถส่งคำขอได้",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const response = await fetch(`/api/budget-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to review");

      toast({
        title: "สำเร็จ!",
        description: `${status === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"}คำขอเรียบร้อยแล้ว`,
      });

      fetchRequests();
    } catch (error) {
      toast({
        title: "ผิดพลาด",
        description: "ไม่สามารถดำเนินการได้",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> รอพิจารณา</Badge>;
      case "APPROVED":
        return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> อนุมัติ</Badge>;
      case "REJECTED":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> ปฏิเสธ</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Budget Requests</h1>
          <p className="text-slate-400 mt-1">คำของบประมาณ</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          ขอเพิ่มงบประมาณ
        </Button>
      </div>

      {/* Loading State */}
      {loading && <TableSkeleton />}

      {/* Error State */}
      {error && !loading && (
        <ErrorState message={error} onRetry={fetchRequests} />
      )}

      {/* Requests Table */}
      {!loading && !error && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">คำขอทั้งหมด</CardTitle>
            <CardDescription className="text-slate-400">
              รายการคำของบประมาณทั้งหมด
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>ยังไม่มีคำของบประมาณ</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-300">วัตถุประสงค์</TableHead>
                    <TableHead className="text-slate-300">จำนวน</TableHead>
                    <TableHead className="text-slate-300">ผู้ขอ</TableHead>
                    <TableHead className="text-slate-300">สถานะ</TableHead>
                    <TableHead className="text-slate-300">วันที่</TableHead>
                    <TableHead className="text-right text-slate-300">จัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-white">
                        <div>
                          <div className="font-medium">{request.purpose}</div>
                          <div className="text-sm text-slate-400">
                            {request.reason}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        ฿{request.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div>
                          <div>{request.requestedBy.name}</div>
                          <div className="text-xs text-slate-500">
                            {request.requestedBy.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-slate-300">
                        {new Date(request.createdAt).toLocaleDateString("th-TH")}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "PENDING" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleReview(request.id, "APPROVED")}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              อนุมัติ
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReview(request.id, "REJECTED")}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              ปฏิเสธ
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ขอเพิ่มงบประมาณ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>วัตถุประสงค์</Label>
              <Input
                value={formData.purpose}
                onChange={(e) =>
                  setFormData({ ...formData, purpose: e.target.value })
                }
                placeholder="เช่น งบประมาณโฆษณา Facebook"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>จำนวนเงิน (บาท)</Label>
              <Input
                type="number"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
                disabled={submitting}
              />
            </div>

            <div>
              <Label>เหตุผล</Label>
              <Textarea
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="อธิบายเหตุผลในการขอเพิ่มงบประมาณ..."
                rows={4}
                disabled={submitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                ส่งคำขอ
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
