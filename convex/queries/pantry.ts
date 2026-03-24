import { query } from "../_generated/server";
import { v } from "convex/values";

export const getPantryItems = query({
  args: {
    householdId: v.id("households"),
    storageLocation: v.optional(
      v.union(
        v.literal("pantry"),
        v.literal("fridge"),
        v.literal("freezer")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.storageLocation) {
      return await ctx.db
        .query("pantryItems")
        .withIndex("by_householdId_storageLocation", (q) =>
          q
            .eq("householdId", args.householdId)
            .eq("storageLocation", args.storageLocation!)
        )
        .collect();
    }

    return await ctx.db
      .query("pantryItems")
      .withIndex("by_householdId", (q) =>
        q.eq("householdId", args.householdId)
      )
      .collect();
  },
});
