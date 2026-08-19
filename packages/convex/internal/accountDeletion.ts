import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const providerValidator = v.union(
  v.literal("posthog"),
  v.literal("sentry"),
  v.literal("revenuecat"),
);

function normalizeLimit(limit?: number) {
  const value = limit ?? 50;
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new ConvexError("Limit must be an integer between 1 and 100.");
  }
  return value;
}

export const listPendingDeletionHandoffs = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("accountDeletionHandoffs"),
      accountKey: v.string(),
      provider: providerValidator,
      externalUserId: v.string(),
      requestedAt: v.number(),
      retentionUntil: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("accountDeletionHandoffs")
      .withIndex("by_status_and_requestedAt", (q) => q.eq("status", "pending"))
      .take(normalizeLimit(args.limit));

    return rows.map((row) => ({
      _id: row._id,
      accountKey: row.accountKey,
      provider: row.provider,
      externalUserId: row.externalUserId,
      requestedAt: row.requestedAt,
      retentionUntil: row.retentionUntil,
    }));
  },
});

export const resolveDeletionHandoff = internalMutation({
  args: {
    handoffId: v.id("accountDeletionHandoffs"),
    outcome: v.union(v.literal("processed"), v.literal("failed")),
    failureReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const handoff = await ctx.db.get(args.handoffId);
    if (!handoff) {
      throw new ConvexError("Deletion handoff not found.");
    }

    const failureReason = args.failureReason?.trim();
    if (failureReason && failureReason.length > 500) {
      throw new ConvexError("Failure reason must be 500 characters or fewer.");
    }
    if (args.outcome === "failed" && !failureReason) {
      throw new ConvexError("A failure reason is required for failed handoffs.");
    }

    await ctx.db.patch(args.handoffId, {
      status: args.outcome,
      processedAt: Date.now(),
      failureReason: args.outcome === "failed" ? failureReason : undefined,
    });
    return null;
  },
});

export const purgeExpiredDeletionHandoffs = internalMutation({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const completed = await ctx.db
      .query("accountDeletionHandoffs")
      .withIndex("by_status_and_retentionUntil", (q) =>
        q.eq("status", "processed").lte("retentionUntil", args.now),
      )
      .take(limit);

    for (const handoff of completed) {
      await ctx.db.delete(handoff._id);
    }

    return completed.length;
  },
});
