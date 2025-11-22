"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Workflow, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const workflowTemplates = {
  "profit-pilot": {
    name: "Profit Pilot Automation",
    description: "ระบบอัตโนมัติสำหรับคำนวณกำไรและ ROI",
    nodes: [
      {
        id: "webhook",
        type: "n8n-nodes-base.webhook",
        name: "Webhook",
        position: [250, 300],
        parameters: { path: "profit-pilot", method: "POST" },
      },
      {
        id: "check-roi",
        type: "n8n-nodes-base.if",
        name: "Check ROI > 200%",
        position: [450, 300],
        parameters: { conditions: { number: [{ value1: "{{$json.roi}}", operation: "larger", value2: 200 }] } },
      },
      {
        id: "send-notification",
        type: "n8n-nodes-base.telegram",
        name: "Send Alert",
        position: [650, 300],
        parameters: { chatId: "YOUR_CHAT_ID", text: "✅ ROI เกิน 200%!" },
      },
    ],
    connections: {
      webhook: { main: [[{ node: "check-roi", type: "main", index: 0 }]] },
      "check-roi": { main: [[{ node: "send-notification", type: "main", index: 0 }]] },
    },
  },
  "scale-revenue": {
    name: "Scale Revenue & Optimize CPA",
    description: "เพิ่มงบโฆษณาอัตโนมัติเมื่อ CPA ต่ำกว่าเป้าหมาย",
    nodes: [
      {
        id: "webhook",
        type: "n8n-nodes-base.webhook",
        name: "Webhook",
        position: [250, 300],
        parameters: { path: "scale-revenue", method: "POST" },
      },
      {
        id: "check-cpa",
        type: "n8n-nodes-base.if",
        name: "Check CPA < 150",
        position: [450, 300],
        parameters: { conditions: { number: [{ value1: "{{$json.cpa}}", operation: "smaller", value2: 150 }] } },
      },
      {
        id: "facebook-ads",
        type: "n8n-nodes-base.facebookAds",
        name: "Increase Budget 20%",
        position: [650, 300],
        parameters: { operation: "updateCampaign", budgetIncrease: 20 },
      },
    ],
    connections: {
      webhook: { main: [[{ node: "check-cpa", type: "main", index: 0 }]] },
      "check-cpa": { main: [[{ node: "facebook-ads", type: "main", index: 0 }]] },
    },
  },
  "lead-generation": {
    name: "Lead Generation Flow",
    description: "รับ Lead จาก Form แล้วส่งไป Google Sheets และ Email",
    nodes: [
      {
        id: "webhook",
        type: "n8n-nodes-base.webhook",
        name: "Form Webhook",
        position: [250, 300],
        parameters: { path: "leads", method: "POST" },
      },
      {
        id: "google-sheets",
        type: "n8n-nodes-base.googleSheets",
        name: "Save to Sheets",
        position: [450, 250],
        parameters: { operation: "append", sheetId: "YOUR_SHEET_ID" },
      },
      {
        id: "send-email",
        type: "n8n-nodes-base.gmail",
        name: "Send Email",
        position: [450, 350],
        parameters: { to: "{{$json.email}}", subject: "Thank you!" },
      },
    ],
    connections: {
      webhook: { main: [[{ node: "google-sheets", type: "main", index: 0 }, { node: "send-email", type: "main", index: 0 }]] },
    },
  },
  "ecommerce-order": {
    name: "E-commerce Order Processing",
    description: "ประมวลผลออเดอร์ สร้างใบเสร็จ และอัพเดตสต็อก",
    nodes: [
      {
        id: "webhook",
        type: "n8n-nodes-base.webhook",
        name: "Order Webhook",
        position: [250, 300],
        parameters: { path: "orders", method: "POST" },
      },
      {
        id: "create-invoice",
        type: "n8n-nodes-base.http",
        name: "Create Invoice",
        position: [450, 250],
        parameters: { method: "POST", url: "YOUR_API/invoices" },
      },
      {
        id: "update-stock",
        type: "n8n-nodes-base.http",
        name: "Update Stock",
        position: [450, 350],
        parameters: { method: "PUT", url: "YOUR_API/products/{{$json.productId}}" },
      },
      {
        id: "notify-customer",
        type: "n8n-nodes-base.sendinblue",
        name: "Send Confirmation",
        position: [650, 300],
        parameters: { to: "{{$json.customerEmail}}" },
      },
    ],
    connections: {
      webhook: { main: [[{ node: "create-invoice", type: "main", index: 0 }, { node: "update-stock", type: "main", index: 0 }]] },
      "create-invoice": { main: [[{ node: "notify-customer", type: "main", index: 0 }]] },
    },
  },
  custom: {
    name: "Custom",
    description: "สร้าง Workflow ของคุณเอง",
    nodes: [
      {
        id: "webhook",
        type: "n8n-nodes-base.webhook",
        name: "Start",
        position: [250, 300],
        parameters: { path: "custom", method: "POST" },
      },
    ],
    connections: {},
  },
};

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof workflowTemplates>("profit-pilot");

  const currentTemplate = workflowTemplates[selectedTemplate];

  const handleExport = () => {
    const workflow = {
      name: currentTemplate.name,
      nodes: currentTemplate.nodes,
      connections: currentTemplate.connections,
      active: false,
      settings: {},
      id: Date.now(),
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `n8n-workflow-${selectedTemplate}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "ดาวน์โหลดสำเร็จ!",
      description: "นำไฟล์ JSON ไป import ใน n8n.io",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Workflow Generator (n8n Integration)</h1>
        <p className="text-muted-foreground">สร้าง Workflow อัตโนมัติด้วย n8n</p>
      </div>

      {/* Template Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            เลือก Template
          </CardTitle>
          <CardDescription>เลือก Workflow Template ที่ต้องการ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as keyof typeof workflowTemplates)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit-pilot">Profit Pilot Automation</SelectItem>
              <SelectItem value="scale-revenue">Scale Revenue & Optimize CPA</SelectItem>
              <SelectItem value="lead-generation">Lead Generation Flow</SelectItem>
              <SelectItem value="ecommerce-order">E-commerce Order Processing</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">{currentTemplate.name}</h3>
            <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview Workflow</CardTitle>
          <CardDescription>โครงสร้าง Nodes และ Connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs text-green-400">
                <code>{JSON.stringify({ name: currentTemplate.name, nodes: currentTemplate.nodes, connections: currentTemplate.connections }, null, 2)}</code>
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Nodes ในWorkflow:</h3>
              <div className="flex flex-wrap gap-2">
                {currentTemplate.nodes.map((node) => (
                  <Badge key={node.id} variant="secondary">
                    {node.name} ({node.type.split(".").pop()})
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Button */}
      <Card>
        <CardHeader>
          <CardTitle>Export Workflow</CardTitle>
          <CardDescription>ดาวน์โหลดไฟล์ JSON เพื่อนำไป import ใน n8n</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleExport} size="lg" className="w-full">
            <Download className="h-5 w-5 mr-2" />
            ดาวน์โหลด Workflow JSON
          </Button>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>คำแนะนำ:</strong> หลังดาวน์โหลดแล้ว ไปที่ n8n.io → Workflows → Import from File → เลือกไฟล์ JSON ที่ดาวน์โหลด
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            วิธีใช้งาน n8n Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold">สร้างบัญชี n8n</h4>
                <p className="text-muted-foreground">
                  ไปที่{" "}
                  <a href="https://n8n.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    n8n.io <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  และสร้างบัญชี (มี Free Plan)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold">ดาวน์โหลด Workflow Template</h4>
                <p className="text-muted-foreground">เลือก Template ด้านบนแล้วคลิก "ดาวน์โหลด Workflow JSON"</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Import Workflow ใน n8n</h4>
                <p className="text-muted-foreground">ไปที่ Workflows → Import from File → เลือกไฟล์ JSON</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold">ตั้งค่า Credentials</h4>
                <p className="text-muted-foreground">กรอก API Keys สำหรับ Facebook Ads, Google Sheets, Email ฯลฯ</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                5
              </div>
              <div>
                <h4 className="font-semibold">Activate Workflow</h4>
                <p className="text-muted-foreground">คลิกสวิตช์ "Active" ที่มุมบนขวาเพื่อเปิดใช้งาน</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                6
              </div>
              <div>
                <h4 className="font-semibold">ทดสอบ Workflow</h4>
                <p className="text-muted-foreground">คลิก "Test Workflow" เพื่อทดสอบการทำงาน</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mt-4">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>หมายเหตุ:</strong> Template เหล่านี้เป็นแนวทางพื้นฐาน คุณสามารถปรับแต่งเพิ่มเติมใน n8n ได้ตามต้องการ
              อย่าลืมแทนที่ค่า Placeholder เช่น YOUR_SHEET_ID, YOUR_API เป็นค่าจริงของคุณ
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-sm">n8n.io</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="https://docs.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-sm">n8n Documentation</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
            <a
              href="https://community.n8n.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <span className="font-medium text-sm">n8n Community</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
