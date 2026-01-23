import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

async function main() {
  const rows = await prisma.adReceipt.findMany({
    where: { OR: [{ fileHash: null }, { qrHash: null }] },
    select: { id: true, qrCodeData: true, fileHash: true, qrHash: true },
  });

  console.log("Need backfill:", rows.length);

  for (const r of rows) {
    const fileHash = r.fileHash ?? sha256(r.id); // ✅ ใช้ id เป็น fallback
    const qrHash = r.qrHash ?? (r.qrCodeData ? sha256(r.qrCodeData) : null);

    await prisma.adReceipt.update({
      where: { id: r.id },
      data: { fileHash, qrHash },
    });
  }

  console.log("Backfill done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
