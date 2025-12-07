import { z } from "zod";

// Product Schema
export const productSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อสินค้า").max(100, "ชื่อยาวเกินไป"),
  category: z.enum(["Skincare", "Makeup", "Haircare", "Supplement", "Fashion", "Other"], {
    required_error: "กรุณาเลือกหมวดหมู่",
  }),
  productType: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : val),
    z
      .coerce
      .number({ invalid_type_error: "กรุณาเลือกประเภทสินค้า" })
      .int("ต้องเป็นตัวเลข")
      .min(1, "ต้องอยู่ระหว่าง 1-4")
      .max(4, "ต้องอยู่ระหว่าง 1-4")
      .optional()
  ),
  quantity: z.coerce
    .number({ required_error: "กรุณากรอกจำนวน" })
    .int("ต้องเป็นจำนวนเต็ม")
    .min(0, "จำนวนต้องไม่น้อยกว่า 0"),
  minStockLevel: z.coerce
    .number({ required_error: "กรุณากรอก Min Stock Level" })
    .int("ต้องเป็นจำนวนเต็ม")
    .min(1, "Min Stock Level ต้องมากกว่า 0"),
  costPrice: z.coerce
    .number({ required_error: "กรุณากรอกราคาทุน" })
    .min(0, "ราคาทุนต้องไม่น้อยกว่า 0"),
  sellPrice: z.coerce
    .number()
    .min(0, "ราคาขายต้องไม่น้อยกว่า 0")
    .optional(),
  description: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Campaign Schema
export const campaignSchema = z.object({
  platform: z.enum(["FACEBOOK", "TIKTOK", "SHOPEE", "LAZADA"], {
    required_error: "กรุณาเลือก Platform",
  }),
  campaignName: z.string().min(1, "กรุณากรอกชื่อแคมเปญ").max(100, "ชื่อยาวเกินไป"),
  budget: z.coerce
    .number({ required_error: "กรุณากรอกงบประมาณ" })
    .min(1, "งบประมาณต้องมากกว่า 0"),
  spent: z.coerce
    .number()
    .min(0, "ค่าใช้จ่ายต้องไม่น้อยกว่า 0")
    .default(0),
  startDate: z.string().min(1, "กรุณาเลือกวันเริ่ม"),
  endDate: z.string().optional(),
  reach: z.coerce.number().min(0).default(0),
  clicks: z.coerce.number().min(0).default(0),
  conversions: z.coerce.number().min(0).default(0),
  roi: z.coerce.number().min(0).default(0),
}).refine((data) => data.spent <= data.budget, {
  message: "ค่าใช้จ่ายต้องไม่เกินงบประมาณ",
  path: ["spent"],
});

export type CampaignFormData = z.infer<typeof campaignSchema>;

// Budget Schema
export const budgetSchema = z.object({
  purpose: z.string().min(1, "กรุณากรอกวัตถุประสงค์").max(100, "ข้อความยาวเกินไป"),
  amount: z.coerce
    .number({ required_error: "กรุณากรอกจำนวนเงิน" })
    .min(1, "จำนวนเงินต้องมากกว่า 0"),
  spent: z.coerce
    .number()
    .min(0, "ค่าใช้จ่ายต้องไม่น้อยกว่า 0")
    .default(0),
  startDate: z.string().min(1, "กรุณาเลือกวันเริ่ม"),
  endDate: z.string().min(1, "กรุณาเลือกวันสิ้นสุด"),
}).refine((data) => data.spent <= data.amount, {
  message: "ค่าใช้จ่ายต้องไม่เกินงบประมาณ",
  path: ["spent"],
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "วันสิ้นสุดต้องมาหลังวันเริ่ม",
  path: ["endDate"],
});

export type BudgetFormData = z.infer<typeof budgetSchema>;
