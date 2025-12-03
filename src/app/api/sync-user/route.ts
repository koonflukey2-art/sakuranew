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
      include: { organization: true },
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
        include: { organization: true },
      });

      // If user has no organization, create one
      if (!user.organizationId) {
        const orgName = `${user.name || email.split("@")[0]}'s Company`;
        const orgSlug = `${email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

        const org = await prisma.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            description: "Default organization",
          },
        });

        user = await prisma.user.update({
          where: { id: user.id },
          data: { organizationId: org.id },
          include: { organization: true },
        });

        console.log(`✅ Created organization for existing user: ${user.email} -> ${org.name}`);
      }

      return NextResponse.json({
        success: true,
        message: "User synced successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } else {
      // Create new user WITH default organization
      const userName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || email.split("@")[0];
      const orgName = `${userName}'s Company`;
      const orgSlug = `${email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;

      // Create organization and user in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            description: "Default organization",
          },
        });

        // Create user linked to organization
        const newUser = await tx.user.create({
          data: {
            clerkId: clerkUser.id,
            email,
            name: userName || null,
            role: "ADMIN", // First user is admin
            organizationId: org.id,
            lastLogin: new Date(),
          },
          include: { organization: true },
        });

        return { user: newUser, org };
      });

      console.log(`✅ Created new user and organization: ${result.user.email} -> ${result.org.name}`);

      return NextResponse.json({
        success: true,
        message: "User created successfully",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          organizationId: result.user.organizationId,
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
