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
  console.log("🔍 PARSING LINE MESSAGE");
  console.log("═══════════════════════════════════════");
  console.log("Raw message:", message);
  console.log("───────────────────────────────────────");

  const lines = message.split("\n").map((l) => l.trim()).filter(Boolean);

  console.log("📝 Split into lines:", lines.length);
  lines.forEach((line, idx) => {
    console.log(`  Line ${idx + 1}: "${line}"`);
  });

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

  // ═══ STEP 1: PRODUCT TYPE (First line) ═══
  console.log("\n🏷️  STEP 1: Extract Product Type");
  const firstLine = lines[0];
  console.log(`  First line: "${firstLine}"`);

  if (/^[1-9]\d*$/.test(firstLine)) {
    result.productType = parseInt(firstLine);
    result.productName = `สินค้าประเภท ${result.productType}`;
    console.log(`  ✅ Product Type: ${result.productType}`);
  } else {
    console.log(`  ❌ Invalid product type: "${firstLine}"`);
    return null;
  }

  // ═══ STEP 2: UNIT PRICE (Second line - "ยอดเก็บ 590") ═══
  console.log("\n💰 STEP 2: Extract Price");
  let extractedPrice = 0;

  // Check second line specifically for price
  if (lines.length >= 2) {
    const priceLine = lines[1];
    console.log(`  Price line: "${priceLine}"`);

    // Pattern 1: "ยอดเก็บ 590"
    const match1 = priceLine.match(/(?:ยอดเก็บ|เก็บยอด|ยอด)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    if (match1) {
      extractedPrice = parseFloat(match1[1].replace(/,/g, ""));
      console.log(`  ✅ Found price (pattern 1): ${extractedPrice}`);
    }

    // Pattern 2: "590 บาท"
    if (!extractedPrice) {
      const match2 = priceLine.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*บาท/);
      if (match2) {
        extractedPrice = parseFloat(match2[1].replace(/,/g, ""));
        console.log(`  ✅ Found price (pattern 2): ${extractedPrice}`);
      }
    }

    // Pattern 3: Just a number
    if (!extractedPrice && /^\d+$/.test(priceLine)) {
      extractedPrice = parseFloat(priceLine);
      console.log(`  ✅ Found price (plain number): ${extractedPrice}`);
    }
  }

  if (extractedPrice > 0) {
    result.unitPrice = extractedPrice;
    result.amount = extractedPrice;
    console.log(`  ✅ Unit Price set: ${result.unitPrice}`);
  } else {
    console.log(`  ❌ No price found`);
  }

  // ═══ STEP 3: CUSTOMER NAME (Third line) ═══
  console.log("\n👤 STEP 3: Extract Customer Name");
  if (lines.length >= 3) {
    result.customerName = lines[2];
    console.log(`  ✅ Customer: "${result.customerName}"`);
  } else {
    console.log(`  ❌ No customer name (need line 3)`);
  }

  // ═══ STEP 4: PHONE NUMBER ═══
  console.log("\n📱 STEP 4: Extract Phone Number");
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];

    // Check for phone pattern "โทร 0925519656"
    const phoneMatch1 = line.match(/(?:โทร|Tel|เบอร์)\s*(0\d{9})/i);
    if (phoneMatch1) {
      result.phone = phoneMatch1[1];
      console.log(`  ✅ Found phone (pattern 1): ${result.phone} at line ${i + 1}`);
      break;
    }

    // Check for standalone phone "0925519656"
    const phoneMatch2 = line.match(/^(0\d{9})$/);
    if (phoneMatch2) {
      result.phone = phoneMatch2[1];
      console.log(`  ✅ Found phone (pattern 2): ${result.phone} at line ${i + 1}`);
      break;
    }

    // Check for phone anywhere in line
    const phoneMatch3 = line.match(/(0\d{9})/);
    if (phoneMatch3) {
      result.phone = phoneMatch3[1];
      console.log(`  ✅ Found phone (pattern 3): ${result.phone} at line ${i + 1}`);
      break;
    }
  }

  if (!result.phone) {
    console.log(`  ❌ No phone number found`);
  }

  // ═══ STEP 5: QUANTITY (Last line) ═══
  console.log("\n🔢 STEP 5: Extract Quantity");
  const lastLine = lines[lines.length - 1];
  console.log(`  Last line: "${lastLine}"`);

  if (/^\d+$/.test(lastLine)) {
    const qty = parseInt(lastLine);
    // Make sure it's not a phone number
    if (qty < 100 && qty !== parseInt(result.phone || "0")) {
      result.quantity = qty;
      console.log(`  ✅ Quantity: ${result.quantity}`);

      // Update total amount
      if (result.unitPrice && result.unitPrice > 0) {
        result.amount = result.unitPrice * result.quantity;
        console.log(`  ✅ Total amount: ${result.unitPrice} × ${result.quantity} = ${result.amount}`);
      }
    } else {
      console.log(`  ⚠️  Looks like phone number, using default quantity: 1`);
    }
  } else {
    console.log(`  ⚠️  Not a number, using default quantity: 1`);
  }

  // ═══ STEP 6: ADDRESS (Lines between customer and phone) ═══
  console.log("\n🏠 STEP 6: Extract Address");
  const addressLines: string[] = [];

  // Find phone line index
  let phoneLineIndex = -1;
  for (let i = 3; i < lines.length; i++) {
    if (lines[i].includes(result.phone || "")) {
      phoneLineIndex = i;
      break;
    }
  }

  // Get address lines (between customer name and phone)
  const startIdx = 3; // After customer name
  const endIdx = phoneLineIndex > 0 ? phoneLineIndex : lines.length - 1;

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i];
    // Skip if it's a phone number or quantity
    if (!/^(0\d{9}|\d{1,2})$/.test(line) && !line.match(/^โทร/i)) {
      addressLines.push(line);
    }
  }

  result.address = addressLines.join(" ");
  console.log(`  Address lines: ${addressLines.length}`);
  addressLines.forEach((line, idx) => {
    console.log(`    ${idx + 1}. "${line}"`);
  });
  console.log(`  ✅ Full address: "${result.address}"`);

  // ═══ VALIDATION ═══
  console.log("\n✅ VALIDATION");
  console.log("───────────────────────────────────────");

  const validationResults = {
    productType: !!result.productType,
    customerName: !!result.customerName,
    phone: !!result.phone,
    unitPrice: (result.unitPrice ?? 0) > 0,
  };

  Object.entries(validationResults).forEach(([field, valid]) => {
    console.log(`  ${valid ? "✅" : "❌"} ${field}: ${valid ? "OK" : "MISSING"}`);
  });

  if (!result.productType || !result.customerName || !result.phone) {
    console.log("\n❌ VALIDATION FAILED - Missing required fields");
    console.log("═══════════════════════════════════════\n");
    return null;
  }

  console.log("\n✅ PARSING SUCCESSFUL");
  console.log("═══════════════════════════════════════");
  console.log("Final result:", JSON.stringify(result, null, 2));
  console.log("═══════════════════════════════════════\n");

  return result as ParsedOrder;
}

export function getProductTypeName(type: number): string {
  return `สินค้าประเภท ${type}`;
}

export interface ParsedSummary {
  date: string;
  totalAmount: number;
  totalOrders: number;
  ordersByQuantity: Record<number, number>;
}

export function parseSummaryMessage(message: string): ParsedSummary | null {
  try {
    const result: ParsedSummary = {
      date: "",
      totalAmount: 0,
      totalOrders: 0,
      ordersByQuantity: {},
    };

    // Extract date
    const dateMatch = message.match(/วันที่[:\s]*(\d+\/\d+\/\d+)/);
    if (dateMatch) {
      result.date = dateMatch[1];
    }

    // Extract total amount
    const amountMatch = message.match(/ยอดตามทั้งหมด[:\s]*(\d+(?:,\d+)*)/);
    if (amountMatch) {
      result.totalAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // Extract total orders
    const ordersMatch = message.match(/จำนวนออเดอร์[:\s]*(\d+)/);
    if (ordersMatch) {
      result.totalOrders = parseInt(ordersMatch[1]);
    }

    // Extract orders by quantity
    const quantityMatches = message.matchAll(/ออเดอร์\s*(\d+)\s*กระปุก[:\s]*(\d+)/g);
    for (const match of quantityMatches) {
      const quantity = parseInt(match[1]);
      const count = parseInt(match[2]);
      result.ordersByQuantity[quantity] = count;
    }

    return result;
  } catch (error) {
    console.error("Error parsing summary message:", error);
    return null;
  }
}
