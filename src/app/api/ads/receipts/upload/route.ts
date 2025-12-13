import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import crypto from "crypto";

import sharp from "sharp";
import jsQR from "jsqr";
import { createWorker } from "tesseract.js";

export const runtime = "nodejs";

let workerPromise: Promise<any> | null = null;

function sha256Hex(buf: Buffer | string) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      // ✅ สำคัญ: createWorker signature ใน tesseract.js (node) = createWorker(langs, oem, options)
      const workerPath = require.resolve("tesseract.js/dist/worker.min.js");
      const corePath = require.resolve("tesseract.js-core/tesseract-core.wasm.js");

      const w: any = await createWorker(
        "eng",
        1,
        {
          workerPath,
          corePath,
          logger: (m: any) => {
            // ถ้าอยากดู progress ให้ปลดคอมเมนต์
            // console.log("[OCR]", m);
          },
        } as any
      );

      // บางเวอร์ชันมี loadLanguage/initialize ให้เรียกด้วย
      if (typeof w.loadLanguage === "function") await w.loadLanguage("eng");
      if (typeof w.initialize === "function") await w.initialize("eng");

      if (typeof w.setParameters === "function") {
        await w.setParameters({
          tessedit_char_whitelist: "0123456789.,",
        });
      }
      return w;
    })();
  }
  return workerPromise;
}

export async function POST(request: NextRequest) {
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

    // ✅ ทำ fileHash ก่อน (กันซ้ำระดับไฟล์)
    const fileHash = sha256Hex(buffer);

    // ✅ เช็คซ้ำจาก DB (ก่อนบันทึกไฟล์)
    const dupByFile = await prisma.adReceipt.findFirst({
      where: { organizationId: orgId, fileHash },
      select: { id: true, receiptNumber: true, receiptUrl: true },
    });

    if (dupByFile) {
      return NextResponse.json(
        {
          error: "DUPLICATE_RECEIPT",
          message: `สลิปนี้เคยอัปโหลดแล้ว (${dupByFile.receiptNumber})`,
          receipt: dupByFile,
        },
        { status: 409 }
      );
    }

    // Save file
    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const receiptUrl = `/uploads/${filename}`;
    console.log("[UPLOAD] saved:", receiptUrl);

    // ✅ อ่านยอดเงิน: Tag54 ก่อน -> ถ้าไม่มีค่อย OCR
    const result = await extractAmountFromReceipt(buffer);

    // ✅ ทำ qrHash (ถ้าอ่าน qr ได้)
    const qrHash = result.qrText ? sha256Hex(result.qrText.trim()) : null;

    // ✅ กันซ้ำด้วย qrHash (กรณีไฟล์ถูกบันทึกใหม่แต่ QR เดิม)
    if (qrHash) {
      const dupByQr = await prisma.adReceipt.findFirst({
        where: { organizationId: orgId, qrHash },
        select: { id: true, receiptNumber: true, receiptUrl: true },
      });
      if (dupByQr) {
        return NextResponse.json(
          {
            error: "DUPLICATE_RECEIPT_QR",
            message: `สลิปนี้เคยอัปโหลดแล้ว (${dupByQr.receiptNumber})`,
            receipt: dupByQr,
          },
          { status: 409 }
        );
      }
    }

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
        qrCodeData: result.qrText,
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

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

async function extractAmountFromReceipt(buffer: Buffer): Promise<{
  amount: number | null;
  qrText: string | null;
  amountDetected: boolean;
  method: "EMV_TAG_54" | "OCR" | "NONE";
  reason?: string;
}> {
  // 1) decode QR (ถ้ามี)
  let qrText: string | null = null;
  try {
    qrText = await decodeQrFromImageBuffer(buffer);
    if (qrText) console.log("[QR] data:", qrText.slice(0, 40) + "...");
  } catch {
    qrText = null;
  }

  // 2) Try EMV Tag 54
  if (qrText) {
    const tlv = parseTlv2Len2(qrText);
    const amountStr = tlv["54"];
    if (amountStr) {
      const amount = Number(amountStr);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, qrText, amountDetected: true, method: "EMV_TAG_54" };
      }
    }
  }

  // 3) Fallback OCR: ✅ เปลี่ยน logic เลือกจำนวนเงินให้ฉลาดขึ้น
  const ocrAmount = await extractAmountByOcrSmart(buffer);
  if (ocrAmount !== null) {
    return { amount: ocrAmount, qrText, amountDetected: true, method: "OCR" };
  }

  return {
    amount: null,
    qrText,
    amountDetected: false,
    method: qrText ? "OCR" : "NONE",
    reason: qrText
      ? "QR has no amount. OCR could not confidently read amount."
      : "No QR detected and OCR could not read amount.",
  };
}

async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
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

/**
 * ✅ OCR แบบ “หาเลข 2 ตำแหน่ง + บาท / หรืออยู่ในบรรทัดจำนวน”
 * - กันเคสไปหยิบเลขอื่น (เช่น 806/751/640) เพราะเดิมใช้ Math.max(...)
 */
async function extractAmountByOcrSmart(buffer: Buffer): Promise<number | null> {
  const img = sharp(buffer);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return null;

  // 1) โซนที่ “มักมีจำนวน: xxx.xx บาท”
  const crop1 = await img
    .extract({
      left: Math.floor(w * 0.05),
      top: Math.floor(h * 0.62),
      width: Math.floor(w * 0.70),
      height: Math.floor(h * 0.25),
    })
    .grayscale()
    .normalize()
    .threshold(175)
    .png()
    .toBuffer();

  const worker = await getOcrWorker();
  console.log("[OCR] start recognize...");

  const res1 = await worker.recognize(crop1);
  const text1 = String(res1?.data?.text || "");
  const picked1 = pickAmountFromOcrText(text1);
  if (picked1 != null) return picked1;

  // 2) fallback โซนล่างซ้ายกว้างขึ้น (ตัด QR ด้านขวา)
  const crop2 = await img
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

  const res2 = await worker.recognize(crop2);
  const text2 = String(res2?.data?.text || "");
  return pickAmountFromOcrText(text2);
}

function pickAmountFromOcrText(raw: string): number | null {
  const text = raw.replace(/\r/g, "");
  const lines = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // 1) ตรงที่สุด: "... 500.00 บาท"
  for (const line of lines) {
    const m = line.match(/(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})\s*บาท/);
    if (m) {
      const val = Number(m[1].replace(/,/g, "") + "." + m[2]);
      if (isFinite(val) && val > 0 && val < 1_000_000) return val;
    }
  }

  // 2) ถัดมา: บรรทัดที่มีคำว่า “จำนวน” แล้วมีเลข
  for (const line of lines) {
    if (!/จำนวน|amount/i.test(line)) continue;

    // prefer decimal first
    const mDec = line.match(/(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})/);
    if (mDec) {
      const val = Number(mDec[1].replace(/,/g, "") + "." + mDec[2]);
      if (isFinite(val) && val > 0 && val < 1_000_000) return val;
    }

    const mInt = line.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
    if (mInt) {
      const val = Number(mInt[1].replace(/,/g, ""));
      if (isFinite(val) && val > 0 && val < 1_000_000) return val;
    }
  }

  // 3) fallback: หาเลขทศนิยม 2 ตำแหน่งทั้งหมด แต่ "ตัดค่าธรรมเนียม" + เลือกตัวที่สมเหตุสมผล
  const candidates: { val: number; score: number; line: string }[] = [];

  for (const line of lines) {
    const feeLine = /ค่าธรรมเนียม|fee/i.test(line);
    const hasBaht = /บาท/.test(line);
    const hasAmountWord = /จำนวน|amount/i.test(line);

    const matches = [...line.matchAll(/(\d{1,3}(?:,\d{3})*|\d+)\.(\d{2})/g)];
    for (const mm of matches) {
      const val = Number(mm[1].replace(/,/g, "") + "." + mm[2]);
      if (!isFinite(val) || val <= 0 || val >= 1_000_000) continue;

      // กันเลขยาวๆหลุดมาเป็น 2 ตำแหน่ง
      const pure = String(mm[0]).replace(/[.,]/g, "");
      if (pure.length > 7) continue;

      let score = 0;
      if (hasBaht) score += 50;
      if (hasAmountWord) score += 60;
      if (feeLine) score -= 80;

      // เงินมักลงท้าย .00
      if (mm[2] === "00") score += 10;

      candidates.push({ val, score, line });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || a.val - b.val);
  return candidates[0].val;
}
