import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/webhooks/lemonsqueezy",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      console.error("LEMONSQUEEZY_WEBHOOK_SECRET not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-signature");

    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    // Verify HMAC signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedSignature !== signature) {
      console.error("Invalid webhook signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const customData = payload.meta?.custom_data;
    const attrs = payload.data?.attributes;

    if (!eventName || !attrs) {
      return new Response("Invalid payload", { status: 400 });
    }

    const subscriptionData = {
      lsCustomerId: String(attrs.customer_id ?? ""),
      lsSubscriptionId: String(payload.data?.id ?? ""),
      lsVariantId: String(attrs.variant_id ?? ""),
      status: String(attrs.status ?? ""),
      endsAt: attrs.ends_at ? String(attrs.ends_at) : undefined,
      userEmail: String(attrs.user_email ?? customData?.user_email ?? ""),
    };

    console.log(`Lemon Squeezy webhook: ${eventName}`, subscriptionData);

    await ctx.runMutation(internal.subscriptions.handleWebhookEvent, {
      eventName,
      ...subscriptionData,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;
