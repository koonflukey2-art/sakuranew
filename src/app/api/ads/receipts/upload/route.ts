import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, extname } from "path";
import { createHash } from "crypto";

import sharp from "sharp";
import jsQR from "jsqr";

export const runtime = "nodejs";

// --------------------- utils ---------------------
function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

// --------------------- OCR worker singleton ---------------------
// ✅ ไม่ส่ง callback เข้า createWorker กัน DataCloneError
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker();

      // ✅ พยายามใช้ THA+ENG ก่อน (อ่าน "บาท/จำนวน" ได้)
      // ถ้าโหลดภาษาไทยไม่ได้ จะ fallback เป็น ENG
      const tryLangs = ["tha+eng", "eng"];
      let initialized = false;

      for (const lang of tryLangs) {
        try {
          if (typeof w.loadLanguage === "function") await w.loadLanguage(lang);
          if (typeof w.initialize === "function") await w.initialize(lang);
          if (typeof w.reinitialize === "function") await w.reinitialize(lang);

          if (typeof w.setParameters === "function") {
            await w.setParameters({
              // โหมดอ่านข้อความเป็นบล็อก
              tessedit_pageseg_mode: "6",
              // อย่า whitelist แคบเกินไป ไม่งั้นไทยหาย
              preserve_interword_spaces: "1",
            });
          }

          initialized = true;
          console.log("[OCR] initialized lang =", lang);
          break;
        } catch (e) {
          console.warn("[OCR] init failed for lang =", lang);
        }
      }

      if (!initialized) {
        console.warn("[OCR] cannot init any language");
      }

      return w;
    })();
  }
  return workerPromise;
}

// --------------------- main handler ---------------------
export async function POST(request: NextRequest) {
  try {
    console.log("[UPLOAD] start");

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found for this user" },
        { status: 404 }
      );
    }
    const orgId = dbUser.organizationId;

    const formData = await request.formData();
    const file = formData.get("receipt") as File | null;
    const platform = (formData.get("platform") as string) || "META_ADS";
    const campaignId = (formData.get("campaignId") as string) || null;

    // ✅ เผื่อแก้ OCR แล้วอยากให้ “รูปเดิม” OCR ใหม่
    const forceReprocess =
      (formData.get("forceReprocess") as string) === "1" ||
      (formData.get("forceReprocess") as string) === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    console.log("[UPLOAD] file:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileHash = sha256Hex(buffer);

    // decode QR
    const qrText = await safeDecodeQr(buffer);
    if (qrText) console.log("[QR] data:", qrText.slice(0, 40) + "...");
    const qrHash = qrText ? sha256Hex(qrText) : null;

    // ✅ กันสลิปซ้ำ (แต่ถ้า forceReprocess ให้ข้าม)
    if (!forceReprocess) {
      const existing = await prisma.adReceipt.findFirst({
        where: {
          organizationId: orgId,
          OR: [{ fileHash }, ...(qrHash ? [{ qrHash }] : [])],
        },
        select: {
          id: true,
          receiptNumber: true,
          amount: true,
          receiptUrl: true,
          createdAt: true,
        },
      });

      if (existing) {
        return NextResponse.json(
          {
            error: "DUPLICATE_RECEIPT",
            message: `สลิปนี้เคยอัพโหลดแล้ว (${existing.receiptNumber})`,
            existing,
          },
          { status: 409 }
        );
      }
    }

    // Ensure uploads dir
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const receiptUrl = `/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: พยายาม Tag54 -> OCR (OCR เราแก้ให้จับ 500 ได้)
    const result = await extractAmountFromReceipt(buffer, qrText);

    const receipt = await prisma.adReceipt.create({
      data: {
        organizationId: orgId,
        campaignId,
        receiptNumber: `RCP-${Date.now()}`,
        platform,
        paymentMethod: "QR_CODE",
        amount: result.amount ?? 0,
        currency: "THB",
        receiptUrl,
        qrCodeData: qrText,
        fileHash,
        qrHash,
        isProcessed: false,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      receipt,
      amount: result.amount ?? 0,
      amountDetected: result.amountDetected,
      detectMethod: result.method, // "EMV_TAG_54" | "OCR" | "NONE"
      needsManualAmount: !result.amountDetected,
      reason: result.amountDetected ? undefined : result.reason,
    });
  } catch (error: any) {
    console.error("[UPLOAD] error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

// --------------------- amount extraction ---------------------
async function extractAmountFromReceipt(
  buffer: Buffer,
  qrText: string | null
): Promise<{
  amount: number | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  // 1) try EMV Tag 54 (แต่หลายสลิป Tag54 ไม่มี amount หรือเป็น 0)
  if (qrText) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0) {
        // ✅ กันกรณี Tag54 อ่านได้เป็นเลขแปลกๆ ใหญ่ผิดปกติ
        if (amount > 0 && amount <= 500_000) {
          return { amount, amountDetected: true, method: "EMV_TAG_54" };
        }
      }
    }
  }

  // 2) fallback OCR
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR has no usable amount. OCR could not confidently read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

// --------------------- QR decode ---------------------
async function safeDecodeQr(buffer: Buffer): Promise<string | null> {
  try {
    return await decodeQrFromImageBuffer(buffer);
  } catch {
    return null;
  }
}

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
}

/**
 * TLV parser: tag(2 chars) + length(2 digits) + value(length)
 */
function parseTlv2Len2(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;

  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(lenStr)) break;

    const len = Number(lenStr);
    const start = i + 4;
    const end = start + len;
    if (end > payload.length) break;

    out[tag] = payload.slice(start, end);
    i = end;
  }
  return out;
}

// --------------------- OCR (สำคัญที่สุด) ---------------------
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("[OCR] start recognize...");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ ทำหลาย crop แบบ “แคบมาก” ตัดเลขอ้างอิงยาวๆ ทิ้ง
  // จากรูป K+ ของคุณ ยอด 500.00 อยู่ช่วงกลางล่าง
  const crops = [
    // โซนแคบเฉพาะ “500.00 บาท”
    {
      left: Math.floor(w * 0.30),
      top: Math.floor(h * 0.64),
      width: Math.floor(w * 0.45),
      height: Math.floor(h * 0.16),
    },
    // โซนกว้างขึ้น (ตัด QR ขวา)
    {
      left: Math.floor(w * 0.12),
      top: Math.floor(h * 0.58),
      width: Math.floor(w * 0.66),
      height: Math.floor(h * 0.28),
    },
    // fallback ล่างซ้าย
    {
      left: 0,
      top: Math.floor(h * 0.55),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.45),
    },
  ];

  // ✅ แต่ละ crop ทำ 2 variant: (A) ไม่ threshold (กันจุดทศนิยมหาย) (B) threshold (คม)
  for (let pass = 0; pass < crops.length; pass++) {
    const r = crops[pass];

    const variants: Buffer[] = [];

    const base = img.clone().extract(r).resize({ width: Math.max(900, r.width * 2) });

    variants.push(
      await base.clone().grayscale().normalize().png().toBuffer()
    );

    variants.push(
      await base
        .clone()
        .grayscale()
        .normalize()
        .threshold(170)
        .png()
        .toBuffer()
    );

    for (let v = 0; v < variants.length; v++) {
      const worker = await getOcrWorker();
      const res = await worker.recognize(variants[v]);

      const rawText = String(res?.data?.text || "");
      const text = rawText.replace(/\s+/g, " ").trim();

      console.log(`[OCR] crop ${pass + 1}.${v + 1} text:`, text.slice(0, 220));

      // ✅ โฟกัส: หาตัวเลขแบบ 2 ตำแหน่งก่อน
      const amount =
        pickMoneyByKeywords(text) ??
        pickMoneyBeforeBahtOrTHB(text) ??
        pickBestDecimalAmount(text) ??
        pickBestIntegerAmount(text);

      if (amount !== null) {
        console.log(`[OCR] amount(crop ${pass + 1}.${v + 1}):`, amount);
        return amount;
      }
    }
  }

  console.log("[OCR] no amount");
  return null;
}

function normalizeNumberToken(token: string) {
  const t = token.trim();
  // 500,00 -> 500.00
  if (/,(\d{2})$/.test(t) && !/\./.test(t)) return t.replace(",", ".");
  return t;
}

function parseMoney(s: string): number | null {
  const n = Number(normalizeNumberToken(s).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;

  // ✅ กันเลขหลุด (เลขอ้างอิง/เลขบัญชี)
  if (n <= 0 || n > 500_000) return null;
  return n;
}

// ✅ ถ้าอ่านภาษาไทยได้ จะเจอ "จำนวน" / "Amount" / "รวม"
function pickMoneyByKeywords(text: string): number | null {
  const patterns = [
    /(?:จำนวน|Amount|รวม|Total)\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = parseMoney(m[1]);
      if (n !== null) return n;
    }
  }
  return null;
}

// ✅ เผื่อจับได้คำว่า “บาท” หรือ “THB”
function pickMoneyBeforeBahtOrTHB(text: string): number | null {
  const re =
    /([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:บาท|THB)/i;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

// ✅ ถ้าข้อความมีหลายเลข ให้เลือก “ทศนิยม 2 ตำแหน่ง” ที่มีค่ามากสุด (ตัด 0.00 ทิ้ง)
function pickBestDecimalAmount(text: string): number | null {
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)[.,]\d{2}/g)].map(
    (m) => m[0]
  );

  const nums = matches
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null)
    .filter((n) => n > 0.01);

  if (nums.length === 0) return null;

  // ✅ ของคุณ 500.00 จะชนะ fee 0.00
  return Math.max(...nums);
}

// ✅ fallback: integer (กรณีจุดทศนิยมหลุด)
function pickBestIntegerAmount(text: string): number | null {
  const tokens = [...text.matchAll(/\b(\d{1,6})\b/g)].map((m) => m[1]); // จำกัด 1-6 หลัก

  const nums = tokens
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null);

  if (nums.length === 0) return null;

  // ✅ เลือกค่าที่ “ดูมีเหตุผล” โดยให้ความสำคัญกับเลขที่ลงท้าย 00 บ่อยในสลิป
  const ending00 = nums.filter((n) => Number.isInteger(n) && n % 100 === 0);
  if (ending00.length) return Math.max(...ending00);

  return Math.max(...nums);
}
