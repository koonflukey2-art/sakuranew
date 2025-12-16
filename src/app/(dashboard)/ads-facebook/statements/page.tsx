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
import { Badge } from "@/components/ui/badge";
import { Upload, Eye, FileText, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Statement {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vat: number;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export default function FacebookAdsStatementsPage() {
  const { toast } = useToast();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingStatement, setViewingStatement] = useState<Statement | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

      const data = await response.json();

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

  const totalAmount = statements.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalVAT = statements.reduce((sum, s) => sum + s.vat, 0);

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

      {/* Summary Cards */}
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
              ยอดรวมทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-green-300 mt-1">รวม VAT</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-purple-300">
              VAT รวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              ฿{totalVAT.toLocaleString()}
            </div>
            <p className="text-xs text-purple-300 mt-1">ภาษีมูลค่าเพิ่ม</p>
          </CardContent>
        </Card>
      </div>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการสเตทเมนต์ทั้งหมด</CardTitle>
          <CardDescription>
            สเตทเมนต์ค่าโฆษณาจาก Meta Ads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              กำลังโหลดข้อมูล...
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                ยังไม่มีสเตทเมนต์
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                คลิก "อัพโหลดสเตทเมนต์" เพื่อเพิ่มไฟล์
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รอบบิล</TableHead>
                  <TableHead>ยอดเรียกเก็บ</TableHead>
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
                        ฿{statement.totalAmount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      ฿{statement.vat.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{statement.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(statement.createdAt).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
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
                          onClick={() => window.open(statement.fileUrl, "_blank")}
                        >
                          <Download className="w-4 h-4" />
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
            <DialogTitle>
              สเตทเมนต์ - {viewingStatement?.period}
            </DialogTitle>
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
    </div>
  );
}
