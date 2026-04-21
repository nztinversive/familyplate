import posthog from "posthog-js";

export type AnalyticsEvent = "cta_clicked" | "plan_shared" | "generator_started" | "generator_completed";

type EventPayload = Record<string, string | number | boolean | undefined>;

export function track(event: AnalyticsEvent, payload?: EventPayload) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, payload as Record<string, unknown>);
  } catch {
    // ignore — never let analytics break the user flow
  }
}
