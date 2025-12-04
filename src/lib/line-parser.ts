export interface ParsedOrder {
  orderNumber?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  amount?: number;
  quantity?: number;
  productType?: number; // 1-4
  productName?: string;
}

export function parseLineMessage(message: string): ParsedOrder | null {
  try {
    const result: ParsedOrder = {};

    // Split message into lines
    const lines = message
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    // Extract order number (first line, just a number)
    const firstLine = lines[0];
    if (/^\d+$/.test(firstLine)) {
      result.orderNumber = firstLine;
    }

    // Extract product type (LAST line, single digit 1-4)
    const lastLine = lines[lines.length - 1];
    if (/^[1-4]$/.test(lastLine)) {
      result.productType = parseInt(lastLine);

      // Map product type to name
      const productNames: Record<number, string> = {
        1: "ครีมอาบน้ำ",
        2: "ยาสีฟัน",
        3: "สินค้าประเภท 3",
        4: "สินค้าประเภท 4",
      };
      result.productName = productNames[result.productType];
    }

    // Extract amount (ยอดเก็บ or เก็บยอด)
    const amountMatch = message.match(/(?:ยอดเก็บ|เก็บยอด)[:\s]*(\d+(?:,\d+)*)/);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    }

    // Extract customer name
    // Name is typically line 3 (after order number and amount)
    for (let i = 0; i < lines.length; i++) {
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

    // Extract address
    const addressMatch = message.match(/[\d\s]*[ม\.][\s\d]+.*?(?=\d{5})/s);
    if (addressMatch) {
      result.address =
        addressMatch[0].trim() + " " + (message.match(/\d{5}/)?.[0] || "");
    }

    // Default quantity
    result.quantity = 1;

    return result;
  } catch (error) {
    console.error("Error parsing LINE message:", error);
    return null;
  }
}

// Map product type to name
export function getProductTypeName(type: number): string {
  const names: Record<number, string> = {
    1: "ครีมอาบน้ำ",
    2: "ยาสีฟัน",
    3: "สินค้าประเภท 3",
    4: "สินค้าประเภท 4",
  };
  return names[type] || "ไม่ระบุ";
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
