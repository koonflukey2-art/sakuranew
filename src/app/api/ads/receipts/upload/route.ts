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

      // ✅ พยายามใช้ eng+tha ก่อน (อ่าน "จำนวน/บาท" ได้)
      // ถ้าเครื่องคุณโหลดภาษาไทยไม่ได้ จะ fallback เป็น eng อัตโนมัติ
      let lang = "eng+tha";
      try {
        if (typeof w.loadLanguage === "function") await w.loadLanguage(lang);
        if (typeof w.initialize === "function") await w.initialize(lang);
      } catch (e: any) {
        console.warn("[OCR] cannot load eng+tha, fallback to eng:", e?.message || e);
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

    console.log("[UPLOAD] file:", { name: file.name, type: file.type, size: file.size });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    // อ่าน buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // hash กันซ้ำ (ทำก่อน save)
    const fileHash = sha256Hex(buffer);

    // decode QR ก่อน
    const qrText = await safeDecodeQr(buffer);
    if (qrText) console.log("[QR] data:", qrText.slice(0, 40) + "...");

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
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // ✅ เสิร์ฟผ่าน API route /api/uploads/[filename]
    const receiptUrl = `/api/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: Tag54 -> OCR robust
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
    return NextResponse.json({ error: error?.message || "Upload failed" }, { status: 500 });
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
  // 1) try EMV Tag 54
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
      ? "QR has no amount. OCR could not confidently read amount."
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
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

// --------------------- OCR amount (robust) ---------------------
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("[OCR] start recognize...");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ ตัดให้เหลือ “บรรทัดจำนวนเงิน” และตัด QR ด้านขวาทิ้ง
  const crops = [
    {
      name: "amount_row_tight",
      left: 0,
      top: Math.floor(h * 0.73),
      width: Math.floor(w * 0.72),
      height: Math.floor(h * 0.10),
    },
    {
      name: "amount_row_wide",
      left: 0,
      top: Math.floor(h * 0.68),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.16),
    },
    {
      name: "fallback_lower_left",
      left: 0,
      top: Math.floor(h * 0.55),
      width: Math.floor(w * 0.78),
      height: Math.floor(h * 0.45),
    },
  ];

  const preprocessVariants: Array<{
    name: string;
    build: (b: Buffer) => Promise<Buffer>;
  }> = [
    {
      name: "A_no_threshold",
      build: async (src) =>
        sharp(src)
          .resize({ width: Math.max(900, Math.floor(w * 1.2)) })
          .grayscale()
          .normalize()
          .png()
          .toBuffer(),
    },
    {
      name: "B_threshold",
      build: async (src) =>
        sharp(src)
          .resize({ width: Math.max(900, Math.floor(w * 1.2)) })
          .grayscale()
          .normalize()
          .threshold(165)
          .png()
          .toBuffer(),
    },
  ];

  for (const c of crops) {
    const rawCrop = await img.clone().extract(c as any).png().toBuffer();

    for (const pv of preprocessVariants) {
      const cropBuf = await pv.build(rawCrop);

      const worker = await getOcrWorker();
      const res = await worker.recognize(cropBuf);

      const rawText = String(res?.data?.text || "");
      const text = rawText.replace(/\s+/g, " ").trim();

      console.log(`[OCR] crop=${c.name} variant=${pv.name} text:`, text.slice(0, 220));

      const amount =
        pickMoneyNearLabel(text, ["จำนวน", "Amount"]) ??
        pickMoneyBeforeBaht(text) ??
        pickBestAmountFromTextRobust(text);

      if (amount !== null) {
        console.log(`[OCR] ✅ amount found (${c.name}/${pv.name}):`, amount);
        return amount;
      }
    }
  }

  console.log("[OCR] ❌ no amount");
  return null;
}

// --------------------- OCR helpers ---------------------
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
      `${label}\\s*[:：]?\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:[\\.,][0-9]{2})?|\\d+(?:[\\.,]\\d{2})?)`,
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
    /([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?|\d+(?:[.,]\d{2})?)\s*บาท/i;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

/**
 * ✅ robust picker:
 * - ให้คะแนน “เลขที่ดูเหมือนเงิน” มากกว่า “เลขอ้างอิง”
 * - ถ้ามีทศนิยม 2 ตำแหน่ง → ให้ความสำคัญสูงสุด
 * - ถ้าเป็นเลขยาว ๆ (>=6 หลัก) และไม่มีทศนิยม → ลดคะแนน (มักเป็นเลขรายการ)
 */
function pickBestAmountFromTextRobust(text: string): number | null {
  const matches = [...text.matchAll(/\d[\d,]*(?:[.,]\d{2})?/g)].map((m) => m[0]);

  const candidates = matches
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const digitsOnly = s.replace(/[^\d]/g, "");
      const has2Dec = /[.,]\d{2}$/.test(s);
      const n = parseMoney(s);
      return n === null
        ? null
        : {
            raw: s,
            n,
            digitsLen: digitsOnly.length,
            has2Dec,
          };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .filter((x) => !(x.n >= 2000 && x.n <= 2700)); // กันปี

  if (candidates.length === 0) return null;

  const scored = candidates.map((c) => {
    let score = 0;
    if (c.has2Dec) score += 10;
    if (c.n > 0.01) score += 2;
    if (c.digitsLen >= 8) score -= 6;
    if (!c.has2Dec && c.digitsLen >= 6) score -= 3;
    return { ...c, score };
  });

  scored.sort((a, b) => (b.score - a.score) || (b.n - a.n));
  return scored[0].n;
}
