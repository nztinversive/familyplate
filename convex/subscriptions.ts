import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const MONTHLY_VARIANT_ID = "1485021";
const ANNUAL_VARIANT_ID = "1485023";
const TEST_VARIANT_ID = "1492777";
const FREE_PLAN_LIMIT = 2; // plans per month

export const handleWebhookEvent = internalMutation({
  args: {
    eventName: v.string(),
    authId: v.optional(v.string()),
    lsCustomerId: v.string(),
    lsSubscriptionId: v.string(),
    lsVariantId: v.string(),
    status: v.string(),
    endsAt: v.optional(v.string()),
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Prefer the authenticated app user passed through Lemon Squeezy custom data.
    let profile = args.authId
      ? await ctx.db
          .query("userProfiles")
          .withIndex("by_authId", (q) => q.eq("authId", args.authId!))
          .first()
      : null;

    // Fallback to an existing Lemon Squeezy customer mapping.
    if (!profile && args.lsCustomerId) {
      profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_lsCustomerId", (q) => q.eq("lsCustomerId", args.lsCustomerId))
        .first();
    }

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

    const isPaidVariant =
      args.lsVariantId === MONTHLY_VARIANT_ID ||
      args.lsVariantId === ANNUAL_VARIANT_ID ||
      args.lsVariantId === TEST_VARIANT_ID;
    const isFamily =
      isPaidVariant &&
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

    const householdProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
      .collect();
    const household = await ctx.db.get(profile.householdId);

    const isFamily = householdProfiles.some(
      (member) =>
        member.subscriptionTier === "family" &&
        (member.subscriptionStatus === "active" || member.subscriptionStatus === "on_trial")
    );

    // Apply free-plan limits at the household level so members share the same quota.
    const now = Date.now();
    const resetAt = household?.planGenerationsResetAt ?? 0;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const plansUsed = now - resetAt > monthMs ? 0 : (household?.planGenerationsThisMonth ?? 0);

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
  args: { householdId: v.id("households") },
  handler: async (ctx, args) => {
    const household = await ctx.db.get(args.householdId);
    if (!household) return;

    const now = Date.now();
    const resetAt = household.planGenerationsResetAt ?? 0;
    const monthMs = 30 * 24 * 60 * 60 * 1000;

    if (now - resetAt > monthMs) {
      // Reset counter for new month
      await ctx.db.patch(args.householdId, {
        planGenerationsThisMonth: 1,
        planGenerationsResetAt: now,
      });
    } else {
      await ctx.db.patch(args.householdId, {
        planGenerationsThisMonth: (household.planGenerationsThisMonth ?? 0) + 1,
      });
    }
  },
});
