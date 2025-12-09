"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  ShoppingCart,
  Package,
  Wallet,
  TrendingUp,
  MessageSquare,
  Database,
  Activity,
  CheckCircle2,
} from "lucide-react";

export default function WorkflowPage() {
  const workflows = [
    {
      title: "ระบบ LINE Order → สต็อก",
      icon: MessageSquare,
      color: "from-green-500 to-emerald-600",
      steps: [
        {
          icon: MessageSquare,
          title: "LINE Message",
          description: "ลูกค้าส่งข้อความสั่งซื้อผ่าน LINE",
          detail: "รูปแบบ: 1ชื่อ,เบอร์,ที่อยู่,จำนวน,ยอดเก็บ",
        },
        {
          icon: Database,
          title: "Webhook Processing",
          description: "ระบบรับข้อมูลและแยกวิเคราะห์",
          detail: "Parse ข้อมูลลูกค้า, ประเภทสินค้า, จำนวน, ราคา",
        },
        {
          icon: ShoppingCart,
          title: "Create Order",
          description: "สร้างออเดอร์ในระบบ",
          detail: "บันทึก Customer, Order, ProductType mapping",
        },
        {
          icon: Package,
          title: "Update Stock",
          description: "ลดสต็อกสินค้าอัตโนมัติ",
          detail: "หา Product จาก productType → ลด quantity",
        },
        {
          icon: CheckCircle2,
          title: "Complete",
          description: "บันทึกรายได้และกำไร",
          detail: "คำนวณ profit = (unitPrice - costPrice) × quantity",
        },
      ],
    },
    {
      title: "ระบบซื้อสินค้า → งบประมาณ",
      icon: Package,
      color: "from-purple-500 to-pink-600",
      steps: [
        {
          icon: Package,
          title: "Add Product",
          description: "เพิ่มสินค้าในหน้า Stock",
          detail: "กรอก: ชื่อ, หมวดหมู่, จำนวน, ราคาทุน",
        },
        {
          icon: Database,
          title: "Calculate Cost",
          description: "คำนวณต้นทุนรวม",
          detail: "totalCost = costPrice × quantity",
        },
        {
          icon: Wallet,
          title: "Deduct Budget",
          description: "หักงบประมาณอัตโนมัติ",
          detail: "remaining -= totalCost (อนุญาตให้ติดลบ)",
        },
        {
          icon: Database,
          title: "Log Transaction",
          description: "บันทึกประวัติการใช้งบ",
          detail: "CapitalBudgetTransaction: type=DEDUCT",
        },
        {
          icon: CheckCircle2,
          title: "Update Display",
          description: "แสดงงบคงเหลือใหม่",
          detail: "แจ้งเตือนหากงบต่ำกว่าขั้นต่ำ",
        },
      ],
    },
    {
      title: "ระบบคำนวณ KPI → รายงาน",
      icon: Activity,
      color: "from-blue-500 to-cyan-600",
      steps: [
        {
          icon: ShoppingCart,
          title: "Collect Orders",
          description: "ดึงข้อมูลออเดอร์ตามช่วงเวลา",
          detail: "Query orders by date range",
        },
        {
          icon: Package,
          title: "Get Product Costs",
          description: "ดึงข้อมูลต้นทุนสินค้า",
          detail: "Join Product.productType with Order.productType",
        },
        {
          icon: TrendingUp,
          title: "Calculate Metrics",
          description: "คำนวณ KPI ทั้งหมด",
          detail: "Revenue, Cost, Profit, Margin, Efficiency",
        },
        {
          icon: Database,
          title: "Save KPI",
          description: "บันทึก KPI ลงฐานข้อมูล",
          detail: "สร้าง/อัพเดท KPI record ตามวันที่",
        },
        {
          icon: CheckCircle2,
          title: "Display Report",
          description: "แสดงผลในหน้า Analysis",
          detail: "กราฟ, ตาราง, การแจ้งเตือน",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gradient-pink mb-2">
          Sakura Biotech - System Workflow
        </h1>
        <p className="text-gray-400">
          แสดงการเชื่อมต่อและการไหลของข้อมูลทั้งระบบ
        </p>
      </div>

      <div className="space-y-8">
        {workflows.map((workflow, workflowIndex) => {
          const Icon = workflow.icon;
          return (
            <Card
              key={workflowIndex}
              className="premium-card border-2 border-purple-500/40"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-r ${workflow.color} flex items-center justify-center`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl">{workflow.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Workflow Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {workflow.steps.map((step, stepIndex) => {
                      const StepIcon = step.icon;
                      return (
                        <div key={stepIndex} className="relative">
                          {/* Connector Arrow */}
                          {stepIndex < workflow.steps.length - 1 && (
                            <div className="hidden md:block absolute top-8 -right-6 z-0">
                              <ArrowRight className="w-12 h-12 text-purple-500/30" />
                            </div>
                          )}

                          {/* Step Card */}
                          <div className="relative z-10 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500 transition-all">
                            {/* Step Number */}
                            <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white">
                              {stepIndex + 1}
                            </div>

                            {/* Icon */}
                            <div className="flex justify-center mb-3">
                              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <StepIcon className="w-6 h-6 text-purple-400" />
                              </div>
                            </div>

                            {/* Title */}
                            <h3 className="text-sm font-bold text-white text-center mb-2">
                              {step.title}
                            </h3>

                            {/* Description */}
                            <p className="text-xs text-gray-400 text-center mb-2">
                              {step.description}
                            </p>

                            {/* Detail */}
                            <div className="bg-purple-500/10 rounded p-2 border border-purple-500/20">
                              <p className="text-xs text-purple-200">
                                {step.detail}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Integration Overview */}
      <Card className="premium-card border-2 border-green-500/40 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            ระบบเชื่อมต่อครบถ้วน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-start gap-3 bg-slate-800 rounded-lg p-4 border border-green-500/30">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">LINE Integration</div>
                <div className="text-xs text-gray-400">
                  Webhook → Order → Stock Update
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800 rounded-lg p-4 border border-green-500/30">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Budget Management</div>
                <div className="text-xs text-gray-400">
                  Product Creation → Auto Deduction
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800 rounded-lg p-4 border border-green-500/30">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Revenue Tracking</div>
                <div className="text-xs text-gray-400">
                  Orders → Profit Calculation
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800 rounded-lg p-4 border border-green-500/30">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">KPI Analysis</div>
                <div className="text-xs text-gray-400">
                  Auto Calculate & Report
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
