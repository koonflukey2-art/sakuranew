"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target,
  TrendingUp,
  DollarSign,
  Download,
  Plus,
  Trash2,
  Edit,
  Save,
  Facebook,
  Video,
  MessageCircle,
  Users as UsersIcon,
  Star,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer } from "recharts";

// Template definitions with 7 templates
const metricsTemplates = [
  {
    id: "growth-plan",
    name: "Growth Plan",
    description: "แผนเติบโตธุรกิจ",
    icon: TrendingUp,
    color: "text-blue-500",
    metrics: [
      { key: "revenue", label: "Monthly Revenue", unit: "฿", target: 100000 },
      { key: "cac", label: "CAC (Cost per Acquisition)", unit: "฿", target: 500 },
      { key: "ltv", label: "LTV (Lifetime Value)", unit: "฿", target: 2000 },
      { key: "conversionRate", label: "Conversion Rate", unit: "%", target: 3.5 },
      { key: "roas", label: "ROAS", unit: "x", target: 3.0 },
    ],
  },
  {
    id: "profit-plan",
    name: "Profit Plan",
    description: "แผนกำไร",
    icon: DollarSign,
    color: "text-green-500",
    metrics: [
      { key: "grossProfit", label: "Gross Profit", unit: "฿", target: 50000 },
      { key: "netProfit", label: "Net Profit", unit: "฿", target: 30000 },
      { key: "profitMargin", label: "Profit Margin", unit: "%", target: 30 },
      { key: "breakEven", label: "Break-even Point", unit: "฿", target: 20000 },
    ],
  },
  {
    id: "facebook-messages",
    name: "Facebook - แคมเปญข้อความ",
    description: "Metrics สำหรับ Facebook Messages Campaign",
    icon: MessageCircle,
    color: "text-blue-600",
    metrics: [
      { key: "cpm", label: "CPM", unit: "฿", target: 50 },
      { key: "ctr", label: "CTR", unit: "%", target: 2.5 },
      { key: "cpc", label: "CPC", unit: "฿", target: 5 },
      { key: "conversions", label: "Conversions", unit: "", target: 100 },
      { key: "costPerConversion", label: "Cost per Conversion", unit: "฿", target: 200 },
    ],
  },
  {
    id: "facebook-s1",
    name: "Facebook (S1 Plan)",
    description: "Facebook S1 Strategy",
    icon: Facebook,
    color: "text-blue-700",
    metrics: [
      { key: "reach", label: "Reach", unit: "", target: 50000 },
      { key: "engagementRate", label: "Engagement Rate", unit: "%", target: 5 },
      { key: "linkClicks", label: "Link Clicks", unit: "", target: 1000 },
      { key: "costPerClick", label: "Cost per Click", unit: "฿", target: 3 },
    ],
  },
  {
    id: "facebook-lead-gen",
    name: "Facebook - Lead Generation",
    description: "สร้างลีด",
    icon: Target,
    color: "text-indigo-500",
    metrics: [
      { key: "leads", label: "Leads", unit: "", target: 200 },
      { key: "costPerLead", label: "Cost per Lead", unit: "฿", target: 100 },
      { key: "leadQuality", label: "Lead Quality Score", unit: "/10", target: 8 },
      { key: "conversionToSale", label: "Conversion to Sale", unit: "%", target: 20 },
    ],
  },
  {
    id: "tiktok-ecommerce",
    name: "TikTok - E-commerce (Growth Plan)",
    description: "ขายของผ่าน TikTok",
    icon: Video,
    color: "text-pink-500",
    metrics: [
      { key: "videoViews", label: "Video Views", unit: "", target: 100000 },
      { key: "engagementRate", label: "Engagement Rate", unit: "%", target: 5 },
      { key: "addToCart", label: "Add to Cart", unit: "", target: 500 },
      { key: "purchase", label: "Purchase", unit: "", target: 100 },
      { key: "roas", label: "ROAS", unit: "x", target: 3 },
    ],
  },
  {
    id: "tiktok-brand",
    name: "TikTok - Brand Awareness",
    description: "สร้างการรับรู้แบรนด์",
    icon: Star,
    color: "text-yellow-500",
    metrics: [
      { key: "impressions", label: "Impressions", unit: "", target: 500000 },
      { key: "videoViews", label: "Video Views", unit: "", target: 200000 },
      { key: "profileVisits", label: "Profile Visits", unit: "", target: 5000 },
      { key: "followerGrowth", label: "Follower Growth", unit: "", target: 1000 },
    ],
  },
];

interface MetricsPlan {
  id: string;
  templateName: string;
  targets: Record<string, number>;
  actual?: Record<string, number>;
  period: string;
  createdAt: string;
}

export default function MetricsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<MetricsPlan[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [period, setPeriod] = useState<string>("monthly");
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [actual, setActual] = useState<Record<string, number>>({});
  const [editingPlan, setEditingPlan] = useState<MetricsPlan | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const response = await fetch("/api/check-permission?page=metrics");
        const data = await response.json();
        if (!data.hasAccess) {
          router.push("/");
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        router.push("/");
      }
    };
    checkAccess();
  }, [router]);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const template = metricsTemplates.find((t) => t.id === selectedTemplate);
      if (template) {
        const defaultTargets: Record<string, number> = {};
        const defaultActual: Record<string, number> = {};
        template.metrics.forEach((metric) => {
          defaultTargets[metric.key] = metric.target;
          defaultActual[metric.key] = 0;
        });
        setTargets(defaultTargets);
        setActual(defaultActual);
      }
    }
  }, [selectedTemplate]);

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedTemplate) {
      toast({
        title: "กรุณาเลือก Template",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        templateName: selectedTemplate,
        targets,
        actual,
        period,
        userId: "temp-user-id",
      };

      const res = editingPlan
        ? await fetch("/api/metrics", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingPlan.id, ...payload }),
          })
        : await fetch("/api/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        toast({
          title: editingPlan ? "อัพเดทแผนสำเร็จ!" : "สร้างแผนสำเร็จ!",
        });
        fetchPlans();
        resetForm();
        setOpenDialog(false);
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("ต้องการลบแผนนี้?")) return;

    try {
      const res = await fetch(`/api/metrics?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast({
          title: "ลบแผนสำเร็จ!",
        });
        fetchPlans();
      }
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        variant: "destructive",
      });
    }
  };

  const handleEditPlan = (plan: MetricsPlan) => {
    setEditingPlan(plan);
    setSelectedTemplate(plan.templateName);
    setTargets(plan.targets);
    setActual(plan.actual || {});
    setPeriod(plan.period);
    setOpenDialog(true);
  };

  const resetForm = () => {
    setSelectedTemplate("");
    setTargets({});
    setActual({});
    setPeriod("monthly");
    setEditingPlan(null);
  };

  const handleExportPDF = () => {
    toast({
      title: "กำลังเตรียม PDF...",
      description: "ฟีเจอร์นี้จะพร้อมใช้งานในเร็วๆ นี้",
    });
    // TODO: Implement PDF export using jsPDF or react-pdf
  };

  const calculateProgress = (actualValue: number, targetValue: number) => {
    if (targetValue === 0) return 0;
    return Math.min((actualValue / targetValue) * 100, 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "text-green-500";
    if (progress >= 70) return "text-blue-500";
    if (progress >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  if (hasAccess === null) {
    return <div className="p-6">กำลังตรวจสอบสิทธิ์...</div>;
  }

  const currentTemplate = metricsTemplates.find((t) => t.id === selectedTemplate);

  // Prepare data for Radial Chart
  const prepareGaugeData = (key: string) => {
    const targetValue = targets[key] || 0;
    const actualValue = actual[key] || 0;
    const progress = calculateProgress(actualValue, targetValue);

    return [
      {
        name: key,
        value: progress,
        fill: progress >= 100 ? "#22c55e" : progress >= 70 ? "#3b82f6" : progress >= 40 ? "#eab308" : "#ef4444",
      },
    ];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-blue-500" />
            แผน Metrics
          </h1>
          <p className="text-muted-foreground mt-1">
            เลือก Template และกำหนดเป้าหมายสำหรับแต่ละ metric
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              สร้างแผนใหม่
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "แก้ไขแผน Metrics" : "สร้างแผน Metrics ใหม่"}
              </DialogTitle>
              <DialogDescription>
                เลือก template และกำหนดเป้าหมายสำหรับแต่ละ metric
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Template Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>เลือก Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือก Template" />
                    </SelectTrigger>
                    <SelectContent>
                      {metricsTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>รอบเวลา</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">รายวัน</SelectItem>
                      <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                      <SelectItem value="monthly">รายเดือน</SelectItem>
                      <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Form with Gauge Charts */}
              {currentTemplate && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {currentTemplate.icon && (
                      <currentTemplate.icon className={`h-5 w-5 ${currentTemplate.color}`} />
                    )}
                    <h3 className="text-lg font-semibold">{currentTemplate.name}</h3>
                    <Badge variant="secondary">{currentTemplate.description}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {currentTemplate.metrics.map((metric) => {
                      const progress = calculateProgress(actual[metric.key] || 0, targets[metric.key] || 0);
                      const gaugeData = prepareGaugeData(metric.key);

                      return (
                        <Card key={metric.key} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center justify-between">
                              <span>{metric.label}</span>
                              <Badge variant={progress >= 100 ? "default" : "secondary"} className="text-xs">
                                {progress.toFixed(0)}%
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Gauge Chart */}
                            <div className="h-32">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                  cx="50%"
                                  cy="50%"
                                  innerRadius="60%"
                                  outerRadius="90%"
                                  barSize={10}
                                  data={gaugeData}
                                  startAngle={180}
                                  endAngle={0}
                                >
                                  <RadialBar
                                    minAngle={15}
                                    background
                                    clockWise
                                    dataKey="value"
                                    cornerRadius={10}
                                  />
                                  <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className={`text-2xl font-bold ${getProgressColor(progress)}`}
                                  >
                                    {progress.toFixed(0)}%
                                  </text>
                                </RadialBarChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Input Fields */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  เป้าหมาย {metric.unit && `(${metric.unit})`}
                                </Label>
                                <Input
                                  type="number"
                                  value={targets[metric.key] || ""}
                                  onChange={(e) =>
                                    setTargets({
                                      ...targets,
                                      [metric.key]: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  placeholder="Target"
                                  className="text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  ผลลัพธ์จริง {metric.unit && `(${metric.unit})`}
                                </Label>
                                <Input
                                  type="number"
                                  value={actual[metric.key] || ""}
                                  onChange={(e) =>
                                    setActual({
                                      ...actual,
                                      [metric.key]: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  placeholder="Actual"
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {(actual[metric.key] || 0).toLocaleString()}{metric.unit}
                                </span>
                                <span>
                                  {(targets[metric.key] || 0).toLocaleString()}{metric.unit}
                                </span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleSavePlan}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingPlan ? "บันทึกการแก้ไข" : "สร้างแผน"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Saved Plans List */}
      <div className="grid gap-4">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">ยังไม่มีแผน Metrics</p>
              <p className="text-sm text-muted-foreground">
                คลิก "สร้างแผนใหม่" เพื่อเริ่มต้น
              </p>
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => {
            const template = metricsTemplates.find((t) => t.id === plan.templateName);
            if (!template) return null;

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {template.icon && (
                          <template.icon className={`h-5 w-5 ${template.color}`} />
                        )}
                        {template.name}
                      </CardTitle>
                      <CardDescription>
                        {plan.period === "monthly"
                          ? "รายเดือน"
                          : plan.period === "daily"
                          ? "รายวัน"
                          : plan.period === "weekly"
                          ? "รายสัปดาห์"
                          : "รายไตรมาส"}
                        {" • "}
                        สร้างเมื่อ {new Date(plan.createdAt).toLocaleDateString("th-TH")}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPlan(plan)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleExportPDF}>
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePlan(plan.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {template.metrics.map((metric) => {
                      const targetValue = plan.targets[metric.key] || 0;
                      const actualValue = plan.actual?.[metric.key] || 0;
                      const progress = calculateProgress(actualValue, targetValue);

                      return (
                        <div key={metric.key} className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-medium">{metric.label}</span>
                            <Badge
                              variant={progress >= 100 ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {progress.toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                {actualValue.toLocaleString()}
                                {metric.unit}
                              </span>
                              <span>
                                {targetValue.toLocaleString()}
                                {metric.unit}
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
