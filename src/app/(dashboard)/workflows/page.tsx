"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRolePermissions } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Download, Workflow, ExternalLink, AlertCircle, Copy, CheckCircle2, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const workflowTemplates = {
  "profit-pilot": {
    id: "profit-pilot",
    name: "Profit Pilot Automation",
    description: "ตรวจสอบ CPA และหยุดโฆษณาอัตโนมัติ",
    category: "Profit Optimization",
    nodes: 5,
    workflow: {
      name: "Profit Pilot Automation",
      nodes: [
        {
          parameters: {
            httpMethod: "POST",
            path: "webhook-profit-pilot",
            responseMode: "responseNode",
          },
          id: "webhook-1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          position: [250, 300],
        },
        {
          parameters: {
            conditions: {
              number: [
                {
                  value1: "={{$json.cpa}}",
                  operation: "larger",
                  value2: 200,
                },
              ],
            },
          },
          id: "if-1",
          name: "Check CPA > 200",
          type: "n8n-nodes-base.if",
          position: [450, 300],
        },
        {
          parameters: {
            resource: "campaign",
            operation: "update",
            campaignId: "={{$json.campaignId}}",
            updateFields: {
              status: "PAUSED",
            },
          },
          id: "facebook-1",
          name: "Pause Campaign",
          type: "n8n-nodes-base.facebookAds",
          position: [650, 200],
        },
        {
          parameters: {
            message: "Campaign {{$json.campaignId}} paused due to high CPA ({{$json.cpa}})",
            options: {},
          },
          id: "notification-1",
          name: "Send Notification",
          type: "n8n-nodes-base.discord",
          position: [850, 200],
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: '={"success": true, "action": "campaign_paused"}',
          },
          id: "respond-1",
          name: "Respond to Webhook",
          type: "n8n-nodes-base.respondToWebhook",
          position: [1050, 300],
        },
      ],
      connections: {
        Webhook: {
          main: [[{ node: "Check CPA > 200", type: "main", index: 0 }]],
        },
        "Check CPA > 200": {
          main: [
            [{ node: "Pause Campaign", type: "main", index: 0 }],
            [{ node: "Respond to Webhook", type: "main", index: 0 }],
          ],
        },
        "Pause Campaign": {
          main: [[{ node: "Send Notification", type: "main", index: 0 }]],
        },
        "Send Notification": {
          main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]],
        },
      },
      settings: {
        executionOrder: "v1",
      },
    },
  },
  "scale-revenue": {
    id: "scale-revenue",
    name: "Scale Revenue & Optimize CPA",
    description: "เพิ่มงบโฆษณาเมื่อ ROAS ดี",
    category: "Growth",
    nodes: 7,
    workflow: {
      name: "Scale Revenue & Optimize CPA",
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "scale-revenue", responseMode: "responseNode" },
          id: "webhook-1",
          name: "Webhook",
          type: "n8n-nodes-base.webhook",
          position: [250, 300],
        },
        {
          parameters: {
            conditions: {
              number: [{ value1: "={{$json.roas}}", operation: "larger", value2: 3 }],
            },
          },
          id: "check-roas",
          name: "Check ROAS > 3",
          type: "n8n-nodes-base.if",
          position: [450, 300],
        },
        {
          parameters: {
            resource: "campaign",
            operation: "update",
            campaignId: "={{$json.campaignId}}",
            updateFields: { dailyBudget: "={{$json.currentBudget * 1.2}}" },
          },
          id: "increase-budget",
          name: "Increase Budget 20%",
          type: "n8n-nodes-base.facebookAds",
          position: [650, 200],
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: '={"success": true, "action": "budget_increased"}',
          },
          id: "respond-success",
          name: "Respond Success",
          type: "n8n-nodes-base.respondToWebhook",
          position: [850, 200],
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: '={"success": false, "action": "no_change"}',
          },
          id: "respond-no-change",
          name: "Respond No Change",
          type: "n8n-nodes-base.respondToWebhook",
          position: [650, 400],
        },
      ],
      connections: {
        Webhook: {
          main: [[{ node: "Check ROAS > 3", type: "main", index: 0 }]],
        },
        "Check ROAS > 3": {
          main: [
            [{ node: "Increase Budget 20%", type: "main", index: 0 }],
            [{ node: "Respond No Change", type: "main", index: 0 }],
          ],
        },
        "Increase Budget 20%": {
          main: [[{ node: "Respond Success", type: "main", index: 0 }]],
        },
      },
      settings: { executionOrder: "v1" },
    },
  },
  "lead-gen": {
    id: "lead-gen",
    name: "Lead Generation Flow",
    description: "ส่งลีดไป CRM อัตโนมัติ",
    category: "Lead Gen",
    nodes: 4,
    workflow: {
      name: "Lead Generation Flow",
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "leads", responseMode: "responseNode" },
          id: "webhook-1",
          name: "Form Webhook",
          type: "n8n-nodes-base.webhook",
          position: [250, 300],
        },
        {
          parameters: { operation: "append", sheetId: "YOUR_SHEET_ID", range: "A:E" },
          id: "google-sheets-1",
          name: "Save to Google Sheets",
          type: "n8n-nodes-base.googleSheets",
          position: [450, 250],
        },
        {
          parameters: { to: "={{$json.email}}", subject: "Thank you for your interest!", text: "We'll contact you soon." },
          id: "email-1",
          name: "Send Thank You Email",
          type: "n8n-nodes-base.gmail",
          position: [450, 350],
        },
        {
          parameters: { respondWith: "json", responseBody: '={"success": true}' },
          id: "respond-1",
          name: "Respond to Webhook",
          type: "n8n-nodes-base.respondToWebhook",
          position: [650, 300],
        },
      ],
      connections: {
        "Form Webhook": {
          main: [[{ node: "Save to Google Sheets", type: "main", index: 0 }, { node: "Send Thank You Email", type: "main", index: 0 }]],
        },
        "Save to Google Sheets": {
          main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]],
        },
      },
      settings: { executionOrder: "v1" },
    },
  },
  "ecommerce-order": {
    id: "ecommerce-order",
    name: "E-commerce Order Processing",
    description: "ประมวลผลออเดอร์และส่ง notification",
    category: "E-commerce",
    nodes: 6,
    workflow: {
      name: "E-commerce Order Processing",
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "orders", responseMode: "responseNode" },
          id: "webhook-1",
          name: "New Order Webhook",
          type: "n8n-nodes-base.webhook",
          position: [250, 300],
        },
        {
          parameters: { method: "POST", url: "YOUR_API/invoices", sendBody: true, bodyParametersJson: "={{$json}}" },
          id: "create-invoice",
          name: "Create Invoice",
          type: "n8n-nodes-base.httpRequest",
          position: [450, 200],
        },
        {
          parameters: { method: "PUT", url: "YOUR_API/products/{{$json.productId}}", sendBody: true, bodyParametersJson: '={"quantity": {{$json.newQuantity}}}' },
          id: "update-stock",
          name: "Update Stock",
          type: "n8n-nodes-base.httpRequest",
          position: [450, 400],
        },
        {
          parameters: { to: "={{$json.customerEmail}}", subject: "Order Confirmation #{{$json.orderId}}", text: "Your order has been confirmed!" },
          id: "notify-customer",
          name: "Notify Customer",
          type: "n8n-nodes-base.sendinblue",
          position: [650, 300],
        },
        {
          parameters: { respondWith: "json", responseBody: '={"success": true, "orderId": "{{$json.orderId}}"}' },
          id: "respond-1",
          name: "Respond to Webhook",
          type: "n8n-nodes-base.respondToWebhook",
          position: [850, 300],
        },
      ],
      connections: {
        "New Order Webhook": {
          main: [[{ node: "Create Invoice", type: "main", index: 0 }, { node: "Update Stock", type: "main", index: 0 }]],
        },
        "Create Invoice": {
          main: [[{ node: "Notify Customer", type: "main", index: 0 }]],
        },
        "Notify Customer": {
          main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]],
        },
      },
      settings: { executionOrder: "v1" },
    },
  },
  "low-stock-alert": {
    id: "low-stock-alert",
    name: "Low Stock Alert",
    description: "แจ้งเตือนสินค้าใกล้หมด",
    category: "Inventory",
    nodes: 3,
    workflow: {
      name: "Low Stock Alert",
      nodes: [
        {
          parameters: { rule: { interval: [{ field: "cronExpression", expression: "0 9 * * *" }] } },
          id: "schedule-1",
          name: "Daily at 9 AM",
          type: "n8n-nodes-base.scheduleTrigger",
          position: [250, 300],
        },
        {
          parameters: { method: "GET", url: "YOUR_API/products?stock=low" },
          id: "check-stock",
          name: "Check Low Stock",
          type: "n8n-nodes-base.httpRequest",
          position: [450, 300],
        },
        {
          parameters: { to: "admin@yourstore.com", subject: "⚠️ Low Stock Alert", text: "Products running low: {{$json.products}}" },
          id: "send-alert",
          name: "Send Alert Email",
          type: "n8n-nodes-base.gmail",
          position: [650, 300],
        },
      ],
      connections: {
        "Daily at 9 AM": {
          main: [[{ node: "Check Low Stock", type: "main", index: 0 }]],
        },
        "Check Low Stock": {
          main: [[{ node: "Send Alert Email", type: "main", index: 0 }]],
        },
      },
      settings: { executionOrder: "v1" },
    },
  },
  custom: {
    id: "custom",
    name: "Custom Workflow",
    description: "สร้าง workflow ของคุณเอง",
    category: "Custom",
    nodes: 0,
    workflow: {
      name: "Custom Workflow",
      nodes: [
        {
          parameters: { httpMethod: "POST", path: "custom", responseMode: "responseNode" },
          id: "webhook-1",
          name: "Start",
          type: "n8n-nodes-base.webhook",
          position: [250, 300],
        },
      ],
      connections: {},
      settings: { executionOrder: "v1" },
    },
  },
};

export default function WorkflowsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof workflowTemplates>("profit-pilot");
  const [webhookDomain, setWebhookDomain] = useState("https://your-n8n-instance.com");
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [copiedURL, setCopiedURL] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Check RBAC permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/me");

        if (!response.ok) {
          // User not authenticated
          router.push("/");
          return;
        }

        const user = await response.json();
        const permissions = getRolePermissions(user.role);

        if (!permissions.canAccessWorkflows) {
          setIsAuthorized(false);
          router.push("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking permissions:", error);
        // On error, redirect to home as a safety measure
        router.push("/");
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, [router]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-12 w-12 border-4 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Return null if not authorized (redirect will happen in useEffect)
  if (!isAuthorized) {
    return null;
  }

  const currentTemplate = workflowTemplates[selectedTemplate];
  const webhookURL = `${webhookDomain}/webhook/${currentTemplate.id}`;

  const handleExport = () => {
    const workflow = {
      ...currentTemplate.workflow,
      active: false,
      id: Date.now(),
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `n8n-workflow-${currentTemplate.id}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "ดาวน์โหลดสำเร็จ!",
      description: "นำไฟล์ JSON ไป import ใน n8n.io",
    });
  };

  const handleCopyJSON = async () => {
    const workflow = {
      ...currentTemplate.workflow,
      active: false,
      id: Date.now(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
      setCopiedJSON(true);
      toast({
        title: "คัดลอกแล้ว!",
        description: "Workflow JSON ถูกคัดลอกไปยัง clipboard",
      });
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกได้",
        variant: "destructive",
      });
    }
  };

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(webhookURL);
      setCopiedURL(true);
      toast({
        title: "คัดลอก URL แล้ว!",
        description: "Webhook URL ถูกคัดลอกไปยัง clipboard",
      });
      setTimeout(() => setCopiedURL(false), 2000);
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถคัดลอกได้",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-800">
            <Workflow className="h-8 w-8 text-blue-600" />
            n8n Workflow Generator
          </h1>
          <p className="text-gray-600 mt-2">สร้าง Workflow JSON สำหรับ n8n โดยอัตโนมัติ 🔄</p>
        </div>

        {/* Template Selector */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">เลือก Template</CardTitle>
            <CardDescription className="text-gray-600 font-medium">เลือก Workflow Template ที่ต้องการ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Select
              value={selectedTemplate}
              onValueChange={(value) => setSelectedTemplate(value as keyof typeof workflowTemplates)}
            >
              <SelectTrigger className="bg-white border-2 border-gray-300 text-gray-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit-pilot">Profit Pilot Automation</SelectItem>
                <SelectItem value="scale-revenue">Scale Revenue & Optimize CPA</SelectItem>
                <SelectItem value="lead-gen">Lead Generation Flow</SelectItem>
                <SelectItem value="ecommerce-order">E-commerce Order Processing</SelectItem>
                <SelectItem value="low-stock-alert">Low Stock Alert</SelectItem>
                <SelectItem value="custom">Custom Workflow</SelectItem>
              </SelectContent>
            </Select>

            {/* Template Info Card - High Contrast */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 md:p-6 rounded-xl border-2 border-cyan-300">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg md:text-xl text-gray-800">{currentTemplate.name}</h3>
                  <p className="text-sm text-gray-700 font-medium">{currentTemplate.description}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge className="bg-purple-500 text-white border-0 font-semibold">{currentTemplate.category}</Badge>
                    <Badge className="bg-blue-500 text-white border-0 font-semibold">{currentTemplate.nodes} nodes</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook URL Generator */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-800">
              <Link2 className="h-5 w-5 text-blue-600" />
              Webhook URL Generator
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">กำหนด URL ของ n8n instance และสร้าง webhook URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">n8n Instance URL</Label>
              <Input
                value={webhookDomain}
                onChange={(e) => setWebhookDomain(e.target.value)}
                placeholder="https://your-n8n-instance.com"
                className="bg-white border-2 border-gray-300 text-gray-800 placeholder:text-gray-400 focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
              />
              <p className="text-xs text-gray-600 font-medium">
                ใส่ URL ของ n8n instance ของคุณ (เช่น https://app.n8n.cloud หรือ self-hosted URL)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Webhook URL สำหรับ Template นี้</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={webhookURL}
                  readOnly
                  className="font-mono text-sm bg-gray-50 border-2 border-gray-300 text-gray-800"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyURL}
                  className="w-full sm:w-auto flex-shrink-0 border-2 border-green-300 text-green-600 hover:bg-green-50"
                >
                  {copiedURL ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-600 font-medium">
                ใช้ URL นี้ในการเรียก webhook หลังจาก import workflow ใน n8n แล้ว
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Node List Accordion */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">📋 รายละเอียด Workflow</CardTitle>
            <CardDescription className="text-gray-600 font-medium">โครงสร้าง Nodes และ Connections</CardDescription>
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
                      <div key={node.id} className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                        <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-800">{node.name}</p>
                          <p className="text-xs text-gray-600 font-medium">{node.type}</p>
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
                <AccordionTrigger className="text-gray-800 font-semibold">JSON Preview</AccordionTrigger>
                <AccordionContent>
                  <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto">
                    <pre className="text-xs text-green-400 font-mono">
                      <code>{JSON.stringify(currentTemplate.workflow, null, 2)}</code>
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
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">Export Workflow</CardTitle>
            <CardDescription className="text-gray-600 font-medium">ดาวน์โหลดหรือคัดลอก JSON เพื่อนำไป import ใน n8n</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                💡 <strong>คำแนะนำ:</strong> หลังดาวน์โหลดหรือคัดลอกแล้ว ไปที่ n8n.io → Workflows →
                Import from File/Clipboard
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-bold text-gray-800">
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
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{step.title}</h4>
                    <p className="text-gray-600 font-medium mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-xl mt-4">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ <strong>หมายเหตุ:</strong> อย่าลืมแทนที่ค่า Placeholder เช่น YOUR_SHEET_ID,
                YOUR_API เป็นค่าจริงของคุณหลังจาก import workflow แล้ว
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="bg-white border-2 border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100 bg-gray-50">
            <CardTitle className="text-lg md:text-xl font-bold text-gray-800">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <a
                href="https://n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl transition-all border-2 border-purple-200 hover:border-purple-300"
              >
                <span className="font-bold text-sm text-gray-800">n8n.io</span>
                <ExternalLink className="h-4 w-4 text-purple-600" />
              </a>
              <a
                href="https://docs.n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all border-2 border-blue-200 hover:border-blue-300"
              >
                <span className="font-bold text-sm text-gray-800">n8n Documentation</span>
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </a>
              <a
                href="https://community.n8n.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all border-2 border-green-200 hover:border-green-300"
              >
                <span className="font-bold text-sm text-gray-800">n8n Community</span>
                <ExternalLink className="h-4 w-4 text-green-600" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
