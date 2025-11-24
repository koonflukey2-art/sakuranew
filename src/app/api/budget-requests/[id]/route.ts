import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // For now, just return success
    // In production, you'd update the BudgetRequest record
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Budget request review error:", error);
    return NextResponse.json(
      { error: "Failed to review budget request" },
      { status: 500 }
    );
  }
}
