import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, extname } from "path";
import crypto from "crypto";

import sharp from "sharp";
import jsQR from "jsqr";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ------------------- utils -------------------
function sha256Hex(input: Buffer | string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
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

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
}

function findAmountFromOcrText(textRaw: string): number | null {
  const text = textRaw.replace(/\s+/g, " ");

  // 1) เอาที่ติดคำว่า "จำนวน" ก่อน
  const m1 = text.match(/จำนวน\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/);
  if (m1?.[1]) return Number(m1[1].replace(/,/g, ""));

  // 2) หรือรูปแบบ "... 500.00 บาท"
  const m2 = text.match(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})\s*บาท/);
  if (m2?.[1]) return Number(m2[1].replace(/,/g, ""));

  // 3) fallback: เอาตัวเลขที่มี .xx เท่านั้น (ลดอ่านผิดเป็น 806 จาก noise)
  const matches = [...text.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g)];
  const nums = matches
    .map((m) => Number(String(m[1]).replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 1_000_000);

  if (!nums.length) return null;
  return Math.max(...nums);
}

// ------------------- OCR worker singleton -------------------
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker({
        logger: (m: any) => {
          // เปิดได้เวลาจะ debug
          // console.log("[OCR]", m);
        },
      });

      // รองรับหลายเวอร์ชัน
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");
      if (typeof w.reinitialize === "function") await w.reinitialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({ tessedit_char_whitelist: "0123456789.,บาทจำนวน: " });
      }

      return w;
    })();
  }
  return workerPromise;
}

async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ตัดโซนล่างซ้าย (ตัด QR ออก)
  const cropBuf = await img
    .extract({
      left: 0,
      top: Math.floor(h * 0.55),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.45),
    })
    .grayscale()
    .normalize()
    .threshold(175)
    .png()
    .toBuffer();

  const worker = await getOcrWorker();
  const res = await worker.recognize(cropBuf);
  const text = String(res?.data?.text || "");
  return findAmountFromOcrText(text);
}

async function extractAmountFromReceipt(buffer: Buffer): Promise<{
  amount: number | null;
  qrText: string | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  let qrText: string | null = null;
  try {
    qrText = await decodeQrFromImageBuffer(buffer);
  } catch {
    qrText = null;
  }

  // Try EMV Tag 54 (ถ้ามี)
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

  // Fallback OCR
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
      ? "QR has no amount. OCR could not confidently read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

// ------------------- handler -------------------
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

    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    console.log("[UPLOAD] file:", { name: file.name, type: file.type, size: file.size });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // hash กันซ้ำจากไฟล์จริง
    const fileHash = sha256Hex(buffer);

    // decode QR ก่อนเพื่อทำ qrHash กันซ้ำ
    const qrText = await decodeQrFromImageBuffer(buffer).catch(() => null);
    if (qrText) console.log("[QR] data:", qrText.slice(0, 40) + "...");
    const qrHash = qrText ? sha256Hex(qrText) : null;

    // ✅ กันสลิปซ้ำ: fileHash หรือ qrHash ซ้ำใน org เดียวกัน
    const dup = await prisma.adReceipt.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { fileHash },
          ...(qrHash ? [{ qrHash }] : []),
        ],
      },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        paidAt: true,
        receiptUrl: true,
      },
    });

    if (dup) {
      return NextResponse.json(
        {
          error: "สลิปนี้ถูกอัพโหลดแล้ว (ซ้ำ)",
          duplicate: dup,
        },
        { status: 409 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file (path ต้องเป็น string เท่านั้น)
    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadsDir, filename); // ✅ filepath เป็น string แน่นอน
    await writeFile(filepath, buffer);

    const receiptUrl = `/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // อ่านยอดเงิน (QR tag54 -> OCR)
    const result = await extractAmountFromReceipt(buffer);

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
      detectMethod: result.method,
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
