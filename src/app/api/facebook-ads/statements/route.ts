import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

// Mock statements data (in production, this would be stored in database)
let mockStatements = [
  {
    id: "stmt-1",
    period: "27 ต.ค. - 3 พ.ย. 2025",
    startDate: "2025-10-27",
    endDate: "2025-11-03",
    totalAmount: 15420.50,
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
    totalAmount: 12350.00,
    vat: 864.50,
    fileUrl: "#",
    fileName: "statement-oct20-26.pdf",
    createdAt: "2025-10-27T10:00:00Z",
  },
];

// GET /api/facebook-ads/statements
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production:
    // 1. Fetch from database using organization ID
    // 2. Filter by user's organization
    // 3. Return actual stored statements

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

// POST /api/facebook-ads/statements - Upload new statement
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("statement") as File;

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

    // In production:
    // 1. Upload to storage (S3, Cloudinary, etc.)
    // 2. Parse PDF to extract data (period, amounts, VAT)
    // 3. Save to database with organization ID
    // 4. Return the saved statement

    // Mock: Create a new statement
    const mockStatement = {
      id: `stmt-${Date.now()}`,
      period: `${new Date().toLocaleDateString("th-TH")}`,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      totalAmount: Math.floor(Math.random() * 50000) + 10000,
      vat: Math.floor(Math.random() * 3500) + 700,
      fileUrl: "#",
      fileName: file.name,
      createdAt: new Date().toISOString(),
    };

    // Add to mock statements
    mockStatements = [mockStatement, ...mockStatements];

    console.log(`✅ Statement uploaded: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

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
