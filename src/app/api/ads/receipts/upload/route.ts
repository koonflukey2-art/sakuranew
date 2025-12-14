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
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

// --------------------- OCR worker singleton ---------------------
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker(); // ✅ no callbacks

      // eng+tha จะอ่านคำว่า "จำนวน/บาท" ได้ดีขึ้น
      let lang = "eng+tha";
      try {
        if (typeof w.loadLanguage === "function") await w.loadLanguage(lang);
        if (typeof w.initialize === "function") await w.initialize(lang);
      } catch {
        lang = "eng";
        if (typeof w.loadLanguage === "function") await w.loadLanguage(lang);
        if (typeof w.initialize === "function") await w.initialize(lang);
      }

      if (typeof w.reinitialize === "function") await w.reinitialize(lang);

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_char_whitelist: "0123456789.,บาทจำนวนAmount: ",
          preserve_interword_spaces: "1",
          tessedit_pageseg_mode: "6",
          user_defined_dpi: "300",
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
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileHash = sha256Hex(buffer);

    // decode QR ก่อน
    const qrText = await safeDecodeQr(buffer);
    const qrHash = qrText ? sha256Hex(qrText) : null;

    // กันสลิปซ้ำ
    const existing = await prisma.adReceipt.findFirst({
      where: {
        organizationId: orgId,
        OR: [{ fileHash }, ...(qrHash ? [{ qrHash }] : [])],
      },
      select: { id: true, receiptNumber: true, amount: true, receiptUrl: true },
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

    // Save file
    const uploadsDir = getUploadDir();
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const receiptUrl = `/api/uploads/${filename}`;

    // ✅ อ่านยอดเงิน: EMV Tag54 เฉพาะ QR ที่เป็น EMV จริงเท่านั้น -> ไม่งั้น OCR
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
  // ✅ 1) ใช้ EMV Tag54 เฉพาะ QR แบบชำระเงินจริงเท่านั้น
  if (qrText && isEmvCoPayload(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr && /^\d+(\.\d{2})?$/.test(amountStr)) {
      const amount = Number(amountStr);
      // ✅ กันค่าหลุด ๆ
      if (Number.isFinite(amount) && amount > 0 && amount < 1_000_000) {
        return { amount, amountDetected: true, method: "EMV_TAG_54" };
      }
    }
  } else if (qrText) {
    // QR บนสลิปตรวจสอบสลิปส่วนใหญ่ไม่ใช่ EMV → ข้าม Tag54
    // console.log("[AMOUNT] QR is not EMV, skip Tag54");
  }

  // ✅ 2) fallback OCR
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR is not EMV or has no amount. OCR could not confidently read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

// ✅ EMVCo payload ต้องขึ้นต้น 000201 และมี tag สำคัญบางตัว
function isEmvCoPayload(s: string) {
  if (!s.startsWith("000201")) return false;
  // มี tag 53 (currency) และ 58TH บ่อยมากใน QR ไทย
  if (!s.includes("53")) return false;
  if (!s.includes("58") && !s.includes("TH")) return false;
  // และต้อง parse TLV ได้แบบมีรูปแบบเลขความยาว 2 หลัก
  return /^\d+$/.test(s);
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

// --------------------- OCR amount (your existing logic) ---------------------
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // โซนล่างซ้าย ตัด QR ขวาออก
  const crops = [
    {
      left: 0,
      top: Math.floor(h * 0.70),
      width: Math.floor(w * 0.72),
      height: Math.floor(h * 0.15),
    },
    {
      left: 0,
      top: Math.floor(h * 0.58),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.40),
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
      .threshold(165)
      .png()
      .toBuffer();

    const worker = await getOcrWorker();
    const res = await worker.recognize(cropBuf);

    const rawText = String(res?.data?.text || "");
    const text = rawText.replace(/\s+/g, " ").trim();

    const byLabel =
      pickMoneyNearLabel(text, ["จำนวน", "Amount"]) ??
      pickMoneyBeforeBaht(text) ??
      pickBestAmountFromText(text);

    if (byLabel !== null) return byLabel;
  }

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
  const re =
    /([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)\s*บาท/i;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

// ✅ เดิมคุณใช้ max(...) ทำให้หลุดไปเอาเลขใหญ่ได้ง่าย
// ปรับให้ “ถ้ามีทศนิยม 2 ตำแหน่ง เลือกอันนั้นก่อน”
function pickBestAmountFromText(text: string): number | null {
  const tokens = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)([.,]\d{2})?/g)].map(
    (m) => m[0]
  );

  const filtered = tokens
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\d]/g, "").length <= 7);

  if (filtered.length === 0) return null;

  const decimals = filtered
    .filter((s) => /[.,]\d{2}$/.test(s))
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null);

  if (decimals.length > 0) {
    // เลือกค่าที่ “สมเหตุสมผล” มากกว่า ไม่เอาเลขใหญ่สุดเสมอ
    decimals.sort((a, b) => a - b);
    return decimals[0]; // ✅ สำหรับสลิปยอดมักอยู่บรรทัดเดียว เลือกตัวแรกที่เจอได้ดี
  }

  const ints = filtered
    .filter((s) => !/[.,]\d{2}$/.test(s))
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null);

  if (ints.length === 0) return null;
  ints.sort((a, b) => a - b);
  return ints[0];
}
