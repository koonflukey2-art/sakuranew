import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PATHS = [
  "/api/profit/summary",
  "/api/ads/receipts",
  "/api/capital-budget",
  "/api/budgets",
  "/api/budget-requests",
];

async function safeReadText(res: Response) {
  try {
    const t = await res.text();
    return t.slice(0, 1200);
  } catch {
    return "";
  }
}

export async function GET(req: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const debugEnabled =
    process.env.DEBUG_ROUTES_ENABLED?.toLowerCase() === "true";
  if (isProd && !debugEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ✅ IMPORTANT: internal Next server is HTTP on port 3000
  const base = "http://127.0.0.1:3000";
  const cookie = req.headers.get("cookie") ?? "";

  const results = await Promise.all(
    PATHS.map(async (path) => {
      const url = base + path;
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            cookie,
            accept: "application/json",
          },
          cache: "no-store",
        });

        const text = await safeReadText(res);
        let body: any = text;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {}

        return {
          path,
          url,
          ok: res.ok,
          status: res.status,
          statusText: res.statusText,
          body,
        };
      } catch (e: any) {
        return {
          path,
          url,
          ok: false,
          status: 0,
          statusText: "FETCH_ERROR",
          body: e?.message || String(e),
        };
      }
    })
  );

  const failed = results.filter((r) => !r.ok);

  return NextResponse.json(
    {
      ok: failed.length === 0,
      failedCount: failed.length,
      failed,
      results,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
