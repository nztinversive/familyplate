import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
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
