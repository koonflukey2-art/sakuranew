import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const DEFAULT_ORG_SLUG = "sakura";
const DEFAULT_ORG_NAME = "Sakura Biotech";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").toLowerCase().trim();
    const password = String(body?.password || "");
    const name = body?.name ? String(body.name).trim() : null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ ensure single organization exists (or create it)
    const org = await prisma.organization.upsert({
      where: { slug: DEFAULT_ORG_SLUG },
      update: {},
      create: {
        name: DEFAULT_ORG_NAME,
        slug: DEFAULT_ORG_SLUG,
      },
      select: { id: true },
    });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
        organizationId: org.id, // ✅ attach org id always
        // role จะ default เป็น EMPLOYEE ตาม schema อยู่แล้ว
      },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }
    }

    console.error("Sign-up error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
