"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, AlertTriangle, Settings, Link } from "lucide-react";

export default function WorkflowsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
      <div className="p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">n8n Workflow Generator</h1>
          <p className="text-gray-600 mt-2">สร้าง Workflow JSON สำหรับ n8n โดยอัตโนมัติ 🔄</p>
        </div>

        <Card className="bg-white border border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-xl font-bold text-gray-800">เลือก Template</CardTitle>
            <CardDescription className="text-gray-600">เลือก Workflow Template ที่ต้องการ</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Card className="bg-cyan-50 border-2 border-cyan-200 hover:border-cyan-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Profit Pilot Automation</h3>
                      <p className="text-sm text-gray-700 mt-1">ตรวจสอบ CPA และหยุดโฆษณาอัตโนมัติเมื่อเกิน</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-purple-500 text-white border-0 text-xs">Profit Optimization</Badge>
                        <Badge className="bg-blue-500 text-white border-0 text-xs">Facebook Ads</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-2 border-orange-200 hover:border-orange-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Low Stock Alert</h3>
                      <p className="text-sm text-gray-700 mt-1">แจ้งเตือนเมื่อสินค้าใกล้หมด</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-orange-500 text-white border-0 text-xs">Inventory</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center">
                      <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">Custom Workflow</h3>
                      <p className="text-sm text-gray-700 mt-1">สร้าง Workflow ของคุณเอง</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Link className="w-5 h-5" />
              Webhook URL Generator
            </CardTitle>
            <CardDescription className="text-gray-600">
              กำหนด URL ของ n8n instance และสร้าง webhook URL
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">n8n Instance URL</label>
                <Input
                  placeholder="https://your-n8n-instance.com"
                  className="bg-white border-2 border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 rounded-xl"
                />
              </div>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md w-full rounded-xl font-semibold">
                สร้าง Webhook URL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
