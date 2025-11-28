"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  Zap,
  Settings,
  Play,
  Pause,
  TestTube,
} from "lucide-react";
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
  const [openTestDialog, setOpenTestDialog] = useState(false);

  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [testResult, setTestResult] = useState<{
    condition: boolean;
    message: string;
    wouldExecute: string;
  } | null>(null);

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
        description: "ไม่สามรถแก้ไข Rule ได้",
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case "pauseCampaign":
        return "หยุดแคมเปญ";
      case "increaseBudget":
        return "เพิ่มงบประมาณ";
      case "decreaseBudget":
        return "ลดงบประมาณ";
      case "sendNotification":
        return "ส่งการแจ้งเตือน";
      default:
        return actionType;
    }
  };

  const handleTestRule = (rule: AutomationRule) => {
    setSelectedRule(rule);

    const mockValue = Math.floor(Math.random() * 500);
    const condition = rule.condition;

    let conditionMet = false;
    switch (condition.operator) {
      case ">":
        conditionMet = mockValue > condition.value;
        break;
      case "<":
        conditionMet = mockValue < condition.value;
        break;
      case "=":
        conditionMet = mockValue === condition.value;
        break;
      case ">=":
        conditionMet = mockValue >= condition.value;
        break;
      case "<=":
        conditionMet = mockValue <= condition.value;
        break;
    }

    const actionLabel = getActionText(
      rule.action.type,
      Number(rule.action.value)
    );

    setTestResult({
      condition: conditionMet,
      message: conditionMet
        ? `✅ เงื่อนไขเป็นจริง: ${getMetricLabel(
            condition.metric
          )} (${mockValue}) ${condition.operator} ${condition.value}`
        : `❌ เงื่อนไขเป็นเท็จ: ${getMetricLabel(
            condition.metric
          )} (${mockValue}) ${condition.operator} ${condition.value}`,
      wouldExecute: conditionMet
        ? `จะทำการ: ${actionLabel}${
            rule.action.value ? ` ${rule.action.value}%` : ""
          }`
        : "ไม่มีการทำงาน (เงื่อนไขไม่เป็นจริง)",
    });

    setOpenTestDialog(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
      </div>
    );
  }

  const activeRulesCount = rules.filter((r) => r.isActive).length;

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
        <div className="p-6 space-y-6">
          {/* Header + CTA */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Automation Rules Builder
              </h1>
              <p className="text-gray-600 mt-2">
                สร้างกฎอัตโนมัติสำหรับการจัดการโฆษณา 🚀
              </p>
            </div>
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-lg font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              สร้าง Rule ใหม่
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">
                      Rules ทั้งหมด
                    </p>
                    <p className="text-4xl font-bold text-gray-800">
                      {rules.length}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Settings className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">
                      Active Rules
                    </p>
                    <p className="text-4xl font-bold text-green-600">
                      {activeRulesCount}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">
                      Paused Rules
                    </p>
                    <p className="text-4xl font-bold text-orange-600">
                      {rules.filter((r) => !r.isActive).length}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <Pause className="w-7 h-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rules List */}
          {rules.length === 0 ? (
            <Card className="bg-white border-2 border-gray-200 shadow-md">
              <CardContent className="py-12 text-center">
                <p className="text-gray-600 font-medium">
                  ยังไม่มี Automation Rules <br />
                  คลิก "สร้าง Rule ใหม่" เพื่อเริ่มต้น
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rules.map((rule) => (
                <Card
                  key={rule.id}
                  className="bg-white border-2 border-gray-200 shadow-md hover:shadow-xl hover:border-pink-300 transition-all"
                >
                  <CardHeader className="border-b border-gray-100 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl font-bold text-gray-800 mb-2">
                          {rule.ruleName}
                        </CardTitle>
                        <p className="text-gray-700 font-medium mt-1">
                          {rule.platform} • {rule.tool}
                        </p>
                      </div>
                      <Badge
                        className={
                          rule.isActive
                            ? "bg-green-500 text-white border-0 font-semibold"
                            : "bg-gray-500 text-white border-0 font-semibold"
                        }
                      >
                        {rule.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-bold text-gray-800 min-w-[70px]">
                          เงื่อนไข:
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          IF{" "}
                          <span className="text-blue-600">
                            {getMetricLabel(rule.condition.metric)}
                          </span>{" "}
                          <span className="text-purple-600 font-bold">
                            {rule.condition.operator}
                          </span>{" "}
                          <span className="text-pink-600">
                            {rule.condition.value}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-sm font-bold text-gray-800 min-w-[70px]">
                          การกระทำ:
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {getActionLabel(rule.action.type)}
                          {rule.action.value && (
                            <span className="text-orange-600 font-bold">
                              {" "}
                              {rule.action.value}%
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold"
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
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEdit(rule)}
                          className="border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openDelete(rule)}
                          className="border-2 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white border-0 font-semibold"
                        onClick={() => handleTestRule(rule)}
                      >
                        <TestTube className="h-3 w-3 mr-1" />
                        ทดสอบ Rule (Dry-run)
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="flex justify-center mt-8">
            <Button
              onClick={() => {
                resetForm();
                setOpenDialog(true);
              }}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-lg text-base px-8 py-6 rounded-xl font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              สร้าง Automation Rule ใหม่
            </Button>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog
        open={openDialog}
        onOpenChange={(open) => {
          setOpenDialog(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <Zap className="h-5 w-5 text-yellow-500" />
              สร้าง Automation Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-800">แพลตฟอร์ม</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) =>
                    setFormData({ ...formData, platform: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 text-gray-800">
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
                <Label className="text-gray-800">เครื่องมือ</Label>
                <Select
                  value={formData.tool}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tool: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Revealbot">Revealbot</SelectItem>
                    <SelectItem value="AdEspresso">AdEspresso</SelectItem>
                    <SelectItem value="Madgicx">Madgicx</SelectItem>
                    <SelectItem value="Custom (n8n webhook)">
                      Custom (n8n webhook)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800">ชื่อ Rule</Label>
              <Input
                placeholder="เช่น 'หยุดแคมเปญเมื่อ CPA สูงเกิน 200'"
                value={formData.ruleName}
                onChange={(e) =>
                  setFormData({ ...formData, ruleName: e.target.value })
                }
                className="border-2 border-gray-300 text-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800">เงื่อนไข (Condition)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={formData.metric}
                    onValueChange={(value) =>
                      setFormData({ ...formData, metric: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPA">
                        CPA (ต้นทุนต่อการแปลง)
                      </SelectItem>
                      <SelectItem value="ROAS">
                        ROAS (ผลตอบแทนจากค่าโฆษณา)
                      </SelectItem>
                      <SelectItem value="CTR">
                        CTR (อัตราการคลิก)
                      </SelectItem>
                      <SelectItem value="Spend">
                        Spend (ค่าใช้จ่าย)
                      </SelectItem>
                      <SelectItem value="Conversions">
                        Conversions (การแปลง)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Select
                    value={formData.operator}
                    onValueChange={(value) =>
                      setFormData({ ...formData, operator: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">{">"}</SelectItem>
                      <SelectItem value="<">{"<"}</SelectItem>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value=">=">{">="}</SelectItem>
                      <SelectItem value="<=">{"<="}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="ค่า"
                    value={formData.value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-2 border-gray-300 text-gray-800"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-600">
                IF {getMetricLabel(formData.metric)} {formData.operator}{" "}
                {formData.value}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800">การกระทำ (Action)</Label>
              <Select
                value={formData.actionType}
                onValueChange={(value) =>
                  setFormData({ ...formData, actionType: value })
                }
              >
                <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pauseCampaign">หยุดแคมเปญ</SelectItem>
                  <SelectItem value="increaseBudget">เพิ่มงบ</SelectItem>
                  <SelectItem value="decreaseBudget">ลดงบ</SelectItem>
                  <SelectItem value="sendNotification">
                    ส่งการแจ้งเตือน
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.actionType === "increaseBudget" ||
              formData.actionType === "decreaseBudget") && (
              <div className="space-y-2">
                <Label className="text-gray-800">จำนวนเงิน (%)</Label>
                <Input
                  type="number"
                  placeholder="เช่น 20 (เพิ่ม/ลด 20%)"
                  value={formData.actionValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionValue: e.target.value,
                    })
                  }
                  className="border-2 border-gray-300 text-gray-800"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialog(false)}
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreate}
              disabled={submitting}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white font-semibold"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onOpenChange={(open) => {
          setOpenEditDialog(open);
          if (!open) {
            setSelectedRule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-800">
              แก้ไข Automation Rule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-800">แพลตฟอร์ม</Label>
                <Select
                  value={formData.platform}
                  onValueChange={(value) =>
                    setFormData({ ...formData, platform: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 text-gray-800">
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
                <Label className="text-gray-800">เครื่องมือ</Label>
                <Select
                  value={formData.tool}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tool: value })
                  }
                >
                  <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Revealbot">Revealbot</SelectItem>
                    <SelectItem value="AdEspresso">AdEspresso</SelectItem>
                    <SelectItem value="Madgicx">Madgicx</SelectItem>
                    <SelectItem value="Custom (n8n webhook)">
                      Custom (n8n webhook)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800">ชื่อ Rule</Label>
              <Input
                placeholder="เช่น 'หยุดแคมเปญเมื่อ CPA สูงเกิน 200'"
                value={formData.ruleName}
                onChange={(e) =>
                  setFormData({ ...formData, ruleName: e.target.value })
                }
                className="border-2 border-gray-300 text-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800">เงื่อนไข (Condition)</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={formData.metric}
                    onValueChange={(value) =>
                      setFormData({ ...formData, metric: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CPA">
                        CPA (ต้นทุนต่อการแปลง)
                      </SelectItem>
                      <SelectItem value="ROAS">
                        ROAS (ผลตอบแทนจากค่าโฆษณา)
                      </SelectItem>
                      <SelectItem value="CTR">
                        CTR (อัตราการคลิก)
                      </SelectItem>
                      <SelectItem value="Spend">
                        Spend (ค่าใช้จ่าย)
                      </SelectItem>
                      <SelectItem value="Conversions">
                        Conversions (การแปลง)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-24">
                  <Select
                    value={formData.operator}
                    onValueChange={(value) =>
                      setFormData({ ...formData, operator: value })
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=">">{">"}</SelectItem>
                      <SelectItem value="<">{"<"}</SelectItem>
                      <SelectItem value="=">=</SelectItem>
                      <SelectItem value=">=">{">="}</SelectItem>
                      <SelectItem value="<=">{"<="}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="ค่า"
                    value={formData.value || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        value: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-2 border-gray-300 text-gray-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-800">การกระทำ (Action)</Label>
              <Select
                value={formData.actionType}
                onValueChange={(value) =>
                  setFormData({ ...formData, actionType: value })
                }
              >
                <SelectTrigger className="border-2 border-gray-300 text-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pauseCampaign">หยุดแคมเปญ</SelectItem>
                  <SelectItem value="increaseBudget">เพิ่มงบ</SelectItem>
                  <SelectItem value="decreaseBudget">ลดงบ</SelectItem>
                  <SelectItem value="sendNotification">
                    ส่งการแจ้งเตือน
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.actionType === "increaseBudget" ||
              formData.actionType === "decreaseBudget") && (
              <div className="space-y-2">
                <Label className="text-gray-800">จำนวนเงิน (%)</Label>
                <Input
                  type="number"
                  placeholder="เช่น 20 (เพิ่ม/ลด 20%)"
                  value={formData.actionValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      actionValue: e.target.value,
                    })
                  }
                  className="border-2 border-gray-300 text-gray-800"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenEditDialog(false)}
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={submitting}
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white font-semibold"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog
        open={openDeleteDialog}
        onOpenChange={(open) => {
          setOpenDeleteDialog(open);
          if (!open) setSelectedRule(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ที่จะลบ Rule "
              {selectedRule?.ruleName}" การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Dialog */}
      <Dialog
        open={openTestDialog}
        onOpenChange={(open) => {
          setOpenTestDialog(open);
          if (!open) setTestResult(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
              <TestTube className="h-5 w-5 text-blue-500" />
              ทดสอบ Rule (Dry-run)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRule && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold text-sm text-gray-800">
                    Rule: {selectedRule.ruleName}
                  </h3>
                  <p className="text-xs text-gray-700">
                    {selectedRule.platform} • {selectedRule.tool}
                  </p>
                </div>

                {testResult && (
                  <>
                    <div
                      className={`p-4 rounded-lg ${
                        testResult.condition
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          testResult.condition
                            ? "text-green-800"
                            : "text-red-800"
                        }`}
                      >
                        {testResult.message}
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <p className="text-sm font-semibold text-blue-800 mb-2">
                        ผลการทำงาน:
                      </p>
                      <p className="text-sm text-blue-700">
                        {testResult.wouldExecute}
                      </p>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        ⚠️ <strong>หมายเหตุ:</strong> นี่เป็นการทดสอบแบบ
                        dry-run ไม่มีการเปลี่ยนแปลงจริงในระบบ
                        ค่าที่ใช้ทดสอบเป็นค่าสุ่ม
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOpenTestDialog(false)}
              className="border-2 border-gray-300 text-gray-700 hover:bg-gray-100"
              variant="outline"
            >
              ปิด
            </Button>
            {selectedRule && (
              <Button
                variant="outline"
                onClick={() => handleTestRule(selectedRule)}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:opacity-90"
              >
                <TestTube className="h-4 w-4 mr-2" />
                ทดสอบอีกครั้ง
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getActionText(actionType: string, actionValue?: number | null): string {
  if (actionType === "increaseBudget" && actionValue) {
    return `เพิ่มงบประมาณ ${actionValue}%`;
  }
  if (actionType === "decreaseBudget" && actionValue) {
    return `ลดงบประมาณ ${actionValue}%`;
  }
  if (actionType === "pauseCampaign") {
    return "หยุดแคมเปญชั่วคราว";
  }
  if (actionType === "sendNotification") {
    return "ส่งการแจ้งเตือน";
  }
  return actionType;
}
