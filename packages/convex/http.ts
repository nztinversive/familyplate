import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

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
      authId: typeof customData?.auth_id === "string" ? customData.auth_id : undefined,
      ...subscriptionData,
    });

    return new Response("OK", { status: 200 });
  }),
});

http.route({
  path: "/api/webhooks/revenuecat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedAuthorization =
      process.env.REVENUECAT_WEBHOOK_AUTH_HEADER ||
      (process.env.REVENUECAT_WEBHOOK_SECRET
        ? `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`
        : undefined);
    if (!expectedAuthorization) {
      console.error("RevenueCat webhook authorization is not set");
      return new Response("Server misconfigured", { status: 500 });
    }

    const authorization = request.headers.get("authorization");
    if (authorization !== expectedAuthorization) {
      return new Response("Invalid authorization", { status: 401 });
    }

    const payload = await request.json();
    const event = payload.event;
    const eventType = event?.type;
    const appUserId = event?.app_user_id;

    if (typeof eventType !== "string" || typeof appUserId !== "string") {
      return new Response("Invalid payload", { status: 400 });
    }

    const entitlementIds = Array.isArray(event.entitlement_ids)
      ? event.entitlement_ids.filter((id: unknown): id is string => typeof id === "string")
      : [];
    const aliases = Array.isArray(event.aliases)
      ? event.aliases.filter((id: unknown): id is string => typeof id === "string")
      : [];

    console.log(`RevenueCat webhook: ${eventType}`, {
      appUserId,
      productId: event.product_id,
      entitlementIds,
      store: event.store,
    });

    await ctx.runMutation(internal.subscriptions.handleRevenueCatWebhookEvent, {
      eventType,
      appUserId,
      originalAppUserId:
        typeof event.original_app_user_id === "string"
          ? event.original_app_user_id
          : undefined,
      aliases,
      productId: typeof event.product_id === "string" ? event.product_id : undefined,
      entitlementIds,
      store: typeof event.store === "string" ? event.store : undefined,
      expirationAtMs:
        typeof event.expiration_at_ms === "number"
          ? event.expiration_at_ms
          : undefined,
      periodType: typeof event.period_type === "string" ? event.period_type : undefined,
    });

    return new Response("OK", { status: 200 });
  }),
});

export default http;
