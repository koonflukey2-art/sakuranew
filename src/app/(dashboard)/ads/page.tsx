"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { campaignSchema, CampaignFormData } from "@/lib/validations";
import { TableSkeleton, ButtonLoading } from "@/components/loading-states";
import { EmptyCampaigns } from "@/components/empty-states";
import { DeleteConfirmation } from "@/components/confirmation-dialog";
import { fetchWithErrorHandling, handleAPIError } from "@/lib/error-handler";

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

  // Create Campaign Form
  const createForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      platform: "FACEBOOK",
      campaignName: "",
      budget: 0,
      spent: 0,
      startDate: "",
      endDate: "",
      reach: 0,
      clicks: 0,
      conversions: 0,
      roi: 0,
    },
  });

  // Edit Campaign Form
  const editForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      platform: "FACEBOOK",
      campaignName: "",
      budget: 0,
      spent: 0,
      startDate: "",
      endDate: "",
      reach: 0,
      clicks: 0,
      conversions: 0,
      roi: 0,
    },
  });

  // Fetch campaigns from API
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await fetchWithErrorHandling<AdCampaign[]>("/api/campaigns");
      setCampaigns(data);
    } catch (error) {
      handleAPIError(error, "ไม่สามารถโหลดข้อมูลแคมเปญได้");
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
  const handleCreateCampaign = async (data: CampaignFormData) => {
    try {
      setCreating(true);
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: "ACTIVE" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create campaign");
      }

      toast({
        title: "สำเร็จ!",
        description: "สร้างแคมเปญใหม่แล้ว",
      });

      createForm.reset();
      setIsCreateOpen(false);
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
    editForm.reset({
      platform: campaign.platform as "FACEBOOK" | "TIKTOK" | "SHOPEE" | "LAZADA",
      campaignName: campaign.campaignName,
      budget: campaign.budget,
      spent: campaign.spent,
      startDate: typeof campaign.startDate === 'string'
        ? campaign.startDate.split('T')[0]
        : new Date(campaign.startDate).toISOString().split('T')[0],
      endDate: campaign.endDate
        ? (typeof campaign.endDate === 'string'
          ? campaign.endDate.split('T')[0]
          : new Date(campaign.endDate).toISOString().split('T')[0])
        : "",
      reach: campaign.reach,
      clicks: campaign.clicks,
      conversions: campaign.conversions,
      roi: campaign.roi,
    });
    setIsEditOpen(true);
  };

  const handleUpdateCampaign = async (data: CampaignFormData) => {
    if (!selectedCampaign) return;

    try {
      const response = await fetch("/api/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          id: selectedCampaign.id,
          status: selectedCampaign.status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update campaign");

      toast({
        title: "สำเร็จ!",
        description: "อัปเดตแคมเปญแล้ว",
      });

      editForm.reset();
      setIsEditOpen(false);
      setSelectedCampaign(null);
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
      {!loading && campaigns.length === 0 ? (
        <EmptyCampaigns onCreate={() => setIsCreateOpen(true)} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>แคมเปญทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={10} />
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
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>สร้างแคมเปญใหม่</DialogTitle>
            <DialogDescription>กรอกข้อมูลแคมเปญโฆษณา</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateCampaign)}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={createForm.control}
                    name="platform"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Platform *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือก Platform" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FACEBOOK">Facebook</SelectItem>
                            <SelectItem value="TIKTOK">TikTok</SelectItem>
                            <SelectItem value="SHOPEE">Shopee</SelectItem>
                            <SelectItem value="LAZADA">Lazada</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <FormField
                    control={createForm.control}
                    name="campaignName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อแคมเปญ *</FormLabel>
                        <FormControl>
                          <Input placeholder="กรอกชื่อแคมเปญ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>งบประมาณ (฿) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="spent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ใช้ไปแล้ว (฿)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันเริ่ม *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>วันสิ้นสุด</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="reach"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reach</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="clicks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clicks</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="conversions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conversions</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="roi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ROI</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {creating ? <ButtonLoading /> : "สร้างแคมเปญ"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateCampaign)}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <FormField
                      control={editForm.control}
                      name="platform"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Platform *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FACEBOOK">Facebook</SelectItem>
                              <SelectItem value="TIKTOK">TikTok</SelectItem>
                              <SelectItem value="SHOPEE">Shopee</SelectItem>
                              <SelectItem value="LAZADA">Lazada</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-2">
                    <FormField
                      control={editForm.control}
                      name="campaignName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ชื่อแคมเปญ *</FormLabel>
                          <FormControl>
                            <Input placeholder="กรอกชื่อแคมเปญ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>งบประมาณ (฿) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="spent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ใช้ไปแล้ว (฿)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="reach"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reach</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="clicks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clicks</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="conversions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conversions</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="roi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ROI</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันเริ่ม *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>วันสิ้นสุด</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        itemName={selectedCampaign?.campaignName || ""}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
