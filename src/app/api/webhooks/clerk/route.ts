import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  // Get webhook secret
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET");
  }

  // Get headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing headers", { status: 400 });
  }

  // Get body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Verification failed", { status: 400 });
  }

  // Handle events
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      await prisma.user.create({
        data: {
          clerkId: id,
          email: email_addresses[0].email_address,
          name: `${first_name || ""} ${last_name || ""}`.trim() || null,
          role: "EMPLOYEE", // Default role for new users
          lastLogin: new Date(),
        },
      });

      console.log("✅ User created in database:", email_addresses[0].email_address);
    } catch (error) {
      console.error("❌ Error creating user:", error);
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;

    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: {
          email: email_addresses[0].email_address,
          name: `${first_name || ""} ${last_name || ""}`.trim() || null,
          lastLogin: new Date(),
        },
      });

      console.log("✅ User updated in database:", email_addresses[0].email_address);
    } catch (error) {
      console.error("❌ Error updating user:", error);
    }
  }

  // Update lastLogin on session creation
  if (eventType === "session.created") {
    const { user_id } = evt.data;

    try {
      await prisma.user.update({
        where: { clerkId: user_id },
        data: { lastLogin: new Date() },
      });

      console.log("✅ User lastLogin updated:", user_id);
    } catch (error) {
      console.error("❌ Error updating lastLogin:", error);
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      await prisma.user.delete({
        where: { clerkId: id as string },
      });

      console.log("✅ User deleted from database");
    } catch (error) {
      console.error("❌ Error deleting user:", error);
    }
  }

  return new Response("Webhook received", { status: 200 });
}
