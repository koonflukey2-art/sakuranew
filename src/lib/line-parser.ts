export interface ParsedOrder {
  orderNumber?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  amount?: number;
  quantity?: number;
  productName?: string;
}

export function parseLineMessage(message: string): ParsedOrder | null {
  try {
    const result: ParsedOrder = {};

    // Extract order number (first line, just a number)
    const orderMatch = message.match(/^(\d+)\s*$/m);
    if (orderMatch) {
      result.orderNumber = orderMatch[1];
    }

    // Extract amount (ยอดเก็บ or เก็บยอด)
    const amountMatch = message.match(/(?:ยอดเก็บ|เก็บยอด)[:\s]*(\d+(?:,\d+)*)/);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // Extract customer name (line after order number or before address)
    const lines = message
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    for (let i = 0; i < lines.length; i++) {
      // Name is typically after order number and before address
      if (lines[i].match(/^[ก-๙\s]+$/) && !lines[i].match(/ยอด|เก็บ|กระปุก|บาท/)) {
        result.customerName = lines[i];
        break;
      }
    }

    // Extract phone (10-digit number)
    const phoneMatch = message.match(/(\d{10})/);
    if (phoneMatch) {
      result.phone = phoneMatch[1];
    }

    // Extract address (text containing ต., อ., จ., or postal code)
    const addressMatch = message.match(/[\d\s]*[ม\.][\s\d]+[ต\.][\S\s]+?(?=\d{5}|\d{10}|$)/);
    if (addressMatch) {
      result.address = addressMatch[0].trim();
    }

    // Extract quantity (number at end or in brackets)
    const quantityMatch = message.match(/\n\s*(\d+)\s*$/);
    if (quantityMatch) {
      result.quantity = parseInt(quantityMatch[1]);
    }

    // Extract product name if specified
    const productMatch = message.match(/สินค้า[:\s]*([\S\s]+?)(?=\n|$)/);
    if (productMatch) {
      result.productName = productMatch[1].trim();
    }

    return result;
  } catch (error) {
    console.error("Error parsing LINE message:", error);
    return null;
  }
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
