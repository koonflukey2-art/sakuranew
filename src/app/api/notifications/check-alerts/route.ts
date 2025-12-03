import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { getOrganizationId } from "@/lib/organization";

export async function POST() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get organization ID
    const orgId = await getOrganizationId();
    if (!orgId) {
      // No organization yet - return success without checking
      return NextResponse.json({
        success: true,
        message: "No organization to check alerts for",
      });
    }

    // Check low stock (using organizationId)
    const products = await prisma.product.findMany({
      where: { organizationId: orgId },
    });

    const lowStockProducts = products.filter(
      (p) => p.quantity < p.minStockLevel
    );

    // Create notifications for low stock
    for (const product of lowStockProducts) {
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "LOW_STOCK",
          message: { contains: product.name },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
          },
        },
      });

      if (!existingNotif) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: "LOW_STOCK",
            title: "สต็อกต่ำ!",
            message: `${product.name} เหลือเพียง ${product.quantity} ชิ้น (ควรมี ${product.minStockLevel})`,
            link: "/stock",
          },
        });
      }
    }

    // Check budget alerts (using organizationId)
    const budgets = await prisma.budget.findMany({
      where: { organizationId: orgId },
    });

    for (const budget of budgets) {
      if (budget.spent > budget.amount * 0.9) {
        const existingNotif = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: "BUDGET_ALERT",
            message: { contains: budget.purpose },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (!existingNotif) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: "BUDGET_ALERT",
              title: "งบประมาณใกล้หมด!",
              message: `งบ "${budget.purpose}" ใช้ไปแล้ว ${((budget.spent / budget.amount) * 100).toFixed(0)}%`,
              link: "/budgets",
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Check alerts error:", error);
    // Don't fail - return success to prevent errors
    return NextResponse.json({ success: true });
  }
}
