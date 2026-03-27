"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";

export const sendInviteEmail = action({
  args: {
    toEmail: v.string(),
    memberName: v.string(),
    inviterName: v.string(),
    householdName: v.string(),
    inviteCode: v.string(),
    appUrl: v.string(),
  },
  handler: async (_ctx, args): Promise<{ success: boolean; error?: string }> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("RESEND_API_KEY not configured");
      return { success: false, error: "Email not configured" };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "FamilyPlate <noreply@updates.noahthies.com>",
          to: [args.toEmail],
          subject: `${args.inviterName} invited you to join ${args.householdName} on FamilyPlate`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1a9d5c; font-size: 24px; margin: 0;">🍽️ FamilyPlate</h1>
              </div>
              
              <h2 style="font-size: 20px; color: #111; margin-bottom: 8px;">
                You've been invited!
              </h2>
              
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                <strong>${args.inviterName}</strong> added you to the <strong>${args.householdName}</strong> household on FamilyPlate — a smart family dinner planner.
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                Your profile name: <strong>${args.memberName}</strong>
              </p>
              
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                <p style="color: #555; font-size: 14px; margin: 0 0 8px 0;">Your invite code:</p>
                <p style="color: #1a9d5c; font-size: 28px; font-weight: 700; letter-spacing: 2px; margin: 0;">
                  ${args.inviteCode}
                </p>
              </div>
              
              <div style="text-align: center; margin: 24px 0;">
                <a href="${args.appUrl}" style="display: inline-block; background: #1a9d5c; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Open FamilyPlate
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
