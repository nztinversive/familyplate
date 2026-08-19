import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

const sourceSurfaceValidator = v.union(
  v.literal("tonight"),
  v.literal("weekly_plan"),
  v.literal("cookbook"),
);
const reportReasonValidator = v.union(
  v.literal("unsafe"),
  v.literal("allergy_risk"),
  v.literal("inappropriate"),
  v.literal("inaccurate"),
  v.literal("other"),
);

function normalizeLimit(limit?: number) {
  const value = limit ?? 50;
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new ConvexError("Limit must be an integer between 1 and 100.");
  }
  return value;
}

export const listPendingAiContentReports = internalQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("aiContentReports"),
      householdId: v.id("households"),
      reporterProfileId: v.id("userProfiles"),
      recipeId: v.id("recipeSuggestions"),
      sourceSurface: sourceSurfaceValidator,
      reason: reportReasonValidator,
      details: v.optional(v.string()),
      contentSnapshot: v.string(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const reports = await ctx.db
      .query("aiContentReports")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
      .take(normalizeLimit(args.limit));

    return reports.map((report) => ({
      _id: report._id,
      householdId: report.householdId,
      reporterProfileId: report.reporterProfileId,
      recipeId: report.recipeId,
      sourceSurface: report.sourceSurface,
      reason: report.reason,
      ...(report.details ? { details: report.details } : {}),
      contentSnapshot: report.contentSnapshot,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    }));
  },
});

export const resolveAiContentReport = internalMutation({
  args: {
    reportId: v.id("aiContentReports"),
    outcome: v.union(v.literal("reviewed"), v.literal("resolved")),
    resolutionNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId);
    if (!report) {
      throw new ConvexError("AI content report not found.");
    }

    const resolutionNote = args.resolutionNote?.trim();
    if (resolutionNote && resolutionNote.length > 1_000) {
      throw new ConvexError("Resolution note must be 1000 characters or fewer.");
    }

    const now = Date.now();
    await ctx.db.patch(args.reportId, {
      status: args.outcome,
      reviewedAt: now,
      updatedAt: now,
      resolutionNote,
    });
    return null;
  },
});
