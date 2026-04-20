import { v } from "convex/values";
import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

const ALLOWED_EVENTS = new Set([
  "generator_completed",
  "cta_clicked",
  "plan_shared",
]);

export const logEvent = mutation({
  args: {
    name: v.string(),
    sourcePage: v.optional(v.string()),
    planId: v.optional(v.id("publicPlans")),
    fingerprint: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!ALLOWED_EVENTS.has(args.name)) return null;
    return await ctx.db.insert("publicEvents", {
      name: args.name,
      sourcePage: args.sourcePage?.slice(0, 120),
      planId: args.planId as Id<"publicPlans"> | undefined,
      fingerprint: args.fingerprint?.slice(0, 80),
      metadata: args.metadata?.slice(0, 500),
      createdAt: Date.now(),
    });
  },
});
