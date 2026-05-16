import posthog from "posthog-js";

export type AnalyticsEvent =
  | "auth_started"
  | "auth_failed"
  | "cta_clicked"
  | "checkout_clicked"
  | "paywall_viewed"
  | "plan_shared"
  | "generator_started"
  | "generator_completed"
  | "generator_failed"
  | "magic_link_sent"
  | "password_reset_requested"
  | "user_signed_in"
  | "user_signed_up"
  | "pantry_item_added"
  | "pantry_item_updated"
  | "pantry_item_update_failed"
  | "pantry_item_deleted"
  | "pantry_item_add_failed"
  | "grocery_item_added"
  | "grocery_item_checked"
  | "grocery_item_removed"
  | "grocery_list_generated"
  | "grocery_list_generation_failed"
  | "recipe_saved"
  | "recipe_unsaved"
  | "missing_ingredients_added_to_grocery"
  | "meal_status_updated"
  | "feedback_submitted"
  | "feedback_deleted"
  | "meal_plan_generated"
  | "meal_plan_generation_started"
  | "meal_plan_generation_failed"
  | "dinner_suggestions_started"
  | "dinner_suggestions_completed"
  | "dinner_suggestions_failed"
  | "camera_scan_started"
  | "camera_scan_completed"
  | "camera_scan_failed"
  | "barcode_scan_started"
  | "barcode_scan_completed"
  | "barcode_scan_failed"
  | "ai_consent_accepted";

type EventPayload = Record<string, string | number | boolean | undefined>;

export function track(event: AnalyticsEvent, payload?: EventPayload) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, {
      ...payload,
      app: "familyplate",
      platform: "web",
    } as Record<string, unknown>);
  } catch {
    // ignore — never let analytics break the user flow
  }
}
