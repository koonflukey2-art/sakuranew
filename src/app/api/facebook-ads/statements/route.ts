import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join, basename } from "path";
import { createHash } from "crypto";

export const runtime = "nodejs";

// ---------- Types ----------
type Statement = {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vat: number;
  fileUrl: string;
  fileName: string;
  source?: string;
  createdAt: string;
};

// ---------- pdf-parse loader (CJS ใน Next Node runtime) ----------
let cachedPdfParse: null | ((buffer: Buffer) => Promise<{ text: string }>) = null;

async function loadPdfParse(): Promise<(buffer: Buffer) => Promise<{ text: string }>> {
  if (cachedPdfParse) return cachedPdfParse;

  let lastError: unknown = null;

  try {
    // ใช้ require ผ่าน eval เพื่อเลี่ยง webpack transform
    const req = eval("require") as any;
    const mod = req("pdf-parse");
    const fn = (mod && (mod.default || mod)) as any;

    if (typeof fn === "function") {
      cachedPdfParse = fn;
      return fn;
    }

    lastError = new Error("pdf-parse require() returned non-function");
  } catch (e) {
    lastError = e;
  }

  console.error("❌ pdf-parse module shape unexpected, lastError:", lastError);
  throw new Error("pdf-parse loaded but is not a function");
}

async function getPdfTextAndBuffer(
  file: File
): Promise<{ buffer: Buffer; text: string }> {
  // แปลง File → Buffer (ใช้ได้เฉพาะ runtime nodejs)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const pdfParse = await loadPdfParse();
  const result = await pdfParse(buffer);

  return { buffer, text: String(result.text ?? "") };
}

// ---------- helpers ----------

function toIsoFromDmy(dmy: string): string {
  // format ในไฟล์: 6/10/2025
  const [dStr, mStr, yStr] = dmy.split("/");
  const d = Number(dStr);
  const m = Number(mStr) - 1;
  const y = Number(yStr);
  const iso = new Date(Date.UTC(y, m, d)).toISOString();
  return iso.slice(0, 10); // YYYY-MM-DD
}

function parseMetaInvoice(text: string) {
  // ลบ space แปลก ๆ และ comma เพื่อดึงเลขง่าย ๆ
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ");

  // ช่วงเวลา: "รายงานการเรียกเก็บเงิน: 6/10/2025 - 13/10/2025"
  const periodMatch = normalized.match(
    /รายงานการเรียกเก็บเงิน.*?(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/
  );

  const startThai = periodMatch?.[1];
  const endThai = periodMatch?.[2];

  // ยอดเรียกเก็บ + VAT
  // แถว "ยอดที่เรียกเก็บทั้งหมด ฿xxx.xx"
  const chargeMatch = normalized.match(
    /ยอดที่เรียกเก็บทั้งหมด\s*฿?(\d+(\.\d{1,2})?)/
  );

  // แถว "VAT Amount: ฿xx.xx"
  const vatMatch = normalized.match(/VAT Amount:\s*฿?(\d+(\.\d{1,2})?)/);

  const charge = chargeMatch ? parseFloat(chargeMatch[1]) : 0;
  const vat = vatMatch ? parseFloat(vatMatch[1]) : 0;
  const totalAmount = charge + vat; // รวม VAT

  const startDate = startThai
    ? toIsoFromDmy(startThai)
    : new Date().toISOString().slice(0, 10);
  const endDate = endThai ? toIsoFromDmy(endThai) : startDate;

  const periodLabel =
    startThai && endThai
      ? `${startThai} - ${endThai}`
      : startThai || endThai || new Date().toLocaleDateString("th-TH");

  return { startDate, endDate, period: periodLabel, totalAmount, vat };
}

function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

function getUploadDir() {
  return (
    process.env.UPLOAD_DIR ||
    join(process.cwd(), "public", "uploads", "statements")
  );
}

// ---------- GET /api/facebook-ads/statements ----------
export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = dbUser.organizationId;

    // Fetch from database
    const statements = await prisma.facebookAdsStatement.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        period: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        vat: true,
        fileUrl: true,
        fileName: true,
        source: true,
        createdAt: true,
      },
    });

    // Format dates for frontend
    const formattedStatements: Statement[] = statements.map((s) => ({
      id: s.id,
      period: s.period,
      startDate: s.startDate.toISOString().split("T")[0],
      endDate: s.endDate.toISOString().split("T")[0],
      totalAmount: s.totalAmount,
      vat: s.vat,
      fileUrl: s.fileUrl,
      fileName: s.fileName,
      source: s.source ?? undefined,
      createdAt: s.createdAt.toISOString(),
    }));

    const totalAmount = statements.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalVAT = statements.reduce((sum, s) => sum + s.vat, 0);

    return NextResponse.json({
      statements: formattedStatements,
      totalAmount,
      totalVAT,
    });
  } catch (error: any) {
    console.error("Failed to fetch statements:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch statements" },
      { status: 500 }
    );
  }
}

// ---------- POST /api/facebook-ads/statements ----------
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = dbUser.organizationId;

    const formData = await request.formData();
    const file = formData.get("statement");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // ดึง text + buffer จาก PDF
    const { buffer, text } = await getPdfTextAndBuffer(file);
    const parsed = parseMetaInvoice(text);

    // Save file to disk
    const uploadsDir = getUploadDir();
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const fileHash = sha256Hex(buffer);
    // ✅ ไม่ใช้ crypto.randomBytes แล้ว
    const filename = `statement-${Date.now()}-${fileHash.slice(0, 8)}.pdf`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // URL ที่ frontend จะใช้เปิด / ดาวน์โหลด (คุณต้องมี route หรือ static serve ให้ path นี้ใช้ได้จริง)
    const fileUrl = `/api/uploads/statements/${filename}`;

    // Create statement in database
    const statement = await prisma.facebookAdsStatement.create({
      data: {
        organizationId: orgId,
        period: parsed.period,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
        totalAmount: parsed.totalAmount,
        vat: parsed.vat,
        fileUrl,
        fileName: file.name,
      },
    });

    console.log(
      `✅ Statement uploaded: ${file.name} (${(file.size / 1024).toFixed(
        2
      )} KB) total=${statement.totalAmount} vat=${statement.vat}`
    );

    return NextResponse.json({
      success: true,
      statement: {
        id: statement.id,
        period: statement.period,
        startDate: statement.startDate.toISOString().split("T")[0],
        endDate: statement.endDate.toISOString().split("T")[0],
        totalAmount: statement.totalAmount,
        vat: statement.vat,
        fileUrl: statement.fileUrl,
        fileName: statement.fileName,
        createdAt: statement.createdAt.toISOString(),
      },
      message: "อัพโหลดสเตทเมนต์สำเร็จ",
    });
  } catch (error: any) {
    console.error("Upload statement error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload statement" },
      { status: 500 }
    );
  }
}

// ---------- DELETE /api/facebook-ads/statements ----------
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true },
    });

    if (!dbUser?.organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const orgId = dbUser.organizationId;

    // อ่านจาก query string: /api/facebook-ads/statements?id=xxx
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    // ก่อนลบ: หา record ให้แน่ใจว่าเป็นของ org นี้ + เอา fileUrl ไปใช้ลบไฟล์ด้วย
    const existing = await prisma.facebookAdsStatement.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      select: {
        id: true,
        fileUrl: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // พยายามลบไฟล์บนดิสก์ (ถ้า path เราคุมเอง)
    if (existing.fileUrl?.startsWith("/api/uploads/statements/")) {
      try {
        const filename = basename(existing.fileUrl);
        const uploadsDir = getUploadDir();
        const filepath = join(uploadsDir, filename);
        await unlink(filepath).catch(() => {});
      } catch (fileErr) {
        console.warn("Failed to delete statement file:", fileErr);
      }
    }

    // ลบจาก DB (ใช้ id อย่างเดียว เพราะเป็น PK)
    await prisma.facebookAdsStatement.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete statement error:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to delete statement" },
      { status: 500 }
    );
  }
}
