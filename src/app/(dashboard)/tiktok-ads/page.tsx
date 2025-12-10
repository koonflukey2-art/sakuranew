"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Music, Sparkles } from "lucide-react";
import Link from "next/link";

export default function TikTokAdsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <Music className="w-8 h-8 text-pink-500" />
            TikTok Ads Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-orange-950/40 border-orange-500/50">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <AlertDescription className="text-orange-100">
              <strong>Coming Soon! 🚧</strong>
            </AlertDescription>
          </Alert>

          <div className="text-gray-300 space-y-4">
            <p className="text-lg">
              ฟีเจอร์ยิงแอด TikTok อัตโนมัติกำลังอยู่ระหว่างการพัฒนา
            </p>

            <div className="bg-slate-700 rounded-lg p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">ฟีเจอร์ที่จะมาในเร็วๆ นี้:</h3>
              </div>
              <ul className="list-disc list-inside space-y-2 ml-8 text-gray-300">
                <li>เชื่อมต่อกับ TikTok Ads API</li>
                <li>สร้างและจัดการแคมเปญโฆษณาอัตโนมัติ</li>
                <li>AI Optimization สำหรับ Targeting</li>
                <li>วิเคราะห์ผลลัพธ์และ ROI</li>
                <li>Auto-scaling งบประมาณตามผลลัพธ์</li>
              </ul>
            </div>

            <p className="text-sm text-gray-400">
              ขณะนี้คุณสามารถใช้งาน{" "}
              <Link href="/facebook-ads" className="text-blue-400 underline">
                Facebook Ads Automation
              </Link>{" "}
              และ{" "}
              <Link href="/qr-scanner" className="text-purple-400 underline">
                QR Scanner
              </Link>{" "}
              เพื่อบันทึกรายได้จากแพลตฟอร์มต่างๆ
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/facebook-ads" className="flex-1">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                ไปยัง Facebook Ads
              </Button>
            </Link>
            <Link href="/qr-scanner" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-purple-400 text-purple-200 hover:bg-purple-500/10"
              >
                ไปยัง QR Scanner
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
