import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
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
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
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
    if (viewer.householdId !== args.householdId) {
      throw new Error("Not a member of this household");
    }

    const normalizedEmail = normalizeEmail(args.email);
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
          name: args.name,
          email: normalizedEmail,
          isChild: args.isChild,
          dietaryPreferences: args.dietaryPreferences,
          allergies: args.allergies,
          dislikes: args.dislikes,
        };

        if (args.age !== undefined) {
          existingProfileUpdates.age = args.age;
        }

        await ctx.db.patch(existingProfile._id, existingProfileUpdates);

        return existingProfile._id;
      }
    }

    const profileId = await ctx.db.insert("userProfiles", {
      authId: "", // managed profile, no auth
      householdId: args.householdId,
      name: args.name,
      email: normalizedEmail,
      role: "member",
      isChild: args.isChild,
      age: args.age,
      dietaryPreferences: args.dietaryPreferences,
      allergies: args.allergies,
      dislikes: args.dislikes,
      createdAt: Date.now(),
    });

    return profileId;
  },
});
