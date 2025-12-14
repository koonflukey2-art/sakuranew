// app/api/.../route.ts  (ไฟล์อัปโหลดสลิป Ads)
// ✅ Node runtime (sharp/tesseract)
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

function getUploadDir() {
  // ✅ แนะนำให้ตั้งบน Render เป็น /opt/render/project/src/uploads
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

// --------------------- OCR worker singleton ---------------------
// ✅ ห้ามส่ง logger/errorHandler callback เข้า createWorker (กัน DataCloneError)
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker(); // ✅ no callbacks

      // รองรับหลายเวอร์ชัน
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");
      if (typeof w.reinitialize === "function") await w.reinitialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          // ให้ OCR โฟกัสแค่ชุดตัวอักษรที่จำเป็น
          tessedit_char_whitelist: "0123456789.,บาทจำนวน:Amount",
        });
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

    // อ่าน buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // hash กันซ้ำ (ทำก่อน save)
    const fileHash = sha256Hex(buffer);

    // decode QR ก่อน
    const qrText = await safeDecodeQr(buffer);

    console.log("[QR] length:", qrText?.length ?? 0);
    console.log("[QR] head:", qrText ? qrText.slice(0, 30) : null);
    console.log("[QR] tail:", qrText ? qrText.slice(-30) : null);
    console.log("[QR] isValidEMV:", qrText ? isValidEmvCoPayload(qrText) : false);

    const qrHash = qrText ? sha256Hex(qrText) : null;

    // ✅ กันสลิปซ้ำ: fileHash หรือ qrHash (ถ้ามี)
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

    // Ensure uploads dir
    const uploadsDir = getUploadDir();
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

    // ✅ ถ้าคุณมี route เสิร์ฟไฟล์แบบ /api/uploads/[filename] ให้ใช้แบบนี้
    // (ตรงกับไฟล์ server ที่คุณส่งมาก่อนหน้า)
    const receiptUrl = `/api/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: EMV Tag54 (เฉพาะ valid CRC) -> OCR
    const result = await extractAmountFromReceipt(buffer, qrText);

    // Create receipt
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
  // ✅ 1) ใช้ Tag54 เฉพาะ EMVCo ที่ valid ด้วย CRC เท่านั้น
  if (qrText && isValidEmvCoPayload(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr && /^\d+(\.\d{2})?$/.test(amountStr)) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0 && amount < 1_000_000) {
        return { amount, amountDetected: true, method: "EMV_TAG_54" };
      }
    }
  }

  // ✅ 2) fallback OCR เสมอ
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR not valid EMV/has no amount. OCR could not confidently read amount."
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

// --------------------- EMVCo validate (CRC) ---------------------
function isValidEmvCoPayload(payload: string): boolean {
  if (!payload) return false;

  // EMVCo ต้องเป็นตัวเลขล้วน
  if (!/^\d+$/.test(payload)) return false;

  // ✅ ต้องขึ้นต้นด้วย "000201"
  if (!payload.startsWith("000201")) return false;

  // ✅ ต้องลงท้ายด้วย "6304" + CRC 4 hex
  // (payload เป็นตัวเลขล้วน => CRC ที่มี A-F จะทำให้ fail → ถูกต้อง เพราะไม่ใช่ EMV)
  const m = payload.match(/6304([0-9A-Fa-f]{4})$/);
  if (!m) return false;

  const tlv = parseTlv2Len2(payload);
  if (tlv["00"] !== "01") return false;
  if (!tlv["01"] || (tlv["01"] !== "11" && tlv["01"] !== "12")) return false;
  if (!tlv["63"] || tlv["63"].length !== 4) return false;

  const expected = tlv["63"].toUpperCase();
  const withoutCrcValue = payload.slice(0, payload.length - 4);
  const computed = crc16ccittFalseAscii(withoutCrcValue).toUpperCase();

  return expected === computed;
}

function crc16ccittFalseAscii(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).padStart(4, "0");
}

// --------------------- OCR ---------------------
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("[OCR] start recognize...");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ OCR 2 pass: โซน “จำนวนเงิน” ก่อน แล้วค่อย fallback
  const crops = [
    {
      left: Math.floor(w * 0.18),
      top: Math.floor(h * 0.60),
      width: Math.floor(w * 0.58),
      height: Math.floor(h * 0.25),
    },
    {
      left: 0,
      top: Math.floor(h * 0.50),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.50),
    },
  ];

  for (let pass = 0; pass < crops.length; pass++) {
    const r = crops[pass];

    const cropBuf = await img
      .clone()
      .extract(r)
      .resize({ width: Math.max(700, r.width * 2) })
      .grayscale()
      .normalize()
      .threshold(170)
      .png()
      .toBuffer();

    const worker = await getOcrWorker();
    const res = await worker.recognize(cropBuf);

    const rawText = String(res?.data?.text || "");
    const text = rawText.replace(/\s+/g, " ").trim();

    console.log(`[OCR] pass ${pass + 1} text:`, text.slice(0, 220));

    const byLabel =
      pickMoneyNearLabel(text, ["จำนวน", "Amount"]) ??
      pickMoneyBeforeBaht(text) ??
      pickBestAmountFromText(text);

    if (byLabel !== null) {
      console.log(`[OCR] amount(pass ${pass + 1}):`, byLabel);
      return byLabel;
    }
  }

  console.log("[OCR] no amount");
  return null;
}

function normalizeNumberToken(token: string) {
  const t = token.trim();
  if (/,(\d{2})$/.test(t) && !/\./.test(t)) return t.replace(",", ".");
  return t;
}

function parseMoney(s: string): number | null {
  const n = Number(normalizeNumberToken(s).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n >= 1_000_000) return null;
  return n;
}

function pickMoneyNearLabel(text: string, labels: string[]): number | null {
  for (const label of labels) {
    const re = new RegExp(
      `${label}\\s*[:：]?\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:[\\.,][0-9]{2})?)`,
      "i"
    );
    const m = text.match(re);
    if (m?.[1]) {
      const n = parseMoney(m[1]);
      if (n !== null) return n;
    }
  }
  return null;
}

function pickMoneyBeforeBaht(text: string): number | null {
  const re = /([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)\s*บาท/;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

function pickBestAmountFromText(text: string): number | null {
  const tokens = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)([.,]\d{2})?/g)].map(
    (m) => m[0]
  );

  const filtered = tokens
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\d]/g, "").length <= 7)
    .filter((s) => {
      const n = Number(normalizeNumberToken(s).replace(/,/g, ""));
      if (!Number.isFinite(n)) return false;
      if (n >= 2000 && n <= 2700) return false;
      return true;
    });

  if (filtered.length === 0) return null;

  const decimals = filtered
    .filter((s) => /[.,]\d{2}$/.test(s))
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null)
    .filter((n) => n > 0.01);

  if (decimals.length > 0) return Math.max(...decimals);

  const ints = filtered
    .filter((s) => !/[.,]\d{2}$/.test(s))
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null);

  if (ints.length === 0) return null;
  return Math.max(...ints);
}
