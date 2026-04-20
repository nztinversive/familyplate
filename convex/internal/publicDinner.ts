import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";

export const PER_IP_DAILY_LIMIT = 5;
export const GLOBAL_DAILY_LIMIT = 500;

function utcDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export const checkAndLogGeneration = internalMutation({
  args: {
    ipHash: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dayKey = utcDayKey(now);

    const ipDayCount = await ctx.db
      .query("publicGenerationLog")
      .withIndex("by_dayKey_ipHash", (q) =>
        q.eq("dayKey", dayKey).eq("ipHash", args.ipHash)
      )
      .collect();

    if (ipDayCount.length >= PER_IP_DAILY_LIMIT) {
      throw new ConvexError(
        `Daily limit reached (${PER_IP_DAILY_LIMIT} generations per day). Sign up to keep planning.`
      );
    }

    const globalDayCount = await ctx.db
      .query("publicGenerationLog")
      .withIndex("by_dayKey", (q) => q.eq("dayKey", dayKey))
      .collect();

    if (globalDayCount.length >= GLOBAL_DAILY_LIMIT) {
      throw new ConvexError(
        "Our free tool is at capacity for today. Please sign up for unlimited access."
      );
    }

    await ctx.db.insert("publicGenerationLog", {
      dayKey,
      ipHash: args.ipHash,
      createdAt: now,
    });
  },
});

const ingredientValidator = v.object({
  name: v.string(),
  quantity: v.number(),
  unit: v.string(),
  inPantry: v.boolean(),
});

const suggestionValidator = v.object({
  name: v.string(),
  description: v.string(),
  effortLevel: v.union(
    v.literal("easy"),
    v.literal("medium"),
    v.literal("hard")
  ),
  estimatedTime: v.number(),
  servings: v.number(),
  ingredients: v.array(ingredientValidator),
  instructions: v.array(v.string()),
  missingItems: v.array(v.string()),
});

export const savePlan = internalMutation({
  args: {
    pantryText: v.string(),
    allergies: v.array(v.string()),
    craving: v.optional(v.string()),
    suggestions: v.array(suggestionValidator),
    sourcePage: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("publicPlans", {
      pantryText: args.pantryText,
      allergies: args.allergies,
      craving: args.craving,
      suggestions: args.suggestions,
      sourcePage: args.sourcePage,
      ipHash: args.ipHash,
      createdAt: Date.now(),
    });
    return id;
  },
});
