import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting workflow templates seed...');

  const workflows = [
    {
      name: 'Profit Pilot Automation',
      description: 'ระบบอัตโนมัติสำหรับคำนวณกำไรและ ROI พร้อมส่งการแจ้งเตือนเมื่อ ROI ต่ำกว่าเป้าหมาย',
      category: 'Profit',
      template: {
        name: 'Profit Pilot Automation',
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            name: 'Webhook',
            position: [250, 300],
            parameters: {
              path: 'profit-pilot',
              method: 'POST',
            },
          },
          {
            id: 'check-roi',
            type: 'n8n-nodes-base.if',
            name: 'Check ROI > 200%',
            position: [450, 300],
            parameters: {
              conditions: {
                number: [
                  {
                    value1: '={{$json.roi}}',
                    operation: 'larger',
                    value2: 200,
                  },
                ],
              },
            },
          },
          {
            id: 'send-success',
            type: 'n8n-nodes-base.sendEmail',
            name: 'Send Success Email',
            position: [650, 200],
            parameters: {
              toEmail: 'admin@example.com',
              subject: '🎉 ROI เกินเป้า!',
              text: 'ROI ของคุณอยู่ที่ {{$json.roi}}%',
            },
          },
          {
            id: 'send-alert',
            type: 'n8n-nodes-base.sendEmail',
            name: 'Send Alert',
            position: [650, 400],
            parameters: {
              toEmail: 'admin@example.com',
              subject: '⚠️ ROI ต่ำกว่าเป้า',
              text: 'ROI ของคุณอยู่ที่ {{$json.roi}}%',
            },
          },
        ],
        connections: {
          webhook: {
            main: [
              [
                {
                  node: 'check-roi',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
          'check-roi': {
            main: [
              [
                {
                  node: 'send-success',
                  type: 'main',
                  index: 0,
                },
              ],
              [
                {
                  node: 'send-alert',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
        },
        active: false,
        settings: {},
      },
    },
    {
      name: 'Scale Revenue & Optimize CPA',
      description: 'ตรวจสอบ CPA และปรับงบโฆษณาอัตโนมัติ หาก CPA > 200 บาท ลดงบ 10%, หาก CPA < 100 บาท เพิ่มงบ 20%',
      category: 'Profit',
      template: {
        name: 'Scale Revenue & Optimize CPA',
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            name: 'Webhook',
            position: [250, 300],
            parameters: {
              path: 'optimize-cpa',
              method: 'POST',
            },
          },
          {
            id: 'check-cpa',
            type: 'n8n-nodes-base.switch',
            name: 'Check CPA',
            position: [450, 300],
            parameters: {
              rules: {
                rules: [
                  {
                    output: 0,
                    value1: '={{$json.cpa}}',
                    operation: 'larger',
                    value2: 200,
                  },
                  {
                    output: 1,
                    value1: '={{$json.cpa}}',
                    operation: 'smaller',
                    value2: 100,
                  },
                ],
              },
            },
          },
          {
            id: 'decrease-budget',
            type: 'n8n-nodes-base.httpRequest',
            name: 'Decrease Budget -10%',
            position: [650, 200],
            parameters: {
              url: '={{$json.api_url}}/budget/decrease',
              method: 'POST',
              body: {
                percentage: 10,
              },
            },
          },
          {
            id: 'increase-budget',
            type: 'n8n-nodes-base.httpRequest',
            name: 'Increase Budget +20%',
            position: [650, 400],
            parameters: {
              url: '={{$json.api_url}}/budget/increase',
              method: 'POST',
              body: {
                percentage: 20,
              },
            },
          },
        ],
        connections: {
          webhook: {
            main: [
              [
                {
                  node: 'check-cpa',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
          'check-cpa': {
            main: [
              [
                {
                  node: 'decrease-budget',
                  type: 'main',
                  index: 0,
                },
              ],
              [
                {
                  node: 'increase-budget',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
        },
        active: false,
        settings: {},
      },
    },
    {
      name: 'Lead Generation Flow',
      description: 'รับข้อมูล Lead จากฟอร์ม → บันทึกใน Google Sheets → ส่งอีเมลแจ้งเตือนทีมขาย',
      category: 'Lead Gen',
      template: {
        name: 'Lead Generation Flow',
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            name: 'Form Webhook',
            position: [250, 300],
            parameters: {
              path: 'lead-gen',
              method: 'POST',
            },
          },
          {
            id: 'google-sheets',
            type: 'n8n-nodes-base.googleSheets',
            name: 'Save to Google Sheets',
            position: [450, 300],
            parameters: {
              operation: 'append',
              sheetId: 'YOUR_SHEET_ID',
              range: 'A:E',
            },
          },
          {
            id: 'send-email',
            type: 'n8n-nodes-base.sendEmail',
            name: 'Notify Sales Team',
            position: [650, 300],
            parameters: {
              toEmail: 'sales@example.com',
              subject: '🎯 New Lead: {{$json.name}}',
              text: 'Email: {{$json.email}}\nPhone: {{$json.phone}}',
            },
          },
        ],
        connections: {
          webhook: {
            main: [
              [
                {
                  node: 'google-sheets',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
          'google-sheets': {
            main: [
              [
                {
                  node: 'send-email',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
        },
        active: false,
        settings: {},
      },
    },
    {
      name: 'E-commerce Order Processing',
      description: 'ระบบจัดการคำสั่งซื้อ: สร้างใบแจ้งหนี้ → อัพเดทสต็อก → ส่งการแจ้งเตือนให้ลูกค้า',
      category: 'E-commerce',
      template: {
        name: 'E-commerce Order Processing',
        nodes: [
          {
            id: 'webhook',
            type: 'n8n-nodes-base.webhook',
            name: 'New Order Webhook',
            position: [250, 300],
            parameters: {
              path: 'new-order',
              method: 'POST',
            },
          },
          {
            id: 'create-invoice',
            type: 'n8n-nodes-base.httpRequest',
            name: 'Create Invoice',
            position: [450, 200],
            parameters: {
              url: '{{$json.api_url}}/invoice/create',
              method: 'POST',
            },
          },
          {
            id: 'update-stock',
            type: 'n8n-nodes-base.httpRequest',
            name: 'Update Stock',
            position: [450, 400],
            parameters: {
              url: '{{$json.api_url}}/stock/update',
              method: 'POST',
            },
          },
          {
            id: 'notify-customer',
            type: 'n8n-nodes-base.sendEmail',
            name: 'Notify Customer',
            position: [650, 300],
            parameters: {
              toEmail: '={{$json.customer_email}}',
              subject: '✅ คำสั่งซื้อของคุณได้รับการยืนยันแล้ว',
              text: 'เลขที่คำสั่งซื้อ: {{$json.order_id}}',
            },
          },
        ],
        connections: {
          webhook: {
            main: [
              [
                {
                  node: 'create-invoice',
                  type: 'main',
                  index: 0,
                },
                {
                  node: 'update-stock',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
          'create-invoice': {
            main: [
              [
                {
                  node: 'notify-customer',
                  type: 'main',
                  index: 0,
                },
              ],
            ],
          },
        },
        active: false,
        settings: {},
      },
    },
  ];

  for (const workflow of workflows) {
    await prisma.workflowTemplate.upsert({
      where: { name: workflow.name },
      update: {},
      create: workflow,
    });
  }

  console.log(`✅ Created ${workflows.length} workflow templates`);
  console.log('🎉 Workflow seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Workflow seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
