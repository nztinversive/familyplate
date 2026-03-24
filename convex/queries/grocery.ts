import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";

export const getMyGroceryList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) return null;

    const householdId = profile.householdId;
    const lists = await ctx.db
      .query("groceryLists")
      .withIndex("by_householdId", (q) => q.eq("householdId", householdId))
      .collect();

    return lists.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});
