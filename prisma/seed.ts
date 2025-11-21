import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', admin.email);

  const products = [
    { name: 'ยาสีฟัน Colgate', category: 'ดูแลช่องปาก', quantity: 150, minStockLevel: 20, costPrice: 45, sellPrice: 89 },
    { name: 'สบู่เหลว Dove', category: 'ดูแลผิว', quantity: 200, minStockLevel: 30, costPrice: 120, sellPrice: 179 },
    { name: 'แชมพู Pantene', category: 'ดูแลผม', quantity: 100, minStockLevel: 15, costPrice: 150, sellPrice: 249 },
    { name: 'ครีมอาบน้ำ Nivea', category: 'ดูแลผิว', quantity: 80, minStockLevel: 10, costPrice: 180, sellPrice: 299 },
    { name: 'โลชั่นทาผิว Vaseline', category: 'ดูแลผิว', quantity: 120, minStockLevel: 20, costPrice: 200, sellPrice: 329 },
  ];

  for (const product of products) {
    await prisma.product.create({ data: { ...product, userId: admin.id } });
  }

  console.log('Products created');

  const campaigns = [
    { platform: 'FACEBOOK' as const, campaignName: 'Summer Sale 2024', budget: 10000, spent: 7500, reach: 50000, clicks: 2500, conversions: 250, roi: 2.5, status: 'ACTIVE' as const, startDate: new Date('2024-06-01'), userId: admin.id },
    { platform: 'TIKTOK' as const, campaignName: 'Viral Product Launch', budget: 15000, spent: 12000, reach: 120000, clicks: 8000, conversions: 600, roi: 3.2, status: 'ACTIVE' as const, startDate: new Date('2024-06-15'), userId: admin.id },
  ];

  for (const campaign of campaigns) {
    await prisma.adCampaign.create({ data: campaign });
  }

  console.log('Campaigns created');
  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
