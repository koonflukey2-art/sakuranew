import { NextRequest, NextResponse } from "next/server";
import { parseLineMessage } from "@/lib/line-parser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  console.log("\n🧪 LINE PARSER TEST ENDPOINT");
  console.log("═══════════════════════════════════════");

  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    console.log("Input message:");
    console.log("───────────────────────────────────────");
    console.log(message);
    console.log("───────────────────────────────────────\n");

    const result = parseLineMessage(message);

    return NextResponse.json({
      success: !!result,
      result: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Test parser error:", error);
    return NextResponse.json(
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "LINE Parser Test Endpoint",
    usage: "POST a JSON body with { message: 'your LINE message' }",
    example: {
      message:
        "1\\nยอดเก็บ 590\\nCyndy\\nโรงเรียนยโสธรพิทยาคม\\nถนนแจ้งสนิท\\nตำบลในเมืองอำเภอเมืองจังหวัดยโสธร 35000\\nโทร 0925519656\\n4",
    },
  });
}
