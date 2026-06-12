import type { PostHog } from "posthog-react-native";
import * as Application from "expo-application";

export type AnalyticsEvent =
  | "auth_started"
  | "auth_failed"
  | "checkout_clicked"
  | "paywall_viewed"
  | "subscription_products_loaded"
  | "subscription_products_failed"
  | "purchase_started"
  | "purchase_completed"
  | "purchase_cancelled"
  | "purchase_failed"
  | "purchase_restore_started"
  | "purchase_restored"
  | "purchase_restore_failed"
  | "subscription_manage_opened"
  | "magic_link_sent"
  | "password_reset_requested"
  | "household_invite_shared"
  | "user_signed_in"
  | "user_signed_up"
  | "onboarding_completed"
  | "onboarding_failed"
  | "eater_profile_added"
  | "pantry_item_added"
  | "pantry_item_updated"
  | "pantry_item_update_failed"
  | "pantry_item_deleted"
  | "pantry_item_add_failed"
  | "grocery_item_added"
  | "grocery_item_checked"
  | "grocery_item_removed"
  | "grocery_items_moved_to_pantry"
  | "grocery_list_generated"
  | "grocery_list_generation_failed"
  | "grocery_list_shared"
  | "grocery_store_mode_started"
  | "grocery_store_mode_finished"
  | "recipe_saved"
  | "custom_recipe_created"
  | "recipe_added_to_plan"
  | "recipe_shared"
  | "recipe_unsaved"
  | "missing_ingredients_added_to_grocery"
  | "meal_status_updated"
  | "plan_adjustment_started"
  | "meal_swapped"
  | "plan_regenerated"
  | "grocery_items_added_from_plan"
  | "preference_saved_from_feedback"
  | "cook_mode_started"
  | "cook_step_viewed"
  | "recipe_cooked"
  | "recipe_feedback_saved"
  | "leftovers_saved"
  | "preference_learned_from_feedback"
  | "feedback_submitted"
  | "feedback_deleted"
  | "meal_plan_generated"
  | "meal_plan_generation_started"
  | "meal_plan_generation_failed"
  | "paywall_cta_tapped"
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
      app_version: Application.nativeApplicationVersion ?? "development",
      app_build: Application.nativeBuildVersion ?? "development",
      app_env: process.env.EXPO_PUBLIC_APP_ENV ?? "development",
    });
  } catch {
    // Analytics should never block a meal-planning flow.
  }
}
