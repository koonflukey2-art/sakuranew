import test from "node:test";
import assert from "node:assert/strict";
import { requireOrganizationId } from "@/lib/organization-guard";

test("requireOrganizationId returns 403 when orgId is null", async () => {
  const { response } = requireOrganizationId(null);
  assert.ok(response);
  assert.equal(response.status, 403);

  const body = await response.json();
  assert.deepEqual(body, { error: "No organization" });
});
