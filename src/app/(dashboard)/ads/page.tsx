"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingUp, DollarSign, Users, MousePointer, MoreVertical, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AdCampaign {
  id: string;
  platform: string;
  campaignName: string;
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  roi: number;
  status: string;
  startDate: string | Date;
  endDate?: string | Date | null;
}

const platformColors: Record<string, string> = {
  FACEBOOK: "bg-blue-500",
  TIKTOK: "bg-black",
  LAZADA: "bg-orange-500",
  SHOPEE: "bg-orange-600",
};

export default function AdsPage() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/campaigns");
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลแคมเปญได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Filter campaigns by platform
  const filteredCampaigns =
    selectedPlatform === "all"
      ? campaigns
      : campaigns.filter((c) => c.platform === selectedPlatform);

  // Calculate statistics
  const totalBudget = filteredCampaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = filteredCampaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalReach = filteredCampaigns.reduce((sum, c) => sum + c.reach, 0);
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0);
  const avgROI =
    filteredCampaigns.length > 0
      ? filteredCampaigns.reduce((sum, c) => sum + c.roi, 0) / filteredCampaigns.length
      : 0;
  const activeCampaigns = filteredCampaigns.filter((c) => c.status === "ACTIVE").length;

  // Create campaign
  const handleCreateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      platform: formData.get("platform") as string,
      campaignName: formData.get("campaignName") as string,
      budget: parseFloat(formData.get("budget") as string),
      spent: parseFloat(formData.get("spent") as string) || 0,
      reach: parseInt(formData.get("reach") as string) || 0,
      clicks: parseInt(formData.get("clicks") as string) || 0,
      conversions: parseInt(formData.get("conversions") as string) || 0,
      roi: parseFloat(formData.get("roi") as string) || 0,
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string || null,
      status: "ACTIVE",
    };

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create campaign");
      }

      toast({
        title: "สำเร็จ!",
        description: "สร้างแคมเปญใหม่แล้ว",
      });

      // Reset form ก่อนปิด Dialog
      e.currentTarget.reset();

      // ปิด Dialog
      setIsCreateOpen(false);

      // Refresh data
      fetchCampaigns();
    } catch (error: any) {
      console.error("Create campaign error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message || "ไม่สามารถสร้างแคมเปญได้",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  // Edit campaign
  const handleEdit = (campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setIsEditOpen(true);
  };

  const handleUpdateCampaign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    const formData = new FormData(e.currentTarget);
    const data = {
      id: selectedCampaign.id,
      platform: formData.get("platform") as string,
      campaignName: formData.get("campaignName") as string,
      budget: parseFloat(formData.get("budget") as string),
      spent: parseFloat(formData.get("spent") as string),
      reach: parseInt(formData.get("reach") as string),
      clicks: parseInt(formData.get("clicks") as string),
      conversions: parseInt(formData.get("conversions") as string),
      roi: parseFloat(formData.get("roi") as string),
      status: formData.get("status") as string,
      endDate: formData.get("endDate") as string || null,
    };

    try {
      const response = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update campaign");

      toast({
        title: "สำเร็จ!",
        description: "อัปเดตแคมเปญแล้ว",
      });

      // Reset form ก่อนปิด Dialog
      e.currentTarget.reset();

      // ปิด Dialog
      setIsEditOpen(false);
      setSelectedCampaign(null);

      // Refresh data
      fetchCampaigns();
    } catch (error) {
      console.error("Update campaign error:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปเดตแคมเปญได้",
        variant: "destructive",
      });
    }
  };

  // Delete campaign
  const handleDelete = (campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCampaign) return;

    try {
      const response = await fetch(`/api/campaigns?id=${selectedCampaign.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete campaign");

      toast({
        title: "สำเร็จ!",
        description: "ลบแคมเปญแล้ว",
      });

      setIsDeleteOpen(false);
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบแคมเปญได้",
        variant: "destructive",
      });
    }
  };

  // Toggle status (Pause/Resume)
  const handleToggleStatus = async (campaign: AdCampaign) => {
    try {
      const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

      const response = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaign.id,
          platform: campaign.platform,
          campaignName: campaign.campaignName,
          budget: campaign.budget,
          spent: campaign.spent,
          reach: campaign.reach,
          clicks: campaign.clicks,
          conversions: campaign.conversions,
          roi: campaign.roi,
          status: newStatus,
          endDate: campaign.endDate,
        }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: "สำเร็จ!",
        description: `${newStatus === "ACTIVE" ? "เปิด" : "หยุด"}แคมเปญแล้ว`,
      });

      fetchCampaigns();
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะได้",
        variant: "destructive",
      });
    }
  };

  // Format currency
  const formatCurrency = (value: number) => `฿${value.toLocaleString()}`;

  // Format number
  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">จัดการโฆษณา</h1>
          <p className="text-muted-foreground">ติดตามประสิทธิภาพแคมเปญโฆษณา</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          สร้างแคมเปญ
        </Button>
      </div>

      {/* Platform Tabs */}
      <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
        <TabsList>
          <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
          <TabsTrigger value="FACEBOOK">Facebook</TabsTrigger>
          <TabsTrigger value="TIKTOK">TikTok</TabsTrigger>
          <TabsTrigger value="SHOPEE">Shopee</TabsTrigger>
          <TabsTrigger value="LAZADA">Lazada</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">งบประมาณทั้งหมด</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ใช้ไป {formatCurrency(totalSpent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">การเข้าถึง</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalReach)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCampaigns} แคมเปญกำลังทำงาน
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">คลิกทั้งหมด</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalClicks)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              CTR: {totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(2) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ROI เฉลี่ย</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{avgROI.toFixed(1)}x</div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredCampaigns.length} แคมเปญ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>แคมเปญทั้งหมด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีแคมเปญ
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>ชื่อแคมเปญ</TableHead>
                  <TableHead>งบประมาณ</TableHead>
                  <TableHead>ใช้ไป</TableHead>
                  <TableHead>Reach</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Badge className={platformColors[campaign.platform]}>
                        {campaign.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                    <TableCell>{formatCurrency(campaign.budget)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <span>{formatCurrency(campaign.spent)}</span>
                        <Progress
                          value={(campaign.spent / campaign.budget) * 100}
                          className="h-1"
                        />
                      </div>
                    </TableCell>
                    <TableCell>{formatNumber(campaign.reach)}</TableCell>
                    <TableCell>{formatNumber(campaign.clicks)}</TableCell>
                    <TableCell>{formatNumber(campaign.conversions)}</TableCell>
                    <TableCell>
                      <Badge
                        className={campaign.roi > 0 ? "bg-green-500" : "bg-red-500"}
                      >
                        {campaign.roi.toFixed(2)}x
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          campaign.status === "ACTIVE"
                            ? "bg-green-500"
                            : campaign.status === "PAUSED"
                            ? "bg-yellow-500"
                            : "bg-gray-500"
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                            {campaign.status === "ACTIVE" ? "⏸️ หยุด" : "▶️ เปิด"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                            ✏️ แก้ไข
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(campaign)}
                            className="text-red-600"
                          >
                            🗑️ ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>สร้างแคมเปญใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลแคมเปญโฆษณา</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCampaign}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Platform *</Label>
                <Select name="platform" required>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือก Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                    <SelectItem value="TIKTOK">TikTok</SelectItem>
                    <SelectItem value="SHOPEE">Shopee</SelectItem>
                    <SelectItem value="LAZADA">Lazada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>ชื่อแคมเปญ *</Label>
                <Input name="campaignName" required />
              </div>

              <div>
                <Label>งบประมาณ (฿) *</Label>
                <Input name="budget" type="number" step="0.01" min="0" required />
              </div>

              <div>
                <Label>ใช้ไปแล้ว (฿)</Label>
                <Input name="spent" type="number" step="0.01" min="0" defaultValue={0} />
              </div>

              <div>
                <Label>วันเริ่ม *</Label>
                <Input name="startDate" type="date" required />
              </div>

              <div>
                <Label>วันสิ้นสุด</Label>
                <Input name="endDate" type="date" />
              </div>

              <div>
                <Label>Reach</Label>
                <Input name="reach" type="number" min="0" defaultValue={0} />
              </div>

              <div>
                <Label>Clicks</Label>
                <Input name="clicks" type="number" min="0" defaultValue={0} />
              </div>

              <div>
                <Label>Conversions</Label>
                <Input name="conversions" type="number" min="0" defaultValue={0} />
              </div>

              <div>
                <Label>ROI</Label>
                <Input name="roi" type="number" step="0.01" min="0" defaultValue={0} />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    กำลังสร้าง...
                  </>
                ) : (
                  "สร้างแคมเปญ"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไขแคมเปญ</DialogTitle>
            <DialogDescription>อัปเดตข้อมูลแคมเปญ</DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <form onSubmit={handleUpdateCampaign}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Platform *</Label>
                  <Select name="platform" defaultValue={selectedCampaign.platform} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FACEBOOK">Facebook</SelectItem>
                      <SelectItem value="TIKTOK">TikTok</SelectItem>
                      <SelectItem value="SHOPEE">Shopee</SelectItem>
                      <SelectItem value="LAZADA">Lazada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>ชื่อแคมเปญ *</Label>
                  <Input
                    name="campaignName"
                    defaultValue={selectedCampaign.campaignName}
                    required
                  />
                </div>

                <div>
                  <Label>งบประมาณ (฿) *</Label>
                  <Input
                    name="budget"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedCampaign.budget}
                    required
                  />
                </div>

                <div>
                  <Label>ใช้ไปแล้ว (฿)</Label>
                  <Input
                    name="spent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedCampaign.spent}
                  />
                </div>

                <div>
                  <Label>Reach</Label>
                  <Input
                    name="reach"
                    type="number"
                    min="0"
                    defaultValue={selectedCampaign.reach}
                  />
                </div>

                <div>
                  <Label>Clicks</Label>
                  <Input
                    name="clicks"
                    type="number"
                    min="0"
                    defaultValue={selectedCampaign.clicks}
                  />
                </div>

                <div>
                  <Label>Conversions</Label>
                  <Input
                    name="conversions"
                    type="number"
                    min="0"
                    defaultValue={selectedCampaign.conversions}
                  />
                </div>

                <div>
                  <Label>ROI</Label>
                  <Input
                    name="roi"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={selectedCampaign.roi}
                  />
                </div>

                <div>
                  <Label>สถานะ</Label>
                  <Select name="status" defaultValue={selectedCampaign.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="PAUSED">PAUSED</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>วันสิ้นสุด</Label>
                  <Input
                    name="endDate"
                    type="date"
                    defaultValue={
                      selectedCampaign.endDate
                        ? new Date(selectedCampaign.endDate).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedCampaign(null);
                  }}
                >
                  ยกเลิก
                </Button>
                <Button type="submit">บันทึก</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบแคมเปญ?</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบแคมเปญ &quot;{selectedCampaign?.campaignName}&quot; ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCampaign(null)}>
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบแคมเปญ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
