"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileImage,
  DollarSign,
  TrendingUp,
  Loader2,
  Check,
  X,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface Receipt {
  id: string;
  receiptNumber: string;
  platform: string;
  amount: number;
  paidAt: string;
  receiptUrl: string;
  qrCodeData: string;
  isProcessed: boolean;
  campaign?: {
    campaignName: string;
  };
}

export default function UploadReceiptPage() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await fetch("/api/ads/receipts");
      if (response.ok) {
        const data = await response.json();
        setReceipts(data.receipts || []);
        setTotalAmount(data.totalAmount || 0);
        setTotalProfit(data.totalProfit || 0);
      }
    } catch (error) {
      console.error("Failed to fetch receipts:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาอัพโหลดไฟล์รูปภาพเท่านั้น",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาอัพโหลดไฟล์ขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "กรุณาเลือกไฟล์",
        description: "กรุณาเลือกรูปภาพสลิปที่ต้องการอัพโหลด",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Create form data
      const formData = new FormData();
      formData.append("receipt", selectedFile);
      formData.append("platform", "META_ADS");

      // Upload receipt
      const response = await fetch("/api/ads/receipts/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      toast({
        title: "✅ อัพโหลดสำเร็จ",
        description: `อ่านยอดเงินได้ ฿${data.amount.toLocaleString()}`,
      });

      // Reset form
      setSelectedFile(null);
      setPreviewUrl("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh receipts list
      fetchReceipts();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพโหลดสลิปได้",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
          อัพโหลดสลิปโฆษณา
        </h1>
        <p className="text-muted-foreground mt-1">
          อัพโหลดสลิปการจ่ายเงินโฆษณาจาก Meta Ads / Facebook Ads
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 border-blue-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-300">
              <FileImage className="w-4 h-4" />
              จำนวนสลิป
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {receipts.length}
            </div>
            <p className="text-xs text-blue-300 mt-1">
              ทั้งหมดในระบบ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900/30 to-green-950/30 border-green-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-green-300">
              <DollarSign className="w-4 h-4" />
              ยอดเงินทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ฿{totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-green-300 mt-1">
              จากการอัพโหลดสลิป
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border-purple-500/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-purple-300">
              <TrendingUp className="w-4 h-4" />
              กำไรจากแคมเปญ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              ฿{totalProfit.toLocaleString()}
            </div>
            <p className="text-xs text-purple-300 mt-1">
              จากการยิงโฆษณา
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>อัพโหลดสลิปใหม่</CardTitle>
          <CardDescription>
            รองรับไฟล์ภาพ JPG, PNG (ขนาดไม่เกิน 5MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <Label>เลือกรูปภาพสลิป</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-1"
              />
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">ตัวอย่าง:</p>
                <div className="relative w-full max-w-md mx-auto">
                  <Image
                    src={previewUrl}
                    alt="Receipt preview"
                    width={400}
                    height={600}
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  กำลังอัพโหลดและอ่านข้อมูล...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  อัพโหลดสลิป
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              ระบบจะอ่าน QR Code และข้อมูลจากสลิปอัตโนมัติ
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Receipts History */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการอัพโหลด</CardTitle>
          <CardDescription>
            รายการสลิปที่อัพโหลดทั้งหมด
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <div className="text-center py-12">
              <FileImage className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                ยังไม่มีประวัติการอัพโหลด
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
                      {receipt.receiptUrl && (
                        <Image
                          src={receipt.receiptUrl}
                          alt="Receipt"
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold">
                        {receipt.receiptNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(receipt.paidAt).toLocaleDateString("th-TH")}
                      </p>
                      {receipt.campaign && (
                        <p className="text-xs text-purple-400 mt-1">
                          {receipt.campaign.campaignName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        ฿{receipt.amount.toLocaleString()}
                      </p>
                      <Badge
                        className={
                          receipt.isProcessed
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }
                      >
                        {receipt.isProcessed ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            ประมวลผลแล้ว
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            รอประมวลผล
                          </>
                        )}
                      </Badge>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        window.open(receipt.receiptUrl, "_blank")
                      }
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
