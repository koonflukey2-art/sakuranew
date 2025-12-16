// src/app/api/facebook-ads/statements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// ใช้ runtime node เพื่อให้ใช้ Buffer / pdf-parse ได้
export const runtime = "nodejs";

type Statement = {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vat: number;
  fileUrl: string;
  fileName: string;
  createdAt: string;
};

// เก็บไว้ใน memory (พอรีสตาร์ท dev server จะหาย แต่พอสำหรับตอนนี้)
let statements: Statement[] = [];

// helper แปลง "3,460.92" -> 3460.92
function parseMoney(str: string | undefined | null): number {
  if (!str) return 0;
  return Number(str.replace(/,/g, ""));
}

// ดึงข้อมูลจาก Meta invoice PDF
async function extractFromPdf(file: File) {
  // import แบบ dynamic เพราะ pdf-parse เป็น CJS
  const pdfParse = (await import("pdf-parse")).default as any;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const data = await pdfParse(buffer);
  const text: string = data.text || "";

  // ยอดที่เรียกเก็บทั้งหมด ฿3,460.92 THB
  const totalMatch = text.match(
    /ยอดที่เรียกเก็บทั้งหมด\s*฿([0-9,]+\.[0-9]{2})/,
  );

  // VAT Amount ฿226.41 THB
  const vatMatch = text.match(/VAT Amount\s*฿([0-9,]+\.[0-9]{2})/);

  // ช่วงวันที่: เช่น "6 ต.ค. 2025 - 13 ต.ค. 2025"
  const periodMatch = text.match(
    /(\d{1,2}\s[^\s]+\s\d{4})\s*-\s*(\d{1,2}\s[^\s]+\s\d{4})/,
  );

  const totalAmount = parseMoney(totalMatch?.[1]);
  const vat = parseMoney(vatMatch?.[1]);

  const period =
    periodMatch?.[0] ??
    new Date().toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const startDate = periodMatch?.[1] ?? new Date().toISOString().split("T")[0];
  const endDate = periodMatch?.[2] ?? new Date().toISOString().split("T")[0];

  return { period, startDate, endDate, totalAmount, vat };
}

// GET /api/facebook-ads/statements
export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const totalAmount = statements.reduce(
      (sum, s) => sum + s.totalAmount,
      0,
    );
    const totalVAT = statements.reduce((sum, s) => sum + s.vat, 0);

    return NextResponse.json({
      statements,
      totalAmount,
      totalVAT,
    });
  } catch (error) {
    console.error("Failed to fetch statements:", error);
    return NextResponse.json(
      { error: "Failed to fetch statements" },
      { status: 500 },
    );
  }
}

// POST /api/facebook-ads/statements  (upload PDF)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("statement") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 },
      );
    }

    // ดึงข้อมูลจริงจาก PDF
    const parsed = await extractFromPdf(file);

    const statement: Statement = {
      id: `stmt-${Date.now()}`,
      period: parsed.period,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      totalAmount: parsed.totalAmount,
      vat: parsed.vat,
      fileUrl: "#", // TODO: ถ้าอัปขึ้น S3 / storage ค่อยใส่ลิงก์จริง
      fileName: file.name,
      createdAt: new Date().toISOString(),
    };

    // เก็บไว้ใน memory
    statements = [statement, ...statements];

    console.log(
      `✅ Statement uploaded: ${file.name} | total=${statement.totalAmount} | vat=${statement.vat}`,
    );

    return NextResponse.json({
      success: true,
      statement,
      message: "อัพโหลดสเตทเมนต์สำเร็จ",
    });
  } catch (error) {
    console.error("Upload statement error:", error);
    return NextResponse.json(
      { error: "Failed to upload statement" },
      { status: 500 },
    );
  }
}

// DELETE /api/facebook-ads/statements?id=stmt-123
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id" },
        { status: 400 },
      );
    }

    const before = statements.length;
    statements = statements.filter((s) => s.id !== id);

    if (statements.length === before) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete statement error:", error);
    return NextResponse.json(
      { error: "Failed to delete statement" },
      { status: 500 },
    );
  }
}
