import { v } from "convex/values";
import { query } from "../_generated/server";

export const getPlan = query({
  args: {
    id: v.id("publicPlans"),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.id);
    if (!plan) return null;
    return {
      _id: plan._id,
      pantryText: plan.pantryText,
      allergies: plan.allergies,
      craving: plan.craving,
      suggestions: plan.suggestions,
      sourcePage: plan.sourcePage,
      createdAt: plan.createdAt,
    };
  },
});
