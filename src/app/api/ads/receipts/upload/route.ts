import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";

import sharp from "sharp";
import jsQR from "jsqr";

export const runtime = "nodejs"; // ให้แน่ใจว่าใช้ fs ได้

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ หา organizationId จาก DB (อย่า default เป็น default-org ถ้าเป็นระบบจริง)
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

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ตั้งชื่อไฟล์ให้ปลอดภัย (ไม่ใช้ชื่อเดิมตรง ๆ)
    const safeExt = extname(file.name) || guessExtFromMime(file.type);
    const filename = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);
    const receiptUrl = `/uploads/${filename}`;

    // ✅ อ่าน QR + ดึง amount (Tag 54 เท่านั้น)
    const { amount, qrText, amountDetected, reason } =
      await extractAmountFromReceipt(buffer);

    // Create receipt record
    const receipt = await prisma.adReceipt.create({
      data: {
        organizationId: orgId,
        campaignId,
        receiptNumber: `RCP-${Date.now()}`,
        platform: platform || "META_ADS",
        paymentMethod: "QR_CODE",

        // ถ้าอ่านไม่ได้ ให้ 0 เพื่อไม่เพี้ยน
        amount: amount ?? 0,
        currency: "THB",

        receiptUrl,
        qrCodeData: qrText,
        isProcessed: false,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      receipt,
      amount: amount ?? 0,
      amountDetected,
      needsManualAmount: !amountDetected, // ✅ ให้หน้าเว็บเอาไปบังคับกรอก/ยืนยันได้
      reason: amountDetected ? undefined : reason,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

function guessExtFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".jpg";
}

/**
 * อ่าน QR จากรูป แล้วดึง amount จาก EMV Tag 54 เท่านั้น
 * - ถ้า QR ไม่มี tag 54 (QR แบบ static) => ไม่เดา amount
 */
async function extractAmountFromReceipt(buffer: Buffer): Promise<{
  amount: number | null;
  qrText: string | null;
  amountDetected: boolean;
  reason?: string;
}> {
  // 1) decode QR
  let qrText: string | null = null;
  try {
    qrText = await decodeQrFromImageBuffer(buffer);
  } catch (e) {
    qrText = null;
  }

  if (!qrText) {
    return { amount: null, qrText: null, amountDetected: false, reason: "No QR detected in image" };
  }

  // 2) parse EMV TLV only if numeric string
  if (!/^\d+$/.test(qrText)) {
    return {
      amount: null,
      qrText,
      amountDetected: false,
      reason: "QR is not EMV TLV numeric payload (cannot safely extract amount)",
    };
  }

  const tlv = parseEmvTlv(qrText);

  // Tag 54 = transaction amount
  const amountStr = tlv["54"];
  if (!amountStr) {
    return {
      amount: null,
      qrText,
      amountDetected: false,
      reason: "EMV payload has no tag 54 (amount not embedded). Ask user to input amount.",
    };
  }

  const amount = Number(amountStr);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      amount: null,
      qrText,
      amountDetected: false,
      reason: "Invalid amount in EMV tag 54",
    };
  }

  return { amount, qrText, amountDetected: true };
}

/** decode QR using sharp + jsqr */
async function decodeQrFromImageBuffer(buffer: Buffer): Promise<string | null> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  return code?.data ?? null;
}

/** EMV TLV parser: [tag(2)][len(2)][value...] */
function parseEmvTlv(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;

  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const lenStr = payload.slice(i + 2, i + 4);
    const len = Number(lenStr);

    if (!Number.isFinite(len) || len < 0) break;

    const start = i + 4;
    const end = start + len;
    if (end > payload.length) break;

    out[tag] = payload.slice(start, end);
    i = end;
  }

  return out;
}
