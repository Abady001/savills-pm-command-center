import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/backend/webhooks";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response("Missing svix headers", { status: 400 });
    }

    const payload = await request.text();
    const wh = new Webhook(webhookSecret);

    let event: WebhookEvent;
    try {
      event = wh.verify(payload, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as WebhookEvent;
    } catch {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    if (event.type === "user.created" || event.type === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        event.data;
      await ctx.runMutation(internal.users.upsertFromClerk, {
        clerkId: id,
        email: email_addresses[0]?.email_address ?? "",
        firstName: first_name ?? undefined,
        lastName: last_name ?? undefined,
        imageUrl: image_url,
      });
    } else if (event.type === "user.deleted") {
      const { id } = event.data;
      if (!id) {
        return new Response("Missing user id in deletion event", {
          status: 400,
        });
      }
      await ctx.runMutation(internal.users.deleteFromClerk, { clerkId: id });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
