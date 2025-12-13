import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

import sharp from "sharp";
import jsQR from "jsqr";
import { createWorker } from "tesseract.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

export const runtime = "nodejs";

// (optional) กัน Next cache route
export const dynamic = "force-dynamic";

// -------- OCR worker singleton --------
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      console.log("[OCR] init worker...");

      // ✅ Fix Render/Next bundling
      const workerPath = require.resolve("tesseract.js/dist/worker.min.js");
      const corePath = require.resolve("tesseract.js-core/tesseract-core.wasm.js");

      // ✅ ใช้ langPath แบบ local กันโหลดจาก CDN ช้า/ค้าง
      // ต้องมีไฟล์: public/tessdata/eng.traineddata.gz
      const langPath = join(process.cwd(), "public", "tessdata");

      const w: any = await createWorker({
        workerPath,
        corePath,
        langPath, // Node รองรับ local path :contentReference[oaicite:3]{index=3}
        logger: (m: any) => console.log("[OCR]", m),       // จะเห็น progress :contentReference[oaicite:4]{index=4}
        errorHandler: (err: any) => console.error("[OCR] worker error:", err), // :contentReference[oaicite:5]{index=5}
      });

      await w.loadLanguage("eng");
      await w.initialize("eng");

      await w.setParameters({
        tessedit_char_whitelist: "0123456789.,",
      });

      console.log("[OCR] worker ready ✅");
      return w;
    })();
  }
  return workerPromise;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  try {
    console.log("[UPLOAD] start");

    const clerkUser = await currentUser();
    if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { organizationId: true },
    });
    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: "Organization not found for this user" }, { status: 404 });
    }
    const orgId = dbUser.organizationId;

    const formData = await request.formData();
    const file = formData.get("receipt") as File | null;
    const platform = (formData.get("platform") as string) || "META_ADS";
    const campaignId = (formData.get("campaignId") as string) || null;

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    console.log("[UPLOAD] file:", { name: file.name, type: file.type, size: file.size });

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);
    const receiptUrl = `/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: Tag54 ก่อน -> ถ้าไม่มีค่อย OCR (มี timeout กันค้าง)
    const result = await extractAmountFromReceipt(buffer);

    console.log("[UPLOAD] detect:", {
      method: result.method,
      amount: result.amount,
      amountDetected: result.amountDetected,
      reason: result.reason,
    });

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

    console.log("[UPLOAD] done in", Date.now() - started, "ms");

    return NextResponse.json({
      success: true,
      receipt,
      amount: result.amount ?? 0,
      amountDetected: result.amountDetected,
      detectMethod: result.method,
      needsManualAmount: !result.amountDetected,
      reason: result.amountDetected ? undefined : result.reason,
    });
  } catch (error: any) {
    console.error("[UPLOAD] error:", error);
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
  }
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

async function extractAmountFromReceipt(buffer: Buffer): Promise<{
  amount: number | null;
  qrText: string | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  // 1) decode QR (ถ้ามี)
  let qrText: string | null = null;
  try {
    qrText = await decodeQrFromImageBuffer(buffer);
    console.log("[QR] data:", qrText ? qrText.slice(0, 40) + "..." : null);
  } catch {
    qrText = null;
  }

  // 2) Try EMV Tag 54
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

  // 3) Fallback OCR (ใส่ timeout กันค้าง)
  const ocrAmount = await withTimeout(extractAmountByOcr(buffer), 20_000); // 20s
  if (ocrAmount !== null) {
    return { amount: ocrAmount, qrText, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    qrText,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR has no amount (tag54 missing). OCR timed out or could not read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
}

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

async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("[OCR] start recognize...");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ ปรับ crop ให้ “ตรงบรรทัดจำนวนเงิน” มากขึ้น (สำหรับสลิป K+ แบบในรูป)
  // โซนตัวเลข 500.00 อยู่แถวล่างกลางซ้าย
  const crop = await img
    .extract({
      left: Math.floor(w * 0.05),
      top: Math.floor(h * 0.62),
      width: Math.floor(w * 0.62),
      height: Math.floor(h * 0.25),
    })
    .grayscale()
    .normalize()
    .threshold(180)
    .png()
    .toBuffer();

  const worker = await getOcrWorker();
  const res = await worker.recognize(crop);

  const text = String(res?.data?.text || "").replace(/\s+/g, " ");
  console.log("[OCR] text:", text);

  // ดึงเลขที่เป็นจำนวนเงิน
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?/g)];
  const nums = matches
    .map((m) => Number(String(m[0]).replace(/,/g, "")))
    .filter((n) => Number.isFinite(n))
    .filter((n) => n > 0 && n < 1_000_000);

  if (nums.length === 0) return null;

  // มักมี 500.00 กับ 0.00 ค่าธรรมเนียม -> เอาค่าสูงสุด
  return Math.max(...nums);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
