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
  console.log("🔍 PARSING LINE MESSAGE (FLEXIBLE VERSION)");
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
  } else {
    console.log(` ❌ Invalid product type: "${firstLine}"`);
  }

  // ═══ STEP 2: UNIT PRICE ═══
  let extractedPrice = 0;
  if (lines.length >= 2) {
    const priceLine = lines[1];
    const priceMatch = priceLine.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    
    if (priceMatch) {
      extractedPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
      console.log(` ✅ Found price: ${extractedPrice}`);
    }
  }

  if (extractedPrice > 0) {
    result.unitPrice = extractedPrice;
    result.amount = extractedPrice; 
  }

  // ═══ STEP 3: CUSTOMER NAME ═══
  if (lines.length >= 3) {
    result.customerName = lines[2];
    console.log(` ✅ Customer: "${result.customerName}"`);
  }

  // ═══ STEP 4: PHONE NUMBER ═══
  let phoneLineIndex = -1;
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    const phoneMatch = line.match(/(0\d{9})/);
    
    if (phoneMatch) {
      result.phone = phoneMatch[1];
      phoneLineIndex = i;
      console.log(` ✅ Found phone: ${result.phone} at line ${i + 1}`);
      break;
    }
  }

  // ═══ STEP 5: QUANTITY ═══
  const lastLine = lines[lines.length - 1];
  const qtyMatch = lastLine.match(/(\d+)/);
  
  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1]);
    const isPhoneNumber = result.phone && lastLine.includes(result.phone);
    const isTooLong = parsedQty > 9999; 

    if (!isPhoneNumber && !isTooLong) {
      result.quantity = parsedQty;
      console.log(` ✅ Quantity found in "${lastLine}": ${result.quantity}`);
    }
  }

  // Recalculate Total Amount
  if (result.unitPrice && result.quantity) {
      result.amount = result.unitPrice * result.quantity;
  }

  // ═══ STEP 6: ADDRESS ═══
  const addressLines: string[] = [];
  const startIdx = 3; 
  const endIdx = phoneLineIndex > 0 ? phoneLineIndex : lines.length - 1;

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    if (!line.match(/^\d+$/) && !line.match(/จำนวน/)) {
        addressLines.push(line);
    }
  }
  
  result.address = addressLines.join(" ");

  // ═══ VALIDATION ═══
  if (!result.productType || !result.customerName || !result.phone || !result.amount) {
    console.log("\n❌ VALIDATION FAILED - Missing required fields");
    return null;
  }

  return result as ParsedOrder;
}

// ✅ ฟังก์ชันที่เคยหายไป เพิ่มให้แล้วครับ
export function getProductTypeName(type: number): string {
  return `สินค้าประเภท ${type}`;
}