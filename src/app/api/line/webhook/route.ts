import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLineMessage } from "@/lib/line-parser";

export async function POST(request: Request) {
  try {
    // Get signature for verification
    const signature = request.headers.get("x-line-signature");
    const body = await request.text();

    // TODO: Verify LINE signature with channel secret
    // const channelSecret = process.env.LINE_CHANNEL_SECRET;
    // const hash = crypto.createHmac('SHA256', channelSecret).update(body).digest('base64');
    // if (signature !== hash) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const data = JSON.parse(body);

    // Process events
    for (const event of data.events || []) {
      if (event.type === "message" && event.message.type === "text") {
        const message = event.message.text;

        // Parse message
        const parsed = parseLineMessage(message);

        if (parsed && parsed.amount) {
          // Find organization from LINE settings
          // TODO: Map LINE user/group to organization

          // Auto-create order
          // Implementation here
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LINE webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
