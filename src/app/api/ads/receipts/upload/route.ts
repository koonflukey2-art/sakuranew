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
  // ถ้าคุณมี route เสิร์ฟไฟล์แบบ /api/uploads/[filename] แล้วตั้ง UPLOAD_DIR ให้ตรงกัน
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
          // (ภาษา eng อาจอ่านไทยไม่เป๊ะ แต่ตัวเลขจะอ่านดีขึ้น)
          tessedit_char_whitelist: "0123456789.,:AmountamountTHBบาท",
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
    const qrHash = qrText ? sha256Hex(qrText) : null;

    console.log("[QR] length:", qrText?.length ?? 0);
    console.log("[QR] head:", qrText ? qrText.slice(0, 40) : null);
    console.log("[QR] tail:", qrText ? qrText.slice(-40) : null);
    console.log("[QR] isValidEMV:", qrText ? isValidEmvCoPayload(qrText) : false);

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
    // ถ้าคุณ serve จาก public/uploads ให้เปลี่ยนเป็น `/uploads/${filename}`
    const receiptUrl = `/api/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: EMV Tag54 (เฉพาะ valid EMV) + OCR เสมอ + กันเลขหลายหมื่น
    const result = await extractAmountFromReceipt(buffer, qrText);

    console.log("[AMOUNT] detected:", {
      amount: result.amount,
      method: result.method,
      amountDetected: result.amountDetected,
      reason: result.reason,
    });

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
  let emvAmount: number | null = null;

  // 1) EMV Tag54 (เฉพาะ valid EMV จริง)
  if (qrText && isValidEmvCoPayload(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr && /^\d+(\.\d{2})?$/.test(amountStr)) {
      const a = Number(amountStr);
      if (Number.isFinite(a) && a > 0 && a < 1_000_000) emvAmount = a;
    }
  }

  // 2) ทำ OCR เสมอ (กัน QR ตรวจสอบสลิป + กัน EMV/Tag54 เพี้ยน)
  const ocrAmount = await extractAmountByOcr(buffer);

  // 3) ตัดสินใจ
  if (emvAmount !== null && ocrAmount !== null) {
    const big = Math.max(emvAmount, ocrAmount);
    const small = Math.min(emvAmount, ocrAmount);

    // ถ้าห่างกัน “ผิดปกติ” มาก (เช่น 500 vs 30000) => เลือกค่าที่เล็กกว่า
    if (big >= small * 3) {
      return { amount: small, amountDetected: true, method: "OCR" };
    }

    // ใกล้กัน => ใช้ EMV
    return { amount: emvAmount, amountDetected: true, method: "EMV_TAG_54" };
  }

  if (emvAmount !== null) {
    return { amount: emvAmount, amountDetected: true, method: "EMV_TAG_54" };
  }
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

// --------------------- EMVCo validate (เข้ม + CRC) ---------------------
function isValidEmvCoPayload(payload: string): boolean {
  if (!payload) return false;

  // EMVCo ปกติเป็นตัวเลขล้วน และขึ้นต้นด้วย 000201
  if (!/^\d+$/.test(payload)) return false;
  if (!payload.startsWith("000201")) return false;

  // ต้องมี CRC tag63 length04 อยู่ท้าย
  const m = payload.match(/6304([0-9A-Fa-f]{4})$/);
  if (!m) return false;

  const tlv = parseTlv2Len2(payload);

  // tag จำเป็นของ EMVCo
  if (tlv["00"] !== "01") return false;
  if (!tlv["01"] || (tlv["01"] !== "11" && tlv["01"] !== "12")) return false;

  // ✅ กัน string มั่ว ๆ ผ่าน: QR ไทยควรมี currency 764 และประเทศ TH
  if (tlv["53"] !== "764") return false;
  if (tlv["58"] !== "TH") return false;

  // ✅ merchant name (tag59) ควรมี
  if (!tlv["59"] || tlv["59"].trim().length < 2) return false;

  // CRC check (CCITT-FALSE)
  const expected = (tlv["63"] || "").toUpperCase();
  if (expected.length !== 4) return false;

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

  // OCR 2 pass: โซน “จำนวนเงิน” ก่อน แล้วค่อย fallback
  const crops = [
    {
      left: Math.floor(w * 0.10),
      top: Math.floor(h * 0.52),
      width: Math.floor(w * 0.70), // ตัด QR ด้านขวาออก
      height: Math.floor(h * 0.30),
    },
    {
      left: 0,
      top: Math.floor(h * 0.45),
      width: Math.floor(w * 0.80),
      height: Math.floor(h * 0.55),
    },
  ];

  for (let pass = 0; pass < crops.length; pass++) {
    const r = crops[pass];

    const cropBuf = await img
      .clone()
      .extract(r)
      .resize({ width: Math.max(900, r.width * 2) })
      .grayscale()
      .normalize()
      .threshold(175)
      .png()
      .toBuffer();

    const worker = await getOcrWorker();
    const res = await worker.recognize(cropBuf);

    const rawText = String(res?.data?.text || "");
    const text = rawText.replace(/\s+/g, " ").trim();

    console.log(`[OCR] pass ${pass + 1} text:`, text.slice(0, 260));

    // 1) ใกล้ label
    const byLabel =
      pickMoneyNearLabel(text, ["จำนวนเงิน", "ยอดโอน", "ยอดชำระ", "Amount", "TOTAL", "Total"]) ??
      // 2) ก่อนคำว่า บาท
      pickMoneyBeforeBaht(text) ??
      // 3) heuristic ที่กัน Balance/คงเหลือ + ไม่เลือกเลขใหญ่สุด
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
  // กรณี OCR อ่าน 500,00 -> 500.00
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
    // เช่น "จำนวนเงิน: 500.00" / "Amount 500.00"
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

// ✅ แก้หลัก ๆ: กัน “คงเหลือ/Balance” และ fallback เลือก “เลขที่เล็กสุด”
function pickBestAmountFromText(text: string): number | null {
  const badContext = /(คงเหลือ|balance|available|ยอดคงเหลือ)/i;
  const goodContext = /(จำนวนเงิน|ยอดโอน|ยอดชำระ|amount|total|รวม)/i;

  const lines = text
    .split(/[\n\r]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: number[] = [];

  for (const line of lines) {
    if (badContext.test(line)) continue;

    const ms = [...line.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)/g)].map(
      (m) => m[1]
    );

    for (const token of ms) {
      const n = parseMoney(token);
      if (n === null) continue;

      // ถ้าบรรทัดมี label ดี ให้คืนทันที
      if (goodContext.test(line)) return n;

      candidates.push(n);
    }
  }

  if (candidates.length === 0) return null;

  // fallback: เลือก “ค่าที่เล็กสุด” กันไปหยิบยอดคงเหลือ
  candidates.sort((a, b) => a - b);
  return candidates[0];
}
