import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { createHash, createHmac } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import sharp from "sharp";
import jsQR from "jsqr";

// ถ้าคุณมี helper เหล่านี้อยู่แล้ว ใช้ของเดิมได้
import { replyLineMessage, pushLineMessage } from "@/lib/line-integration";

export const runtime = "nodejs";

// =====================
// 1) ORGANIZATION / SETTINGS
// =====================
async function getActiveOrganizationFromSystemSettings() {
  const settings = await prisma.systemSettings.findFirst();

  if (!settings?.organizationId) {
    console.warn(
      "⚠️ No systemSettings.organizationId – กรุณาเข้าไปหน้า System Settings แล้วกดบันทึกอย่างน้อย 1 ครั้ง"
    );
    return null;
  }
  return { organizationId: settings.organizationId };
}

async function getLineAdsSettings(organizationId: string) {
  const s = await prisma.systemSettings.findUnique({
    where: { organizationId },
    select: {
      adsLineChannelAccessToken: true,
      adsLineChannelSecret: true,
      adsLineNotifyToken: true,
      adsLineWebhookUrl: true,

      // optional (ถ้าจะ push ไปที่ที่ผูกไว้)
      lineTargetId: true,
    },
  });

  return s;
}

// =====================
// 2) SIGNATURE VERIFY (LINE)
// =====================
function verifyLineSignature(
  rawBody: string,
  channelSecret: string,
  signature: string
) {
  const hmac = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return hmac === signature;
}

// =====================
// 3) DOWNLOAD IMAGE FROM LINE
// =====================
async function fetchLineMessageContent(
  messageId: string,
  accessToken: string
): Promise<Buffer> {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Failed to fetch content from LINE (${res.status}): ${t}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

// =====================
// 4) HASH / FILE SAVE
// =====================
function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

async function saveToPublicUploads(imageBuf: Buffer, ext = ".jpg") {
  const uploadsDir = join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true });
  }
  const filename = `ads-slip-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )}${ext}`;
  const filepath = join(uploadsDir, filename);
  await writeFile(filepath, imageBuf);
  return `/uploads/${filename}`;
}

// =====================
// 5) QR DECODE
// =====================
async function safeDecodeQr(buffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(buffer)
      .rotate() // ✅ สำคัญ: รูปจาก LINE บางทีหมุน
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    return code?.data ?? null;
  } catch {
    return null;
  }
}

function isEmvPaymentQr(qrText: string) {
  // EMVCo payload มักเป็นตัวเลขล้วน เริ่ม 000201 และมี 6304 (CRC)
  if (!/^\d{6,}$/.test(qrText)) return false;
  if (!qrText.startsWith("000201")) return false;
  if (!qrText.includes("6304")) return false;
  return true;
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

// =====================
// 6) OCR WORKER (✅ FIX)
// =====================
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker(); // ✅ ห้ามส่ง callback กัน DataCloneError

      // อ่านตัวเลขเป็นหลัก
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");
      if (typeof w.reinitialize === "function") await w.reinitialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          // ✅ เปิดโอกาสให้เจอคำไทย/label บ้าง (ช่วยคัดกรอง)
          tessedit_char_whitelist: "0123456789.,Amountบาทจำนวน:： ",
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
        });
      }

      return w;
    })();
  }
  return workerPromise;
}

function normalizeNumberToken(token: string) {
  const t = token.trim();
  // เผื่อ OCR อ่าน 500,00
  if (/,(\d{2})$/.test(t) && !/\./.test(t)) return t.replace(",", ".");
  return t;
}

// ✅ เข้มงวด: ต้องเป็นเลขเงินทศนิยม 2 ตำแหน่งเท่านั้น
function parseMoneyStrictDecimal(token: string): number | null {
  const t = normalizeNumberToken(token).replace(/,/g, "").trim();

  // ต้องเป็น xxx.xx เท่านั้น (กันเลขอ้างอิงที่ OCR ใส่จุดมั่ว ๆ)
  if (!/^\d+(\.\d{2})$/.test(t)) return null;

  // กันเลขยาวผิดปกติ (เช่น 0153460.12)
  const digits = t.replace(/\D/g, "");
  if (digits.length > 7) return null; // ✅ สำคัญ

  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;

  // กันหลุดเป็นหลักแสน/ล้าน
  if (n > 500_000) return null;

  return n;
}

// =====================
// 7) OCR AMOUNT (แก้ไม่ให้มั่ว)
// =====================
/**
 * ✅ OCR แบบ “กันเลขอ้างอิง”
 * - รับเฉพาะเลขรูปแบบ 500.00 / 1,234.00
 * - ตัด candidates ที่ digits > 7
 * - เลือกตัวที่ “อยู่ล่าง + อยู่ขวา” (ตำแหน่งยอดเงินบนสลิป K+)
 * - ตัด 0.00 ทิ้ง
 */
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ โฟกัสเฉพาะโซน “จำนวนเงิน” (ล่าง ๆ) และตัด QR ขวาออก
  const crops = [
    {
      left: Math.floor(w * 0.10),
      top: Math.floor(h * 0.70),
      width: Math.floor(w * 0.70),
      height: Math.floor(h * 0.18),
    },
    {
      // fallback กว้างขึ้นนิด
      left: Math.floor(w * 0.05),
      top: Math.floor(h * 0.63),
      width: Math.floor(w * 0.75),
      height: Math.floor(h * 0.30),
    },
  ];

  for (let pass = 0; pass < crops.length; pass++) {
    const r = crops[pass];

    const cropBuf = await img
      .clone()
      .extract(r)
      .resize({ width: Math.max(1200, r.width * 2) })
      .grayscale()
      .normalize()
      .threshold(170)
      .png()
      .toBuffer();

    const worker = await getOcrWorker();
    const res = await worker.recognize(cropBuf);

    const words = (res?.data?.words || []) as Array<{
      text: string;
      bbox?: { x0: number; y0: number; x1: number; y1: number };
    }>;

    // candidate: เงินทศนิยม 2 ตำแหน่งเท่านั้น
    const candidates: Array<{
      value: number;
      x: number;
      y: number;
      raw: string;
    }> = [];

    for (const ww of words) {
      const raw = (ww.text || "").trim();

      // รับเฉพาะรูปแบบที่มี .xx หรือ ,xxx.xx
      if (!/^\d{1,3}(?:,\d{3})*(?:[.,]\d{2})$/.test(raw)) continue;

      const value = parseMoneyStrictDecimal(raw);
      if (value === null) continue;

      // ตัด 0.00 ออก
      if (value <= 0) continue;

      const x = ww.bbox?.x0 ?? 0;
      const y = ww.bbox?.y0 ?? 0;

      candidates.push({ value, x, y, raw });
    }

    if (candidates.length > 0) {
      // ✅ เลือก “ล่าง + ขวา” เป็นหลัก
      // score = y*0.7 + x*0.3 (ยิ่งมากยิ่งดี)
      candidates.sort((a, b) => {
        const sa = a.y * 0.7 + a.x * 0.3;
        const sb = b.y * 0.7 + b.x * 0.3;
        return sb - sa;
      });

      // กันเคส OCR เจอหลายตัว (เช่น 0.00, 500.00)
      // เลือกตัวแรกที่ >= 1
      const best = candidates.find((c) => c.value >= 1);
      if (best) return best.value;
    }
  }

  return null;
}

// =====================
// 8) AMOUNT EXTRACT (EMV Tag54 -> OCR)
// =====================
async function extractAmountFromReceipt(buffer: Buffer, qrText: string | null) {
  // 1) try EMV Tag54 เฉพาะ EMV payment QR จริงเท่านั้น
  if (qrText && isEmvPaymentQr(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0 && amount < 1_000_000) {
        return {
          amount,
          method: "EMV_TAG_54" as const,
          amountDetected: true as const,
        };
      }
    }
  }

  // 2) fallback OCR
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, method: "OCR" as const, amountDetected: true as const };
  }

  return { amount: null, method: "NONE" as const, amountDetected: false as const };
}

// =====================
// 9) MAIN WEBHOOK
// =====================
export async function POST(req: NextRequest) {
  let rawBody = "";

  try {
    rawBody = await req.text();

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const activeOrg = await getActiveOrganizationFromSystemSettings();
    const organizationId = activeOrg?.organizationId;

    if (!organizationId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const adsSettings = await getLineAdsSettings(organizationId);

    if (!adsSettings?.adsLineChannelAccessToken) {
      console.warn("LINE Ads Channel Access Token not configured");
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (!adsSettings?.adsLineChannelSecret) {
      console.warn("LINE Ads Channel Secret not configured");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // ✅ verify signature
    const signature = req.headers.get("x-line-signature") || "";
    const okSig = verifyLineSignature(
      rawBody,
      adsSettings.adsLineChannelSecret,
      signature
    );
    if (!okSig) {
      console.warn("❌ LINE signature invalid");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (!Array.isArray(data.events) || data.events.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    for (const event of data.events) {
      if (event.type !== "message") continue;

      const replyToken: string | undefined = event.replyToken;

      // ✅ รับรูปเท่านั้น
      if (event.message?.type !== "image") continue;

      const messageId: string = event.message.id;

      // 1) download image
      const imageBuf = await fetchLineMessageContent(
        messageId,
        adsSettings.adsLineChannelAccessToken
      );

      // 2) hash
      const fileHash = sha256Hex(imageBuf);

      // 3) decode QR
      const qrText = await safeDecodeQr(imageBuf);
      const qrHash = qrText ? sha256Hex(qrText) : null;

      // 4) กันซ้ำ
      const existing = await prisma.adReceipt.findFirst({
        where: {
          organizationId,
          OR: [{ fileHash }, ...(qrHash ? [{ qrHash }] : [])],
        },
        select: { id: true, receiptNumber: true, amount: true },
      });

      if (existing) {
        const msg =
          `⚠️ สลิปนี้เคยส่งแล้ว\n` +
          `เลขที่: ${existing.receiptNumber}\n` +
          `จำนวนเงิน: ฿${Number(existing.amount || 0).toLocaleString("th-TH")}`;

        if (replyToken) {
          await replyLineMessage(
            replyToken,
            adsSettings.adsLineChannelAccessToken,
            msg
          );
        } else if (adsSettings.lineTargetId) {
          await pushLineMessage(
            adsSettings.lineTargetId,
            adsSettings.adsLineChannelAccessToken,
            msg
          );
        }
        continue;
      }

      // 5) save image file
      const receiptUrl = await saveToPublicUploads(imageBuf, ".jpg");

      // 6) extract amount
      const amountResult = await extractAmountFromReceipt(imageBuf, qrText);

      // ✅ ถ้า OCR อ่านได้ “ใหญ่ผิดปกติ” ให้ mark ว่าไม่ชัวร์ (กันตัดสินใจผิด)
      const suspicious =
        amountResult.amountDetected &&
        typeof amountResult.amount === "number" &&
        amountResult.amount > 200_000;

      // 7) create adReceipt
      const receiptNumber = `ADS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const created = await prisma.adReceipt.create({
        data: {
          organizationId,
          receiptNumber,
          platform: "META_ADS",
          paymentMethod: "QR_CODE",
          amount: suspicious ? 0 : (amountResult.amount ?? 0),
          currency: "THB",
          receiptUrl,
          qrCodeData: qrText,
          fileHash,
          qrHash,
          isProcessed: false,
          paidAt: new Date(),
          notes: suspicious
            ? `Suspicious OCR amount: ${amountResult.amount} method=${amountResult.method}`
            : undefined,
        },
      });

      // 8) reply
      const shownAmount = suspicious ? 0 : Number(created.amount || 0);

      const msg =
        `✅ รับสลิปแล้ว!\n\n` +
        `เลขที่: ${created.receiptNumber}\n` +
        `จำนวนเงิน: ฿${shownAmount.toLocaleString("th-TH")}\n` +
        `แพลตฟอร์ม: ${created.platform}\n\n` +
        `ดูสลิป: ${receiptUrl}\n` +
        `วิธีตรวจ: ${amountResult.method}` +
        (suspicious ? "\n⚠️ ยอดที่อ่านได้ผิดปกติ ระบบตั้งเป็น 0 ให้ตรวจเอง" : "");

      if (replyToken) {
        await replyLineMessage(replyToken, adsSettings.adsLineChannelAccessToken, msg);
      } else if (adsSettings.lineTargetId) {
        await pushLineMessage(adsSettings.lineTargetId, adsSettings.adsLineChannelAccessToken, msg);
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("❌ LINE ADS WEBHOOK ERROR:", err?.message || err);
    console.error("Raw body:", rawBody);
    // LINE ต้องได้ 200 เสมอ ไม่งั้น retry รัว
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
