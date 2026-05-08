import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

function requireNonEmptyString(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }
  return trimmed;
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validatePositiveNumber(
  value: number,
  fieldName: string,
  { allowZero = false }: { allowZero?: boolean } = {}
) {
  if (!Number.isFinite(value) || (!allowZero && value <= 0) || (allowZero && value < 0)) {
    throw new Error(`${fieldName} must be greater than ${allowZero ? "or equal to " : ""}zero.`);
  }
  return value;
}

function normalizeStringList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

async function getViewerProfile(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_authId", (q) => q.eq("authId", userId as string))
    .first();

  if (!profile) {
    throw new Error("Profile not found");
  }

  return profile;
}

function assertHouseholdAdmin(
  viewer: {
    householdId: unknown;
    role: "admin" | "member";
  },
  householdId: unknown
) {
  if (viewer.householdId !== householdId) {
    throw new Error("Not a member of this household");
  }

  if (viewer.role !== "admin") {
    throw new Error("Only household admins can manage members");
  }
}

export const updateProfile = mutation({
  args: {
    profileId: v.id("userProfiles"),
    name: v.optional(v.string()),
    age: v.optional(v.number()),
    weight: v.optional(v.number()),
    activityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("moderate"),
        v.literal("active")
      )
    ),
    dietaryPreferences: v.optional(v.array(v.string())),
    allergies: v.optional(v.array(v.string())),
    dislikes: v.optional(v.array(v.string())),
    goals: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewerProfile(ctx);
    const { profileId, ...updates } = args;
    const targetProfile = await ctx.db.get(profileId);
    if (!targetProfile) {
      throw new Error("Profile not found");
    }

    if (targetProfile._id !== viewer._id) {
      throw new Error("You can only update your own profile");
    }

    const cleanUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) {
      cleanUpdates.name = requireNonEmptyString(updates.name, "Name");
    }
    if (updates.age !== undefined) {
      cleanUpdates.age = validatePositiveNumber(updates.age, "Age");
    }
    if (updates.weight !== undefined) {
      cleanUpdates.weight = validatePositiveNumber(updates.weight, "Weight");
    }
    if (updates.activityLevel !== undefined) {
      cleanUpdates.activityLevel = updates.activityLevel;
    }
    if (updates.dietaryPreferences !== undefined) {
      cleanUpdates.dietaryPreferences = normalizeStringList(updates.dietaryPreferences);
    }
    if (updates.allergies !== undefined) {
      cleanUpdates.allergies = normalizeStringList(updates.allergies);
    }
    if (updates.dislikes !== undefined) {
      cleanUpdates.dislikes = normalizeStringList(updates.dislikes);
    }
    if (updates.goals !== undefined) {
      cleanUpdates.goals = normalizeOptionalString(updates.goals);
    }

    await ctx.db.patch(profileId, cleanUpdates);
    return profileId;
  },
});

export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const authId = userId as string;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();

    if (profile) {
      const householdProfiles = await ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
        .collect();
      const otherAuthenticatedProfiles = householdProfiles.filter(
        (member) => member._id !== profile._id && member.authId
      );

      if (otherAuthenticatedProfiles.length === 0) {
        const savedRecipes = await ctx.db
          .query("savedRecipes")
          .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
          .collect();
        for (const savedRecipe of savedRecipes) {
          await ctx.db.delete(savedRecipe._id);
        }

        const recipes = await ctx.db
          .query("recipeSuggestions")
          .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
          .collect();
        for (const recipe of recipes) {
          const feedback = await ctx.db
            .query("mealFeedback")
            .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id))
            .collect();
          for (const entry of feedback) {
            await ctx.db.delete(entry._id);
          }
        }

        const mealPlans = await ctx.db
          .query("weeklyMealPlans")
          .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
          .collect();
        for (const mealPlan of mealPlans) {
          const plannedMeals = await ctx.db
            .query("plannedMeals")
            .withIndex("by_mealPlanId", (q) => q.eq("mealPlanId", mealPlan._id))
            .collect();
          for (const meal of plannedMeals) {
            await ctx.db.delete(meal._id);
          }
          await ctx.db.delete(mealPlan._id);
        }

        const groceryLists = await ctx.db
          .query("groceryLists")
          .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
          .collect();
        for (const groceryList of groceryLists) {
          await ctx.db.delete(groceryList._id);
        }

        const pantryItems = await ctx.db
          .query("pantryItems")
          .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
          .collect();
        for (const item of pantryItems) {
          await ctx.db.delete(item._id);
        }

        for (const recipe of recipes) {
          await ctx.db.delete(recipe._id);
        }

        for (const member of householdProfiles) {
          await ctx.db.delete(member._id);
        }

        await ctx.db.delete(profile.householdId);
      } else {
        const savedRecipes = await ctx.db
          .query("savedRecipes")
          .withIndex("by_savedBy", (q) => q.eq("savedBy", profile._id))
          .collect();
        for (const savedRecipe of savedRecipes) {
          await ctx.db.delete(savedRecipe._id);
        }

        const feedback = await ctx.db
          .query("mealFeedback")
          .withIndex("by_oderId", (q) => q.eq("oderId", profile._id))
          .collect();
        for (const entry of feedback) {
          await ctx.db.delete(entry._id);
        }

        const household = await ctx.db.get(profile.householdId);
        if (household?.createdBy === authId) {
          await ctx.db.patch(profile.householdId, {
            createdBy: otherAuthenticatedProfiles[0].authId,
          });
        }

        const pantryItems = await ctx.db
          .query("pantryItems")
          .withIndex("by_householdId", (q) => q.eq("householdId", profile.householdId))
          .collect();
        for (const item of pantryItems) {
          if (item.addedBy === profile._id) {
            await ctx.db.delete(item._id);
          }
        }

        await ctx.db.delete(profile._id);
      }
    }

    const typedUserId = userId as Id<"users">;
    const user = await ctx.db.get(typedUserId);
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", typedUserId))
      .collect();

    for (const account of accounts) {
      const verificationCodes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of verificationCodes) {
        await ctx.db.delete(code._id);
      }
      await ctx.db.delete(account._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", typedUserId))
      .collect();
    const verifiers = await ctx.db.query("authVerifiers").collect();
    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }
      for (const verifier of verifiers) {
        if (verifier.sessionId === session._id) {
          await ctx.db.delete(verifier._id);
        }
      }
      await ctx.db.delete(session._id);
    }

    if (user?.email) {
      const rateLimit = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", user.email ?? ""))
        .first();
      if (rateLimit) {
        await ctx.db.delete(rateLimit._id);
      }
    }

    if (user) {
      await ctx.db.delete(typedUserId);
    }

    return { deleted: true };
  },
});

export const addFamilyMember = mutation({
  args: {
    householdId: v.id("households"),
    name: v.string(),
    email: v.optional(v.string()),
    isChild: v.boolean(),
    age: v.optional(v.number()),
    dietaryPreferences: v.array(v.string()),
    allergies: v.array(v.string()),
    dislikes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewerProfile(ctx);
    assertHouseholdAdmin(viewer, args.householdId);

    const name = requireNonEmptyString(args.name, "Name");
    const normalizedEmail = normalizeEmail(args.email);
    const dietaryPreferences = normalizeStringList(args.dietaryPreferences);
    const allergies = normalizeStringList(args.allergies);
    const dislikes = normalizeStringList(args.dislikes);
    const age =
      args.age !== undefined
        ? validatePositiveNumber(args.age, "Age")
        : undefined;

    if (args.isChild && normalizedEmail) {
      throw new Error("Child profiles cannot have an invite email.");
    }

    if (normalizedEmail) {
      const householdProfiles = await ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .collect();

      const existingProfile = householdProfiles.find(
        (profile) => normalizeEmail(profile.email) === normalizedEmail
      );

      if (existingProfile) {
        if (existingProfile.authId) {
          throw new Error("A household member with that email already exists.");
        }

        const existingProfileUpdates: {
          name: string;
          email: string;
          isChild: boolean;
          dietaryPreferences: string[];
          allergies: string[];
          dislikes: string[];
          age?: number;
        } = {
          name,
          email: normalizedEmail,
          isChild: args.isChild,
          dietaryPreferences,
          allergies,
          dislikes,
        };

        if (age !== undefined) {
          existingProfileUpdates.age = age;
        }

        await ctx.db.patch(existingProfile._id, existingProfileUpdates);

        return existingProfile._id;
      }
    }

    const profileId = await ctx.db.insert("userProfiles", {
      authId: "", // managed profile, no auth
      householdId: args.householdId,
      name,
      email: normalizedEmail,
      role: "member",
      isChild: args.isChild,
      age,
      dietaryPreferences,
      allergies,
      dislikes,
      createdAt: Date.now(),
    });

    return profileId;
  },
});
