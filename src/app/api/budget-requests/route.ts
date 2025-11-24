import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function GET() {
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

    // For now, return mock data since we don't have BudgetRequest table yet
    const mockRequests = [
      {
        id: "1",
        purpose: "งบประมาณโฆษณา Facebook Q1",
        amount: 50000,
        reason: "เพิ่มยอดขายในช่วงเทศกาลปีใหม่",
        status: "PENDING",
        requestedBy: {
          name: user.name || "User",
          email: user.email,
        },
        createdAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json(mockRequests);
  } catch (error) {
    console.error("Budget requests fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();

    // For now, just return success
    // In production, you'd create a BudgetRequest record
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget request creation error:", error);
    return NextResponse.json(
      { error: "Failed to create budget request" },
      { status: 500 }
    );
  }
}
