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

/**
 * ✅ ดึงเบอร์โทรแบบไทยจากข้อความ:
 * - รองรับ 062-223-6733 / 062 223 6733 / 0622236733
 * - คืนค่าเป็น "ตัวเลขล้วน" เช่น 0622236733
 */
function extractThaiPhone(text: string): string | null {
  const matches = text.match(/0\d[\d -]{7,14}\d/g);
  if (!matches) return null;

  for (const m of matches) {
    const digits = m.replace(/\D/g, "");
    if ((digits.length === 9 || digits.length === 10) && digits.startsWith("0")) {
      return digits;
    }
  }
  return null;
}

function stripPhoneFromLine(line: string) {
  // ลบ pattern ที่เหมือนเบอร์ (แบบมี -/space)
  return line.replace(/0\d[\d -]{7,14}\d/g, "").trim();
}

/**
 * ✅ ถ้าบรรทัดเดียวมี "ชื่อ + ที่อยู่ + เบอร์"
 * จะพยายามแยก "ชื่อ" ออกจาก "ที่อยู่" โดย split ที่เลขบ้านตัวแรก
 */
function splitNameAddressOneLine(line: string): { name: string; address: string } {
  const noPhone = stripPhoneFromLine(line);

  const m = noPhone.match(/\d+/); // เจอเลขบ้านครั้งแรก
  if (m && m.index !== undefined && m.index > 0) {
    const idx = m.index;
    const name = noPhone.slice(0, idx).trim();
    const address = noPhone.slice(idx).trim();
    return { name, address };
  }

  // fallback: ถือว่าทั้งบรรทัดเป็นชื่อ (ที่อยู่ค่อยไปบรรทัดอื่น)
  return { name: noPhone.trim(), address: "" };
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
  const typeNum = parseInt(firstLine.replace(/[^\d]/g, ""), 10);

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
    result.amount = extractedPrice;
  }

  // ═══ STEP 3: CUSTOMER NAME (รองรับกรณีชื่อ+ที่อยู่+เบอร์อยู่บรรทัดเดียว) ═══
  // เดิมคุณ fix ไว้ว่า lines[2] คือชื่อ แต่ในเคสจริง lines[2] อาจเป็น "ชื่อ + ที่อยู่ + เบอร์"
  if (lines.length >= 3) {
    const line3 = lines[2];

    // ถ้าบรรทัดนี้มีเบอร์และมีเลขบ้าน -> แยก name/address
    const phoneInLine3 = extractThaiPhone(line3);
    if (phoneInLine3) {
      const { name, address } = splitNameAddressOneLine(line3);
      result.customerName = name || line3;
      if (!result.address && address) result.address = address;
      result.phone = phoneInLine3;

      console.log(` ✅ Customer (from line3): "${result.customerName}"`);
      console.log(` ✅ Phone (from line3): ${result.phone}`);
      if (address) console.log(` ✅ Address (from line3): "${address}"`);
    } else {
      result.customerName = line3;
      console.log(` ✅ Customer: "${result.customerName}"`);
    }
  }

  // ═══ STEP 4/6: PHONE & ADDRESS (อ่านจากทั้งข้อความก่อน) ═══
  // ✅ สำคัญ: ดึงจากทั้ง message จะไม่พลาดกรณีเบอร์อยู่ท้ายบรรทัดยาว
  if (!result.phone) {
    const phoneAll = extractThaiPhone(message);
    if (phoneAll) {
      result.phone = phoneAll;
      console.log(` ✅ Found phone (from whole message): ${result.phone}`);
    }
  }

  const addressParts: string[] = [];

  // เริ่ม Loop จากบรรทัดถัดจากชื่อ (index 3)
  for (let i = 3; i < lines.length; i++) {
    let line = lines[i];

    // ถ้าบรรทัดสุดท้ายเป็น quantity ให้ข้าม
    if (i === lines.length - 1 && /^\d+$/.test(line) && line.length < 5) {
      continue;
    }

    // ลบเบอร์/คำที่เกี่ยวข้องออกจากบรรทัดก่อนเอาไปต่อที่อยู่
    line = stripPhoneFromLine(line);
    line = line.replace(/(?:โทร|tel|เบอร์|phone)\s*[:：]?\s*$/i, "").trim();

    if (line.length > 0) {
      addressParts.push(line);
    }
  }

  // ถ้า address ยังว่าง แต่มี addressParts -> ใช้ addressParts
  if (!result.address) {
    result.address = addressParts.join(" ").trim();
  } else {
    // ถ้ามี address จาก line3 แล้ว ก็ append เพิ่มจากบรรทัดหลัง ๆ
    const tail = addressParts.join(" ").trim();
    if (tail) result.address = `${result.address} ${tail}`.trim();
  }

  console.log(` ✅ Address: "${result.address}"`);

  // ═══ STEP 5: QUANTITY ═══
  const lastLine = lines[lines.length - 1];
  const qtyMatch = lastLine.match(/(\d+)/);

  if (qtyMatch) {
    const parsedQty = parseInt(qtyMatch[1], 10);
    const isTooLong = parsedQty > 9999;

    if (!isTooLong && parsedQty > 0) {
      result.quantity = parsedQty;
      console.log(` ✅ Quantity found in "${lastLine}": ${result.quantity}`);
    }
  }

  // ═══ STEP 5.5: unitPrice ═══
  if (result.amount && result.quantity && result.quantity > 0) {
    result.unitPrice = result.amount / result.quantity;
    console.log(` ✅ UnitPrice computed: ${result.unitPrice}`);
  } else if (result.amount) {
    result.unitPrice = result.amount;
  }

  // ═══ VALIDATION ═══
  if (!result.productType || !result.customerName || !result.amount) {
    console.log("\n❌ VALIDATION FAILED - Missing required fields");
    return null;
  }

  // ✅ ถ้าไม่มีเบอร์: อย่าใช้ UNKNOWN ซ้ำ ๆ เพราะจะทำให้ customer ปนกัน
  if (!result.phone) {
    result.phone = `UNKNOWN-${Date.now()}`;
    console.log("⚠️ Warning: No phone number found, using unique placeholder:", result.phone);
  }

  return result as ParsedOrder;
}

export function getProductTypeName(type: number): string {
  return `สินค้าประเภท ${type}`;
}
