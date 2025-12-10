"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Upload, Check, QrCode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Revenue {
  id: string;
  platform: string;
  amount: number;
  scannedAt: string;
  notes?: string;
}

export default function QRScannerPage() {
  const { toast } = useToast();
  const [platform, setPlatform] = useState<string>("FACEBOOK");
  const [scannedAmount, setScannedAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRevenues();
  }, []);

  const fetchRevenues = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ad-revenue");
      if (res.ok) {
        const data = await res.json();
        setRevenues(data);
      }
    } catch (error) {
      console.error("Failed to fetch revenues:", error);
    } finally {
      setLoading(false);
    }
  };

  // Start camera for scanning
  const startCamera = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      toast({
        title: "กล้องเปิดแล้ว",
        description: "สแกน QR Code เพื่อดึงข้อมูลยอดเงิน",
      });
    } catch (error) {
      console.error("Camera error:", error);
      toast({
        title: "ไม่สามารถเปิดกล้องได้",
        description: "กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์",
        variant: "destructive",
      });
      setScanning(false);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    setScanning(false);
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({
      title: "อัพโหลดรูปสำเร็จ",
      description: "กรุณากรอกยอดเงินที่ได้รับ",
    });

    // In a real implementation, you would use a QR code library like jsqr
    // to extract the amount from the image
  };

  // Save revenue to database
  const saveRevenue = async () => {
    if (!scannedAmount || parseFloat(scannedAmount) <= 0) {
      toast({
        title: "กรุณากรอกยอดเงิน",
        description: "ยอดเงินต้องมากกว่า 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/ad-revenue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          amount: parseFloat(scannedAmount),
          notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast({
        title: "✅ บันทึกสำเร็จ",
        description: `บันทึกรายได้ ${parseFloat(scannedAmount).toLocaleString()} บาท จาก ${platform}`,
      });

      setScannedAmount("");
      setNotes("");
      stopCamera();
      fetchRevenues();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Calculate totals
  const getTotalByPlatform = (platformName: string) => {
    return revenues
      .filter((r) => r.platform === platformName)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const platforms = ["FACEBOOK", "TIKTOK", "LAZADA", "SHOPEE"];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gradient-pink mb-2">
          สแกน QR Code - รายได้จากโฆษณา
        </h1>
        <p className="text-gray-300">
          สแกน QR Code หรืออัพโหลดรูปเพื่อบันทึกรายได้จากแพลตฟอร์มต่างๆ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <QrCode className="w-5 h-5 text-purple-400" />
              สแกน QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Platform selector */}
            <div>
              <Label className="text-gray-200">แพลตฟอร์มโฆษณา</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="TIKTOK">TikTok</SelectItem>
                  <SelectItem value="LAZADA">Lazada</SelectItem>
                  <SelectItem value="SHOPEE">Shopee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Camera button (mobile) */}
            <div className="block md:hidden">
              <Button
                onClick={scanning ? stopCamera : startCamera}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                {scanning ? "หยุดสแกน" : "เปิดกล้องสแกน"}
              </Button>
            </div>

            {/* Upload button (desktop) */}
            <div className="hidden md:block">
              <label
                htmlFor="qr-upload"
                className="cursor-pointer block border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-purple-500 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-300">
                  คลิกเพื่ออัพโหลดรูป QR Code
                </p>
              </label>
              <input
                ref={fileInputRef}
                id="qr-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Video preview */}
            {scanning && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-purple-500 rounded-lg"></div>
                </div>
              </div>
            )}

            {/* Manual input form */}
            <div className="space-y-4 mt-6 pt-6 border-t border-slate-600">
              <div>
                <Label className="text-gray-200">ยอดเงิน (฿)</Label>
                <Input
                  type="number"
                  value={scannedAmount}
                  onChange={(e) => setScannedAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  step="0.01"
                  min="0"
                />
              </div>

              <div>
                <Label className="text-gray-200">หมายเหตุ (ถ้ามี)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เพิ่มหมายเหตุ..."
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                  rows={3}
                />
              </div>

              <Button
                onClick={saveRevenue}
                disabled={saving || !scannedAmount}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    บันทึกรายได้
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              สรุปรายได้แยกตามแพลตฟอร์ม
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {platforms.map((platformName) => {
                  const total = getTotalByPlatform(platformName);
                  const count = revenues.filter(
                    (r) => r.platform === platformName
                  ).length;

                  return (
                    <div
                      key={platformName}
                      className="flex justify-between items-center p-4 bg-slate-700 rounded-lg border border-slate-600"
                    >
                      <div>
                        <span className="font-medium text-white">
                          {platformName}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {count} รายการ
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-green-400">
                        ฿{total.toLocaleString()}
                      </span>
                    </div>
                  );
                })}

                <div className="pt-4 mt-4 border-t border-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">
                      รวมทั้งหมด
                    </span>
                    <span className="text-3xl font-bold text-green-400">
                      ฿
                      {revenues
                        .reduce((sum, r) => sum + r.amount, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Revenues */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">รายการล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : revenues.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <QrCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีรายการบันทึก</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {revenues.slice(0, 10).map((rev) => (
                <div
                  key={rev.id}
                  className="flex justify-between items-center p-3 bg-slate-700 rounded-lg border border-slate-600"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {rev.platform}
                      </span>
                      <span className="text-xl font-bold text-green-400">
                        ฿{rev.amount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(rev.scannedAt).toLocaleString("th-TH")}
                    </p>
                    {rev.notes && (
                      <p className="text-sm text-gray-300 mt-1">{rev.notes}</p>
                    )}
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
