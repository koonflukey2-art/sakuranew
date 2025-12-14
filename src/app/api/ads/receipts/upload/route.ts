import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";
import jsQR from "jsqr";
import { createHash } from "crypto";

export const runtime = "nodejs";

// --------------------- helpers: hash ---------------------
function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

// --------------------- helpers: LINE download image ---------------------
// ดึงรูปต้นฉบับจาก LINE Messaging API
async function downloadLineMessageContent(
  messageId: string,
  channelAccessToken: string
): Promise<Buffer> {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    }
  );

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`LINE content download failed: ${res.status} ${t}`);
  }

  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

// --------------------- helpers: LINE push/reply ---------------------
async function replyLineMessage(
  replyToken: string,
  channelAccessToken: string,
  text: string
) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  }).catch(() => {});
}

async function pushLineMessage(
  to: string,
  channelAccessToken: string,
  text: string
) {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  }).catch(() => {});
}

// --------------------- helpers: org + settings ---------------------
async function getActiveOrgFromSystemSettings() {
  const s = await prisma.systemSettings.findFirst({
    select: { organizationId: true },
  });
  return s?.organizationId || null;
}

async function getAdsLineSettings(organizationId: string) {
  // ✅ สำคัญ: ต้อง select ฟิลด์ adsLine... ให้ครบ ไม่งั้น TS จะฟ้องว่าไม่มี property
  const s = await prisma.systemSettings.findUnique({
    where: { organizationId },
    select: {
      organizationId: true,
      adsLineChannelAccessToken: true,
      adsLineChannelSecret: true,
      adsLineNotifyToken: true,
      adsLineWebhookUrl: true,
      lineTargetId: true, // เผื่อคุณใช้ targetId เดิมหรือ bind แยกเอง
    },
  });

  return s;
}

function pickTargetIdFromSource(source: any): string | null {
  if (!source) return null;
  if (source.type === "group" && source.groupId) return source.groupId;
  if (source.type === "room" && source.roomId) return source.roomId;
  if (source.type === "user" && source.userId) return source.userId;
  return null;
}

// --------------------- QR decode ---------------------
async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  // ✅ rotate() แก้ EXIF orientation จากรูปที่ส่งมาจากมือถือ/LINE
  const { data, info } = await sharp(buffer)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
}

function isPromptPayEmvPayload(qrText: string) {
  // PromptPay EMV มักขึ้นต้น 000201
  return typeof qrText === "string" && qrText.startsWith("000201");
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

// --------------------- OCR worker (tha+eng) ---------------------
let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const mod: any = await import("tesseract.js");
      const createWorker: any = mod.createWorker;

      const w: any = await createWorker();

      // try Thai+Eng first
      const tryLangs = ["tha+eng", "eng"];
      for (const lang of tryLangs) {
        try {
          if (typeof w.loadLanguage === "function") await w.loadLanguage(lang);
          if (typeof w.initialize === "function") await w.initialize(lang);
          if (typeof w.reinitialize === "function") await w.reinitialize(lang);

          if (typeof w.setParameters === "function") {
            await w.setParameters({
              tessedit_pageseg_mode: "6",
              preserve_interword_spaces: "1",
            });
          }

          console.log("[OCR] initialized =", lang);
          break;
        } catch {
          console.warn("[OCR] init failed =", lang);
        }
      }

      return w;
    })();
  }
  return workerPromise;
}

// --------------------- amount extraction ---------------------
function normalizeNumberToken(token: string) {
  const t = token.trim();
  if (/,(\d{2})$/.test(t) && !/\./.test(t)) return t.replace(",", ".");
  return t;
}

function parseMoney(s: string): number | null {
  const n = Number(normalizeNumberToken(s).replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  // ✅ กันเลขอ้างอิง/เลขรายการยาวๆ หลุดมาเป็นหลายหมื่น/แสน
  if (n <= 0 || n > 500_000) return null;
  return n;
}

function pickMoneyByKeywords(text: string): number | null {
  const re =
    /(?:จำนวน|Amount|รวม|Total)\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)/i;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

function pickMoneyBeforeBaht(text: string): number | null {
  const re =
    /([0-9]{1,3}(?:,[0-9]{3})*(?:[.,][0-9]{2})?)\s*(?:บาท|THB)/i;
  const m = text.match(re);
  if (m?.[1]) return parseMoney(m[1]);
  return null;
}

function pickBestDecimal(text: string): number | null {
  const matches = [...text.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)[.,]\d{2}/g)].map(
    (m) => m[0]
  );

  const nums = matches
    .map((s) => parseMoney(s))
    .filter((n): n is number => n !== null)
    .filter((n) => n > 0.01);

  if (!nums.length) return null;
  return Math.max(...nums);
}

async function extractAmountByOcr(buffer: Buffer): Promise<number | null> {
  const img = sharp(buffer).rotate();
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // ✅ crop แคบๆ ตัดเลขอ้างอิง + ตัด QR ขวา
  const crops = [
    { left: Math.floor(w * 0.30), top: Math.floor(h * 0.64), width: Math.floor(w * 0.45), height: Math.floor(h * 0.16) },
    { left: Math.floor(w * 0.12), top: Math.floor(h * 0.58), width: Math.floor(w * 0.66), height: Math.floor(h * 0.28) },
    { left: 0, top: Math.floor(h * 0.55), width: Math.floor(w * 0.78), height: Math.floor(h * 0.45) },
  ];

  for (let pass = 0; pass < crops.length; pass++) {
    const r = crops[pass];

    const base = img.clone().extract(r).resize({ width: Math.max(900, r.width * 2) });

    const variants: Buffer[] = [
      await base.clone().grayscale().normalize().png().toBuffer(),
      await base.clone().grayscale().normalize().threshold(170).png().toBuffer(),
    ];

    for (let v = 0; v < variants.length; v++) {
      const worker = await getOcrWorker();
      const res = await worker.recognize(variants[v]);

      const raw = String(res?.data?.text || "");
      const text = raw.replace(/\s+/g, " ").trim();

      const amt =
        pickMoneyByKeywords(text) ??
        pickMoneyBeforeBaht(text) ??
        pickBestDecimal(text);

      if (amt !== null) return amt;
    }
  }

  return null;
}

async function extractAmountFromReceipt(buffer: Buffer): Promise<{
  amount: number | null;
  method: "EMV_TAG_54" | "OCR" | "NONE";
}> {
  // 1) QR
  const qrText = await decodeQrFromImageBuffer(buffer);

  // ✅ ใช้ Tag54 เฉพาะกรณีเป็น EMV PromptPay จริง (ขึ้นต้น 000201)
  if (qrText && isPromptPayEmvPayload(qrText)) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0 && amount <= 500_000) {
        return { amount, method: "EMV_TAG_54" };
      }
    }
  }

  // 2) OCR
  const ocrAmount = await extractAmountByOcr(buffer);
  if (ocrAmount !== null) return { amount: ocrAmount, method: "OCR" };

  return { amount: null, method: "NONE" };
}

// --------------------- MAIN: LINE ADS webhook ---------------------
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

    if (!Array.isArray(data.events) || data.events.length === 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const orgId = await getActiveOrgFromSystemSettings();
    if (!orgId) return NextResponse.json({ ok: true }, { status: 200 });

    const adsSettings = await getAdsLineSettings(orgId);
    const token = adsSettings?.adsLineChannelAccessToken || "";
    if (!token) return NextResponse.json({ ok: true }, { status: 200 });

    for (const event of data.events) {
      const replyToken = event.replyToken;
      const targetId = pickTargetIdFromSource(event.source);

      // รองรับ bind แบบเร็ว
      if (event.type === "message" && event.message?.type === "text") {
        const text = String(event.message.text || "").trim();
        if (text.toLowerCase().startsWith("#bind")) {
          if (targetId) {
            await prisma.systemSettings.update({
              where: { organizationId: orgId },
              data: { lineTargetId: targetId },
            });

            const msg =
              `✅ ผูกปลายทางรับสลิปโฆษณาแล้ว\n` +
              `type: ${event.source?.type}\n` +
              `targetId: ${targetId}`;

            if (replyToken) await replyLineMessage(replyToken, token, msg);
            else await pushLineMessage(targetId, token, msg);
          }
          continue;
        }
      }

      // ✅ “รูป” เท่านั้นสำหรับสลิป
      if (event.type !== "message" || event.message?.type !== "image") continue;

      const messageId = event.message.id;
      if (!messageId) continue;

      // 1) download image bytes
      const imgBuf = await downloadLineMessageContent(messageId, token);

      // 2) กันซ้ำด้วย hash (รูปจาก LINE จะ hash ได้)
      const fileHash = sha256Hex(imgBuf);

      const dup = await prisma.adReceipt.findFirst({
        where: { organizationId: orgId, fileHash },
        select: { id: true, receiptNumber: true, amount: true },
      });

      if (dup) {
        const dupMsg = `⚠️ สลิปนี้เคยบันทึกแล้ว (${dup.receiptNumber}) ยอด ฿${Number(
          dup.amount
        ).toLocaleString("th-TH")}`;
        if (replyToken) await replyLineMessage(replyToken, token, dupMsg);
        else if (targetId) await pushLineMessage(targetId, token, dupMsg);
        continue;
      }

      // 3) extract amount (QR/ OCR แบบเดียวกับเว็บ)
      const { amount, method } = await extractAmountFromReceipt(imgBuf);

      const finalAmount = amount ?? 0;

      // 4) save db
      const receipt = await prisma.adReceipt.create({
        data: {
          organizationId: orgId,
          receiptNumber: `ADS-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
          platform: "META_ADS",
          paymentMethod: "QR_CODE",
          amount: finalAmount,
          currency: "THB",
          fileHash,
          paidAt: new Date(),
          isProcessed: false,
        },
        select: { receiptNumber: true, amount: true },
      });

      const msg =
        `✅ รับสลิปแล้ว!\n\n` +
        `เลขที่: ${receipt.receiptNumber}\n` +
        `จำนวนเงิน: ฿${Number(receipt.amount).toLocaleString("th-TH")}\n` +
        `method: ${method}`;

      if (replyToken) await replyLineMessage(replyToken, token, msg);
      else if (targetId) await pushLineMessage(targetId, token, msg);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("LINE ADS WEBHOOK ERROR:", err?.message || err);
    console.error("Raw body:", rawBody);
    // LINE ต้องได้ 200 เสมอ
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
