import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (ระวัง: จะลบข้อมูลเดิมทั้งหมด!)
  await prisma.metricsPlan.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.adCampaign.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  console.log('👤 Creating users...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@test.com',
      password: userPassword,
      name: 'Stock Staff',
      role: 'STOCK',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@test.com',
      password: userPassword,
      name: 'Regular User',
      role: 'EMPLOYEE',
    },
  });

  console.log('✅ Users created');

  // 2. Create Products
  console.log('📦 Creating products...');

  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'ครีมกันแดด SPF50+',
        category: 'Skincare',
        quantity: 150,
        minStockLevel: 50,
        costPrice: 250,
        sellPrice: 499,
        userId: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'เซรั่มวิตามินซี',
        category: 'Skincare',
        quantity: 80,
        minStockLevel: 30,
        costPrice: 350,
        sellPrice: 699,
        userId: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'ลิปสติกเนื้อแมท',
        category: 'Makeup',
        quantity: 200,
        minStockLevel: 50,
        costPrice: 150,
        sellPrice: 299,
        userId: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'คุชชั่นกันแดด',
        category: 'Makeup',
        quantity: 45,
        minStockLevel: 50,
        costPrice: 400,
        sellPrice: 799,
        userId: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'แชมพูบำรุงเส้นผม',
        category: 'Haircare',
        quantity: 120,
        minStockLevel: 40,
        costPrice: 180,
        sellPrice: 349,
        userId: staff.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'วิตามินซี 1000mg',
        category: 'Supplement',
        quantity: 25,
        minStockLevel: 30,
        costPrice: 200,
        sellPrice: 399,
        userId: staff.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'คอลลาเจนผง',
        category: 'Supplement',
        quantity: 90,
        minStockLevel: 40,
        costPrice: 450,
        sellPrice: 899,
        userId: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'เสื้อยืดผ้าฝ้าย',
        category: 'Fashion',
        quantity: 180,
        minStockLevel: 60,
        costPrice: 120,
        sellPrice: 249,
        userId: staff.id,
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // 3. Create Ad Campaigns
  console.log('📢 Creating ad campaigns...');

  const campaigns = await Promise.all([
    prisma.adCampaign.create({
      data: {
        platform: 'FACEBOOK',
        campaignName: 'กันแดด Summer Sale',
        budget: 10000,
        spent: 8500,
        reach: 45000,
        clicks: 2300,
        conversions: 180,
        roi: 2.8,
        status: 'ACTIVE',
        startDate: new Date('2025-11-15'),
        endDate: new Date('2025-12-15'),
        userId: admin.id,
      },
    }),
    prisma.adCampaign.create({
      data: {
        platform: 'TIKTOK',
        campaignName: 'Vitamin C Serum Viral',
        budget: 15000,
        spent: 12000,
        reach: 120000,
        clicks: 8500,
        conversions: 320,
        roi: 3.5,
        status: 'ACTIVE',
        startDate: new Date('2025-11-10'),
        endDate: new Date('2025-12-10'),
        userId: admin.id,
      },
    }),
    prisma.adCampaign.create({
      data: {
        platform: 'SHOPEE',
        campaignName: '11.11 Mega Sale',
        budget: 20000,
        spent: 20000,
        reach: 80000,
        clicks: 4500,
        conversions: 450,
        roi: 4.2,
        status: 'COMPLETED',
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-11'),
        userId: admin.id,
      },
    }),
    prisma.adCampaign.create({
      data: {
        platform: 'LAZADA',
        campaignName: 'Flash Sale วันนี้',
        budget: 8000,
        spent: 3500,
        reach: 35000,
        clicks: 1800,
        conversions: 95,
        roi: 2.1,
        status: 'ACTIVE',
        startDate: new Date('2025-11-20'),
        endDate: new Date('2025-11-30'),
        userId: admin.id,
      },
    }),
    prisma.adCampaign.create({
      data: {
        platform: 'FACEBOOK',
        campaignName: 'Retargeting - Cart Abandonment',
        budget: 5000,
        spent: 4200,
        reach: 15000,
        clicks: 950,
        conversions: 120,
        roi: 3.8,
        status: 'ACTIVE',
        startDate: new Date('2025-11-18'),
        userId: admin.id,
      },
    }),
  ]);

  console.log(`✅ Created ${campaigns.length} campaigns`);

  // 4. Create Budgets
  console.log('💰 Creating budgets...');

  const budgets = await Promise.all([
    prisma.budget.create({
      data: {
        amount: 50000,
        purpose: 'Facebook Ads - November',
        spent: 35000,
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-30'),
        userId: admin.id,
      },
    }),
    prisma.budget.create({
      data: {
        amount: 30000,
        purpose: 'TikTok Ads - November',
        spent: 22000,
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-30'),
        userId: admin.id,
      },
    }),
    prisma.budget.create({
      data: {
        amount: 25000,
        purpose: 'E-commerce Platform Ads',
        spent: 18500,
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-30'),
        userId: admin.id,
      },
    }),
    prisma.budget.create({
      data: {
        amount: 15000,
        purpose: 'Content Creation',
        spent: 8000,
        startDate: new Date('2025-11-01'),
        endDate: new Date('2025-11-30'),
        userId: admin.id,
      },
    }),
    prisma.budget.create({
      data: {
        amount: 10000,
        purpose: 'Influencer Marketing',
        spent: 7500,
        startDate: new Date('2025-11-15'),
        endDate: new Date('2025-12-15'),
        userId: admin.id,
      },
    }),
  ]);

  console.log(`✅ Created ${budgets.length} budgets`);

  // 5. Create Automation Rules
  console.log('⚡ Creating automation rules...');

  await Promise.all([
    prisma.automationRule.create({
      data: {
        platform: 'Facebook Ads',
        tool: 'Revealbot',
        ruleName: 'หยุดโฆษณา CPA สูงเกิน 200 บาท',
        condition: { metric: 'CPA', operator: '>', value: 200 },
        action: { type: 'pauseCampaign' },
        isActive: true,
        userId: admin.id,
      },
    }),
    prisma.automationRule.create({
      data: {
        platform: 'Facebook Ads',
        tool: 'Revealbot',
        ruleName: 'เพิ่มงบ 20% เมื่อ ROAS > 3.0',
        condition: { metric: 'ROAS', operator: '>', value: 3 },
        action: { type: 'increaseBudget', value: 20 },
        isActive: true,
        userId: admin.id,
      },
    }),
    prisma.automationRule.create({
      data: {
        platform: 'TikTok Ads',
        tool: 'Custom',
        ruleName: 'แจ้งเตือนเมื่อ CTR < 1%',
        condition: { metric: 'CTR', operator: '<', value: 1 },
        action: { type: 'sendNotification' },
        isActive: false,
        userId: admin.id,
      },
    }),
  ]);

  console.log('✅ Automation rules created');

  // 6. Create Metrics Plans
  console.log('📊 Creating metrics plans...');

  await Promise.all([
    prisma.metricsPlan.create({
      data: {
        templateName: 'Growth Plan',
        targets: {
          revenue: 100000,
          cac: 500,
          ltv: 2000,
          conversionRate: 3.5,
          roas: 3.0
        },
        actual: {
          revenue: 85000,
          cac: 450,
          ltv: 1800,
          conversionRate: 3.2,
          roas: 3.2
        },
        period: 'monthly',
        userId: admin.id,
      },
    }),
    prisma.metricsPlan.create({
      data: {
        templateName: 'Profit Plan',
        targets: {
          grossProfit: 50000,
          netProfit: 30000,
          profitMargin: 30
        },
        actual: {
          grossProfit: 42000,
          netProfit: 25000,
          profitMargin: 27
        },
        period: 'monthly',
        userId: admin.id,
      },
    }),
  ]);

  console.log('✅ Metrics plans created');

  console.log('');
  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📝 Test Accounts:');
  console.log('   Admin:');
  console.log('   - Email: admin@test.com');
  console.log('   - Password: admin123');
  console.log('');
  console.log('   Staff:');
  console.log('   - Email: staff@test.com');
  console.log('   - Password: user123');
  console.log('');
  console.log('   User:');
  console.log('   - Email: user@test.com');
  console.log('   - Password: user123');
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
