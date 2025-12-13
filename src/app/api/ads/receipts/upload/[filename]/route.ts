import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

function getUploadDir() {
  // ✅ ให้ตรงกับที่ save: public/uploads
  return process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
}

function contentTypeFromName(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const filePath = join(getUploadDir(), filename);
    await stat(filePath);

    const stream = createReadStream(filePath);

    return new NextResponse(stream as any, {
      headers: {
        "Content-Type": contentTypeFromName(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
