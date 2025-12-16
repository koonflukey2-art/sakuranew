import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

interface Statement {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  vat: number;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

// Mock statements data (ในโปรดักชันค่อยเปลี่ยนไปใช้ DB)
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
    totalAmount: 12350.0,
    vat: 864.5,
    fileUrl: "#",
    fileName: "statement-oct20-26.pdf",
    createdAt: "2025-10-27T10:00:00Z",
  },
];

// ========================
// GET /api/facebook-ads/statements
// ========================
export async function GET(_request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      statements: mockStatements,
      totalAmount: mockStatements.reduce((sum, s) => sum + s.totalAmount, 0),
      totalVAT: mockStatements.reduce((sum, s) => sum + s.vat, 0),
    });
  } catch (error) {
    console.error("Failed to fetch statements:", error);
    return NextResponse.json(
      { error: "Failed to fetch statements" },
      { status: 500 }
    );
  }
}

// ========================
// POST /api/facebook-ads/statements
// อัพโหลดสเตตเมนต์ใหม่ (mock)
// ========================
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
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // NOTE: ตอนนี้ยังไม่ได้เซฟไฟล์จริง แค่ mock ไว้
    // ถ้าจะเซฟจริง ต้องเอา buffer ไปเขียนลง disk หรืออัพขึ้น S3 แล้วใช้ URL นั้นแทน "#"
    // const bytes = await file.arrayBuffer();
    // const buffer = Buffer.from(bytes);

    const now = new Date();

    const mockStatement: Statement = {
      id: `stmt-${Date.now()}`,
      period: now.toLocaleDateString("th-TH"),
      startDate: now.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
      totalAmount: Math.floor(Math.random() * 50000) + 10000,
      vat: Math.floor(Math.random() * 3500) + 700,
      fileUrl: "#", // ตอนนี้ยังใช้ placeholder
      fileName: file.name,
      createdAt: now.toISOString(),
    };

    mockStatements = [mockStatement, ...mockStatements];

    console.log(
      `✅ Statement uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
    );

    return NextResponse.json({
      success: true,
      statement: mockStatement,
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

// ========================
// DELETE /api/facebook-ads/statements?id=xxxx
// ลบสเตตเมนต์ออกจาก mockStatements
// ========================
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
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const exists = mockStatements.some((s) => s.id === id);
    if (!exists) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    mockStatements = mockStatements.filter((s) => s.id !== id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete statement error:", error);
    return NextResponse.json(
      { error: "Failed to delete statement" },
      { status: 500 }
    );
  }
}
