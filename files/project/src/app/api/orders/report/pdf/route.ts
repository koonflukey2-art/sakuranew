import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/organization";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// แปลงค่าเป็น string สวย ๆ สำหรับวันที่ / ข้อความ
function formatDateTime(v: any): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // รูปแบบ: 2026-01-13 14:16:15
  return d.toISOString().replace("T", " ").slice(0, 19);
}

function safeText(v: any): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return formatDateTime(v);
  return String(v);
}

export async function GET(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 8);

  try {
    console.log("[pdf:" + rid + "] start", req.url);

    const url = new URL(req.url);
    const date = url.searchParams.get("date") || "";
    if (!date) {
      return NextResponse.json({ error: "Missing date" }, { status: 400 });
    }

    // พยายามดึง orgId (ถ้า error ก็ข้ามไป)
    let orgId: string | null = null;
    try {
      orgId = await getOrganizationId();
    } catch (e) {
      console.warn("[pdf:" + rid + "] getOrganizationId error", e);
    }
    console.log("[pdf:" + rid + "] orgId", orgId);

    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ช่วงเวลา 1 วันของ date นั้น (UTC)
    const start = new Date(date + "T00:00:00.000Z");
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const where: any = {
      organizationId: orgId,
      AND: [
        {
          OR: [
            { orderDate: { gte: start, lt: end } },
            { createdAt: { gte: start, lt: end } },
          ],
        },
      ],
    };

    const orders = await prisma.order.findMany({
      where,
      include: { customer: true },
      orderBy: { orderDate: "asc" },
    });

    console.log("[pdf:" + rid + "] orders", orders.length);

    // ---------- สร้าง PDF ด้วย pdf-lib + ฟอนต์ไทย ----------
    const pdfDoc = await PDFDocument.create();

    // สำคัญ: register fontkit ก่อน embed ฟอนต์
    (pdfDoc as any).registerFontkit(fontkit as any);

    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "NotoSansThai-Regular.ttf",
    );
    console.log("[pdf:" + rid + "] fontPath", fontPath);

    const fontBytes = await fs.readFile(fontPath);
    const thaiFont = await pdfDoc.embedFont(fontBytes, { subset: true });

    // A4 ขนาด point (ประมาณ 595 x 842)
    let page = pdfDoc.addPage([595.28, 841.89]);
    let { width, height } = page.getSize();

    let y = height - 60;

    // หัวรายงาน
    page.drawText(`รายงานคำสั่งซื้อวันที่ ${date}`, {
      x: 50,
      y,
      size: 18,
      font: thaiFont,
      color: rgb(0, 0, 0),
    });

    y -= 30;

    // header ตาราง
    page.drawText("วันที่ | ลูกค้า | เลขที่ | ยอดรวม", {
      x: 50,
      y,
      size: 12,
      font: thaiFont,
      color: rgb(0, 0, 0),
    });

    y -= 18;
    const lineHeight = 14;

    for (const o of orders) {
      // ถ้าเกือบสุดหน้าก็ขึ้นหน้าใหม่
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89]);
        ({ width, height } = page.getSize());
        y = height - 60;

        page.drawText(`รายงานคำสั่งซื้อวันที่ ${date} (ต่อ)`, {
          x: 50,
          y,
          size: 14,
          font: thaiFont,
          color: rgb(0, 0, 0),
        });

        y -= 26;

        page.drawText("วันที่ | ลูกค้า | เลขที่ | ยอดรวม", {
          x: 50,
          y,
          size: 12,
          font: thaiFont,
          color: rgb(0, 0, 0),
        });

        y -= 18;
      }

      const dt = (o as any).orderDate ?? o.createdAt;
      const dtStr = formatDateTime(dt);
      const customerName = safeText((o as any).customer?.name ?? "");
      const id = safeText(o.id);
      const total = safeText((o as any).total ?? (o as any).amount ?? 0);

      const line = `${dtStr} | ${customerName} | ${id} | ${total}`;

      page.drawText(line, {
        x: 50,
        y,
        size: 11,
        font: thaiFont,
        color: rgb(0, 0, 0),
      });

      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    console.log("[pdf:" + rid + "] bytes", pdfBytes.length);

    return new NextResponse(pdfBytes as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="orders-${date}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[pdf:" + rid + "] failed", e?.message);
    console.error("[pdf:" + rid + "] stack", e?.stack || e);
    return NextResponse.json(
      { error: "Failed to generate PDF", detail: String(e?.message || e) },
      { status: 500 },
    );
  }
}
