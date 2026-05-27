import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "../_generated/server";

function normalizeStringList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && value.length <= 80)
    )
  );
}

function inferLearnedDislikes(args: {
  liked: boolean;
  tags: string[];
  recipeTitle: string;
}) {
  const tags = new Set(args.tags.map((tag) => tag.trim().toLowerCase()));
  const learned: string[] = [];

  if (!args.liked || tags.has("not again")) {
    learned.push(args.recipeTitle);
  }

  if (tags.has("kid disliked it")) {
    learned.push(`${args.recipeTitle} for kids`);
  }

  if (tags.has("too spicy")) {
    learned.push("spicy meals");
  }

  if (tags.has("too hard") || tags.has("too much prep")) {
    learned.push("hard dinners");
  }

  return normalizeStringList(learned);
}

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

    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be a whole number between 1 and 5.");
    }

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
    } else {
      await ctx.db.insert("mealFeedback", {
        recipeId: args.recipeId,
        oderId: profile._id,
        rating: args.rating,
        liked: args.liked,
        tags: args.tags,
        notes: args.notes,
        createdAt: Date.now(),
      });
    }

    const learnedDislikes = inferLearnedDislikes({
      liked: args.liked,
      tags: args.tags,
      recipeTitle: recipe.title,
    });

    if (learnedDislikes.length > 0) {
      const nextDislikes = normalizeStringList([
        ...profile.dislikes,
        ...learnedDislikes,
      ]);
      if (nextDislikes.length !== profile.dislikes.length) {
        await ctx.db.patch(profile._id, { dislikes: nextDislikes });
      }
    }

    const updated = await ctx.db
      .query("mealFeedback")
      .withIndex("by_recipeId", (q) => q.eq("recipeId", args.recipeId))
      .collect();

    return updated.find((f) => f.oderId === profile._id)?._id;
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
