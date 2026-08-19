import { ConvexError, v } from "convex/values";
import { mutation } from "../_generated/server";
import { getViewerProfile } from "../lib/agentConnections";
import {
  buildAiContentSnapshot,
  normalizeAiReportDetails,
} from "../lib/aiContentReports";

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

export const submitAiContentReport = mutation({
  args: {
    recipeId: v.id("recipeSuggestions"),
    sourceSurface: sourceSurfaceValidator,
    reason: reportReasonValidator,
    details: v.optional(v.string()),
  },
  returns: v.object({
    reportId: v.id("aiContentReports"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const reporter = await getViewerProfile(ctx);
    if (!reporter) {
      throw new ConvexError("Must be signed in to report a suggestion.");
    }

    const recipe = await ctx.db.get(args.recipeId);
    if (
      !recipe ||
      recipe.householdId !== reporter.householdId ||
      recipe.source !== "ai"
    ) {
      throw new ConvexError("AI suggestion not found.");
    }

    let details: string | undefined;
    try {
      details = normalizeAiReportDetails(args.details);
    } catch (error) {
      throw new ConvexError(
        error instanceof Error ? error.message : "Report details are invalid.",
      );
    }

    const contentSnapshot = buildAiContentSnapshot(recipe);
    const now = Date.now();
    const existing = await ctx.db
      .query("aiContentReports")
      .withIndex("by_reporterProfileId_and_recipeId", (q) =>
        q
          .eq("reporterProfileId", reporter._id)
          .eq("recipeId", recipe._id),
      )
      .order("desc")
      .first();

    if (existing?.status === "pending") {
      await ctx.db.patch(existing._id, {
        sourceSurface: args.sourceSurface,
        reason: args.reason,
        details,
        contentSnapshot,
        updatedAt: now,
      });
      return { reportId: existing._id, created: false };
    }

    const reportId = await ctx.db.insert("aiContentReports", {
      householdId: reporter.householdId,
      reporterProfileId: reporter._id,
      recipeId: recipe._id,
      sourceSurface: args.sourceSurface,
      reason: args.reason,
      details,
      contentSnapshot,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return { reportId, created: true };
  },
});
