import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const addItem = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
    storageLocation: v.union(
      v.literal("pantry"),
      v.literal("fridge"),
      v.literal("freezer")
    ),
    expirationDate: v.optional(v.number()),
    barcode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get the user's profile to use as addedBy
    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    if (!profile) throw new Error("No profile found");

    // Verify user belongs to this household
    if (profile.householdId !== args.householdId) {
      throw new Error("Not a member of this household");
    }

    return await ctx.db.insert("pantryItems", {
      householdId: args.householdId,
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      category: args.category,
      storageLocation: args.storageLocation,
      expirationDate: args.expirationDate,
      barcode: args.barcode,
      addedBy: profile._id,
      addedAt: Date.now(),
    });
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("pantryItems"),
    name: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    category: v.optional(v.string()),
    storageLocation: v.optional(
      v.union(
        v.literal("pantry"),
        v.literal("fridge"),
        v.literal("freezer")
      )
    ),
    expirationDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    const { itemId, ...updates } = args;
    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) cleanUpdates[key] = value;
    }

    await ctx.db.patch(args.itemId, cleanUpdates);
    return args.itemId;
  },
});

export const deleteItem = mutation({
  args: {
    itemId: v.id("pantryItems"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");

    await ctx.db.delete(args.itemId);
  },
});
