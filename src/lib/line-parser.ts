export interface ParsedOrder {
  productType?: number; // 1-4 from FIRST line
  quantity?: number; // from LAST line
  customerName?: string;
  phone?: string;
  address?: string;
  amount?: number; // Total amount
  unitPrice?: number; // Price per unit from "ยอดเก็บ 590"
  productName?: string;
}

export function parseLineMessage(message: string): ParsedOrder | null {
  try {
    const result: ParsedOrder = {};
    const lines = message
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    if (lines.length < 3) {
      return null;
    }

    // First line = product type (1-4)
    const firstLine = lines[0];
    if (/^[1-4]$/.test(firstLine)) {
      result.productType = parseInt(firstLine);
      result.productName = `สินค้าหมายเลข ${result.productType}`;
    } else {
      console.log("Invalid product type:", firstLine);
      return null;
    }

    // Last line = quantity
    const lastLine = lines[lines.length - 1];
    if (/^\d+$/.test(lastLine)) {
      result.quantity = parseInt(lastLine);
    } else {
      result.quantity = 1;
    }

    // Extract amount and unitPrice (ยอดเก็บ or เก็บยอด)
    const amountMatch = message.match(/(?:ยอดเก็บ|เก็บยอด)[:\s]*(\d+(?:,\d+)*)/);
    if (amountMatch) {
      const extractedPrice = parseFloat(amountMatch[1].replace(/,/g, ""));
      result.unitPrice = extractedPrice; // Price per unit
      result.amount = extractedPrice; // Default to same value (will be adjusted by quantity later)
    }

    // Extract customer name (Thai characters line)
    for (let i = 1; i < lines.length - 1; i++) {
      if (
        lines[i].match(/^[ก-๙\s]+$/) &&
        !lines[i].match(/ยอด|เก็บ|กระปุก|บาท/) &&
        lines[i].length > 3
      ) {
        result.customerName = lines[i];
        break;
      }
    }

    // Extract phone (10-digit number)
    const phoneMatch = message.match(/0\d{9}/);
    if (phoneMatch) {
      result.phone = phoneMatch[0];
    }

    // Extract address (lines containing ต., อ., จ., ม. or postal code)
    const addressLines = lines.filter(
      (line) => line.match(/[ต\.อ\.จ\.ม\.]/g) || line.match(/\d{5}/)
    );
    if (addressLines.length > 0) {
      result.address = addressLines.join(" ");
    }

    // Calculate total amount = unitPrice * quantity
    if (result.unitPrice && result.quantity) {
      result.amount = result.unitPrice * result.quantity;
    }

    return result;
  } catch (error) {
    console.error("Error parsing LINE message:", error);
    return null;
  }
}

// Map product type to name
export function getProductTypeName(type: number): string {
  return `สินค้าหมายเลข ${type}`;
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
