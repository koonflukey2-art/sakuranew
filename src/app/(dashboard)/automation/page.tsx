"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Loader2, Zap, Settings, Play, Pause } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AutomationRule {
  id: string;
  platform: string;
  tool: string;
  ruleName: string;
  condition: {
    metric: string;
    operator: string;
    value: number;
  };
  action: {
    type: string;
    value?: string;
  };
  isActive: boolean;
  createdAt: string;
}

export default function AutomationPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    platform: "Facebook Ads",
    tool: "Revealbot",
    ruleName: "",
    metric: "CPA",
    operator: ">",
    value: 0,
    actionType: "pauseCampaign",
    actionValue: "",
  });

  // Fetch rules
  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/automation");
      if (!response.ok) throw new Error("Failed to fetch rules");
      const data = await response.json();
      setRules(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูล Automation Rules ได้",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create rule
  const handleCreate = async () => {
    if (!formData.ruleName) {
      toast({
        variant: "destructive",
        title: "กรุณากรอกชื่อ Rule",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: formData.platform,
          tool: formData.tool,
          ruleName: formData.ruleName,
          condition: {
            metric: formData.metric,
            operator: formData.operator,
            value: formData.value,
          },
          action: {
            type: formData.actionType,
            value: formData.actionValue,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to create rule");

      toast({
        title: "สำเร็จ",
        description: "สร้าง Automation Rule เรียบร้อยแล้ว",
      });

      setOpenDialog(false);
      resetForm();
      fetchRules();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้าง Rule ได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Update rule
  const handleUpdate = async () => {
    if (!selectedRule) return;

    try {
      setSubmitting(true);
      const response = await fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRule.id,
          platform: formData.platform,
          tool: formData.tool,
          ruleName: formData.ruleName,
          condition: {
            metric: formData.metric,
            operator: formData.operator,
            value: formData.value,
          },
          action: {
            type: formData.actionType,
            value: formData.actionValue,
          },
          isActive: selectedRule.isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update rule");

      toast({
        title: "สำเร็จ",
        description: "แก้ไข Rule เรียบร้อยแล้ว",
      });

      setOpenEditDialog(false);
      setSelectedRule(null);
      resetForm();
      fetchRules();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไข Rule ได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete rule
  const handleDelete = async () => {
    if (!selectedRule) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/automation?id=${selectedRule.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");

      toast({
        title: "สำเร็จ",
        description: "ลบ Rule เรียบร้อยแล้ว",
      });

      setOpenDeleteDialog(false);
      setSelectedRule(null);
      fetchRules();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบ Rule ได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      const response = await fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rule.id,
          platform: rule.platform,
          tool: rule.tool,
          ruleName: rule.ruleName,
          condition: rule.condition,
          action: rule.action,
          isActive: !rule.isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to toggle rule");

      toast({
        title: "สำเร็จ",
        description: `${!rule.isActive ? "เปิด" : "ปิด"}ใช้งาน Rule แล้ว`,
      });

      fetchRules();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยนสถานะได้",
      });
    }
  };

  const openEdit = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setFormData({
      platform: rule.platform,
      tool: rule.tool,
      ruleName: rule.ruleName,
      metric: rule.condition.metric,
      operator: rule.condition.operator,
      value: rule.condition.value,
      actionType: rule.action.type,
      actionValue: rule.action.value || "",
    });
    setOpenEditDialog(true);
  };

  const openDelete = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setOpenDeleteDialog(true);
  };

  const resetForm = () => {
    setFormData({
      platform: "Facebook Ads",
      tool: "Revealbot",
      ruleName: "",
      metric: "CPA",
      operator: ">",
      value: 0,
      actionType: "pauseCampaign",
      actionValue: "",
    });
  };

  const getActionLabel = (actionType: string) => {
    const actions: Record<string, string> = {
      pauseCampaign: "หยุดแคมเปญ",
      increaseBudget: "เพิ่มงบ",
      decreaseBudget: "ลดงบ",
      sendNotification: "ส่งการแจ้งเตือน",
    };
    return actions[actionType] || actionType;
  };

  const getMetricLabel = (metric: string) => {
    const metrics: Record<string, string> = {
      CPA: "CPA (ต้นทุนต่อการแปลง)",
      ROAS: "ROAS (ผลตอบแทนจากค่าโฆษณา)",
      CTR: "CTR (อัตราการคลิก)",
      Spend: "ค่าใช้จ่าย",
      Conversions: "การแปลง",
    };
    return metrics[metric] || metric;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automation Rules Builder</h1>
          <p className="text-muted-foreground">สร้างกฎอัตโนมัติสำหรับการจัดการโฆษณา</p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              สร้าง Rule ใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                สร้าง Automation Rule
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>แพลตฟอร์ม</Label>
                  <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                      <SelectItem value="Google Ads">Google Ads</SelectItem>
                      <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                      <SelectItem value="X Ads">X Ads</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>เครื่องมือ</Label>
                  <Select value={formData.tool} onValueChange={(value) => setFormData({ ...formData, tool: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Revealbot">Revealbot</SelectItem>
                      <SelectItem value="AdEspresso">AdEspresso</SelectItem>
                      <SelectItem value="Madgicx">Madgicx</SelectItem>
                      <SelectItem value="Custom (n8n webhook)">Custom (n8n webhook)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>ชื่อ Rule</Label>
                <Input
                  placeholder="เช่น 'หยุดแคมเปญเมื่อ CPA สูงเกิน 200'"
                  value={formData.ruleName}
                  onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>เงื่อนไข (Condition)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={formData.metric} onValueChange={(value) => setFormData({ ...formData, metric: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CPA">CPA (ต้นทุนต่อการแปลง)</SelectItem>
                        <SelectItem value="ROAS">ROAS (ผลตอบแทนจากค่าโฆษณา)</SelectItem>
                        <SelectItem value="CTR">CTR (อัตราการคลิก)</SelectItem>
                        <SelectItem value="Spend">Spend (ค่าใช้จ่าย)</SelectItem>
                        <SelectItem value="Conversions">Conversions (การแปลง)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="w-24">
                    <Select value={formData.operator} onValueChange={(value) => setFormData({ ...formData, operator: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">{'>'}</SelectItem>
                        <SelectItem value="<">{'<'}</SelectItem>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value=">=">{'>='}</SelectItem>
                        <SelectItem value="<=">{'<='}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="ค่า"
                      value={formData.value || ""}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  IF {getMetricLabel(formData.metric)} {formData.operator} {formData.value}
                </p>
              </div>

              <div className="space-y-2">
                <Label>การกระทำ (Action)</Label>
                <Select value={formData.actionType} onValueChange={(value) => setFormData({ ...formData, actionType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pauseCampaign">หยุดแคมเปญ</SelectItem>
                    <SelectItem value="increaseBudget">เพิ่มงบ</SelectItem>
                    <SelectItem value="decreaseBudget">ลดงบ</SelectItem>
                    <SelectItem value="sendNotification">ส่งการแจ้งเตือน</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.actionType === "increaseBudget" || formData.actionType === "decreaseBudget") && (
                <div className="space-y-2">
                  <Label>จำนวนเงิน (%)</Label>
                  <Input
                    type="number"
                    placeholder="เช่น 20 (เพิ่ม/ลด 20%)"
                    value={formData.actionValue}
                    onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenDialog(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                บันทึก
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rules ทั้งหมด</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {rules.filter((r) => r.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paused Rules</CardTitle>
            <Pause className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {rules.filter((r) => !r.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            ยังไม่มี Automation Rules <br />
            คลิก "สร้าง Rule ใหม่" เพื่อเริ่มต้น
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{rule.ruleName}</CardTitle>
                    <CardDescription className="mt-1">
                      {rule.platform} • {rule.tool}
                    </CardDescription>
                  </div>
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "Active" : "Paused"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">เงื่อนไข:</span> IF{" "}
                    <span className="text-blue-600">{getMetricLabel(rule.condition.metric)}</span>{" "}
                    <span className="font-bold">{rule.condition.operator}</span>{" "}
                    <span className="text-purple-600">{rule.condition.value}</span>
                  </div>
                  <div>
                    <span className="font-semibold">การกระทำ:</span>{" "}
                    <span className="text-green-600">{getActionLabel(rule.action.type)}</span>
                    {rule.action.value && <span className="text-orange-600"> {rule.action.value}%</span>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleActive(rule)}
                  >
                    {rule.isActive ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDelete(rule)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>แก้ไข Automation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>แพลตฟอร์ม</Label>
                <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                    <SelectItem value="X Ads">X Ads</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>เครื่องมือ</Label>
                <Select value={formData.tool} onValueChange={(value) => setFormData({ ...formData, tool: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Revealbot">Revealbot</SelectItem>
                    <SelectItem value="AdEspresso">AdEspresso</SelectItem>
                    <SelectItem value="Madgicx">Madgicx</SelectItem>
                    <SelectItem value="Custom (n8n webhook)">Custom (n8n webhook)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ชื่อ Rule</Label>
              <Input
                placeholder="เช่น 'หยุดแคมเปญเมื่อ CPA สูงเกิน 200'"
                value={formData.ruleName}
                onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>เงื่อนไข (Condition)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select value={formData.metric} onValueChange={(value) => setFormData({ ...formData, metric: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPA">CPA (ต้นทุนต่อการแปลง)</SelectItem>
                      <SelectItem value="ROAS">ROAS (ผลตอบแทนจากค่าโฆษณา)</SelectItem>
                      <SelectItem value="CTR">CTR (อัตราการคลิก)</SelectItem>
                      <SelectItem value="Spend">Spend (ค่าใช้จ่าย)</SelectItem>
                      <SelectItem value="Conversions">Conversions (การแปลง)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Select value={formData.operator} onValueChange={(value) => setFormData({ ...formData, operator: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">{'>'}</SelectItem>
                      <SelectItem value="<">{'<'}</SelectItem>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value=">=">{'>='}</SelectItem>
                      <SelectItem value="<=">{'<='}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="ค่า"
                    value={formData.value || ""}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>การกระทำ (Action)</Label>
              <Select value={formData.actionType} onValueChange={(value) => setFormData({ ...formData, actionType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pauseCampaign">หยุดแคมเปญ</SelectItem>
                  <SelectItem value="increaseBudget">เพิ่มงบ</SelectItem>
                  <SelectItem value="decreaseBudget">ลดงบ</SelectItem>
                  <SelectItem value="sendNotification">ส่งการแจ้งเตือน</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.actionType === "increaseBudget" || formData.actionType === "decreaseBudget") && (
              <div className="space-y-2">
                <Label>จำนวนเงิน (%)</Label>
                <Input
                  type="number"
                  placeholder="เช่น 20 (เพิ่ม/ลด 20%)"
                  value={formData.actionValue}
                  onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ Rule "{selectedRule?.ruleName}" การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-red-500 hover:bg-red-600">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
