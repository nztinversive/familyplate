# FamilyPlate monitoring playbook

FamilyPlate uses Sentry for exceptions and PostHog for product analytics on both web and iOS. The code already includes the main events below; dashboards and alert rules should be created in the vendor dashboards with account-level access.

## PostHog dashboards

Create one shared FamilyPlate dashboard with these tiles.

### Activation funnel

1. `user_signed_up`
2. `pantry_item_added`
3. `meal_plan_generation_started`
4. `meal_plan_generated`
5. `grocery_list_generated`

Break down by `platform` and filter to `app = familyplate`.

### AI reliability

Track event counts and failure rate for:

- `meal_plan_generation_started`
- `meal_plan_generated`
- `meal_plan_generation_failed`
- `dinner_suggestions_started`
- `dinner_suggestions_completed`
- `dinner_suggestions_failed`
- `camera_scan_started`
- `camera_scan_completed`
- `camera_scan_failed`

Break down by `platform`, `source`, and `reason` where available.

### Subscription intent

Track:

- `paywall_viewed`
- `checkout_clicked`

Break down by `platform`, `location`, `plan`, and `source`.

### Retention workflow usage

Track:

- `recipe_saved`
- `recipe_unsaved`
- `missing_ingredients_added_to_grocery`
- `grocery_item_added`
- `grocery_item_checked`
- `grocery_item_removed`
- `feedback_submitted`

Break down by `platform` and `source`.

## Sentry alerts

Create alert rules for web and iOS projects.

### Critical user-flow failures

Trigger when any of these exception fingerprints or tags appear more than 3 times in 10 minutes:

- auth failure exceptions
- `meal_plan_generation_failed`
- `dinner_suggestions_failed`
- `camera_scan_failed`
- `barcode_scan_failed`
- `grocery_list_generation_failed`

Route to email for now. Slack can be added later when there is a team channel.

### Release regression

Trigger when new issues appear in the latest release and affect at least 2 users.

### Crash-free sessions

Trigger if crash-free sessions fall below 99% for either platform.

## Required production env

Web:

- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SENTRY_DSN`

Mobile/EAS:

- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`
- `EXPO_PUBLIC_SENTRY_DSN`

## Verification after deploy

1. Sign up or sign in on web and iOS.
2. Add a pantry item.
3. Generate a meal plan.
4. Generate a grocery list.
5. Save and unsave a recipe.
6. Submit recipe feedback.
7. Confirm events appear in PostHog with `app = familyplate` and the correct `platform`.
8. Confirm Sentry shows no new release errors during the smoke test.
