import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";

async function getViewerProfile(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const authId = userId as string;
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .first();

  if (!profile) throw new Error("No profile found");
  return profile;
}

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
    const profile = await getViewerProfile(ctx);

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
    clearExpirationDate: v.optional(v.boolean()),
    barcode: v.optional(v.string()),
    clearBarcode: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.householdId !== profile.householdId) {
      throw new Error("Item does not belong to your household");
    }

    const updatedItem: typeof item = {
      ...item,
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.quantity !== undefined ? { quantity: args.quantity } : {}),
      ...(args.unit !== undefined ? { unit: args.unit } : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(args.storageLocation !== undefined
        ? { storageLocation: args.storageLocation }
        : {}),
      ...(args.barcode !== undefined ? { barcode: args.barcode } : {}),
    };

    if (args.expirationDate !== undefined) {
      updatedItem.expirationDate = args.expirationDate;
    } else if (args.clearExpirationDate) {
      delete updatedItem.expirationDate;
    }

    if (args.clearBarcode) {
      delete updatedItem.barcode;
    }

    await ctx.db.replace(args.itemId, updatedItem);
    return args.itemId;
  },
});

export const deleteItem = mutation({
  args: {
    itemId: v.id("pantryItems"),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Item not found");
    if (item.householdId !== profile.householdId) {
      throw new Error("Item does not belong to your household");
    }

    await ctx.db.delete(args.itemId);
  },
});
