"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Check,
  AlertTriangle,
  Settings,
  Link2,
  Workflow as WorkflowIcon,
  CheckCircle2,
  Copy,
  Download,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

// ----------------------
// Types & Templates
// ----------------------

type TemplateKey =
  | "profit-pilot"
  | "scale-revenue"
  | "lead-gen"
  | "ecommerce-order"
  | "low-stock-alert"
  | "custom";

interface SimpleNode {
  id: string;
  name: string;
  type: string;
}

interface SimpleWorkflow {
  name: string;
  nodes: SimpleNode[];
  connections: any[];
}

interface WorkflowTemplate {
  id: TemplateKey;
  name: string;
  description: string;
  category: string;
  nodes: number;
  workflow: SimpleWorkflow;
}

const workflowTemplates: Record<TemplateKey, WorkflowTemplate> = {
  "profit-pilot": {
    id: "profit-pilot",
    name: "Profit Pilot Automation",
    description:
      "เชื่อมข้อมูลโฆษณากับยอดขายเพื่อตัดสินใจเพิ่ม/ลดงบแบบอัตโนมัติจาก ROAS / CPA",
    category: "Performance / Scaling",
    nodes: 5,
    workflow: {
      name: "Profit Pilot Automation",
      nodes: [
        {
          id: "1",
          name: "Cron Trigger",
          type: "n8n-nodes-base.cron",
        },
        {
          id: "2",
          name: "Fetch Ads Metrics",
          type: "n8n-nodes-base.httpRequest",
        },
        {
          id: "3",
          name: "Fetch Sales Data",
          type: "n8n-nodes-base.httpRequest",
        },
        {
          id: "4",
          name: "Calculate ROAS / CPA",
          type: "n8n-nodes-base.function",
        },
        {
          id: "5",
          name: "Adjust Budgets",
          type: "n8n-nodes-base.httpRequest",
        },
      ],
      connections: [],
    },
  },
  "scale-revenue": {
    id: "scale-revenue",
    name: "Scale Revenue & Optimize CPA",
    description:
      "เพิ่มงบแคมเปญที่กำไรดี และลด/หยุดแคมเปญที่ CPA สูงเกินเป้าแบบอัตโนมัติ",
    category: "Scaling",
    nodes: 4,
    workflow: {
      name: "Scale Revenue & Optimize CPA",
      nodes: [
        {
          id: "1",
          name: "Cron Trigger",
          type: "n8n-nodes-base.cron",
        },
        {
          id: "2",
          name: "Get Campaign Metrics",
          type: "n8n-nodes-base.httpRequest",
        },
        {
          id: "3",
          name: "Decide Action (Scale / Pause)",
          type: "n8n-nodes-base.function",
        },
        {
          id: "4",
          name: "Update Campaign Budget",
          type: "n8n-nodes-base.httpRequest",
        },
      ],
      connections: [],
    },
  },
  "lead-gen": {
    id: "lead-gen",
    name: "Lead Generation Flow",
    description:
      "ดึง Leads จาก Facebook / TikTok แล้วส่งเข้า Google Sheets / CRM พร้อมแจ้งเตือน",
    category: "Lead Generation",
    nodes: 4,
    workflow: {
      name: "Lead Generation Flow",
      nodes: [
        {
          id: "1",
          name: "Webhook (Receive Lead)",
          type: "n8n-nodes-base.webhook",
        },
        {
          id: "2",
          name: "Save to Google Sheets",
          type: "n8n-nodes-base.googleSheets",
        },
        {
          id: "3",
          name: "Send Notification to Slack",
          type: "n8n-nodes-base.slack",
        },
        {
          id: "4",
          name: "Send Lead to CRM",
          type: "n8n-nodes-base.httpRequest",
        },
      ],
      connections: [],
    },
  },
  "ecommerce-order": {
    id: "ecommerce-order",
    name: "E-commerce Order Processing",
    description:
      "รับออเดอร์จากร้านค้าออนไลน์ แล้วอัปเดตสต็อก + แจ้งทีม + ส่งข้อมูลไปยัง ERP",
    category: "E-commerce / Ops",
    nodes: 5,
    workflow: {
      name: "E-commerce Order Processing",
      nodes: [
        {
          id: "1",
          name: "Webhook (New Order)",
          type: "n8n-nodes-base.webhook",
        },
        {
          id: "2",
          name: "Update Inventory",
          type: "n8n-nodes-base.httpRequest",
        },
        {
          id: "3",
          name: "Send Discord / Slack Notification",
          type: "n8n-nodes-base.slack",
        },
        {
          id: "4",
          name: "Push to Google Sheets",
          type: "n8n-nodes-base.googleSheets",
        },
        {
          id: "5",
          name: "Sync to ERP",
          type: "n8n-nodes-base.httpRequest",
        },
      ],
      connections: [],
    },
  },
  "low-stock-alert": {
    id: "low-stock-alert",
    name: "Low Stock Alert",
    description:
      "เช็คสต็อกสินค้าตามเวลา ถ้าต่ำกว่าเกณฑ์ → แจ้งเตือน + ติด tag / อัปเดต status",
    category: "Inventory / Alerting",
    nodes: 4,
    workflow: {
      name: "Low Stock Alert",
      nodes: [
        {
          id: "1",
          name: "Cron Trigger (Every 2 hours)",
          type: "n8n-nodes-base.cron",
        },
        {
          id: "2",
          name: "Get Inventory",
          type: "n8n-nodes-base.httpRequest",
        },
        {
          id: "3",
          name: "Filter Low Stock",
          type: "n8n-nodes-base.function",
        },
        {
          id: "4",
          name: "Send Notification",
          type: "n8n-nodes-base.slack",
        },
      ],
      connections: [],
    },
  },
  custom: {
    id: "custom",
    name: "Custom Workflow",
    description:
      "เริ่มจากโครงเปล่า แล้วค่อยปรับ nodes / connections เองใน n8n",
    category: "Custom",
    nodes: 1,
    workflow: {
      name: "Custom Workflow",
      nodes: [
        {
          id: "1",
          name: "Start Here",
          type: "n8n-nodes-base.manualTrigger",
        },
      ],
      connections: [],
    },
  },
};

// ----------------------
// Component
// ----------------------

export default function WorkflowsPage() {
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateKey>("profit-pilot");
  const [webhookDomain, setWebhookDomain] = useState(
    "https://your-n8n-instance.com"
  );
  const [copiedURL, setCopiedURL] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);

  const currentTemplate = useMemo(
    () => workflowTemplates[selectedTemplate],
    [selectedTemplate]
  );

  const webhookURL = useMemo(() => {
    if (!webhookDomain) return "";
    const cleanDomain = webhookDomain.replace(/\/$/, "");
    // ตัวอย่าง path: /webhook/profit-pilot
    return `${cleanDomain}/webhook/${currentTemplate.id}`;
  }, [webhookDomain, currentTemplate.id]);

  const handleCopyURL = async () => {
    if (!webhookURL) return;
    try {
      await navigator.clipboard.writeText(webhookURL);
      setCopiedURL(true);
      setTimeout(() => setCopiedURL(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyJSON = async () => {
    try {
      const json = JSON.stringify(currentTemplate.workflow, null, 2);
      await navigator.clipboard.writeText(json);
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(currentTemplate.workflow, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTemplate.id}-workflow.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-800">
            <WorkflowIcon className="h-8 w-8 text-blue-600" />
            n8n Workflow Generator
          </h1>
          <p className="text-gray-600 mt-2">
            สร้าง Workflow JSON สำหรับ n8n โดยอัตโนมัติ 🔄
          </p>
        </div>

        {/* Template Selector */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-xl font-bold text-gray-800">
              เลือก Template
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              เลือก Workflow Template ที่ต้องการ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Select
              value={selectedTemplate}
              onValueChange={(value) =>
                setSelectedTemplate(value as TemplateKey)
              }
            >
              <SelectTrigger className="bg-white border-2 border-gray-300 text-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit-pilot">
                  Profit Pilot Automation
                </SelectItem>
                <SelectItem value="scale-revenue">
                  Scale Revenue &amp; Optimize CPA
                </SelectItem>
                <SelectItem value="lead-gen">Lead Generation Flow</SelectItem>
                <SelectItem value="ecommerce-order">
                  E-commerce Order Processing
                </SelectItem>
                <SelectItem value="low-stock-alert">
                  Low Stock Alert
                </SelectItem>
                <SelectItem value="custom">Custom Workflow</SelectItem>
              </SelectContent>
            </Select>

            {/* Template Info Card - High Contrast */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-6 rounded-xl border-2 border-cyan-300">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <h3 className="font-bold text-xl text-gray-800">
                    {currentTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-700 font-medium">
                    {currentTemplate.description}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-purple-500 text-white border-0 font-semibold">
                      {currentTemplate.category}
                    </Badge>
                    <Badge className="bg-blue-500 text-white border-0 font-semibold">
                      {currentTemplate.nodes} nodes
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook URL Generator */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <Link2 className="h-5 w-5 text-blue-600" />
              Webhook URL Generator
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              กำหนด URL ของ n8n instance และสร้าง webhook URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                n8n Instance URL
              </Label>
              <Input
                value={webhookDomain}
                onChange={(e) => setWebhookDomain(e.target.value)}
                placeholder="https://your-n8n-instance.com"
                className="bg-white border-2 border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
              <p className="text-xs text-gray-600 font-medium">
                ใส่ URL ของ n8n instance ของคุณ (เช่น
                https://app.n8n.cloud หรือ self-hosted URL)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                Webhook URL สำหรับ Template นี้
              </Label>
              <div className="flex gap-2">
                <Input
                  value={webhookURL}
                  readOnly
                  className="font-mono text-sm bg-gray-50 border-2 border-gray-300 text-gray-800"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyURL}
                  className="flex-shrink-0 border-2 border-green-300 text-green-600 hover:bg-green-50"
                >
                  {copiedURL ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600 font-medium">
                ใช้ URL นี้ในการเรียก webhook หลังจาก import workflow ใน
                n8n แล้ว
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Node List Accordion */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-xl font-bold text-gray-800">
              📋 รายละเอียด Workflow
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              โครงสร้าง Nodes และ Connections
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="nodes">
                <AccordionTrigger className="text-gray-800 font-semibold">
                  Node List ({currentTemplate.workflow.nodes.length} nodes)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {currentTemplate.workflow.nodes.map((node, idx) => (
                      <div
                        key={node.id}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200"
                      >
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-800">
                            {node.name}
                          </p>
                          <p className="text-xs text-gray-600 font-medium">
                            {node.type}
                          </p>
                        </div>
                        <Badge className="text-xs bg-purple-500 text-white border-0 font-semibold">
                          {node.type.split(".").pop()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="json">
                <AccordionTrigger className="text-gray-800 font-semibold">
                  JSON Preview
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                    <pre className="text-xs text-green-400 font-mono">
                      <code>
                        {JSON.stringify(currentTemplate.workflow, null, 2)}
                      </code>
                    </pre>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Export Buttons */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-xl font-bold text-gray-800">
              Export Workflow
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              ดาวน์โหลดหรือคัดลอก JSON เพื่อนำไป import ใน n8n
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleExport}
                size="lg"
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white border-0 shadow-md font-semibold"
              >
                <Download className="h-5 w-5 mr-2" />
                ดาวน์โหลด JSON
              </Button>
              <Button
                onClick={handleCopyJSON}
                variant="outline"
                size="lg"
                className="w-full border-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold"
              >
                {copiedJSON ? (
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                ) : (
                  <Copy className="h-5 w-5 mr-2" />
                )}
                {copiedJSON ? "คัดลอกแล้ว!" : "คัดลอก JSON"}
              </Button>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-xl">
              <p className="text-sm text-blue-800 font-medium">
                💡 <strong>คำแนะนำ:</strong>{" "}
                หลังดาวน์โหลดหรือคัดลอกแล้ว ไปที่ n8n.io → Workflows → Import
                from File/Clipboard
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-gray-800">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              💡 วิธีใช้งาน
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4 text-sm">
              {[
                {
                  title: "คลิก 'ดาวน์โหลด JSON'",
                  desc: "ดาวน์โหลดไฟล์ JSON ของ workflow ที่เลือก",
                },
                {
                  title: "เปิด n8n.io",
                  desc: "ไปที่ n8n.io และเข้าสู่ระบบ (หรือสมัครใหม่ถ้ายังไม่มีบัญชี)",
                },
                {
                  title: "Import workflow",
                  desc: "ไปที่ Workflows → Import from File → เลือกไฟล์ JSON ที่ดาวน์โหลด",
                },
                {
                  title: "ตั้งค่า credentials",
                  desc: "กรอก API Keys สำหรับ Facebook Ads, Google Sheets, Discord ฯลฯ",
                },
                {
                  title: "Activate!",
                  desc: "คลิกสวิตช์ Active ที่มุมบนขวาเพื่อเปิดใช้งาน workflow",
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{step.title}</h4>
                    <p className="text-gray-600 font-medium mt-1">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-xl mt-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ <strong>หมายเหตุ:</strong> อย่าลืมแทนที่ค่า Placeholder เช่น
                YOUR_SHEET_ID, YOUR_API เป็นค่าจริงของคุณหลังจาก import
                workflow แล้ว
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-xl font-bold text-gray-800">
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="https://n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all border-2 border-purple-200 hover:border-purple-300"
              >
                <span className="font-bold text-sm text-gray-800">
                  n8n.io
                </span>
                <ExternalLink className="h-4 w-4 text-purple-600" />
              </a>
              <a
                href="https://docs.n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all border-2 border-blue-200 hover:border-blue-300"
              >
                <span className="font-bold text-sm text-gray-800">
                  n8n Documentation
                </span>
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </a>
              <a
                href="https://community.n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all border-2 border-green-200 hover:border-green-300"
              >
                <span className="font-bold text-sm text-gray-800">
                  n8n Community
                </span>
                <ExternalLink className="h-4 w-4 text-green-600" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
