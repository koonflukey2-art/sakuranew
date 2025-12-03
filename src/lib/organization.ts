import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Get current user's organization ID
 */
export async function getOrganizationId(): Promise<string | null> {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      console.warn("No authenticated user found");
      return null;
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      select: { organizationId: true },
    });

    if (!dbUser || !dbUser.organizationId) {
      console.warn(`User ${clerkUser.id} has no organization`);
      return null;
    }

    return dbUser.organizationId;
  } catch (error) {
    console.error("Error getting organization ID:", error);
    return null;
  }
}

/**
 * Get current user's full organization details
 */
export async function getOrganization() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
      include: { organization: true },
    });

    return dbUser?.organization || null;
  } catch (error) {
    console.error("Error getting organization:", error);
    return null;
  }
}

/**
 * Check if user has an organization
 */
export async function hasOrganization(): Promise<boolean> {
  const orgId = await getOrganizationId();
  return orgId !== null;
}

/**
 * Get all users in current user's organization
 */
export async function getOrganizationMembers() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return [];

    const members = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return members;
  } catch (error) {
    console.error("Error getting organization members:", error);
    return [];
  }
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(orgId: string) {
  try {
    const [
      productCount,
      campaignCount,
      memberCount,
      budgetCount,
    ] = await Promise.all([
      prisma.product.count({ where: { organizationId: orgId } }),
      prisma.adCampaign.count({ where: { organizationId: orgId } }),
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.budget.count({ where: { organizationId: orgId } }),
    ]);

    return {
      products: productCount,
      campaigns: campaignCount,
      members: memberCount,
      budgets: budgetCount,
    };
  } catch (error) {
    console.error("Error getting organization stats:", error);
    return {
      products: 0,
      campaigns: 0,
      members: 0,
      budgets: 0,
    };
  }
}
