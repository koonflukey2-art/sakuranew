import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

// ---------- Types ----------
type Statement = {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number; // ยอดรวม (รวม VAT)
  vat: number;
  fileUrl: string;     // data:application/pdf;base64,...
  fileName: string;
  createdAt: string;
};

// ---------- mock storage (รีสตาร์ทเซิร์ฟเวอร์แล้วจะหาย) ----------
let mockStatements: Statement[] = [
  {
    id: "stmt-1",
    period: "27 ต.ค. - 3 พ.ย. 2025",
    startDate: "2025-10-27",
    endDate: "2025-11-03",
    totalAmount: 15420.5,
    vat: 1080.45,
    fileUrl: "#",
    fileName: "statement-oct27-nov3.pdf",
    createdAt: "2025-11-04T10:00:00Z",
  },
  {
    id: "stmt-2",
    period: "20-26 ต.ค. 2025",
    startDate: "2025-10-20",
    endDate: "2025-10-26",
    totalAmount: 12350,
    vat: 864.5,
    fileUrl: "#",
    fileName: "statement-oct20-26.pdf",
    createdAt: "2025-10-27T10:00:00Z",
  },
];

// ---------- helpers ----------
async function getPdfTextAndBuffer(file: File): Promise<{ buffer: Buffer; text: string }> {
  // แปลง File → Buffer (ใช้ได้เฉพาะ runtime nodejs)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // import pdf-parse แบบรองรับทั้ง CJS / ESM
  const mod: any = await import("pdf-parse");
  const pdfParse = mod.default || mod; // ตรงนี้แหละที่แก้ t is not a function

  const result = await pdfParse(buffer);
  return { buffer, text: String(result.text ?? "") };
}

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
  const chargeMatch = normalized.match(/ยอดที่เรียกเก็บทั้งหมด\s*฿?(\d+(\.\d{1,2})?)/);
  const vatMatch = normalized.match(/VAT Amount:\s*฿?(\d+(\.\d{1,2})?)/);

  const charge = chargeMatch ? parseFloat(chargeMatch[1]) : 0;
  const vat = vatMatch ? parseFloat(vatMatch[1]) : 0;
  const totalAmount = charge + vat; // รวม VAT

  const startDate = startThai ? toIsoFromDmy(startThai) : new Date().toISOString().slice(0, 10);
  const endDate = endThai ? toIsoFromDmy(endThai) : startDate;

  const periodLabel =
    startThai && endThai
      ? `${startThai} - ${endThai}`
      : startThai || endThai || new Date().toLocaleDateString("th-TH");

  return { startDate, endDate, period: periodLabel, totalAmount, vat };
}

// ---------- GET /api/facebook-ads/statements ----------
export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const totalAmount = mockStatements.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalVAT = mockStatements.reduce((sum, s) => sum + s.vat, 0);

    return NextResponse.json({
      statements: mockStatements,
      totalAmount,
      totalVAT,
    });
  } catch (error) {
    console.error("Failed to fetch statements:", error);
    return NextResponse.json(
      { error: "Failed to fetch statements" },
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

    // data:URL สำหรับเปิดใน <iframe> / download
    const base64 = buffer.toString("base64");
    const fileUrl = `data:application/pdf;base64,${base64}`;

    const statement: Statement = {
      id: `stmt-${Date.now()}`,
      fileName: file.name,
      fileUrl,
      createdAt: new Date().toISOString(),
      ...parsed,
    };

    mockStatements = [statement, ...mockStatements];

    console.log(
      `✅ Statement uploaded: ${file.name} (${(file.size / 1024).toFixed(
        2
      )} KB) total=${statement.totalAmount} vat=${statement.vat}`
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

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const before = mockStatements.length;
    mockStatements = mockStatements.filter((s) => s.id !== id);
    const deleted = mockStatements.length < before;

    if (!deleted) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete statement error:", error);
    return NextResponse.json(
      { error: "Failed to delete statement" },
      { status: 500 }
    );
  }
}
