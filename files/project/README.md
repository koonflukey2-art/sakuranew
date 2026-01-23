# E-Commerce Dashboard

Dashboard ครบวงจรสำหรับธุรกิจ E-commerce พร้อม AI Integration

## ✨ Features

- 📊 **Dashboard** - สรุปภาพรวมธุรกิจแบบ real-time
- 📦 **Stock Management** - จัดการสินค้าพร้อมแจ้งเตือนสต็อกใกล้หมด
- 📢 **Ad Campaigns** - ติดตามแคมเปญโฆษณาหลายแพลตฟอร์ม
- 💰 **Budget Tracking** - จัดการงบประมาณและค่าใช้จ่าย
- 📈 **Reports** - รายงานครบถ้วนพร้อม Export Excel/PDF
- 🧮 **Profit Calculator** - คำนวณกำไรแบบละเอียด 3 ขั้นตอน
- 📊 **Metrics Templates** - แผนติดตาม KPI 7 แบบ
- ⚡ **Automation Rules** - สร้างกฎอัตโนมัติสำหรับโฆษณา
- 🔄 **n8n Workflow Generator** - สร้าง workflow อัตโนมัติ
- 👥 **User Management** - จัดการผู้ใช้และบทบาท
- ⚙️ **Settings** - ตั้งค่าระบบและ API keys

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)

### Installation

1. Clone repository
```bash
git clone https://github.com/your-username/sakuranew.git
cd sakuranew
```

2. Install dependencies
```bash
npm install
```

3. Setup environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your database URL and other keys:
```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:9002"
```

4. Setup database
```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. Run development server
```bash
npm run dev
```

6. Open http://localhost:9002

## 🔐 Test Accounts

- **Admin**
  - Email: admin@test.com
  - Password: admin123

- **Staff**
  - Email: staff@test.com
  - Password: user123

- **User**
  - Email: user@test.com
  - Password: user123

## 🛠️ Tech Stack

- **Framework:** Next.js 15.3
- **Database:** PostgreSQL + Prisma
- **Authentication:** NextAuth.js
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **State:** React Hooks

## 📦 Project Structure

```
src/
├── app/
│   ├── (auth)/         # Login/Register pages
│   ├── (dashboard)/    # Dashboard pages
│   └── api/            # API routes
├── components/         # React components
│   └── ui/            # shadcn/ui components
├── lib/               # Utilities
└── types/             # TypeScript types

prisma/
├── schema.prisma      # Database schema
└── seed.ts            # Seed data
```

## 📊 Features Detail

### Dashboard
- Real-time business overview
- Key metrics cards
- Charts and graphs
- Recent activity

### Stock Management
- Full CRUD operations
- Low stock alerts
- Search and filter
- Bulk operations

### Ad Campaigns
- Multi-platform support (Facebook, TikTok, Shopee, Lazada)
- Performance metrics (ROI, ROAS, CTR)
- Campaign status tracking

### Reports
- Date range selection
- Revenue/Profit/Spent analysis
- Platform statistics
- Top products ranking
- Export to Excel/PDF

### Automation Rules
- Platform-specific rules
- Condition-based triggers
- Auto budget adjustment
- Notifications

### n8n Workflow Generator
- 6 pre-built templates
- Webhook URL generator
- JSON export
- Copy to clipboard

### Metrics Templates
- 7 KPI templates
- Gauge charts
- Target vs Actual tracking
- PDF export

## 🔧 Scripts

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run ESLint
npm run typecheck   # TypeScript type checking
```

## ⏰ Daily Cutoff & Summary (VPS cron)

ระบบรองรับการยิง cron จาก VPS เพื่อให้ตัดยอด/ส่งสรุปเองโดยไม่ต้องใช้ cron-job.org

### Environment overrides

ตัวแปรเหล่านี้จะ override ค่าจาก `SystemSettings`:

```env
DAILY_CUTOFF_HOUR=23      # 0-23 (เวลาไทย)
DAILY_CUTOFF_MINUTE=59    # 0-59 (เวลาไทย)
ENABLE_DAILY_SUMMARY=true # optional: true/false
```

> ถ้าตั้งค่าไม่ถูกต้อง ระบบจะ log warning และ fallback ไปใช้ค่าใน `SystemSettings`.

### Cron examples (ยิงเฉพาะ localhost)

**ตัวอย่าง: ยิงทุก 1 นาที** (ให้ระบบเช็คเวลาเอง)

```bash
* * * * * curl -fsS -H "x-cron-secret: <CRON_SECRET>" http://127.0.0.1:3000/api/daily-cutoff/auto >/dev/null
* * * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/cron/daily-summary >/dev/null
```

**ตัวอย่าง: ยิงตรงเวลาจริง (23:59 ทุกวัน)**  

```bash
59 23 * * * curl -fsS -H "x-cron-secret: <CRON_SECRET>" http://127.0.0.1:3000/api/daily-cutoff/auto >/dev/null
59 23 * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" http://127.0.0.1:3000/api/cron/daily-summary >/dev/null
```

> แนะนำให้ยิงไปที่ `http://127.0.0.1:3000` เพื่อไม่ต้องเปิด public และต้องส่ง header ตามที่ route ใช้ (`x-cron-secret` หรือ `Authorization: Bearer`).

## 📝 License

MIT License

## 🙏 Acknowledgments

- Next.js Team
- shadcn/ui
- Vercel
- Neon Database
