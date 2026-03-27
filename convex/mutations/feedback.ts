import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const submitFeedback = mutation({
  args: {
    recipeId: v.id("recipeSuggestions"),
    rating: v.number(),
    liked: v.boolean(),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) throw new Error("Profile not found.");

    const recipe = await ctx.db.get(args.recipeId);
    if (!recipe || recipe.householdId !== profile.householdId) {
      throw new Error("Recipe not found.");
    }

    // Check if feedback already exists
    const existing = await ctx.db
      .query("mealFeedback")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    const myFeedback = existing.find((f) => f.oderId === profile._id);

    if (myFeedback) {
      await ctx.db.patch(myFeedback._id, {
        rating: args.rating,
        liked: args.liked,
        tags: args.tags,
        notes: args.notes,
      });
      return myFeedback._id;
    }

    return await ctx.db.insert("mealFeedback", {
      recipeId: args.recipeId,
      oderId: profile._id,
      rating: args.rating,
      liked: args.liked,
      tags: args.tags,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const deleteFeedback = mutation({
  args: {
    feedbackId: v.id("mealFeedback"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", userId as string))
      .first();
    if (!profile) throw new Error("Profile not found.");

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback || feedback.oderId !== profile._id) {
      throw new Error("Feedback not found or not yours.");
    }

    await ctx.db.delete(args.feedbackId);
  },
});
