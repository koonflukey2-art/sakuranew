// src/lib/line-ads-integration.ts
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { existsSync } from "fs";

interface ReceiptData {
  receiptNumber: string;
  amount: number;
  qrData: string;
  imageUrl: string;
}

/**
 * Process receipt image from LINE
 */
export async function processReceiptImage(
  imageBuffer: Buffer,
  organizationId: string
): Promise<ReceiptData | null> {
  try {
    // Ensure upload directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads", "receipts");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save image file
    const filename = `receipt-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}.jpg`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, imageBuffer);
    const imageUrl = `/uploads/receipts/${filename}`;

    // Extract data from image
    // Method 1: Try to read QR code
    const qrData = await extractQRCode(imageBuffer);

    // Method 2: Use OCR to extract amount
    const amount = await extractAmountFromImage(imageBuffer);

    if (!amount || amount <= 0) {
      console.error("Could not extract amount from receipt");
      return null;
    }

    const receiptNumber = `ADS-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

    return {
      receiptNumber,
      amount,
      qrData: qrData || "",
      imageUrl,
    };
  } catch (error) {
    console.error("Process receipt error:", error);
    return null;
  }
}

/**
 * Extract QR code from image buffer
 * Using jsQR library
 *
 * TODO: Implement actual QR code extraction
 * For production, install and use:
 * npm install jsqr canvas
 *
 * import jsQR from "jsqr";
 * import { createCanvas, loadImage } from "canvas";
 */
async function extractQRCode(buffer: Buffer): Promise<string | null> {
  try {
    // TODO: Implement using jsQR
    // For now, return null
    // In production, use:
    // import jsQR from "jsqr";
    // import { createCanvas, loadImage } from "canvas";
    // Convert buffer to ImageData and process with jsQR

    return null;
  } catch (error) {
    console.error("QR extraction error:", error);
    return null;
  }
}

/**
 * Extract amount from receipt image using OCR
 * Using Tesseract.js or cloud OCR service
 *
 * TODO: Implement actual OCR
 * For production, use one of these:
 * 1. Tesseract.js (free, runs locally) - npm install tesseract.js
 * 2. Google Cloud Vision API (paid, more accurate)
 * 3. AWS Textract (paid)
 * 4. Azure Computer Vision (paid)
 */
async function extractAmountFromImage(buffer: Buffer): Promise<number> {
  try {
    // TODO: Implement actual OCR
    // For now, use mock extraction

    // In production, use one of these:
    // 1. Tesseract.js (free, runs locally)
    // 2. Google Cloud Vision API (paid, more accurate)
    // 3. AWS Textract (paid)
    // 4. Azure Computer Vision (paid)

    // Mock implementation:
    // Look for patterns like:
    // "ยอดชำระ", "Total", "Amount", "THB", "฿"
    // Extract numbers nearby

    // For demo, analyze buffer to extract amount
    // This is a simplified version - in production, use proper OCR
    const mockAmount = await mockExtractAmount(buffer);
    return mockAmount;
  } catch (error) {
    console.error("OCR extraction error:", error);
    return 0;
  }
}

/**
 * Mock amount extraction
 * In production, replace this with actual OCR
 */
async function mockExtractAmount(buffer: Buffer): Promise<number> {
  // For demo purposes, we'll generate a realistic amount
  // In production, this should use actual OCR/QR reading

  // Generate random amount between 5,000 and 50,000 baht
  const mockAmount = Math.floor(Math.random() * 45000) + 5000;

  console.log("⚠️ Using mock amount extraction. Implement actual OCR for production.");
  console.log(`Mock extracted amount: ฿${mockAmount}`);

  return mockAmount;
}

/**
 * Alternative: Use Google Cloud Vision API for OCR
 * Requires: @google-cloud/vision
 */
async function extractAmountWithGoogleVision(
  buffer: Buffer
): Promise<number> {
  try {
    // Requires: @google-cloud/vision
    // const vision = require("@google-cloud/vision");
    // const client = new vision.ImageAnnotatorClient();
    //
    // const [result] = await client.textDetection({
    //   image: { content: buffer.toString("base64") },
    // });
    //
    // const fullText = result.textAnnotations?.[0]?.description || "";
    // return parseAmountFromText(fullText);

    return 0;
  } catch (error) {
    console.error("Google Vision error:", error);
    return 0;
  }
}

/**
 * Parse amount from extracted text
 */
export function parseAmountFromText(text: string): number {
  try {
    // Look for common patterns
    const patterns = [
      /ยอดชำระ[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /total[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /amount[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /฿\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /THB\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /จำนวนเงิน[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    // Fallback: Find largest number in text
    const numbers = text.match(/[0-9,]+(?:\.[0-9]{2})?/g);
    if (numbers && numbers.length > 0) {
      const amounts = numbers
        .map((n) => parseFloat(n.replace(/,/g, "")))
        .filter((n) => !isNaN(n) && n > 100); // Filter out small numbers

      if (amounts.length > 0) {
        return Math.max(...amounts);
      }
    }

    return 0;
  } catch (error) {
    console.error("Parse amount error:", error);
    return 0;
  }
}
