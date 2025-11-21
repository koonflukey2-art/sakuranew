"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, DollarSign, Users, MousePointer } from "lucide-react";

const mockCampaigns = [
  { id: "1", platform: "FACEBOOK", campaignName: "Summer Sale 2024", budget: 10000, spent: 7500, reach: 50000, clicks: 2500, roi: 2.5, status: "ACTIVE" },
  { id: "2", platform: "TIKTOK", campaignName: "Viral Product Launch", budget: 15000, spent: 12000, reach: 120000, clicks: 8000, roi: 3.2, status: "ACTIVE" },
  { id: "3", platform: "LAZADA", campaignName: "Flash Sale Weekend", budget: 8000, spent: 8000, reach: 30000, clicks: 1500, roi: 1.8, status: "COMPLETED" },
  { id: "4", platform: "SHOPEE", campaignName: "Monthly Deals", budget: 12000, spent: 5000, reach: 45000, clicks: 3000, roi: 2.8, status: "ACTIVE" },
];

const platformColors: Record<string, string> = { FACEBOOK: "bg-blue-500", TIKTOK: "bg-black", LAZADA: "bg-orange-500", SHOPEE: "bg-orange-600" };

export default function AdsPage() {
  const [campaigns] = useState(mockCampaigns);
  const totalSpent = campaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalReach = campaigns.reduce((acc, c) => acc + c.reach, 0);
  const avgRoi = campaigns.reduce((acc, c) => acc + c.roi, 0) / campaigns.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการโฆษณา</h1>
          <p className="text-muted-foreground">ติดตามประสิทธิภาพแคมเปญโฆษณา</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />สร้างแคมเปญ</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ใช้จ่ายทั้งหมด</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">฿{totalSpent.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">การเข้าถึง</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{(totalReach / 1000).toFixed(0)}K</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">คลิกทั้งหมด</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{campaigns.reduce((acc, c) => acc + c.clicks, 0).toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ROI เฉลี่ย</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{avgRoi.toFixed(1)}x</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>แคมเปญทั้งหมด</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>แพลตฟอร์ม</TableHead>
                <TableHead>ชื่อแคมเปญ</TableHead>
                <TableHead>งบประมาณ</TableHead>
                <TableHead>ใช้ไป</TableHead>
                <TableHead>การเข้าถึง</TableHead>
                <TableHead>ROI</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell><Badge className={platformColors[campaign.platform]}>{campaign.platform}</Badge></TableCell>
                  <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                  <TableCell>฿{campaign.budget.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span>฿{campaign.spent.toLocaleString()}</span>
                      <Progress value={(campaign.spent / campaign.budget) * 100} className="h-1" />
                    </div>
                  </TableCell>
                  <TableCell>{(campaign.reach / 1000).toFixed(0)}K</TableCell>
                  <TableCell><span className={campaign.roi >= 2 ? "text-green-500" : "text-orange-500"}>{campaign.roi}x</span></TableCell>
                  <TableCell><Badge variant={campaign.status === "ACTIVE" ? "default" : "secondary"}>{campaign.status === "ACTIVE" ? "กำลังทำงาน" : "เสร็จสิ้น"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
