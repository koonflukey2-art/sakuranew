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
function verifyLineSignature(rawBody: string, channelSecret: string, signature: string) {
  const hmac = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  return hmac === signature;
}

// =====================
// 3) DOWNLOAD IMAGE FROM LINE
// =====================
async function fetchLineMessageContent(messageId: string, accessToken: string): Promise<Buffer> {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
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
  const filename = `ads-slip-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
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

      const w: any = await createWorker(); // ✅ no logger callbacks

      // ใช้ eng ก็พอ เพราะเราจะอ่าน “ตัวเลข” เป็นหลัก
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");
      if (typeof w.reinitialize === "function") await w.reinitialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_char_whitelist: "0123456789.,",
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

function parseMoney(s: string): number | null {
  const n = Number(normalizeNumberToken(s).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n >= 10_000_000) return null;
  return n;
}

/**
 * ✅ OCR แบบ “ไม่มั่ว”
 * - หาเลขที่เป็นเงินรูปแบบ 500.00 / 1,234.00
 * - เลือกตัวที่ “อยู่ล่างสุด” ใน crop (โดย y มากสุด)
 * - กันหลงเลขใหญ่ ๆ ด้านบน
 */
async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // โฟกัสช่วงล่าง (บรรทัดจำนวน/ค่าธรรมเนียมอยู่ล่าง)
  const crops = [
    {
      left: Math.floor(w * 0.05),
      top: Math.floor(h * 0.68),
      width: Math.floor(w * 0.72), // ตัด QR ขวา
      height: Math.floor(h * 0.22),
    },
    {
      left: Math.floor(w * 0.05),
      top: Math.floor(h * 0.62),
      width: Math.floor(w * 0.72),
      height: Math.floor(h * 0.30),
    },
  ];

  for (let pass = 0; pass < crops.length; pass++) {
    const r = crops[pass];

    const cropBuf = await img
      .clone()
      .extract(r)
      .resize({ width: Math.max(1000, r.width * 2) })
      .grayscale()
      .normalize()
      .threshold(170)
      .png()
      .toBuffer();

    const worker = await getOcrWorker();
    const res = await worker.recognize(cropBuf);

    const words = (res?.data?.words || []) as Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;

    const candidates: { value: number; y: number; raw: string }[] = [];

    for (const ww of words) {
      const t = (ww.text || "").trim();

      // เงิน: 500.00 / 1,234.00
      if (!/^\d{1,3}(?:,\d{3})*(?:[.,]\d{2})$/.test(t)) continue;

      const value = parseMoney(t);
      if (value === null) continue;

      const y = ww.bbox?.y0 ?? 0;
      candidates.push({ value, y, raw: t });
    }

    const positive = candidates.filter((c) => c.value > 0);
    if (positive.length > 0) {
      positive.sort((a, b) => b.y - a.y); // ✅ ล่างสุดก่อน
      return positive[0].value;
    }
  }

  return null;
}

// =====================
// 7) AMOUNT EXTRACT (EMV Tag54 -> OCR)
// =====================
async function extractAmountFromReceipt(buffer: Buffer, qrText: string | null) {
  // 1) try EMV Tag54 เฉพาะ EMV payment QR จริงเท่านั้น
  if (qrText && isEmvPaymentQr(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, method: "EMV_TAG_54" as const, amountDetected: true as const };
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
// 8) MAIN WEBHOOK
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
    const okSig = verifyLineSignature(rawBody, adsSettings.adsLineChannelSecret, signature);
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
          await replyLineMessage(replyToken, adsSettings.adsLineChannelAccessToken, msg);
        } else if (adsSettings.lineTargetId) {
          await pushLineMessage(adsSettings.lineTargetId, adsSettings.adsLineChannelAccessToken, msg);
        }
        continue;
      }

      // 5) save image file (optional แต่ช่วยให้ดูสลิปย้อนหลังได้)
      const receiptUrl = await saveToPublicUploads(imageBuf, ".jpg");

      // 6) extract amount
      const amountResult = await extractAmountFromReceipt(imageBuf, qrText);

      // 7) create adReceipt
      const receiptNumber = `ADS-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const created = await prisma.adReceipt.create({
        data: {
          organizationId,
          receiptNumber,
          platform: "META_ADS",
          paymentMethod: "QR_CODE",
          amount: amountResult.amount ?? 0,
          currency: "THB",
          receiptUrl,
          qrCodeData: qrText,
          fileHash,
          qrHash,
          isProcessed: false,
          paidAt: new Date(),
        },
      });

      // 8) reply
      const msg =
        `✅ รับสลิปแล้ว!\n\n` +
        `เลขที่: ${created.receiptNumber}\n` +
        `จำนวนเงิน: ฿${Number(created.amount || 0).toLocaleString("th-TH")}\n` +
        `แพลตฟอร์ม: ${created.platform}\n\n` +
        `ดูสลิป: ${receiptUrl}\n` +
        `วิธีตรวจ: ${amountResult.method}${amountResult.amountDetected ? "" : " (อ่านไม่ชัวร์)"}`;

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
