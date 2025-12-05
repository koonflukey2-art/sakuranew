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
  try {
    const lines = message
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 3) {
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

    // 1. FIRST LINE = Product Type (numeric code)
    const firstLine = lines[0];
    if (/^[1-9]\d*$/.test(firstLine)) {
      result.productType = parseInt(firstLine, 10);
      result.productName = `สินค้าประเภท ${result.productType}`;
    }

    // 2. EXTRACT PRICE (amount/unit price)
    let extractedPrice = 0;
    for (const line of lines) {
      const priceMatch1 = line.match(
        /(?:เก็บยอด|ยอดเก็บ|ยอด)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:บาท)?/i
      );
      if (priceMatch1) {
        extractedPrice = parseFloat(priceMatch1[1].replace(/,/g, ""));
        break;
      }

      const priceMatch2 = line.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)\s*บาท/);
      if (priceMatch2) {
        extractedPrice = parseFloat(priceMatch2[1].replace(/,/g, ""));
        break;
      }

      const priceMatch3 = line.match(/฿\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
      if (priceMatch3) {
        extractedPrice = parseFloat(priceMatch3[1].replace(/,/g, ""));
        break;
      }

      const priceMatch4 = line.match(/(\d+(?:,\d{3})*(?:\.\d{2})?)บาท/);
      if (priceMatch4) {
        extractedPrice = parseFloat(priceMatch4[1].replace(/,/g, ""));
        break;
      }
    }

    if (extractedPrice > 0) {
      result.unitPrice = extractedPrice;
      result.amount = extractedPrice;
    }

    // 3. CUSTOMER NAME (use third line when available)
    if (lines.length >= 3) {
      result.customerName = lines[2];
    }

    // 4. ADDRESS (lines between name and phone)
    const addressLines: string[] = [];
    for (let i = 3; i < lines.length - 2; i++) {
      if (!/^\d{10}$/.test(lines[i])) {
        addressLines.push(lines[i]);
      }
    }
    result.address = addressLines.join(" ");

    // 5. PHONE (search bottom-up for 10-digit)
    for (let i = lines.length - 1; i >= 0; i--) {
      const phoneMatch = lines[i].match(/0\d{9}/);
      if (phoneMatch) {
        result.phone = phoneMatch[0];
        break;
      }
    }

    // 6. LAST LINE = Quantity
    const lastLine = lines[lines.length - 1];
    if (/^\d+$/.test(lastLine)) {
      const qty = parseInt(lastLine, 10);
      result.quantity = qty;
      if (result.unitPrice && result.unitPrice > 0) {
        result.amount = result.unitPrice * qty;
      }
    }

    if (!result.productType || !result.customerName || !result.phone) {
      return null;
    }

    return result as ParsedOrder;
  } catch (error) {
    console.error("Error parsing LINE message:", error);
    return null;
  }
}

// Map product type to name
export function getProductTypeName(type: number): string {
  return `สินค้าประเภท ${type}`;
}

export interface ParsedSummary {
  date: string;
  totalAmount: number;
  totalOrders: number;
  ordersByQuantity: Record<number, number>; // {1: 1, 3: 14, 7: 1, 11: 1}
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
