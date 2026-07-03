import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";
import { resolveExpirationDate } from "../lib/pantryExpiration";

const EXPIRATION_BACKFILL_BATCH_SIZE = 50;

function requireNonEmptyString(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function validateQuantity(quantity: number) {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }
  return quantity;
}

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validateOptionalTimestamp(value?: number) {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isFinite(value)) {
    throw new Error("Expiration date is invalid.");
  }

  return value;
}

function getResolvedExpiration(args: {
  name: string;
  category: string;
  storageLocation: "pantry" | "fridge" | "freezer";
  expirationDate?: number;
  referenceTime?: number;
}) {
  return resolveExpirationDate({
    ...args,
    expirationDate: validateOptionalTimestamp(args.expirationDate),
  });
}

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

function inferCategory(name: string): string {
  const n = name.trim().toLowerCase();
  if (!n) return "Other";
  if (/frozen|ice cream|popsicle/.test(n)) return "Frozen";
  if (/chicken|beef|pork|turkey|bacon|sausage|ham|salmon|tuna|fish|shrimp|seafood|meat/.test(n)) return "Meat";
  if (/milk|cheese|yogurt|butter|cream|kefir/.test(n)) return "Dairy";
  if (/lettuce|spinach|kale|broccoli|cauliflower|carrot|celery|cucumber|zucchini|onion|garlic|potato|tomato|pepper|avocado|mushroom|cilantro|parsley|basil|ginger|lime|lemon|apple|banana|berry|melon|peach|fruit|vegetable|veggie/.test(n)) return "Produce";
  if (/egg|bread|bagel|roll|bun|tofu/.test(n)) return "Fresh";
  if (/rice|pasta|cereal|oats|flour|noodle|quinoa|tortilla|wrap|grain/.test(n)) return "Grains";
  if (/canned|soup|broth|stock|beans?|chickpea|lentil/.test(n)) return "Canned";
  if (/sauce|dressing|ketchup|mustard|mayo|oil|vinegar|syrup|spice|seasoning|salsa|jam|jelly|peanut butter/.test(n)) return "Condiments";
  if (/juice|soda|water|coffee|tea|drink|beverage/.test(n)) return "Beverages";
  if (/chip|cracker|cookie|pretzel|popcorn|candy|chocolate|snack/.test(n)) return "Snacks";
  return "Other";
}

export const bulkImportFromGenerator = mutation({
  args: {
    items: v.array(v.string()),
    allergies: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const profile = await getViewerProfile(ctx);

    const cleanItems = Array.from(
      new Set(
        args.items
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 80)
          .slice(0, 60)
      )
    );

    const now = Date.now();
    let inserted = 0;
    for (const name of cleanItems) {
      const category = inferCategory(name);
      const storageLocation = /frozen/i.test(name)
        ? "freezer"
        : /milk|cheese|yogurt|butter|cream|egg|fresh|deli|tofu/i.test(name)
          ? "fridge"
          : "pantry";
      const expiration = getResolvedExpiration({
        name,
        category,
        storageLocation,
        referenceTime: now,
      });

      await ctx.db.insert("pantryItems", {
        householdId: profile.householdId,
        name,
        quantity: 1,
        unit: "items",
        category,
        storageLocation,
        ...expiration,
        addedBy: profile._id,
        addedAt: now,
      });
      inserted++;
    }

    if (args.allergies && args.allergies.length > 0) {
      const cleanAllergies = Array.from(
        new Set([
          ...profile.allergies,
          ...args.allergies
            .map((a) => a.trim())
            .filter((a) => a.length > 0 && a.length <= 40)
            .slice(0, 20),
        ])
      );
      await ctx.db.patch(profile._id, { allergies: cleanAllergies });
    }

    return { inserted };
  },
});

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

    const name = requireNonEmptyString(args.name, "Name");
    const quantity = validateQuantity(args.quantity);
    const unit = requireNonEmptyString(args.unit, "Unit");
    const category = requireNonEmptyString(args.category, "Category");
    const barcode = normalizeOptionalString(args.barcode);
    const expiration = getResolvedExpiration({
      name,
      category,
      storageLocation: args.storageLocation,
      expirationDate: args.expirationDate,
    });

    return await ctx.db.insert("pantryItems", {
      householdId: args.householdId,
      name,
      quantity,
      unit,
      category,
      storageLocation: args.storageLocation,
      ...expiration,
      barcode,
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
      ...(args.name !== undefined
        ? { name: requireNonEmptyString(args.name, "Name") }
        : {}),
      ...(args.quantity !== undefined
        ? { quantity: validateQuantity(args.quantity) }
        : {}),
      ...(args.unit !== undefined
        ? { unit: requireNonEmptyString(args.unit, "Unit") }
        : {}),
      ...(args.category !== undefined
        ? { category: requireNonEmptyString(args.category, "Category") }
        : {}),
      ...(args.storageLocation !== undefined
        ? { storageLocation: args.storageLocation }
        : {}),
      ...(args.barcode !== undefined
        ? { barcode: normalizeOptionalString(args.barcode) }
        : {}),
    };

    if (args.expirationDate !== undefined) {
      const expirationDate = validateOptionalTimestamp(args.expirationDate);
      updatedItem.expirationDate = expirationDate;
      updatedItem.expirationDateSource =
        item.expirationDateSource === "estimated" &&
        item.expirationDate === expirationDate
          ? "estimated"
          : "manual";
    } else if (args.clearExpirationDate) {
      const expiration = getResolvedExpiration({
        name: updatedItem.name,
        category: updatedItem.category,
        storageLocation: updatedItem.storageLocation,
        referenceTime: item.addedAt,
      });
      updatedItem.expirationDate = expiration.expirationDate;
      updatedItem.expirationDateSource = expiration.expirationDateSource;
    } else if (
      !updatedItem.expirationDate ||
      (item.expirationDateSource === "estimated" &&
        (args.name !== undefined ||
          args.category !== undefined ||
          args.storageLocation !== undefined))
    ) {
      const expiration = getResolvedExpiration({
        name: updatedItem.name,
        category: updatedItem.category,
        storageLocation: updatedItem.storageLocation,
        referenceTime: item.addedAt,
      });
      updatedItem.expirationDate = expiration.expirationDate;
      updatedItem.expirationDateSource = expiration.expirationDateSource;
    }

    if (args.clearBarcode) {
      delete updatedItem.barcode;
    }

    await ctx.db.replace(args.itemId, updatedItem);
    return args.itemId;
  },
});

export const backfillMissingExpirationDates = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await getViewerProfile(ctx);
    const items = await ctx.db
      .query("pantryItems")
      .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
      .collect();

    let updated = 0;
    let hasMore = false;
    for (const item of items) {
      const hasExpirationDate = item.expirationDate !== undefined;
      const hasExpirationDateSource = item.expirationDateSource !== undefined;

      if (hasExpirationDate && hasExpirationDateSource) {
        continue;
      }

      if (updated >= EXPIRATION_BACKFILL_BATCH_SIZE) {
        hasMore = true;
        break;
      }

      if (hasExpirationDate && !hasExpirationDateSource) {
        await ctx.db.patch(item._id, { expirationDateSource: "manual" });
        updated++;
        continue;
      }

      const expiration = getResolvedExpiration({
        name: item.name,
        category: item.category,
        storageLocation: item.storageLocation,
      });
      await ctx.db.patch(item._id, expiration);
      updated++;
    }

    return { updated, hasMore };
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
