import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "../_generated/server";
import { v } from "convex/values";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

async function generateUniqueInviteCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const inviteCode = generateInviteCode();
    const existing = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
      .first();

    if (!existing) {
      return inviteCode;
    }
  }

  throw new Error("Unable to create a unique invite code right now.");
}

export const createHousehold = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const authId = userId as string;
    const user = await ctx.db.get(userId);
    const email = user?.email ?? "";
    const userName = user?.name || email.split("@")[0] || "User";

    // Check if user already has a profile/household
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();

    if (existing) {
      throw new Error("You already belong to a household");
    }

    const inviteCode = await generateUniqueInviteCode(ctx);

    const householdId = await ctx.db.insert("households", {
      name: args.name,
      createdBy: authId,
      inviteCode,
      createdAt: Date.now(),
    });

    await ctx.db.insert("userProfiles", {
      authId,
      householdId,
      name: userName,
      email,
      role: "admin",
      isChild: false,
      dietaryPreferences: [],
      allergies: [],
      dislikes: [],
      createdAt: Date.now(),
    });

    return { householdId, inviteCode };
  },
});

export const joinHousehold = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    const authId = userId as string;
    const user = await ctx.db.get(userId);
    const email = user?.email ?? "";
    const normalizedEmail = normalizeEmail(email);
    const userName = user?.name || email.split("@")[0] || "User";

    const household = await ctx.db
      .query("households")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!household) {
      throw new Error("Invalid invite code");
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", authId))
      .first();

    if (existing) {
      throw new Error("You already belong to a household");
    }

    const householdProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_householdId", (q) => q.eq("householdId", household._id))
      .collect();

    const invitedPlaceholder = normalizedEmail
      ? householdProfiles.find(
          (profile) =>
            !profile.authId &&
            normalizeEmail(profile.email) === normalizedEmail
        )
      : null;

    if (invitedPlaceholder) {
      await ctx.db.patch(invitedPlaceholder._id, {
        authId,
        email,
        name: userName,
        isChild: false,
      });
      return { householdId: household._id };
    }

    const matchingMember = normalizedEmail
      ? householdProfiles.find(
          (profile) => normalizeEmail(profile.email) === normalizedEmail
        )
      : null;

    if (matchingMember) {
      throw new Error("A household member with that email already exists.");
    }

    await ctx.db.insert("userProfiles", {
      authId,
      householdId: household._id,
      name: userName,
      email,
      role: "member",
      isChild: false,
      dietaryPreferences: [],
      allergies: [],
      dislikes: [],
      createdAt: Date.now(),
    });

    return { householdId: household._id };
  },
});
