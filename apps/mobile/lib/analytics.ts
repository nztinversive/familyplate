import type { PostHog } from "posthog-react-native";

export type AnalyticsEvent =
  | "user_signed_in"
  | "user_signed_up"
  | "pantry_item_added"
  | "grocery_item_added"
  | "recipe_saved"
  | "meal_plan_generated"
  | "camera_scan_started"
  | "camera_scan_completed"
  | "barcode_scan_completed"
  | "ai_consent_accepted";

type EventPayload = Record<string, string | number | boolean | undefined>;

export function track(
  posthog: PostHog | undefined,
  event: AnalyticsEvent,
  payload?: EventPayload,
) {
  try {
    posthog?.capture(event, {
      ...payload,
      app: "familyplate",
      platform: "ios",
    });
  } catch {
    // Analytics should never block a meal-planning flow.
  }
}
