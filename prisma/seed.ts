import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ลบข้อมูลเก่าทั้งหมด (optional)
  await prisma.notification.deleteMany();
  await prisma.profit.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.adCampaign.deleteMany();
  await prisma.stockHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.aIConfig.deleteMany();
  await prisma.user.deleteMany();

  // สร้าง Admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // สร้างสินค้า
  const products = [
    { name: 'ยาสีฟัน Colgate', category: 'ดูแลช่องปาก', quantity: 150, minStockLevel: 20, costPrice: 45, sellPrice: 89 },
    { name: 'สบู่เหลว Dove', category: 'ดูแลผิว', quantity: 200, minStockLevel: 30, costPrice: 120, sellPrice: 179 },
    { name: 'แชมพู Pantene', category: 'ดูแลผม', quantity: 100, minStockLevel: 15, costPrice: 150, sellPrice: 249 },
    { name: 'ครีมอาบน้ำ Nivea', category: 'ดูแลผิว', quantity: 80, minStockLevel: 10, costPrice: 180, sellPrice: 299 },
    { name: 'โลชั่นทาผิว Vaseline', category: 'ดูแลผิว', quantity: 120, minStockLevel: 20, costPrice: 200, sellPrice: 329 },
    { name: 'เจลล้างมือ Lifebuoy', category: 'ดูแลสุขภาพ', quantity: 300, minStockLevel: 50, costPrice: 35, sellPrice: 59 },
    { name: 'ผ้าเช็ดหน้า Kleenex', category: 'ของใช้', quantity: 500, minStockLevel: 100, costPrice: 25, sellPrice: 45 },
    { name: 'น้ำยาบ้วนปาก Listerine', category: 'ดูแลช่องปาก', quantity: 90, minStockLevel: 15, costPrice: 180, sellPrice: 289 },
    { name: 'ดีโอโดแรนท์ Rexona', category: 'ดูแลส่วนตัว', quantity: 70, minStockLevel: 10, costPrice: 120, sellPrice: 199 },
    { name: 'แป้งฝุ่น Pond\'s', category: 'เครื่องสำอาง', quantity: 60, minStockLevel: 10, costPrice: 250, sellPrice: 399 },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: {
        ...product,
        userId: admin.id,
      },
    });
  }

  console.log('✅ Created 10 products');

  // สร้างแคมเปญโฆษณา
  const campaigns = [
    {
      platform: 'FACEBOOK' as const,
      campaignName: 'Summer Sale 2024',
      budget: 10000,
      spent: 7500,
      reach: 50000,
      clicks: 2500,
      conversions: 250,
      roi: 2.5,
      status: 'ACTIVE' as const,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-30'),
      userId: admin.id,
    },
    {
      platform: 'TIKTOK' as const,
      campaignName: 'Viral Product Launch',
      budget: 15000,
      spent: 12000,
      reach: 120000,
      clicks: 8000,
      conversions: 600,
      roi: 3.2,
      status: 'ACTIVE' as const,
      startDate: new Date('2024-06-15'),
      endDate: new Date('2024-07-15'),
      userId: admin.id,
    },
    {
      platform: 'LAZADA' as const,
      campaignName: 'Flash Sale Weekend',
      budget: 8000,
      spent: 8000,
      reach: 30000,
      clicks: 1500,
      conversions: 180,
      roi: 1.8,
      status: 'COMPLETED' as const,
      startDate: new Date('2024-05-20'),
      endDate: new Date('2024-05-22'),
      userId: admin.id,
    },
    {
      platform: 'SHOPEE' as const,
      campaignName: 'Monthly Deals',
      budget: 12000,
      spent: 5000,
      reach: 45000,
      clicks: 3000,
      conversions: 300,
      roi: 2.8,
      status: 'ACTIVE' as const,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-30'),
      userId: admin.id,
    },
  ];

  for (const campaign of campaigns) {
    await prisma.adCampaign.create({ data: campaign });
  }

  console.log('✅ Created 4 ad campaigns');

  // สร้างข้อมูลกำไร 7 วัน
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    await prisma.profit.create({
      data: {
        date: date,
        revenue: Math.floor(Math.random() * 50000) + 30000,
        costs: Math.floor(Math.random() * 30000) + 15000,
        netProfit: Math.floor(Math.random() * 20000) + 10000,
      },
    });
  }

  console.log('✅ Created 7 days of profit data');

  // สร้าง Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: 'LOW_STOCK',
        message: 'สินค้า "แป้งฝุ่น Pond\'s" ใกล้หมดสต็อก (เหลือ 8 ชิ้น)',
        link: '/stock',
        isRead: false,
      },
      {
        userId: admin.id,
        type: 'CAMPAIGN_COMPLETE',
        message: 'แคมเปญ "Flash Sale Weekend" สิ้นสุดแล้ว ROI: 1.8x',
        link: '/ads',
        isRead: false,
      },
      {
        userId: admin.id,
        type: 'AI_ALERT',
        message: 'AI แนะนำ: เพิ่มงบโฆษณา TikTok 20% เพื่อ ROI ที่ดีขึ้น',
        link: '/budget',
        isRead: false,
      },
    ],
  });

  console.log('✅ Created 3 notifications');
  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📧 Login credentials:');
  console.log('   Email: admin@test.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });