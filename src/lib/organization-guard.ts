import { NextResponse } from "next/server";

export function requireOrganizationId(orgId: string | null) {
  if (!orgId) {
    return {
      organizationId: null,
      response: NextResponse.json({ error: "No organization" }, { status: 403 }),
    };
  }

  return { organizationId: orgId, response: null };
}
