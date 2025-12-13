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
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker();

      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");
      if (typeof w.reinitialize === "function") await w.reinitialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_char_whitelist: "0123456789.,บาทจำนวน:Amount ",
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileHash = sha256Hex(buffer);

    // decode QR ก่อน
    const qrText = await safeDecodeQr(buffer);
    if (qrText) console.log("[QR] data(head):", qrText.slice(0, 60));

    const qrHash = qrText ? sha256Hex(qrText) : null;

    // ✅ กันสลิปซ้ำ
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

    // Ensure uploads dir (public/uploads)
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const receiptUrl = `/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: EMV Tag54 (เฉพาะ QR EMV จริง) -> OCR
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

function isEmvPaymentQr(qrText: string) {
  // EMVCo payload มักเริ่มด้วย 000201 และมี CRC tag 63 length 04 (6304) ใกล้ท้าย
  if (!/^\d{6,}$/.test(qrText)) return false; // ต้องเป็นตัวเลขล้วนก่อน
  if (!qrText.startsWith("000201")) return false;
  if (!qrText.includes("6304")) return false;
  return true;
}

async function extractAmountFromReceipt(
  buffer: Buffer,
  qrText: string | null
): Promise<{
  amount: number | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  // 1) try EMV Tag 54 (เฉพาะ QR ที่เป็น EMV จริงเท่านั้น)
  if (qrText && isEmvPaymentQr(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, amountDetected: true, method: "EMV_TAG_54" };
      }
    }
  } else if (qrText) {
    console.log("[AMOUNT] QR detected but not EMV payment QR -> skip Tag54");
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
      ? "QR has no usable EMV amount. OCR could not confidently read amount."
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

// --------------------- OCR ---------------------
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("[OCR] start recognize...");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ crop โฟกัสโซน "จำนวน/บาท" + ตัด QR ขวาออก
  const crops = [
    {
      left: Math.floor(w * 0.10),
      top: Math.floor(h * 0.58),
      width: Math.floor(w * 0.68),
      height: Math.floor(h * 0.22),
    },
    {
      left: Math.floor(w * 0.05),
      top: Math.floor(h * 0.48),
      width: Math.floor(w * 0.75),
      height: Math.floor(h * 0.45),
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
      .threshold(170)
      .png()
      .toBuffer();

    const worker = await getOcrWorker();
    const res = await worker.recognize(cropBuf);

    const rawText = String(res?.data?.text || "");
    const text = rawText.replace(/\s+/g, " ").trim();

    console.log(`[OCR] pass ${pass + 1} text:`, text.slice(0, 220));

    // ✅ “เข้มงวด”: เอาเฉพาะยอดที่ผูกกับ label/บาท
    const amount =
      pickMoneyNearLabel(text, ["จำนวน", "Amount"]) ??
      pickMoneyBeforeBaht(text) ??
      pickMoneyByProximity(text, ["จำนวน", "Amount", "บาท"]);

    if (amount !== null) {
      console.log(`[OCR] amount(pass ${pass + 1}):`, amount);
      return amount;
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
  if (n <= 0 || n >= 10_000_000) return null; // กันเลขมั่วใหญ่ๆ
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
    /([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)\s*บาท/;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

// ✅ fallback แบบไม่มั่ว: เลือกเลขที่ “ใกล้ keyword” มากที่สุด
function pickMoneyByProximity(text: string, keywords: string[]): number | null {
  const candidates: { val: number; idx: number }[] = [];
  for (const m of text.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)/g)) {
    const token = m[1];
    const idx = m.index ?? -1;

    // ตัดเลขยาวๆ (ref/account)
    if (token.replace(/[^\d]/g, "").length > 7) continue;

    const n = parseMoney(token);
    if (n === null) continue;

    // กันปี
    if (n >= 2000 && n <= 2700) continue;

    candidates.push({ val: n, idx });
  }

  if (candidates.length === 0) return null;

  const keywordIdxs = keywords
    .map((k) => text.indexOf(k))
    .filter((i) => i >= 0);

  if (keywordIdxs.length === 0) return null;

  let best: { val: number; score: number } | null = null;
  for (const c of candidates) {
    const dist = Math.min(...keywordIdxs.map((kidx) => Math.abs(c.idx - kidx)));
    // ให้ทศนิยม 2 ตำแหน่งได้โบนัส
    const has2dp = /[.,]\d{2}$/.test(String(c.val));
    const score = dist - (has2dp ? 30 : 0);

    if (!best || score < best.score) best = { val: c.val, score };
  }

  return best?.val ?? null;
}
