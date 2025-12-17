"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Upload,
  Eye,
  FileText,
  Download,
  ArrowLeft,
  Trash2,
  Receipt as ReceiptIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface Receipt {
  id: string;
  receiptNumber: string;
  platform: string;
  amount: number;
  currency: string;
  receiptUrl: string;
  qrCodeData: string | null;
  isProcessed: boolean;
  paidAt: string;
  campaign?: {
    campaignName: string;
  };
}

export default function UploadReceiptPage() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [receiptToDelete, setReceiptToDelete] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ads/receipts");

      if (response.ok) {
        const data = await response.json();
        setReceipts(data.receipts || []);
        setTotalAmount(data.totalAmount || 0);
      }
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น (JPG, PNG)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "กรุณาเลือกไฟล์",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("receipt", selectedFile);
      formData.append("platform", "META_ADS");

      const response = await fetch("/api/ads/receipts/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();

      if (data.needsManualAmount) {
        toast({
          title: "⚠️ ไม่สามารถอ่านจำนวนเงินได้",
          description:
            "ระบบไม่สามารถอ่านจำนวนเงินจากสลิปได้ กรุณาตรวจสอบและแก้ไข",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ อัพโหลดสำเร็จ",
          description: `อ่านจำนวนเงิน: ฿${data.amount?.toLocaleString()} (${data.detectMethod})`,
        });
      }

      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchReceipts();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถอัพโหลดไฟล์ได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!receiptToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/ads/receipts?id=${receiptToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }

      toast({
        title: "✅ ลบสลิปสำเร็จ",
      });

      setReceipts((prev) => prev.filter((r) => r.id !== receiptToDelete.id));
      setReceiptToDelete(null);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบสลิปได้",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/ads-facebook">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                อัพโหลดสลิปโฆษณา
              </h1>
              <p className="text-muted-foreground mt-1">
                อัพโหลดสลิปการจ่ายเงินค่าโฆษณา (รูปภาพ)
              </p>
            </div>
          </div>
        </div>

        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          อัพโหลดสลิป
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-300">
              จำนวนสลิปทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {receipts.length}
            </div>
            <p className="text-xs text-blue-300 mt-1">ใบเสร็จในระบบ</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-300">
              ยอดรวมทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-green-300 mt-1">รวมค่าโฆษณาทั้งหมด</p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการสลิปทั้งหมด</CardTitle>
          <CardDescription>
            สลิปการจ่ายเงินค่าโฆษณาที่อัพโหลดผ่านเว็บ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              กำลังโหลดข้อมูล...
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12">
              <ReceiptIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ยังไม่มีสลิป</p>
              <p className="text-sm text-muted-foreground mt-2">
                คลิก "อัพโหลดสลิป" เพื่อเพิ่มไฟล์
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขที่</TableHead>
                  <TableHead>แพลตฟอร์ม</TableHead>
                  <TableHead>จำนวนเงิน</TableHead>
                  <TableHead>วิธีการชำระ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ReceiptIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono text-sm">
                          {receipt.receiptNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{receipt.platform}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-green-500">
                        ฿{receipt.amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          receipt.qrCodeData ? "default" : "secondary"
                        }
                      >
                        {receipt.qrCodeData ? "QR Code" : "ธนาคาร"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(receipt.paidAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={receipt.isProcessed ? "default" : "secondary"}
                      >
                        {receipt.isProcessed ? "ประมวลผลแล้ว" : "รอดำเนินการ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingReceipt(receipt)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          ดู
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            window.open(receipt.receiptUrl, "_blank")
                          }
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setReceiptToDelete(receipt)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          ลบ
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>อัพโหลดสลิปโฆษณา</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>เลือกไฟล์รูปภาพ (JPG, PNG)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  ไฟล์: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <p className="font-semibold mb-2">💡 เคล็ดลับ:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>ถ่ายรูปให้ชัดเจน ไม่มัว</li>
                <li>แสงสว่างเพียงพอ</li>
                <li>ให้เห็น QR Code และจำนวนเงินชัดเจน</li>
                <li>ระบบจะอ่านข้อมูลอัตโนมัติ</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1"
              >
                {uploading ? "กำลังอัพโหลด..." : "อัพโหลด"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadDialogOpen(false);
                  setSelectedFile(null);
                }}
                className="flex-1"
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog */}
      <Dialog
        open={!!viewingReceipt}
        onOpenChange={() => setViewingReceipt(null)}
      >
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              สลิป - {viewingReceipt?.receiptNumber}
            </DialogTitle>
          </DialogHeader>
          {viewingReceipt && (
            <div className="flex-1 h-full">
              <img
                src={viewingReceipt.receiptUrl}
                alt="Receipt"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={!!receiptToDelete}
        onOpenChange={(open) => {
          if (!open) setReceiptToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบสลิปนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบสลิป{" "}
              <span className="font-semibold">
                {receiptToDelete?.receiptNumber}
              </span>
              <br />
              การลบนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "กำลังลบ..." : "ลบสลิป"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
