import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { join, basename, extname } from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export const runtime = "nodejs";

function getUploadDir() {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

function contentTypeForExt(ext: string) {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = req.nextUrl.pathname.split("/").pop() || "";
    const safeName = basename(raw);
    const ext = extname(safeName);
    const contentType = contentTypeForExt(ext);

    if (!safeName || !contentType) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const uploadDir = getUploadDir();
    const filePath = join(uploadDir, safeName);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "File not found", filename: safeName },
        { status: 404 }
      );
    }

    const buf = await readFile(filePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (e: any) {
    console.error("Serve upload error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to serve file" },
      { status: 500 }
    );
  }
}
