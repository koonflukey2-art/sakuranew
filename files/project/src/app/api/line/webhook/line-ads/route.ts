import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { createHash, createHmac } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, extname } from "path";

import sharp from "sharp";
import jsQR from "jsqr";

// ใช้ helper เดิมของคุณ
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
  return prisma.systemSettings.findUnique({
    where: { organizationId },
    select: {
      adsLineChannelAccessToken: true,
      adsLineChannelSecret: true,
      adsLineNotifyToken: true,
      adsLineWebhookUrl: true,
      lineTargetId: true, // optional
    },
  });
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

function guessExtFromBuffer(buf: Buffer) {
  // เบา ๆ พอ: ตรวจ magic header
  if (buf.length >= 12) {
    // PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
      return ".png";
    // WEBP: "RIFF....WEBP"
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    )
      return ".webp";
  }
  return ".jpg";
}

async function saveToPublicUploads(imageBuf: Buffer) {
  const uploadsDir = join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true });

  const ext = guessExtFromBuffer(imageBuf);
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
  // EMVCo payload ของ PromptPay/Payment
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
// 6) OCR WORKER (Singleton)
// =====================
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      // ✅ ห้ามส่ง logger callback เข้าไป (กัน DataCloneError)
      const w: any = await createWorker();

      // ✅ FIX: Use Thai+English for Thai receipts!
      console.log("🔧 Initializing OCR with Thai+English support...");
      if (typeof w.loadLanguage === "function") await w.loadLanguage("tha+eng");
      if (typeof w.initialize === "function") await w.initialize("tha+eng");
      if (typeof w.reinitialize === "function") await w.reinitialize("tha+eng");

      // ✅ FIX: REMOVE character whitelist to allow reading Thai context words like "จำนวน", "บาท"
      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_pageseg_mode: "6",
          preserve_interword_spaces: "1",
        });
      }
      console.log("✅ OCR worker ready with Thai+English");

      return w;
    })();
  }
  return workerPromise;
}

function normalizeNumberToken(token: string) {
  const t = token.trim();
  // 500,00 -> 500.00 (เผื่อ OCR)
  if (/,(\d{2})$/.test(t) && !/\./.test(t)) return t.replace(",", ".");
  return t;
}

function parseMoney(s: string): number | null {
  const n = Number(normalizeNumberToken(s).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n >= 10_000_000) return null;
  return n;
}

type OcrCandidate = { value: number; x: number; y: number; raw: string; hasDecimal: boolean };

function pickBestByPosition(cands: OcrCandidate[]) {
  // คาดว่าตำแหน่ง “จำนวนเงิน” จะอยู่แถวล่าง และค่อนกลาง (ไม่ติด QR ขวาสุด)
  // score ยิ่งน้อยยิ่งดี
  let best: { c: OcrCandidate; score: number } | null = null;

  for (const c of cands) {
    const x = c.x; // 0..1
    const y = c.y; // 0..1
    const expectedX = 0.55;
    const expectedY = 0.75;

    const dx = Math.abs(x - expectedX);
    const dy = Math.abs(y - expectedY);

    // penalize เลขใหญ่เว่อร์ (มักเป็นเลขอ้างอิง)
    const bigPenalty = c.value >= 100_000 ? 6 : c.value >= 50_000 ? 3 : 0;

    // prefer มีทศนิยม 2 ตำแหน่ง
    const decimalPenalty = c.hasDecimal ? 0 : 0.7;

    const score = dx * 2.2 + dy * 3.0 + bigPenalty + decimalPenalty;

    if (!best || score < best.score) best = { c, score };
  }

  return best?.c ?? null;
}

async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  console.log("════════════════════════════════════════");
  console.log("🔍 OCR AMOUNT EXTRACTION START");
  console.log("════════════════════════════════════════");

  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  console.log(`📐 Image dimensions: ${w}x${h}`);
  if (!w || !h) return null;

  // ✅ 3 crop: (1) เจาะจงบริเวณจำนวนเงิน (2) กว้างขึ้น (3) fallback กว้างสุดแต่ตัด QR
  const crops = [
    // (1) เจาะจงตำแหน่งยอดเงินของสลิป K+
    {
      left: Math.floor(w * 0.22),
      top: Math.floor(h * 0.68),
      width: Math.floor(w * 0.46),
      height: Math.floor(h * 0.16),
    },
    // (2) โซนล่างกลาง (ตัด QR ขวา)
    {
      left: Math.floor(w * 0.10),
      top: Math.floor(h * 0.62),
      width: Math.floor(w * 0.62),
      height: Math.floor(h * 0.26),
    },
    // (3) ล่างซ้ายกว้าง ๆ (ตัด QR ขวา)
    {
      left: 0,
      top: Math.floor(h * 0.55),
      width: Math.floor(w * 0.75),
      height: Math.floor(h * 0.40),
    },
  ];

  const worker = await getOcrWorker();

  for (let pass = 0; pass < crops.length; pass++) {
    console.log(`\n📍 PASS ${pass + 1}/3 - Crop region:`, crops[pass]);
    const r = crops[pass];

    const cropBuf = await img
      .clone()
      .extract(r)
      .resize({ width: Math.max(1200, r.width * 2) })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(170)
      .png()
      .toBuffer();

    const res = await worker.recognize(cropBuf);

    // ✅ FIX: Get full text for Thai context matching
    const fullText = String(res?.data?.text || "").replace(/\s+/g, " ").trim();
    console.log(`📄 Full OCR text (first 300 chars):\n${fullText.slice(0, 300)}`);

    // ✅ FIX: Try Thai context-based extraction FIRST
    const contextAmount = extractAmountWithThaiContext(fullText);
    if (contextAmount !== null) {
      console.log(`✅ FOUND via Thai context: ฿${contextAmount.toLocaleString()}`);
      console.log("════════════════════════════════════════\n");
      return contextAmount;
    }

    const words = (res?.data?.words || []) as Array<{
      text: string;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }>;

    console.log(`🔢 Total words detected: ${words.length}`);
    const cands: OcrCandidate[] = [];

    for (const ww of words) {
      const t = (ww.text || "").trim();
      if (!t) continue;

      // รองรับทั้งมี/ไม่มี comma และมี/ไม่มีทศนิยม 2 ตำแหน่ง
      // แต่ "ให้คะแนนดีกว่า" ถ้ามีทศนิยม
      const isMoneyish = /^\d{1,3}(?:,\d{3})*(?:[.,]\d{2})?$/.test(t) || /^\d+(?:[.,]\d{2})?$/.test(t);
      if (!isMoneyish) continue;

      // กันเลขยาว ๆ (เลขรายการ/อ้างอิง)
      const digitLen = t.replace(/[^\d]/g, "").length;
      if (digitLen >= 8) {
        console.log(`⏭️  Skipping long number (likely reference): ${t} (${digitLen} digits)`);
        continue;
      }

      const value = parseMoney(t);
      if (value === null) continue;

      // normalize bbox -> 0..1
      const cx = ((ww.bbox?.x0 ?? 0) + (ww.bbox?.x1 ?? 0)) / 2;
      const cy = ((ww.bbox?.y0 ?? 0) + (ww.bbox?.y1 ?? 0)) / 2;

      const x = cx / Math.max(1, r.width);
      const y = cy / Math.max(1, r.height);

      const hasDecimal = /[.,]\d{2}$/.test(t);

      console.log(`  💰 Candidate: ฿${value.toLocaleString()} (${t}) at (${x.toFixed(2)}, ${y.toFixed(2)}) decimal=${hasDecimal}`);
      cands.push({ value, x, y, raw: t, hasDecimal });
    }

    console.log(`\n📊 Total candidates: ${cands.length}`);

    // ✅ เลือกที่ "ตำแหน่งเหมือนยอดเงินจริง" มากสุด
    const best = pickBestByPosition(cands);
    if (best) {
      console.log(`✅ BEST PICK: ฿${best.value.toLocaleString()} (${best.raw}) at position (${best.x.toFixed(2)}, ${best.y.toFixed(2)})`);
      console.log("════════════════════════════════════════\n");
      return best.value;
    }

    // fallback text-based (กันหลุด)
    console.log(`⚠️ No candidates found, trying fallback regex...`);
    const m = fullText.match(/(\d{1,3}(?:,\d{3})*(?:[.,]\d{2}))/);
    if (m?.[1]) {
      const n = parseMoney(m[1]);
      if (n !== null) {
        console.log(`⚠️ FALLBACK: Found ฿${n.toLocaleString()} via regex`);
        console.log("════════════════════════════════════════\n");
        return n;
      }
    }
  }

  console.log("❌ NO AMOUNT FOUND in any pass");
  console.log("════════════════════════════════════════\n");
  return null;
}

/**
 * ✅ NEW: Extract amount using Thai context words
 * Priority patterns for Thai receipt formats
 */
function extractAmountWithThaiContext(text: string): number | null {
  // Thai receipt patterns (in priority order)
  const patterns = [
    // "จำนวน" followed by number
    /จำนวน[:\s]*([0-9,]+(?:\.[0-9]{2})?)\s*(?:บาท)?/i,
    // "ยอดชำระ" followed by number
    /ยอดชำระ[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
    // "จำนวนเงิน" followed by number
    /จำนวนเงิน[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
    // "ชำระเงิน" followed by number
    /ชำระเงิน[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
    // "ยอดรวม" followed by number
    /ยอดรวม[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
    // Number followed by "บาท"
    /([0-9,]+(?:\.[0-9]{2})?)\s*บาท/i,
    // "THB" or "฿" with number
    /(?:THB|฿)\s*([0-9,]+(?:\.[0-9]{2})?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseMoney(match[1]);
      if (value !== null && value >= 100 && value < 100000) {
        console.log(`  ✨ Thai context match: "${match[0]}" → ฿${value.toLocaleString()}`);
        return value;
      }
    }
  }

  return null;
}

// =====================
// 7) AMOUNT EXTRACT (EMV Tag54 -> OCR)
// =====================
async function extractAmountFromReceipt(buffer: Buffer, qrText: string | null) {
  console.log("\n🎯 ═══════════════════════════════════════════");
  console.log("🎯 RECEIPT AMOUNT EXTRACTION PIPELINE");
  console.log("🎯 ═══════════════════════════════════════════");

  // 1) try EMV Tag54 เฉพาะ EMV payment QR จริงเท่านั้น
  if (qrText) {
    console.log("📱 QR Code found, checking if EMV PromptPay...");
    if (isEmvPaymentQr(qrText)) {
      console.log("✅ Valid EMV PromptPay QR detected");
      const tlv = parseTlv2Len2(qrText);
      console.log("🔍 EMV Tags found:", Object.keys(tlv).join(", "));
      const amountStr = tlv["54"];
      if (amountStr) {
        const amount = Number(amountStr);
        console.log(`💰 Tag 54 (amount): "${amountStr}" → ฿${amount.toLocaleString()}`);
        if (Number.isFinite(amount) && amount > 0) {
          console.log("✅ AMOUNT EXTRACTED via EMV Tag 54");
          console.log("═══════════════════════════════════════════\n");
          return { amount, method: "EMV_TAG_54" as const, amountDetected: true as const };
        }
      } else {
        console.log("⚠️ Tag 54 not found in EMV payload");
      }
    } else {
      console.log("⚠️ QR is not EMV PromptPay format, skipping tag extraction");
      console.log("   QR preview:", qrText.slice(0, 100));
    }
  } else {
    console.log("ℹ️ No QR code detected in image");
  }

  // 2) OCR
  console.log("\n🔍 Falling back to OCR extraction...");
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) {
    console.log("✅ AMOUNT EXTRACTED via OCR");
    console.log("═══════════════════════════════════════════\n");
    return { amount: ocrAmount, method: "OCR" as const, amountDetected: true as const };
  }

  console.log("❌ EXTRACTION FAILED - No amount found via QR or OCR");
  console.log("═══════════════════════════════════════════\n");
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
    if (!organizationId) return NextResponse.json({ ok: true }, { status: 200 });

    const adsSettings = await getLineAdsSettings(organizationId);
    if (!adsSettings?.adsLineChannelAccessToken || !adsSettings?.adsLineChannelSecret) {
      console.warn("LINE Ads token/secret not configured");
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

      // ✅ รับ “รูป” เท่านั้น
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

      // 5) save image
      const receiptUrl = await saveToPublicUploads(imageBuf);

      // 6) extract amount
      let amountResult = await extractAmountFromReceipt(imageBuf, qrText);

      // ✅ กัน “อ่านหลุดเป็นหลายหมื่น” : ถ้า OCR อ่านได้สูงผิดปกติ ลอง OCR ใหม่ด้วย crop เจาะจง (pass1 จะทำอยู่แล้ว)
      // ตรงนี้เป็น safety อีกชั้น (เผื่อบางรูป pass อื่นหลุด)
      if (amountResult.amountDetected && (amountResult.amount ?? 0) >= 10_000) {
        console.warn("[AMOUNT] suspicious amount:", amountResult.amount, "try again OCR only");
        const retry = await extractAmountByOcr(imageBuf);
        if (retry !== null) {
          amountResult = { amount: retry, method: "OCR" as const, amountDetected: true as const };
        }
      }

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

      // 8) reply (โชว์ method ด้วย จะได้รู้ว่ามาจาก QR หรือ OCR)
      const msg =
        `✅ รับสลิปแล้ว!\n\n` +
        `เลขที่: ${created.receiptNumber}\n` +
        `จำนวนเงิน: ฿${Number(created.amount || 0).toLocaleString("th-TH")}\n` +
        `แพลตฟอร์ม: ${created.platform}\n` +
        `วิธีตรวจ: ${amountResult.method}\n\n` +
        `ดูสลิป: ${receiptUrl}`;

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
