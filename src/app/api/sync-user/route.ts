import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST() {
  try {
    // Get current Clerk user
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "No email found" },
        { status: 400 }
      );
    }

    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update existing user with clerkId
      user = await prisma.user.update({
        where: { email },
        data: {
          clerkId: clerkUser.id,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
          lastLogin: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "User synced successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email,
          name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
          role: "EMPLOYEE",
          lastLogin: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }
  } catch (error) {
    console.error("❌ Sync user error:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
