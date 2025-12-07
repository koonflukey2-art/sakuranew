// src/lib/line-parser.ts

export interface ParsedOrder {
  productType: number;
  productName: string;
  amount: number;
  unitPrice: number;
  quantity: number;
  customerName: string;
  phone: string;
  address: string;
}

export function parseLineMessage(message: string): ParsedOrder | null {
  console.log("═══════════════════════════════════════");
  console.log("🔍 PARSING LINE MESSAGE (SMART PHONE DETECT)");
  console.log("═══════════════════════════════════════");

  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);

  if (lines.length < 3) {
    console.log("❌ Not enough lines (minimum 3 required)");
    return null;
  }

  const result: Partial<ParsedOrder> = {
    productType: undefined,
    productName: "",
    amount: 0,
    unitPrice: 0,
    quantity: 1,
    customerName: "",
    phone: "",
    address: "",
  };

  // ═══ STEP 1: PRODUCT TYPE ═══
  const firstLine = lines[0];
  const typeNum = parseInt(firstLine.replace(/[^\d]/g, "")); 

  if (!isNaN(typeNum) && typeNum > 0) {
    result.productType = typeNum;
    result.productName = `สินค้าประเภท ${result.productType}`;
    console.log(` ✅ Product Type: ${result.productType}`);
  }

  // ═══ STEP 2: PRICE (ยอดเก็บ = ยอดรวมเลย) ═══
  let extractedPrice = 0;
  if (lines.length >= 2) {
    const priceLine = lines[1];
    // หาตัวเลขที่มี comma หรือทศนิยม
    const priceMatch = priceLine.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    
    if (priceMatch) {
      extractedPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
      console.log(` ✅ Found price (Total Amount): ${extractedPrice}`);
    }
  }

  if (extractedPrice > 0) {
    result.unitPrice = extractedPrice; 
    result.amount = extractedPrice;    // ยึดค่านี่เป็นยอดรวม
  }

  // ═══ STEP 3: CUSTOMER NAME ═══
  if (lines.length >= 3) {
    result.customerName = lines[2];
    console.log(` ✅ Customer: "${result.customerName}"`);
  }

  // ═══ STEP 4: PHONE NUMBER (แก้ใหม่ รองรับขีด - และจุด .) ═══
  let phoneLineIndex = -1;
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    
    // 1. ลบทุกอย่างที่ไม่ใช่ตัวเลขออก (ลบ - . ช่องว่าง ก ข ค)
    // "โทร.087-3179458" จะกลายเป็น "0873179458"
    const cleanNumber = line.replace(/\D/g, ""); 

    // 2. เช็คว่าเป็นเบอร์มือถือไหม (ขึ้นต้นด้วย 0 และยาว 10 หลัก)
    // หรือเบอร์บ้าน (ขึ้นต้นด้วย 02 ยาว 9 หลัก) แต่เน้นมือถือเป็นหลัก
    if (cleanNumber.length === 10 && cleanNumber.startsWith("0")) {
      result.phone = cleanNumber; // เก็บเบอร์แบบไม่มีขีดลง DB
      phoneLineIndex = i;
      console.log(` ✅ Found phone (cleaned): ${result.phone} at line ${i + 1}`);
      break;
    }
  }

  // ═══ STEP 5: QUANTITY ═══
  const lastLine = lines[lines.length - 1];
  // หาตัวเลขในบรรทัดสุดท้าย
  const qtyMatch = lastLine.match(/(\d+)/);
  
  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1]);
    
    // เช็คว่าเลขที่เจอ ไม่ใช่เบอร์โทรศัพท์ (เผื่อบรรทัดสุดท้ายเป็นเบอร์)
    const isPhoneNumber = result.phone && lastLine.replace(/\D/g, "").includes(result.phone);
    const isTooLong = parsedQty > 9999; 

    if (!isPhoneNumber && !isTooLong) {
      result.quantity = parsedQty;
      console.log(` ✅ Quantity found in "${lastLine}": ${result.quantity}`);
      // ไม่มีการคูณ amount แล้ว ตามที่ขอ
    }
  }

  // ═══ STEP 6: ADDRESS ═══
  const addressLines: string[] = [];
  const startIdx = 3; 
  const endIdx = phoneLineIndex > 0 ? phoneLineIndex : lines.length - 1;

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    // กรองบรรทัดที่ไม่ใช่ส่วนหนึ่งของที่อยู่จริงๆ
    if (!line.match(/^\d+$/) && !line.match(/จำนวน/)) {
        addressLines.push(line);
    }
  }
  
  result.address = addressLines.join(" ");
  console.log(` ✅ Address combined: "${result.address}"`);

  // ═══ VALIDATION ═══
  if (!result.productType || !result.customerName || !result.phone || !result.amount) {
    console.log("\n❌ VALIDATION FAILED - Missing required fields");
    return null;
  }

  return result as ParsedOrder;
}

export function getProductTypeName(type: number): string {
  return `สินค้าประเภท ${type}`;
}