"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal as api } from "../_generated/api";
import { action } from "../_generated/server";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export const sendInviteEmail = action({
  args: {
    toEmail: v.string(),
    memberName: v.string(),
    householdId: v.id("households"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email not configured" };
    }

    const appUrl = process.env.APP_URL?.trim();
    if (!appUrl) {
      console.error("APP_URL not configured");
      return { success: false, error: "Invite URL not configured" };
    }

    const toEmail = normalizeEmail(args.toEmail);
    const inviteContext = await ctx.runQuery(
      api.internal.invites.getInviteEmailContext,
      {
        authId: userId as string,
        householdId: args.householdId,
        toEmail,
      }
    );

    const inviteUrl = `${appUrl.replace(/\/$/, "")}/join/${inviteContext.inviteCode}`;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "FamilyPlate <noreply@updates.noahthies.com>",
          to: [toEmail],
          subject: `${inviteContext.inviterName} invited you to join ${inviteContext.householdName} on FamilyPlate`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
              <h1 style="color: #1a9d5c; font-size: 24px; margin: 0 0 24px;">FamilyPlate</h1>
              <h2 style="font-size: 20px; color: #111; margin-bottom: 8px;">You've been invited</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                <strong>${inviteContext.inviterName}</strong> added you to the <strong>${inviteContext.householdName}</strong> household on FamilyPlate.
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                Your profile name: <strong>${args.memberName}</strong>
              </p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="color: #555; font-size: 14px; margin: 0 0 8px;">Your invite code:</p>
                <p style="color: #1a9d5c; font-size: 28px; font-weight: 700; letter-spacing: 2px; margin: 0;">
                  ${inviteContext.inviteCode}
                </p>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: #1a9d5c; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Join Household
                </a>
              </div>
              <p style="color: #999; font-size: 13px; text-align: center; margin-top: 32px;">
                Use the invite code when you sign up to join the household.
              </p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resend error:", errorText);
        return { success: false, error: "Failed to send email" };
      }

      return { success: true };
    } catch (err) {
      console.error("Email send failed:", err);
      return { success: false, error: "Failed to send email" };
    }
  },
});
