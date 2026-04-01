import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const getInviteEmailContext = internalQuery({
  args: {
    authId: v.string(),
    householdId: v.id("households"),
    toEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await ctx.db
      .query("userProfiles")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .first();

    if (!viewer || viewer.householdId !== args.householdId) {
      throw new Error("You do not have access to that household.");
    }

    if (viewer.role !== "admin") {
      throw new Error("Only household admins can send invite emails.");
    }

    const household = await ctx.db.get(args.householdId);
    if (!household) {
      throw new Error("Household not found.");
    }

    const invitedProfile = (
      await ctx.db
        .query("userProfiles")
        .withIndex("by_householdId", (q) => q.eq("householdId", args.householdId))
        .collect()
    ).find(
      (profile) =>
        profile.authId === "" &&
        normalizeEmail(profile.email) === normalizeEmail(args.toEmail)
    );

    if (!invitedProfile) {
      throw new Error("Invite email must match a pending household member.");
    }

    return {
      householdName: household.name,
      inviteCode: household.inviteCode,
      inviterName: viewer.name,
    };
  },
});
