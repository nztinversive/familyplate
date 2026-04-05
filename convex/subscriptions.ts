import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const MONTHLY_VARIANT_ID = "1485021";
const ANNUAL_VARIANT_ID = "1485023";
const FREE_PLAN_LIMIT = 2; // plans per month

export const handleWebhookEvent = internalMutation({
  args: {
    eventName: v.string(),
    lsCustomerId: v.string(),
    lsSubscriptionId: v.string(),
    lsVariantId: v.string(),
    status: v.string(),
    endsAt: v.optional(v.string()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the user profile by email or lsCustomerId
    let profile = args.lsCustomerId
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_lsCustomerId", (q) => q.eq("lsCustomerId", args.lsCustomerId))
          .first()
      : null;

    // Fallback: find by email
    if (!profile && args.userEmail) {
      const allProfiles = await ctx.db.query("userProfiles").collect();
      profile = allProfiles.find(
        (p) => p.email?.toLowerCase() === args.userEmail.toLowerCase()
      ) ?? null;
    }

    if (!profile) {
      console.warn(`No profile found for LS customer ${args.lsCustomerId} / email ${args.userEmail}`);
      return;
    }

    const isFamily =
      (args.lsVariantId === MONTHLY_VARIANT_ID || args.lsVariantId === ANNUAL_VARIANT_ID) &&
      (args.status === "active" || args.status === "on_trial");

    switch (args.eventName) {
      case "subscription_created":
      case "subscription_updated":
        await ctx.db.patch(profile._id, {
          subscriptionTier: isFamily ? "family" : "free",
          lsCustomerId: args.lsCustomerId,
          lsSubscriptionId: args.lsSubscriptionId,
          lsVariantId: args.lsVariantId,
          subscriptionStatus: args.status,
          subscriptionEndsAt: args.endsAt,
        });
        break;

      case "subscription_cancelled":
      case "subscription_expired":
        await ctx.db.patch(profile._id, {
          subscriptionTier: "free",
          subscriptionStatus: args.status,
          subscriptionEndsAt: args.endsAt,
        });
        break;

      default:
        console.log(`Unhandled LS event: ${args.eventName}`);
    }
  },
});

export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { tier: "free" as const, isFamily: false, canGenerate: true, plansUsed: 0, plansLimit: FREE_PLAN_LIMIT };

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();

    if (!profile) return { tier: "free" as const, isFamily: false, canGenerate: true, plansUsed: 0, plansLimit: FREE_PLAN_LIMIT };

    const tier = profile.subscriptionTier ?? "free";
    const isFamily = tier === "family" && (profile.subscriptionStatus === "active" || profile.subscriptionStatus === "on_trial");

    // Check monthly plan generation limit for free users
    const now = Date.now();
    const resetAt = profile.planGenerationsResetAt ?? 0;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const plansUsed = now - resetAt > monthMs ? 0 : (profile.planGenerationsThisMonth ?? 0);

    return {
      tier: isFamily ? "family" as const : "free" as const,
      isFamily,
      canGenerate: isFamily || plansUsed < FREE_PLAN_LIMIT,
      plansUsed,
      plansLimit: FREE_PLAN_LIMIT,
      status: profile.subscriptionStatus,
      endsAt: profile.subscriptionEndsAt,
      lsCustomerId: profile.lsCustomerId,
    };
  },
});

export const incrementPlanGeneration = internalMutation({
  args: { authId: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();
    if (!profile) return;

    const now = Date.now();
    const resetAt = profile.planGenerationsResetAt ?? 0;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    if (now - resetAt > monthMs) {
      // Reset counter for new month
      await ctx.db.patch(profile._id, {
        planGenerationsThisMonth: 1,
        planGenerationsResetAt: now,
      });
    } else {
      await ctx.db.patch(profile._id, {
        planGenerationsThisMonth: (profile.planGenerationsThisMonth ?? 0) + 1,
      });
    }
  },
});
