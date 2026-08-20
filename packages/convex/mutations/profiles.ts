import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { ConvexError, v } from "convex/values";
import {
  buildThirdPartyDeletionHandoffs,
  DELETION_HANDOFF_RETENTION_MS,
} from "../lib/accountDeletion";

const ACCOUNT_DELETION_QUERY_LIMIT = 750;
const ACCOUNT_DELETION_WRITE_LIMIT = 6_000;

type DeletionBudget = { writes: number };

function reserveDeletionWrites(
  budget: DeletionBudget,
  count: number,
  label: string,
) {
  budget.writes += count;
  if (budget.writes > ACCOUNT_DELETION_WRITE_LIMIT) {
    throw new ConvexError(
      `This account has too much ${label} data for safe automatic deletion. Contact support@familyplate.co for assisted deletion.`,
    );
  }
}

async function takeForDeletion<T>(
  query: { take: (limit: number) => Promise<T[]> },
  label: string,
  budget: DeletionBudget,
) {
  const rows = await query.take(ACCOUNT_DELETION_QUERY_LIMIT + 1);
  if (rows.length > ACCOUNT_DELETION_QUERY_LIMIT) {
    throw new ConvexError(
      `This account has too much ${label} data for safe automatic deletion. Contact support@familyplate.co for assisted deletion.`,
    );
  }
  reserveDeletionWrites(budget, rows.length, label);
  return rows;
}

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
  returns: v.object({
    deleted: v.boolean(),
    thirdPartyCleanupQueued: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const authId = userId as string;
    const typedUserId = userId as Id<"users">;
    const user = await ctx.db.get(typedUserId);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();
    const deletionBudget: DeletionBudget = { writes: 0 };

    const handoffs = buildThirdPartyDeletionHandoffs({
      authId,
      revenueCatAppUserId: profile?.rcAppUserId,
      revenueCatOriginalAppUserId: profile?.rcOriginalAppUserId,
    });
    reserveDeletionWrites(
      deletionBudget,
      handoffs.length,
      "third-party cleanup",
    );

    if (profile) {
      const householdProfiles = await takeForDeletion(
        ctx.db
          .query("userProfiles")
          .withIndex("by_householdId", (q) =>
            q.eq("householdId", profile.householdId),
          ),
        "household profile",
        deletionBudget,
      );
      const otherAuthenticatedProfiles = householdProfiles.filter(
        (member) => member._id !== profile._id && member.authId.trim().length > 0,
      );

      if (otherAuthenticatedProfiles.length === 0) {
        const planReservations = await takeForDeletion(
          ctx.db
            .query("planGenerationReservations")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "plan-generation reservation",
          deletionBudget,
        );
        const agentConnections = await takeForDeletion(
          ctx.db
            .query("agentConnections")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "agent connection",
          deletionBudget,
        );
        const reports = await takeForDeletion(
          ctx.db
            .query("aiContentReports")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "AI content report",
          deletionBudget,
        );
        const savedRecipes = await takeForDeletion(
          ctx.db
            .query("savedRecipes")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "saved recipe",
          deletionBudget,
        );
        const recipes = await takeForDeletion(
          ctx.db
            .query("recipeSuggestions")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "recipe",
          deletionBudget,
        );
        const feedbackEntries = [];
        for (const recipe of recipes) {
          const recipeFeedback = await takeForDeletion(
            ctx.db
              .query("mealFeedback")
              .withIndex("by_recipeId", (q) => q.eq("recipeId", recipe._id)),
            "meal feedback",
            deletionBudget,
          );
          feedbackEntries.push(...recipeFeedback);
        }

        const mealPlans = await takeForDeletion(
          ctx.db
            .query("weeklyMealPlans")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "meal plan",
          deletionBudget,
        );
        const plannedMeals = [];
        for (const mealPlan of mealPlans) {
          const planMeals = await takeForDeletion(
            ctx.db
              .query("plannedMeals")
              .withIndex("by_mealPlanId", (q) =>
                q.eq("mealPlanId", mealPlan._id),
              ),
            "planned meal",
            deletionBudget,
          );
          plannedMeals.push(...planMeals);
        }

        const groceryLists = await takeForDeletion(
          ctx.db
            .query("groceryLists")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "grocery list",
          deletionBudget,
        );
        const pantryItems = await takeForDeletion(
          ctx.db
            .query("pantryItems")
            .withIndex("by_householdId", (q) =>
              q.eq("householdId", profile.householdId),
            ),
          "pantry item",
          deletionBudget,
        );
        reserveDeletionWrites(deletionBudget, 1, "household");

        for (const reservation of planReservations) {
          await ctx.db.delete(reservation._id);
        }
        for (const connection of agentConnections) {
          await ctx.db.delete(connection._id);
        }
        for (const report of reports) await ctx.db.delete(report._id);
        for (const savedRecipe of savedRecipes) {
          await ctx.db.delete(savedRecipe._id);
        }
        for (const entry of feedbackEntries) await ctx.db.delete(entry._id);
        for (const meal of plannedMeals) await ctx.db.delete(meal._id);
        for (const mealPlan of mealPlans) await ctx.db.delete(mealPlan._id);
        for (const groceryList of groceryLists) {
          await ctx.db.delete(groceryList._id);
        }
        for (const item of pantryItems) await ctx.db.delete(item._id);
        for (const recipe of recipes) await ctx.db.delete(recipe._id);
        for (const member of householdProfiles) await ctx.db.delete(member._id);
        await ctx.db.delete(profile.householdId);
      } else {
        const planReservations = await takeForDeletion(
          ctx.db
            .query("planGenerationReservations")
            .withIndex("by_authId", (q) => q.eq("authId", authId)),
          "plan-generation reservation",
          deletionBudget,
        );
        const agentConnections = await takeForDeletion(
          ctx.db
            .query("agentConnections")
            .withIndex("by_profileId", (q) => q.eq("profileId", profile._id)),
          "agent connection",
          deletionBudget,
        );
        const reports = await takeForDeletion(
          ctx.db
            .query("aiContentReports")
            .withIndex("by_reporterProfileId", (q) =>
              q.eq("reporterProfileId", profile._id),
            ),
          "AI content report",
          deletionBudget,
        );
        const savedRecipes = await takeForDeletion(
          ctx.db
            .query("savedRecipes")
            .withIndex("by_savedBy", (q) => q.eq("savedBy", profile._id)),
          "saved recipe",
          deletionBudget,
        );
        const feedback = await takeForDeletion(
          ctx.db
            .query("mealFeedback")
            .withIndex("by_oderId", (q) => q.eq("oderId", profile._id)),
          "meal feedback",
          deletionBudget,
        );
        const pantryItems = await takeForDeletion(
          ctx.db
            .query("pantryItems")
            .withIndex("by_addedBy", (q) => q.eq("addedBy", profile._id)),
          "pantry item",
          deletionBudget,
        );
        const createdRecipes = await takeForDeletion(
          ctx.db
            .query("recipeSuggestions")
            .withIndex("by_createdBy", (q) => q.eq("createdBy", profile._id)),
          "created recipe",
          deletionBudget,
        );

        const household = await ctx.db.get(profile.householdId);
        const otherAdmin = otherAuthenticatedProfiles.find(
          (member) => member.role === "admin",
        );
        const replacementAdmin = otherAdmin ?? otherAuthenticatedProfiles[0];
        const transfersHouseholdOwnership = household?.createdBy === authId;
        if (transfersHouseholdOwnership) {
          reserveDeletionWrites(deletionBudget, 1, "household ownership");
          await ctx.db.patch(profile.householdId, {
            createdBy: replacementAdmin.authId,
          });
        }
        if ((transfersHouseholdOwnership || profile.role === "admin") && !otherAdmin) {
          reserveDeletionWrites(deletionBudget, 1, "household admin transfer");
          await ctx.db.patch(replacementAdmin._id, { role: "admin" });
        }

        reserveDeletionWrites(deletionBudget, 1, "profile");
        for (const reservation of planReservations) {
          await ctx.db.delete(reservation._id);
        }
        for (const connection of agentConnections) {
          await ctx.db.delete(connection._id);
        }
        for (const report of reports) await ctx.db.delete(report._id);
        for (const savedRecipe of savedRecipes) {
          await ctx.db.delete(savedRecipe._id);
        }
        for (const entry of feedback) await ctx.db.delete(entry._id);
        for (const item of pantryItems) await ctx.db.delete(item._id);
        for (const recipe of createdRecipes) {
          await ctx.db.patch(recipe._id, { createdBy: undefined });
        }
        await ctx.db.delete(profile._id);
      }
    }

    const accounts = await takeForDeletion(
      ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) => q.eq("userId", typedUserId)),
      "authentication account",
      deletionBudget,
    );
    const verificationCodes = [];
    for (const account of accounts) {
      const accountCodes = await takeForDeletion(
        ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", account._id)),
        "authentication verification code",
        deletionBudget,
      );
      verificationCodes.push(...accountCodes);
    }

    const sessions = await takeForDeletion(
      ctx.db
        .query("authSessions")
        .withIndex("userId", (q) => q.eq("userId", typedUserId)),
      "authentication session",
      deletionBudget,
    );
    const refreshTokens = [];
    const verifiers = [];
    for (const session of sessions) {
      const sessionTokens = await takeForDeletion(
        ctx.db
          .query("authRefreshTokens")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id)),
        "authentication refresh token",
        deletionBudget,
      );
      const sessionVerifiers = await takeForDeletion(
        ctx.db
          .query("authVerifiers")
          .withIndex("sessionId", (q) => q.eq("sessionId", session._id)),
        "authentication verifier",
        deletionBudget,
      );
      refreshTokens.push(...sessionTokens);
      verifiers.push(...sessionVerifiers);
    }

    let rateLimit = null;
    if (user?.email) {
      rateLimit = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", user.email ?? ""))
        .first();
      if (rateLimit) {
        reserveDeletionWrites(deletionBudget, 1, "authentication rate limit");
      }
    }

    if (user) reserveDeletionWrites(deletionBudget, 1, "authentication user");

    const requestedAt = Date.now();
    for (const handoff of handoffs) {
      await ctx.db.insert("accountDeletionHandoffs", {
        ...handoff,
        status: "pending",
        requestedAt,
        retentionUntil: requestedAt + DELETION_HANDOFF_RETENTION_MS,
      });
    }

    for (const code of verificationCodes) await ctx.db.delete(code._id);
    for (const account of accounts) await ctx.db.delete(account._id);
    for (const token of refreshTokens) await ctx.db.delete(token._id);
    for (const verifier of verifiers) await ctx.db.delete(verifier._id);
    for (const session of sessions) await ctx.db.delete(session._id);
    if (rateLimit) await ctx.db.delete(rateLimit._id);
    if (user) {
      await ctx.db.delete(typedUserId);
    }

    return {
      deleted: true,
      thirdPartyCleanupQueued: handoffs.length,
    };
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
