// src/app/api/uploads/statements/[filename]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { join, basename } from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

function getUploadDir() {
  return (
    process.env.UPLOAD_DIR ||
    join(process.cwd(), "public", "uploads", "statements")
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ดึง filename จาก pathname (ไม่พึ่ง ctx params เพื่อให้ Next15 ชัวร์)
    const raw = req.nextUrl.pathname.split("/").pop() || "";
    const safeName = basename(raw);

    if (!safeName || !safeName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    const filePath = join(uploadDir, safeName);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found", filename: safeName, uploadDir },
        { status: 404 }
      );
    }

    const buf = await readFile(filePath);

    // NextResponse ต้องการ BodyInit; แปลง Buffer -> Uint8Array
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (e: any) {
    console.error("Serve statement PDF error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to serve file" },
      { status: 500 }
    );
  }
}
