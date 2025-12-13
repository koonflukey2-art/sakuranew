import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, extname } from "path";
import crypto from "crypto";

import sharp from "sharp";
import jsQR from "jsqr";
import { createWorker } from "tesseract.js";

export const runtime = "nodejs";

// ----------------- OCR worker singleton -----------------
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w: any = await createWorker();
      // รองรับหลายเวอร์ชัน
      if (typeof w.reinitialize === "function") await w.reinitialize("eng");
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_char_whitelist: "0123456789.,บาท ",
        });
      }
      return w;
    })();
  }
  return workerPromise;
}

function sha256(bufOrText: Buffer | string) {
  return crypto.createHash("sha256").update(bufOrText).digest("hex");
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

export async function POST(request: NextRequest) {
  let savedFilePath: string | null = null;

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

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ✅ file hash กันซ้ำแบบชัวร์ (ไฟล์เดียวกัน)
    const fileHash = sha256(buffer);

    // ✅ อ่าน QR ก่อน (ถ้ามี)
    const qrText = await decodeQrFromImageBuffer(buffer);
    const qrHash = qrText ? sha256(qrText) : null;

    // ✅ เช็คซ้ำ (ใน org เดียวกัน)
    const dup = await prisma.adReceipt.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { fileHash },                 // file ซ้ำ
          ...(qrHash ? [{ qrHash }] : []) // qr ซ้ำ
        ],
      },
      select: { id: true, receiptNumber: true, amount: true, paidAt: true },
    });

    if (dup) {
      return NextResponse.json(
        { error: "DUPLICATE_RECEIPT", message: "สลิปนี้เคยอัพโหลดแล้ว", existing: dup },
        { status: 409 }
      );
    }

    // Save file
    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadsDir, filename);
    savedFilePath = filepath;

    await writeFile(filepath, buffer);
    const receiptUrl = `/uploads/${filename}`;

    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: Tag 54 จาก QR ก่อน -> ไม่เจอค่อย OCR
    const amountResult = await extractAmountFromReceipt(buffer, qrText);

    const receipt = await prisma.adReceipt.create({
      data: {
        organizationId: orgId,
        campaignId,
        receiptNumber: `RCP-${Date.now()}`,
        platform,
        paymentMethod: "QR_CODE",
        amount: amountResult.amount ?? 0,
        currency: "THB",
        receiptUrl,
        qrCodeData: qrText,

        // ✅ fields ใหม่
        fileHash,
        qrHash,

        isProcessed: false,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      receipt,
      amount: amountResult.amount ?? 0,
      amountDetected: amountResult.amountDetected,
      detectMethod: amountResult.method, // EMV_TAG_54 | OCR | NONE
      needsManualAmount: !amountResult.amountDetected,
      reason: amountResult.amountDetected ? undefined : amountResult.reason,
    });
  } catch (error: any) {
    console.error("[UPLOAD] error:", error);

    if (savedFilePath) {
      try { await unlink(savedFilePath); } catch {}
    }

    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

// ----------------- Amount extraction helpers -----------------

async function extractAmountFromReceipt(
  buffer: Buffer,
  qrText: string | null
): Promise<{
  amount: number | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  // 1) Try EMV Tag 54
  if (qrText) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, amountDetected: true, method: "EMV_TAG_54" };
      }
    }
  }

  // 2) OCR fallback
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR has no tag 54 amount. OCR could not confidently read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  try {
    const resized = await sharp(buffer)
      .rotate()
      .resize({ width: 900, withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const code = jsQR(
      new Uint8ClampedArray(resized.data),
      resized.info.width,
      resized.info.height
    );
    return code?.data ?? null;
  } catch {
    return null;
  }
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
  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  const crop = await img
    .rotate()
    .extract({
      left: 0,
      top: Math.floor(h * 0.55),
      width: Math.floor(w * 0.75),
      height: Math.floor(h * 0.45),
    })
    .grayscale()
    .normalize()
    .threshold(180)
    .png()
    .toBuffer();

  const worker = await getOcrWorker();
  const res = await worker.recognize(crop);
  const text = String(res?.data?.text || "").replace(/\s+/g, " ").trim();

  // 1) จับหลังคำว่า "จำนวน"
  const m1 = text.match(/จำนวน[:\s]*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)(?:\.(\d{2}))?/);
  if (m1) {
    const n = Number(String(m1[1] + (m1[2] ? "." + m1[2] : "")).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n;
  }

  // 2) fallback: เลือกเลขที่ “เหมือนจำนวนเงิน”
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d{2}))?/g)];
  const nums = matches
    .map((m) => String(m[0]).replace(/,/g, ""))
    .filter((s) => s.replace(".", "").length <= 7) // กันเลขรายการยาว
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n))
    .filter((n) => n > 0 && n < 1_000_000);

  if (nums.length === 0) return null;
  return Math.max(...nums);
}
