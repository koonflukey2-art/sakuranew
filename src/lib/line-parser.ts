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
  console.log("🔍 PARSING LINE MESSAGE (HYBRID ADDRESS/PHONE)");
  console.log("═══════════════════════════════════════");

  const lines = message
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

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

  // ═══ STEP 2: PRICE (ยอดเก็บรวม) ═══
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
    // ตีความว่า "ยอดเก็บ" = ยอดรวมทั้งหมด
    result.amount = extractedPrice;
    // unitPrice จะไปคำนวณทีหลังหลังรู้ quantity แล้ว
  }

  // ═══ STEP 3: CUSTOMER NAME ═══
  if (lines.length >= 3) {
    result.customerName = lines[2];
    console.log(` ✅ Customer: "${result.customerName}"`);
  }

  // ═══ STEP 4 & 6: PHONE & ADDRESS ═══
  const addressParts: string[] = [];

  // เริ่ม Loop จากบรรทัดที่ 4 (index 3) คือบรรทัดถัดจากชื่อลูกค้า
  for (let i = 3; i < lines.length; i++) {
    let line = lines[i];

    // ถ้าบรรทัดสุดท้ายเป็นตัวเลขล้วนๆ สั้นๆ น่าจะเป็น Quantity ให้ข้ามไปทำ Step 5
    if (i === lines.length - 1 && /^\d+$/.test(line) && line.length < 5) {
      continue;
    }

    // ─── หาเบอร์โทรในบรรทัดนี้ ───
    if (!result.phone) {
      const normalizedForCheck = line.replace(/[-.\s]/g, "");
      const phoneMatch = normalizedForCheck.match(/(0\d{9})/);

      if (phoneMatch) {
        result.phone = phoneMatch[1];
        console.log(
          ` ✅ Found phone: ${result.phone} (extracted from line ${i + 1})`
        );

        // ลบเบอร์ที่เจอออกจาก line
        line = line.replace(result.phone, "").trim();
        // ลบคำว่า "โทร", "Tel", "เบอร์" ที่อาจเหลือ
        line = line.replace(/(?:โทร|Tel|เบอร์)\.?\s*$/i, "").trim();
      }
    }

    // ถ้าเหลือข้อความที่ไม่ใช่ขีด/จุดล้วน ๆ ให้ถือว่าเป็นที่อยู่
    if (line.length > 0) {
      if (line.replace(/[-.\s]/g, "").length > 0) {
        addressParts.push(line);
      }
    }
  }

  result.address = addressParts.join(" ");
  console.log(` ✅ Address: "${result.address}"`);

  // ═══ STEP 5: QUANTITY ═══
  const lastLine = lines[lines.length - 1];
  const qtyMatch = lastLine.match(/(\d+)/);

  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1]);
    const isTooLong = parsedQty > 9999;

    // (อันนี้เราไม่ได้ใช้ isPhoneNumber แล้ว เพราะเบอร์ถูกดึงไปก่อนหน้า)
    if (!isTooLong) {
      result.quantity = parsedQty;
      console.log(` ✅ Quantity found in "${lastLine}": ${result.quantity}`);
    }
  }

  // ═══ STEP 5.5: คำนวณ unitPrice จาก amount / quantity ═══
  if (result.amount && result.quantity && result.quantity > 0) {
    result.unitPrice = result.amount / result.quantity;
    console.log(` ✅ UnitPrice computed: ${result.unitPrice}`);
  } else if (result.amount) {
    // ถ้าไม่มี quantity ก็ให้ unitPrice = amount ไปก่อน
    result.unitPrice = result.amount;
  }

  // ═══ VALIDATION ═══
  if (!result.productType || !result.customerName || !result.amount) {
    if (!result.phone) console.log("⚠️ Warning: No phone number found");

    console.log("\n❌ VALIDATION FAILED - Missing required fields");
    return null;
  }

  // ถ้าไม่มีเบอร์ ให้ใส่ default กัน Error
  if (!result.phone) result.phone = "UNKNOWN";

  return result as ParsedOrder;
}

export function getProductTypeName(type: number): string {
  return `สินค้าประเภท ${type}`;
}
