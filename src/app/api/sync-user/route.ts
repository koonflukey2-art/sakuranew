import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ หา organization เดิม ถ้าไม่มีให้สร้างใหม่
    let org = await prisma.organization.findFirst({
      where: { slug: "default-org" },
    });

    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: "Default Organization",
          slug: "default-org",
        },
      });
    }

    // ✅ หา user เดิมจาก clerkId หรือ email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: clerkUser.id }, { email: clerkUser.emailAddresses[0]?.emailAddress }],
      },
    });

    // ✅ ถ้าไม่มี user เดิม → สร้างใหม่
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
          role: "EMPLOYEE",
          organizationId: org.id,
        },
      });
    } else {
      // ✅ อัปเดต organizationId ให้ตรง schema ใหม่
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          organizationId: user.organizationId ?? org.id,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
          email: clerkUser.emailAddresses[0]?.emailAddress || user.email,
        },
      });
    }

    return NextResponse.json({ message: "User synced", user });
  } catch (error: any) {
    console.error("❌ Sync user error:", error);
    return NextResponse.json(
      { error: "Failed to sync user", details: error.message },
      { status: 500 }
    );
  }
}
