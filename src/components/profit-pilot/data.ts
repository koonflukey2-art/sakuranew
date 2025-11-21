export const platformFees = {
  own_website: { platform: 0, payment: 3.0 },
  facebook_shop: { platform: 0, payment: 2.5 },
  tiktok_shop: { platform: 4.0, payment: 3.0 },
  shopee: { platform: 5.0, payment: 3.0 },
  lazada: { platform: 5.0, payment: 3.0 },
  facebook_ads_message: { platform: 0, payment: 3.0 },
  facebook_ads_website: { platform: 0, payment: 3.0 },
  tiktok_ads: { platform: 0, payment: 3.0 },
  other: { platform: 0, payment: 0 },
};

export const platformFeeLabels = {
  own_website: 'เว็บไซต์ตัวเอง',
  facebook_shop: 'Facebook Shop',
  tiktok_shop: 'TikTok Shop',
  shopee: 'Shopee',
  lazada: 'Lazada',
  facebook_ads_message: 'Facebook Ads - ข้อความ',
  facebook_ads_website: 'Facebook Ads - เว็บไซต์',
  tiktok_ads: 'Tiktok Ads',
  other: 'อื่นๆ',
};

export const funnelPlans = {
  super_launch: { name: "เปิดตัวครั้งใหญ่ (TOFU 90%)", tofu: 90, mofu: 10, bofu: 0 },
  brand_building: { name: "สร้างแบรนด์จริงจัง (TOFU 80%)", tofu: 80, mofu: 15, bofu: 5 },
  awareness_focus: { name: "เน้นการรับรู้ (TOFU 70%)", tofu: 70, mofu: 20, bofu: 10 },
  launch: { name: "เปิดตัวแบรนด์ (TOFU 60%)", tofu: 60, mofu: 30, bofu: 10 },
  aggressive: { name: "หาลูกค้าใหม่ (TOFU 50%)", tofu: 50, mofu: 30, bofu: 20 },
  balanced: { name: "สมดุล (TOFU 30%)", tofu: 30, mofu: 40, bofu: 30 },
  nurture: { name: "ดูแลลูกค้า (TOFU 20%)", tofu: 20, mofu: 50, bofu: 30 },
  profit: { name: "ทำกำไรสูงสุด (TOFU 10%)", tofu: 10, mofu: 30, bofu: 60 },
};

export const businessTypeKeywords = {
  ecommerce_fashion: ['เสื้อ', 'กางเกง', 'เดรส', 'กระโปรง', 'ชุด', 'รองเท้า', 'กระเป๋า', 'เครื่องประดับ', 'fashion'],
  ecommerce_cosmetic: ['ลิป', 'แป้ง', 'รองพื้น', 'เซรั่ม', 'ครีม', 'สกินแคร์', 'เมคอัพ', 'cosmetic', 'skincare', 'กันแดด'],
  ecommerce_supplement: ['อาหารเสริม', 'วิตามิน', 'คอลลาเจน', 'โปรตีน', 'supplement', 'collagen', 'vitamin'],
  ecommerce_gadget: ['แก็ดเจ็ต', 'gadget', 'หูฟัง', 'มือถือ', 'คอม', 'อิเล็กทรอนิกส์'],
  ecommerce_homedecor: ['ของตกแต่งบ้าน', 'เฟอร์นิเจอร์', 'โคมไฟ', 'พรม', 'ของใช้ในบ้าน'],
  leadgen_high_ticket: ['อสังหา', 'บ้าน', 'คอนโด', 'ประกัน', 'รถยนต์', 'คอร์สราคาแพง'],
  ecommerce_digital: ['คอร์สออนไลน์', 'e-book', 'template', 'สัมมนาออนไลน์', 'webinar'],
  ecommerce_website_campaign: ['website', 'เว็บ'],
};

export const metricsPlans = {
  fb_ecommerce_growth: {
      name: "Growth Plan",
      summary: 'เน้นการขยายตัวอย่างรวดเร็ว เพิ่มการรับรู้และฐานลูกค้า',
      kpis: [
          { stage: 'BOFU', metric: 'ROAS', benchmark: '3.0+', importance: 'สูง', notes: 'ต้องทำกำไรและขยายตัว' },
          { stage: 'BOFU', metric: 'CPA', benchmark: '≤30% ของ LTV', importance: 'สูง', notes: 'ควบคุมต้นทุนลูกค้า' },
          { stage: 'TOFU', metric: 'CTR', benchmark: '1.5%+', importance: 'กลาง', notes: 'วัดความน่าสนใจ' },
          { stage: 'BOFU', metric: 'Conversion Rate', benchmark: '2%+', importance: 'สูง', notes: 'ประสิทธิภาพการขาย' },
      ]
  },
  fb_ecommerce_profit: {
      name: "Profit Plan",
      summary: 'แผนทำกำไรสำหรับ E-commerce บน Facebook เน้นการ Optimize Conversion และ ROAS จากกลุ่มเป้าหมายที่มีคุณภาพสูง (High-Intent) และลูกค้าเก่า',
      kpis: [
          { stage: 'TOFU', metric: 'Frequency', benchmark: '< 2.5', importance: 'กลาง', notes: 'ควบคุมความถี่การเห็นโฆษณา' },
          { stage: 'MOFU', metric: 'Cost per Add to Cart (CPATC)', benchmark: '< 120 ฿', importance: 'สูง', notes: 'ต้นทุนการเพิ่มสินค้าลงตะกร้า' },
          { stage: 'BOFU', metric: 'CVR (Conversion Rate)', benchmark: '> 2.0%', importance: 'สูงมาก', notes: 'อัตราการปิดการขาย' },
          { stage: 'BOFU', metric: 'ROAS', benchmark: '> 5x', importance: 'สูงมาก', notes: 'ผลตอบแทนจากค่าโฆษณา' },
          { stage: 'BOFU', metric: 'AOV (Average Order Value)', benchmark: 'ติดตาม', importance: 'สูง', notes: 'มูลค่าการสั่งซื้อเฉลี่ย' },
      ]
  },
  fb_message_campaign: {
      name: "Facebook - แคมเปญข้อความ",
      summary: 'แผนสำหรับแคมเปญข้อความ (Inbox) เน้นการสร้างปฏิสัมพันธ์และปิดการขายในแชท วัดผลจากต้นทุนต่อการเริ่มสนทนา (CPP) และอัตราการปิดการขายของแอดมินเป็นหลัก',
      kpis: [
          { stage: 'MOFU', metric: 'ต้นทุนต่อการส่งข้อความเพื่อเริ่มการสนทนา', benchmark: '< 100 ฿', importance: 'สูงมาก', notes: 'Cost per Conversation' },
          { stage: 'BOFU', metric: '% ปิดการขาย', benchmark: '> 20%', importance: 'สูงมาก', notes: 'วัดประสิทธิภาพแอดมิน' },
          { stage: 'BOFU', metric: 'Roas Meta', benchmark: '> 3x', importance: 'สูงมาก', notes: 'ผลตอบแทนโดยรวม' },
      ]
  },
  fb_s1_plan: {
    name: "Facebook (S1 Plan)",
    summary: "แผนการตลาดบน Facebook โฟกัสการสร้างข้อความส่วนตัวและการปิดการขาย",
    kpis: [
      { stage: 'TOFU', metric: 'การเข้าถึง', benchmark: '50K+/เดือน', importance: 'กลาง', notes: 'จํานวนคนที่เห็นโฆษณา' },
      { stage: 'TOFU', metric: 'อิมเพรสชั่น', benchmark: '200K+/เดือน', importance: 'กลาง', notes: 'จํานวนครั้งที่แสดงโฆษณา' },
      { stage: 'TOFU', metric: 'ความถี่', benchmark: '3-5 ครั้ง', importance: 'กลาง', notes: 'จํานวนครั้งเฉลี่ยที่คนเดียวกันเห็น' },
      { stage: 'TOFU', metric: 'CPM', benchmark: '≤250฿', importance: 'กลาง', notes: 'ต้นทุนต่อ 1,000 การแสดงผล' },
      { stage: 'MOFU', metric: 'จํานวนการคลิกลิงก์', benchmark: '1,000+/เดือน', importance: 'สูง', notes: 'การคลิกเข้าสู่แชท' },
      { stage: 'MOFU', metric: 'ค่าใช้จ่ายต่อผู้ติดต่อผ่านการส่งข้อความรายใหม่', benchmark: '≤50฿', importance: 'สูง', notes: 'ต้นทุนต่อการเริ่มสนทนาใหม่' },
      { stage: 'MOFU', metric: 'ผู้ติดต่อผ่านการส่งข้อความรายใหม่', benchmark: '200+/เดือน', importance: 'สูง', notes: 'จํานวนคนที่เริ่มสนทนาใหม่' },
      { stage: 'MOFU', metric: 'ต้นทุนต่อการส่งข้อความเพื่อเริ่มการสนทนา', benchmark: '≤30฿', importance: 'สูง', notes: 'ต้นทุนต่อข้อความแรก' },
      { stage: 'MOFU', metric: 'การส่งข้อความเพื่อเริ่มการสนทนา', benchmark: '300+/เดือน', importance: 'สูง', notes: 'จํานวนข้อความที่เริ่มสนทนา' },
      { stage: 'MOFU', metric: '%ทักใหม่', benchmark: '20%+', importance: 'กลาง', notes: 'เปอร์เซ็นต์การเริ่มสนทนาใหม่' },
      { stage: 'BOFU', metric: 'ผลลัพธ์', benchmark: '50+/เดือน', importance: 'สูงมาก', notes: 'จํานวนการขายที่เกิดขึ้น' },
      { stage: 'BOFU', metric: 'การซื้อบน Meta', benchmark: '30+/เดือน', importance: 'สูง', notes: 'การซื้อผ่านระบบ Meta' },
      { stage: 'BOFU', metric: 'ต้นทุนต่อการซื้อบน Meta', benchmark: '≤200฿', importance: 'สูง', notes: 'ต้นทุนต่อการขาย Meta' },
      { stage: 'BOFU', metric: '%ปิดการขาย', benchmark: '15%+', importance: 'สูงมาก', notes: 'เปอร์เซ็นต์การปิดการขาย' },
      { stage: 'BOFU', metric: '%ค่า Ads', benchmark: '≤30%', importance: 'สูง', notes: 'เปอร์เซ็นต์ต้นทุนโฆษณา' },
      { stage: 'BOFU', metric: 'ROAS Meta', benchmark: '3.5+', importance: 'สูงมาก', notes: 'ผลตอบแทนการลงทุนโฆษณา' },
      { stage: 'BOFU', metric: 'จํานวนเงินที่ใช้จ่ายไป', benchmark: 'ตามงบ', importance: 'กลาง', notes: 'การควบคุมงบประมาณ' },
    ]
  },
  fb_lead_gen: {
      name: "Facebook - Lead Generation",
      summary: 'แผนหา Lead คุณภาพบน Facebook เน้นการลดต้นทุนต่อ Lead (CPL) และเพิ่มอัตราการเปลี่ยนเป็นลูกค้า (Lead to Close Rate)',
      kpis: [
          { stage: 'MOFU', metric: 'Cost Per Lead (CPL)', benchmark: '< 250 ฿', importance: 'สูงมาก', notes: 'ต้นทุนต่อการได้มาซึ่งผู้สนใจ' },
          { stage: 'MOFU', metric: 'Lead Form Conversion Rate', benchmark: '> 15%', importance: 'สูง', notes: 'อัตราการกรอกฟอร์ม' },
          { stage: 'BOFU', metric: 'Appointment Rate', benchmark: '> 10%', importance: 'สูงมาก', notes: 'อัตราการนัดหมายสำเร็จ' },
      ]
  },
  tiktok_ecommerce_growth: {
      name: "TikTok - E-commerce (Growth Plan)",
      summary: 'แผนการเติบโตสำหรับ TikTok Shop เน้นการสร้าง Viral และการมีส่วนร่วม (Engagement) เพื่อเพิ่มยอดเข้าชมร้านค้าและผู้ติดตามใหม่',
      kpis: [
          { stage: 'TOFU', metric: 'CPM', benchmark: '30-80 ฿', importance: 'สูง', notes: 'ต้นทุนการแสดงผล 1,000 ครั้ง' },
          { stage: 'MOFU', metric: 'Cost per Click (CPC)', benchmark: '< 5 ฿', importance: 'สูง', notes: 'ต้นทุนต่อคลิก' },
          { stage: 'BOFU', metric: 'ROAS', benchmark: '> 3x', importance: 'สูงมาก', notes: 'ผลตอบแทน' },
      ]
  },
  tiktok_brand_awareness: {
      name: "TikTok - Brand Awareness",
      summary: 'แผนสร้างการรับรู้แบรนด์บน TikTok เน้นการเข้าถึงกลุ่มเป้าหมายในวงกว้างด้วยต้นทุนที่ต่ำ และวัดผลจากการดูวิดีโอและการมีส่วนร่วม',
      kpis: [
          { stage: 'TOFU', metric: 'CPM', benchmark: '< 50 ฿', importance: 'สูงมาก', notes: 'ต้นทุนการเข้าถึง' },
          { stage: 'MOFU', metric: 'Engagement Rate', benchmark: '> 5%', importance: 'สูง', notes: 'อัตราการมีส่วนร่วม' },
      ]
  }
};

export const funnelObjectivesData = {
  ecommerce_website_campaign: { name: "ยิงแอด (เว็บไซต์)", objectives: { tofu: ['สร้างการรับรู้แบรนด์', 'เพิ่ม Traffic เข้าเว็บไซต์'], mofu: ['สร้างความน่าเชื่อถือ (Reviews)', 'ให้ข้อมูลเชิงลึก'], bofu: ['กระตุ้นการซื้อ (Promotions)', 'ปิดการขาย'] } },
  ecommerce_message_campaign: { name: "ยิงแอด (ข้อความ)", objectives: { tofu: ['เริ่มบทสนทนา', 'สร้างการรับรู้ผ่านแชท'], mofu: ['ให้คำปรึกษา', 'สร้างความสัมพันธ์'], bofu: ['ปิดการขายใน Inbox', 'เสนอดีลพิเศษ'] } },
  ecommerce_fashion: { name: "สินค้าแฟชั่น", objectives: { tofu: ['แสดงคอลเลคชั่นใหม่', 'สร้างแรงบันดาลใจ'], mofu: ['Lookbook / Mix & Match', 'รีวิวจาก Influencer'], bofu: ['โปรโมชั่นจำกัดเวลา', 'แจ้งเตือนสินค้า Restock'] } },
  ecommerce_cosmetic: { name: "เครื่องสำอาง/สกินแคร์", objectives: { tofu: ['Tutorial การใช้งาน', 'สร้าง Awareness'], mofu: ['รีวิวผลลัพธ์ Before/After', 'แจก Sample'], bofu: ['โปรโมชั่นซื้อ 1 แถม 1', 'สร้าง Loyalty Program'] } },
  ecommerce_supplement: { name: "อาหารเสริม/สุขภาพ", objectives: { tofu: ['ให้ความรู้ด้านสุขภาพ', 'สร้างความน่าเชื่อถือ'], mofu: ['ผลวิจัยรองรับ', 'รีวิวจากผู้ใช้จริง'], bofu: ['โปรแกรมสมัครสมาชิก', 'โปรโมชั่นพิเศษ'] } },
  ecommerce_gadget: { name: "แกดเจ็ต/IT", objectives: { tofu: ['Unboxing & First Impression', 'แสดงนวัตกรรม'], mofu: ['เปรียบเทียบฟีเจอร์', 'วิดีโอสาธิตการใช้งาน'], bofu: ['ส่วนลด Pre-order', 'โปรแกรม Trade-in'] } },
  ecommerce_homedecor: { name: "ของแต่งบ้าน", objectives: { tofu: ['สร้างแรงบันดาลใจในการแต่งบ้าน', 'แสดงสินค้าในบรรยากาศจริง'], mofu: ['แนะนำการจัดวาง', 'รีวิวจากลูกค้า'], bofu: ['ส่วนลดสำหรับ Set สินค้า', 'บริการออกแบบฟรี'] } },
  ecommerce_fmcg: { name: "สินค้าอุปโภคบริโภค (FMCG)", objectives: { tofu: ['สร้างการจดจำในวงกว้าง', 'โปรโมทโปรโมชั่น'], mofu: ['เน้นย้ำคุณประโยชน์', 'สร้างสูตรอาหาร/การใช้งาน'], bofu: ['ส่วนลดที่จุดขาย', 'สะสมแต้มแลกของรางวัล'] } },
  ecommerce_digital: { name: "สินค้าดิจิทัล/คอร์สออนไลน์", objectives: { tofu: ['ให้ความรู้ฟรี (Webinar)', 'สร้าง Community'], mofu: ['แสดงตัวอย่างเนื้อหา', 'Testimonials'], bofu: ['ส่วนลด Early Bird', 'เสนอขายคอร์สเรียนขั้นสูง'] } },
  leadgen_b2b: { name: "หาลูกค้า (B2B)", objectives: { tofu: ['สร้าง Whitepaper / Case Study', 'สร้าง Thought Leadership'], mofu: ['จัด Webinar ให้ความรู้', 'เสนอ Demo'], bofu: ['เสนอราคาพิเศษ', 'ให้คำปรึกษาฟรี'] } },
  leadgen_service: { name: "ธุรกิจบริการ/เอเจนซี่", objectives: { tofu: ['แสดงผลงาน (Portfolio)', 'สร้างความน่าเชื่อถือ'], mofu: ['ให้คำปรึกษาเบื้องต้น', 'รีวิวจากลูกค้า'], bofu: ['ประเมินราคาฟรี', 'โปรโมชั่นสำหรับลูกค้าใหม่'] } },
  leadgen_high_ticket: { name: "สินค้าราคาสูง/อสังหาฯ", objectives: { tofu: ['สร้างภาพลักษณ์ที่หรูหรา', 'ให้ข้อมูลภาพรวมโครงการ/บริการ'], mofu: ['นัดหมายเข้าชมโครงการ', 'ให้คำปรึกษาทางการเงิน'], bofu: ['เสนอเงื่อนไขพิเศษ', 'ปิดการขาย'] } },
  event: { name: "โปรโมทอีเวนต์/สัมมนา", objectives: { tofu: ['โปรโมทงาน', 'สร้าง Hype'], mofu: ['เปิดเผยรายชื่อ Speaker/ศิลปิน', 'ขายบัตรรอบ Early Bird'], bofu: ['โปรโมชั่นนาทีสุดท้าย', 'ขายสินค้าหน้างาน'] } },
  awareness: { name: "สร้างการรับรู้แบรนด์", objectives: { tofu: ['สร้างการรับรู้ในวงกว้าง (Reach)', 'สร้างการจดจำแบรนด์ (Ad Recall)'], mofu: ['สร้างการมีส่วนร่วม (Engagement)', 'สื่อสารข้อความหลักของแบรนด์'], bofu: ['กระตุ้นให้เกิดการค้นหาแบรนด์', 'สร้างทัศนคติที่ดีต่อแบรนด์'] } }
};

export const automationToolsConfig = {
  facebook: {
      name: 'Facebook Ads',
      icon: 'Facebook',
      levels: [
          { value: 'campaign', text: 'แคมเปญ' },
          { value: 'adset', text: 'ชุดโฆษณา' },
          { value: 'ad', text: 'โฆษณา' },
      ],
      metrics: [
          { value: 'cpa', text: 'Cost per Result' },
          { value: 'roas', text: 'Purchase ROAS' },
          { value: 'spend', text: 'Lifetime Spend' },
          { value: 'frequency', text: 'Frequency' },
          { value: 'cpm', text: 'CPM' },
      ],
      operators: [
          { value: '>', text: 'มากกว่า' },
          { value: '<', text: 'น้อยกว่า' },
          { value: '>=', text: 'มากกว่าหรือเท่ากับ' },
          { value: '<=', text: 'น้อยกว่าหรือเท่ากับ' },
      ],
      actions: [
          { value: 'turn_off_adset', text: 'ปิด Ad Set', needsValue: false },
          { value: 'turn_on_adset', text: 'เปิด Ad Set', needsValue: false },
          { value: 'increase_budget_percent', text: 'เพิ่มงบประมาณรายวัน (%)', needsValue: true },
          { value: 'decrease_budget_percent', text: 'ลดงบประมาณรายวัน (%)', needsValue: true },
          { value: 'notify', text: 'ส่งการแจ้งเตือน', needsValue: false },
      ],
      timeframes: [
          { value: 'today', text: 'วันนี้' },
          { value: 'yesterday', text: 'เมื่อวาน' },
          { value: 'last_3_days', text: '3 วันล่าสุด' },
          { value: 'last_7_days', text: '7 วันล่าสุด' },
          { value: 'lifetime', text: 'ตลอดอายุการใช้งาน' },
      ]
  },
  revealbot: {
      name: 'Revealbot',
      icon: 'Bot',
       levels: [
          { value: 'campaign', text: 'Campaign' },
          { value: 'adset', text: 'Ad Set' },
          { value: 'ad', text: 'Ad' },
      ],
       metrics: [
          { value: 'roas', text: 'ROAS (Purchase)' },
          { value: 'cpa', text: 'CPA (Purchase)' },
          { value: 'spend', text: 'Spend' },
          { value: 'frequency', text: 'Frequency' },
          { value: 'cpm', text: 'CPM' },
          { value: 'ctr_link', text: 'CTR (Link Click-Through)' },
          { value: 'cpc_link', text: 'CPC (Link)' },
          { value: 'impressions', text: 'Impressions' },
      ],
      operators: [
          { value: '>', text: 'is greater than' },
          { value: '<', text: 'is less than' },
          { value: '>=', text: 'is greater than or equal to' },
          { value: '<=', text: 'is less than or equal to' },
          { value: 'in_range', text: 'is in range' },
          { value: 'not_in_range', text: 'is not in range' },
      ],
      actions: [
          { value: 'pause', text: 'Pause', needsValue: false },
          { value: 'start', text: 'Start', needsValue: false },
          { value: 'increase_budget_percent', text: 'Increase budget by %', needsValue: true },
          { value: 'decrease_budget_percent', text: 'Decrease budget by %', needsValue: true },
          { value: 'set_budget', text: 'Set budget to', needsValue: true },
          { value: 'increase_bid_percent', text: 'Increase bid by %', needsValue: true },
          { value: 'notify_slack', text: 'Notify in Slack', needsValue: false },
      ],
      timeframes: [
          { value: 'last_1_hour', text: 'Last 1 hour' },
          { value: 'last_24_hours', text: 'Last 24 hours' },
          { value: 'today', text: 'Today' },
          { value: 'yesterday', 'text': 'Yesterday' },
          { value: 'last_3_days_inc', text: 'Last 3 days (including today)' },
          { value: 'last_7_days_exc', text: 'Last 7 days (excluding today)' },
          { value: 'lifetime', text: 'Lifetime' },
      ]
  },
  madgicx: {
      name: 'Madgicx',
      icon: 'Wand',
       levels: [
          { value: 'campaign', text: 'Campaign' },
          { value: 'adset', text: 'Ad Set' },
          { value: 'ad', text: 'Ad' },
      ],
       metrics: [
          { value: 'roas', text: 'ROAS' },
          { value: 'cpa', text: 'CPA' },
          { value: 'spend', text: 'Amount Spent' },
          { value: 'ctr', text: 'CTR (All)' },
          { value: 'profit', text: 'Profit' },
      ],
      operators: [
          { value: '>', text: 'is higher than' },
          { value: '<', text: 'is lower than' },
      ],
      actions: [
          { value: 'stop_ad', text: 'Stop Ad', needsValue: false },
          { value: 'increase_budget_by', text: 'Increase Budget By (%)', needsValue: true },
          { value: 'decrease_budget_by', text: 'Decrease Budget By (%)', needsValue: true },
          { value: 'notify', text: 'Send a notification', needsValue: false },
      ],
      timeframes: [
          { value: 'last_24_hours', text: 'in the last 24 hours' },
          { value: 'last_3_days', text: 'in the last 3 days' },
          { value: 'last_7_days', text: 'in the last 7 days' },
          { value: 'last_14_days', text: 'in the last 14 days' },
      ]
  }
};
