import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

async function getOrganizationId(): Promise<string> {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    select: { organizationId: true },
  });

  return dbUser?.organizationId || "default-org";
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getOrganizationId();
    const formData = await request.formData();
    const file = formData.get("receipt") as File;
    const platform = formData.get("platform") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `receipt-${Date.now()}-${file.name}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);
    const receiptUrl = `/uploads/${filename}`;

    // Extract amount from image using OCR (mock for now)
    // TODO: Implement actual OCR/QR code reading
    const extractedAmount = await extractAmountFromReceipt(buffer);

    // Create receipt record
    const receipt = await prisma.adReceipt.create({
      data: {
        organizationId: orgId,
        receiptNumber: `RCP-${Date.now()}`,
        platform: platform || "META_ADS",
        paymentMethod: "QR_CODE",
        amount: extractedAmount,
        currency: "THB",
        receiptUrl,
        isProcessed: false,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      receipt,
      amount: extractedAmount,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

// Mock OCR function - replace with actual OCR library
async function extractAmountFromReceipt(buffer: Buffer): Promise<number> {
  // TODO: Implement actual OCR using:
  // - Tesseract.js for text extraction
  // - jsQR for QR code reading
  // - Pattern matching for amount detection

  // For now, return random amount for demo
  return Math.floor(Math.random() * 10000) + 1000;
}
