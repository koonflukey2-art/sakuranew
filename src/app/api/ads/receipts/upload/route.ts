import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

import { mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join, extname } from "path";

import sharp from "sharp";
import jsQR from "jsqr";

export const runtime = "nodejs";

// -------------------- config --------------------
function getUploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

// -------------------- OCR worker singleton --------------------
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      console.log("[OCR] init worker...");

      // ✅ dynamic import ลดปัญหา bundling และโหลดเฉพาะตอนใช้จริง
      const tesseract: any = await import("tesseract.js");
      const createWorker: any = tesseract.createWorker;

      // รองรับหลายเวอร์ชัน: บางเวอร์ชัน createWorker('eng', ...) ได้เลย
      const w: any = await createWorker("eng", 1, {
        logger: (m: any) => {
          // จะเห็น log ตอนดาวน์โหลด/โหลด wasm/recognize
          if (m?.status) console.log("[OCR]", m.status, m.progress ?? "");
        },
      });

      // เผื่อเวอร์ชันที่ยังต้อง loadLanguage/initialize
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_char_whitelist: "0123456789.,บาทBAHT",
          preserve_interword_spaces: "1",
          tessedit_pageseg_mode: "6",
        });
      }

      console.log("[OCR] worker ready");
      return w;
    })();
  }
  return workerPromise;
}

// -------------------- main --------------------
export async function POST(request: NextRequest) {
  const startedAt = Date.now();

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

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    console.log("[UPLOAD] file:", { name: file.name, type: file.type, size: file.size });

    // ✅ save to uploads dir (ไม่ใช่ public/)
    const uploadDir = getUploadDir();
    if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // ✅ serve ผ่าน API route
    const receiptUrl = `/api/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: QR(EMV tag54) ก่อน -> ถ้าไม่มีค่อย OCR
    const result = await extractAmountFromReceipt(buffer);

    // Create receipt record
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
        qrCodeData: result.qrText,
        isProcessed: false,
        paidAt: new Date(),
      },
    });

    console.log("[UPLOAD] done in", Date.now() - startedAt, "ms");

    return NextResponse.json({
      success: true,
      receipt,
      amount: result.amount ?? 0,
      amountDetected: result.amountDetected,
      detectMethod: result.method, // "EMV_TAG_54" | "OCR" | "NONE"
      needsManualAmount: !result.amountDetected,
      reason: result.amountDetected ? undefined : result.reason,
    });
  } catch (err: any) {
    console.error("[UPLOAD] error:", err);
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

// -------------------- QR + OCR extract --------------------
async function extractAmountFromReceipt(buffer: Buffer): Promise<{
  amount: number | null;
  qrText: string | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  // 1) decode QR
  let qrText: string | null = null;
  try {
    qrText = await decodeQrFromImageBuffer(buffer);
    if (qrText) console.log("[QR] data:", qrText.slice(0, 40) + "...");
  } catch {
    qrText = null;
  }

  // 2) EMV Tag 54 (กรณีเป็น QR payment ที่ฝัง amount)
  if (qrText) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, qrText, amountDetected: true, method: "EMV_TAG_54" };
      }
    }
  }

  // 3) OCR (กรณีสลิป K+ / ธนาคาร QR ตรวจสอบสลิป มักไม่มี amount ใน QR)
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, qrText, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    qrText,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR has no embedded amount. OCR could not confidently read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  // ลด noise ก่อนอ่าน QR
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
}

// TLV parser: tag(2) + len(2) + value(len) รองรับ payload อักษร/ตัวเลข
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

/**
 * OCR: ตัดโซน "จำนวน: xxx.xx บาท" และเลือกเลขที่อยู่ใกล้คำว่า บาท
 * (กันอ่านเลขยาวๆ เช่น เลขรายการ/อ้างอิง แล้วไปเป็น 8,765)
 */
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("[OCR] start recognize...");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ crop โซนล่างซ้าย (กัน QR ด้านขวา)
  const cropBuf = await img
    .rotate()
    .extract({
      left: 0,
      top: Math.floor(h * 0.55),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.40),
    })
    // ✅ preprocess ให้ตัวเลขชัดขึ้น
    .resize({ width: Math.floor(w * 1.2) }) // ขยายช่วย OCR
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(170)
    .png()
    .toBuffer();

  const worker = await getOcrWorker();

  // ✅ กันค้าง: ถ้าเกิน 20s ให้ปล่อย null (ไม่ให้ request ค้างยาว)
  const timeoutMs = 20000;
  const res: any = await Promise.race([
    worker.recognize(cropBuf),
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);

  const text = String(res?.data?.text || "")
    .replace(/\s+/g, " ")
    .trim();

  console.log("[OCR] text:", text);

  // ✅ กรณีอ่านได้แบบ "... 500.00 บาท" ให้ใช้ตัวนี้ก่อน
  const bahtMatch = text.match(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?\s*(บาท|baht)/i);
  if (bahtMatch?.[0]) {
    const n = Number(bahtMatch[0].replace(/[^\d.,]/g, "").replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }

  // fallback: เอาตัวเลขที่ plausible (ตัดเลขยาวๆ ออก)
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?/g)];
  const nums = matches
    .map((m) => Number(String(m[0]).replace(/,/g, "")))
    .filter((n) => Number.isFinite(n))
    .filter((n) => n > 0 && n < 200_000);

  if (nums.length === 0) return null;

  // ✅ เลือกค่าที่มีทศนิยม .00 หรือ .xx ก่อน (มักเป็นจำนวนเงิน)
  const withDecimals = nums.filter((n) => String(n).includes("."));
  if (withDecimals.length) return Math.max(...withDecimals);

  return Math.max(...nums);
}
