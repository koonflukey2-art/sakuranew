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
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Statement {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number; // รวม VAT
  vat: number;
  fileUrl: string;
  fileName: string;
  source?: string;
  createdAt: string;
}

export default function FacebookAdsStatementsPage() {
  const { toast } = useToast();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStatement, setViewingStatement] = useState<Statement | null>(
    null
  );
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // สำหรับลบ
  const [statementToDelete, setStatementToDelete] =
    useState<Statement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/facebook-ads/statements");

      if (response.ok) {
        const data = await response.json();
        setStatements(data.statements || []);
      }
    } catch (error) {
      console.error("Failed to fetch statements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาอัพโหลดไฟล์ PDF เท่านั้น",
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
      formData.append("statement", selectedFile);

      const response = await fetch("/api/facebook-ads/statements", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      await response.json();

      toast({
        title: "✅ อัพโหลดสำเร็จ",
        description: "อัพโหลดสเตทเมนต์แล้ว",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      fetchStatements();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพโหลดไฟล์ได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!statementToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(
        `/api/facebook-ads/statements?id=${statementToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }

      toast({
        title: "✅ ลบสเตตเมนต์สำเร็จ",
      });

      setStatementToDelete(null);
      fetchStatements();
    } catch (error: any) {
      console.error(error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถลบสเตตเมนต์ได้",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // ====== รวมยอดต่าง ๆ ======
  const totalBeforeVAT = statements.reduce(
    (sum, s) => sum + (s.totalAmount - s.vat),
    0
  );
  const totalVAT = statements.reduce((sum, s) => sum + s.vat, 0);
  const totalWithVAT = statements.reduce(
    (sum, s) => sum + s.totalAmount,
    0
  );

  const formatMoney = (value: number) =>
    value.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
                Facebook Ads Statements
              </h1>
              <p className="text-muted-foreground mt-1">
                ดูและจัดการสเตทเมนต์ค่าโฆษณา Facebook
              </p>
            </div>
          </div>
        </div>

        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          อัพโหลดสเตทเมนต์
        </Button>
      </div>

      {/* LINE Integration Info */}
      <Alert className="bg-purple-500/10 border-purple-500/30">
        <MessageSquare className="w-4 h-4" />
        <AlertDescription className="text-purple-200">
          <p className="font-semibold mb-2">💡 ส่งสเตทเมนต์ผ่าน LINE:</p>
          <p className="text-sm">
            คุณสามารถส่งไฟล์ PDF สเตทเมนต์จาก Meta Ads ผ่าน LINE Bot โดยตรง
            <br />
            ระบบจะอ่านและบันทึกข้อมูลอัตโนมัติ
          </p>
          <p className="text-xs mt-2 text-purple-300">
            ตั้งค่า LINE Bot ได้ที่: System Settings → LINE Ads
          </p>
        </AlertDescription>
      </Alert>

      {/* Summary Cards ด้านบน */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-300">
              จำนวนสเตทเมนต์
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {statements.length}
            </div>
            <p className="text-xs text-blue-300 mt-1">ทั้งหมดในระบบ</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-green-300">
              ยอดรวมสุทธิ (รวม VAT)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{formatMoney(totalWithVAT)}
            </div>
            <p className="text-xs text-green-300 mt-1">รวม VAT แล้ว</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-300">
              VAT รวมทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              ฿{formatMoney(totalVAT)}
            </div>
            <p className="text-xs text-purple-300 mt-1">ภาษีมูลค่าเพิ่มรวม</p>
          </CardContent>
        </Card>
      </div>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการสเตทเมนต์ทั้งหมด</CardTitle>
          <CardDescription>สเตทเมนต์ค่าโฆษณาจาก Meta Ads</CardDescription>
        </CardHeader>
        <CardContent>
          {/* แถบสรุปในส่วน "รายการสเตทเมนต์ทั้งหมด" */}
          {!loading && statements.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3 text-sm">
              <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/80">
                <p className="text-xs text-muted-foreground">
                  ยอดรวมก่อน VAT
                </p>
                <p className="font-semibold text-slate-50">
                  ฿{formatMoney(totalBeforeVAT)}
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/80">
                <p className="text-xs text-muted-foreground">VAT รวม</p>
                <p className="font-semibold text-purple-300">
                  ฿{formatMoney(totalVAT)}
                </p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/80">
                <p className="text-xs text-muted-foreground">
                  ยอดรวมสุทธิ (รวม VAT)
                </p>
                <p className="font-semibold text-green-400">
                  ฿{formatMoney(totalWithVAT)}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              กำลังโหลดข้อมูล...
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ยังไม่มีสเตทเมนต์</p>
              <p className="text-sm text-muted-foreground mt-2">
                คลิก "อัพโหลดสเตทเมนต์" เพื่อเพิ่มไฟล์
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รอบบิล</TableHead>
                  <TableHead>ยอดรวม (รวม VAT)</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>ไฟล์</TableHead>
                  <TableHead>วันที่อัพโหลด</TableHead>
                  <TableHead className="text-right">การจัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statements.map((statement) => (
                  <TableRow key={statement.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{statement.period}</p>
                        <p className="text-xs text-muted-foreground">
                          {statement.startDate} ถึง {statement.endDate}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-green-500">
                        ฿{statement.totalAmount.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      ฿{statement.vat.toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{statement.fileName}</span>
                        {statement.source === "LINE" && (
                          <Badge className="bg-green-500 ml-2">
                            <MessageSquare className="w-3 h-3 mr-1" />
                            LINE
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(statement.createdAt).toLocaleDateString(
                        "th-TH",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingStatement(statement)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          ดูไฟล์
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            window.open(statement.fileUrl, "_blank")
                          }
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setStatementToDelete(statement)}
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
            <DialogTitle>อัพโหลดสเตทเมนต์</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>เลือกไฟล์ PDF</Label>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  ไฟล์: {selectedFile.name}
                </p>
              )}
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

      {/* View PDF Dialog */}
      <Dialog
        open={!!viewingStatement}
        onOpenChange={() => setViewingStatement(null)}
      >
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>สเตทเมนต์ - {viewingStatement?.period}</DialogTitle>
          </DialogHeader>
          {viewingStatement && (
            <div className="flex-1 h-full">
              <iframe
                src={viewingStatement.fileUrl}
                className="w-full h-full rounded-lg"
                title="Statement PDF"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={!!statementToDelete}
        onOpenChange={(open) => {
          if (!open) setStatementToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบสเตทเมนต์นี้?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบสเตทเมนต์{" "}
              <span className="font-semibold">
                {statementToDelete?.fileName}
              </span>
              <br />
              การลบนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "กำลังลบ..." : "ลบสเตทเมนต์"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
