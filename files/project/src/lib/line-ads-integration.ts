// src/lib/line-ads-integration.ts
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { existsSync } from "fs";
import jsQR from "jsqr";
import { createCanvas, loadImage } from "canvas";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import { extractAmountFromQrText } from "./receiptAmount";

function getUploadDir() {
  return (
    process.env.UPLOAD_DIR ||
    join(process.cwd(), "public", "uploads", "statements")
  );
}

// ======================================================
// RECEIPT IMAGE PROCESSING (เดิมของคุณ) 
// ======================================================

interface ReceiptData {
  receiptNumber: string;
  amount: number;
  qrData: string;
  imageUrl: string;
  confidence: number;
  extractionMethod: "QR_EMV" | "OCR";
  metadata?: {
    date?: string;
    refNumber?: string;
    ocrText?: string;
  };
}

/**
 * Process receipt image from LINE with high accuracy
 * Priority: QR Code (99%) > OCR (90%) > Fallback
 */
export async function processReceiptImage(
  imageBuffer: Buffer,
  organizationId: string
): Promise<ReceiptData | null> {
  try {
    console.log("📸 Processing receipt image...");

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

    // Strategy 1: Try QR Code extraction (highest accuracy)
    console.log("🔍 Attempting QR code extraction...");
    const qrData = await extractQRCode(imageBuffer);

    if (qrData) {
      // Parse QR code using EMV TLV parser
      const qrResult = extractAmountFromQrText(qrData);

      if (qrResult.ok) {
        console.log(`✅ QR Code extraction successful: ฿${qrResult.amount}`);

        const receiptNumber = generateReceiptNumber();

        return {
          receiptNumber,
          amount: qrResult.amount,
          qrData: qrData,
          imageUrl,
          confidence: qrResult.confidence,
          extractionMethod: "QR_EMV",
          metadata: {},
        };
      } else {
        console.log(`⚠️ QR found but parsing failed: ${qrResult.reason}`);
      }
    }

    // Strategy 2: OCR extraction (fallback)
    console.log("📄 Falling back to OCR extraction...");
    const ocrResult = await extractAmountFromImage(imageBuffer);

    if (ocrResult.amount > 0 && ocrResult.confidence > 0.5) {
      console.log(
        `✅ OCR extraction successful: ฿${ocrResult.amount} (${(
          ocrResult.confidence * 100
        ).toFixed(1)}%)`
      );

      // Extract metadata from OCR text
      const metadata = extractMetadataFromText(ocrResult.text);

      const receiptNumber = generateReceiptNumber();

      return {
        receiptNumber,
        amount: ocrResult.amount,
        qrData: qrData || "",
        imageUrl,
        confidence: ocrResult.confidence,
        extractionMethod: "OCR",
        metadata: {
          ...metadata,
          ocrText: ocrResult.text.substring(0, 500), // Store first 500 chars
        },
      };
    }

    console.error("❌ Could not extract amount from receipt");
    return null;
  } catch (error) {
    console.error("Process receipt error:", error);
    return null;
  }
}

/**
 * Generate unique receipt number
 */
function generateReceiptNumber(): string {
  return `ADS-${Date.now()}-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;
}

/**
 * Extract metadata from OCR text
 */
function extractMetadataFromText(text: string): {
  date?: string;
  refNumber?: string;
} {
  const metadata: any = {};

  // Extract date patterns
  const datePatterns = [
    /(\d{1,2}\s+[ก-๙]+\.\s+\d{2,4})/, // Thai format: "12 ธ.ค. 68"
    /(\d{2}\/\d{2}\/\d{4})/, // "12/12/2025"
    /(\d{4}-\d{2}-\d{2})/, // "2025-12-12"
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.date = match[1];
      break;
    }
  }

  // Extract reference number
  const refPatterns = [
    /เลขที่รายการ[:\s]*([A-Z0-9]+)/i,
    /(?:ref|reference)[:\s]*([A-Z0-9-]+)/i,
    /(?:transaction|trans)[:\s]*([A-Z0-9-]+)/i,
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.refNumber = match[1];
      break;
    }
  }

  return metadata;
}

/**
 * Extract QR code from image buffer
 * Using jsQR library with canvas
 */
async function extractQRCode(buffer: Buffer): Promise<string | null> {
  try {
    // Load image using canvas
    const image = await loadImage(buffer);

    // Create canvas and get image data
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Extract QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      console.log("✅ QR Code found:", code.data.substring(0, 50) + "...");
      return code.data;
    }

    // Try with inverted colors
    const codeInverted = jsQR(
      imageData.data,
      imageData.width,
      imageData.height,
      {
        inversionAttempts: "attemptBoth",
      }
    );

    if (codeInverted && codeInverted.data) {
      console.log(
        "✅ QR Code found (inverted):",
        codeInverted.data.substring(0, 50) + "..."
      );
      return codeInverted.data;
    }

    console.log("⚠️ No QR code found in image");
    return null;
  } catch (error) {
    console.error("QR extraction error:", error);
    return null;
  }
}

/**
 * Extract amount from receipt image using OCR
 * Using Tesseract.js with Thai + English language support
 */
async function extractAmountFromImage(buffer: Buffer): Promise<{
  amount: number;
  confidence: number;
  text: string;
}> {
  try {
    console.log("🔍 Starting OCR extraction...");

    // Preprocess image for better OCR accuracy
    const processedBuffer = await preprocessImageForOCR(buffer);

    // Run OCR with Thai + English languages
    const {
      data: { text, confidence },
    } = await (Tesseract as any).recognize(processedBuffer, "tha+eng", {
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log("📄 OCR Text extracted:", text.substring(0, 200));
    console.log(`📊 OCR Confidence raw: ${confidence}`);

    // Parse amount from text
    const amount = parseAmountFromText(text);

    return {
      amount,
      confidence: Number(confidence) / 100, // Convert to 0-1 scale
      text,
    };
  } catch (error) {
    console.error("OCR extraction error:", error);
    return { amount: 0, confidence: 0, text: "" };
  }
}

/**
 * Preprocess image for better OCR accuracy
 * Applies grayscale, contrast enhancement, and thresholding
 */
async function preprocessImageForOCR(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .grayscale() // Convert to grayscale
      .normalize() // Enhance contrast
      .sharpen() // Sharpen edges
      .threshold(128) // Binary threshold
      .toBuffer();
  } catch (error) {
    console.error("Image preprocessing error:", error);
    return buffer; // Return original if preprocessing fails
  }
}

// ======================================================
// STATEMENT PDF PROCESSING (FOR LINE WEBHOOK)
// ======================================================

interface StatementData {
  period: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  vat: number;
  fileUrl: string;
  fileName: string;
  fileHash: string;
}

/**
 * Process Facebook Ads Statement PDF from LINE
 */
export async function processStatementPDF(
  pdfBuffer: Buffer,
  fileName: string,
  organizationId: string
): Promise<StatementData | null> {
  try {
    console.log("📄 Processing statement PDF from LINE...");

    if (!organizationId) {
      console.error("❌ processStatementPDF: organizationId is empty");
      return null;
    }

    // Generate hash for duplicate detection
    const fileHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    // Parse PDF to extract text
    const pdfText = await extractPDFText(pdfBuffer);

    if (!pdfText) {
      console.error("❌ Could not extract text from PDF");
      return null;
    }

    // Parse metadata from PDF text
    const metadata = parseStatementMetadata(pdfText);

    if (!metadata) {
      console.error("❌ Could not parse statement metadata");
      return null;
    }

    // Save PDF file to disk (ใช้โฟลเดอร์เดียวกับฝั่งเว็บ)
    const uploadsDir = getUploadDir();
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const newFileName = `statement-${Date.now()}-${fileHash.slice(0, 8)}.pdf`;
    const filepath = join(uploadsDir, newFileName);

    await writeFile(filepath, pdfBuffer);

    // ใช้ route เดียวกับฝั่งเว็บ
    const fileUrl = `/api/uploads/statements/${newFileName}`;

    console.log(`✅ Statement processed: ${fileName} → ${newFileName}`);
    console.log(`   Period: ${metadata.period}`);
    console.log(`   Total: ฿${metadata.totalAmount.toLocaleString()}`);
    console.log(`   VAT: ฿${metadata.vat.toLocaleString()}`);

    return {
      period: metadata.period,
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      totalAmount: metadata.totalAmount,
      vat: metadata.vat,
      fileUrl,
      fileName: fileName || newFileName,
      fileHash,
    };
  } catch (error) {
    console.error("Process statement PDF error:", error);
    return null;
  }
}

/**
 * Extract text from PDF buffer
 * ใช้ loader แบบเดียวกับฝั่งอัพโหลดในเว็บ (รองรับ default / CJS)
 */
async function extractPDFText(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const req = eval("require") as any;
    const mod = req("pdf-parse");
    const fn = (mod && (mod.default || mod)) as any;

    if (typeof fn !== "function") {
      console.error("❌ pdf-parse module is not a function:", mod);
      return null;
    }

    const result = await fn(pdfBuffer);
    return result.text || null;
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return null;
  }
}

/**
 * Parse statement metadata from PDF text
 */
function parseStatementMetadata(text: string): {
  period: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  vat: number;
} | null {
  try {
    const normalized = text
      .replace(/\u00a0/g, " ")
      .replace(/,/g, "")
      .replace(/\s+/g, " ");

    // "รายงานการเรียกเก็บเงิน: 6/10/2025 - 13/10/2025"
    const periodMatch = normalized.match(
      /รายงานการเรียกเก็บเงิน.*?(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/
    );

    const startDateStr = periodMatch?.[1];
    const endDateStr = periodMatch?.[2];

    // "ยอดที่เรียกเก็บทั้งหมด ฿xxx.xx"
    const chargeMatch = normalized.match(
      /ยอดที่เรียกเก็บทั้งหมด\s*฿?(\d+(\.\d{1,2})?)/
    );

    // "VAT Amount: ฿xx.xx"
    const vatMatch = normalized.match(/VAT Amount:\s*฿?(\d+(\.\d{1,2})?)/);

    const charge = chargeMatch ? parseFloat(chargeMatch[1]) : 0;
    const vat = vatMatch ? parseFloat(vatMatch[1]) : 0;
    const totalAmount = charge + vat;

    const startDate = startDateStr
      ? parseDDMMYYYY(startDateStr)
      : new Date();
    const endDate = endDateStr ? parseDDMMYYYY(endDateStr) : startDate;

    const periodLabel =
      startDateStr && endDateStr
        ? `${startDateStr} - ${endDateStr}`
        : startDateStr || endDateStr || new Date().toLocaleDateString("th-TH");

    if (totalAmount === 0 || !startDateStr || !endDateStr) {
      console.warn("⚠️ Incomplete statement data parsed");
      console.warn(
        `   Total: ${totalAmount}, Dates: ${startDateStr} - ${endDateStr}`
      );
    }

    return {
      period: periodLabel,
      startDate,
      endDate,
      totalAmount,
      vat,
    };
  } catch (error) {
    console.error("Parse statement metadata error:", error);
    return null;
  }
}

/**
 * Parse DD/MM/YYYY date format to Date object
 */
function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// ======================================================
// AMOUNT PARSER (ใช้ร่วมกับ OCR / ใบเสร็จ)
// ======================================================

export function parseAmountFromText(text: string): number {
  try {
    // Clean and normalize text
    const cleaned = text.replace(/\s+/g, " ").trim();

    // Priority patterns for Thai receipts
    const patterns = [
      // Thai specific patterns (highest priority for KBank receipts)
      /จำนวน[:\s]*([0-9,]+(?:\.[0-9]{2})?)\s*บาท/i, // "จำนวน: 500.00 บาท"
      /ยอดชำระ[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i, // "ยอดชำระ: 500.00"
      /จำนวนเงิน[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i, // "จำนวนเงิน: 500.00"
      /ชำระเงิน[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i, // "ชำระเงิน: 500.00"
      /ยอดรวม[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i, // "ยอดรวม: 500.00"

      // English patterns
      /total[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /amount[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,
      /payment[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i,

      // Currency patterns
      /฿\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /THB\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /([0-9,]+(?:\.[0-9]{2})?)\s*บาท/i,

      // Generic number with decimal (lowest priority)
      /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/,
    ];

    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(amount) && amount > 0 && amount < 10000000) {
          console.log(
            `✅ Amount found with pattern: ${pattern.source} = ${amount}`
          );
          return amount;
        }
      }
    }

    // Fallback: Find all decimal numbers and pick most likely amount
    const numbers = cleaned.match(/[0-9,]+\.[0-9]{2}/g);
    if (numbers && numbers.length > 0) {
      const amounts = numbers
        .map((n) => parseFloat(n.replace(/,/g, "")))
        .filter((n) => !isNaN(n) && n >= 100 && n < 10000000); // Reasonable range for ads payment

      if (amounts.length > 0) {
        // Return the largest amount (usually the total)
        const amount = Math.max(...amounts);
        console.log(`⚠️ Fallback: Using largest decimal number: ${amount}`);
        return amount;
      }
    }

    console.log("❌ No amount found in text");
    return 0;
  } catch (error) {
    console.error("Parse amount error:", error);
    return 0;
  }
}
