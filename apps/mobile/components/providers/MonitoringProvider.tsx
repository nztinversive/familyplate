import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { useQuery } from "convex/react";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import { Sentry } from "@/lib/sentry";

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function MonitoringProvider({ children }: { children: ReactNode }) {
  if (!posthogKey) {
    return (
      <>
        <SentryUserTracker />
        {children}
      </>
    );
  }

  return (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        host: posthogHost,
        captureAppLifecycleEvents: true,
      }}
      autocapture={{
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <UserAnalyticsTracker />
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
}

function SentryUserTracker() {
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});

  useEffect(() => {
    if (currentUser === undefined) return;
    if (!currentUser) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: currentUser.authId,
      email: currentUser.email,
      username: currentUser.userName,
    });
  }, [currentUser]);

  return null;
}

function UserAnalyticsTracker() {
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const posthog = usePostHog();
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (currentUser === undefined) return;
    if (!currentUser?.authId) {
      Sentry.setUser(null);
      identifiedUserId.current = null;
      return;
    }

    Sentry.setUser({
      id: currentUser.authId,
      email: currentUser.email,
      username: currentUser.userName,
    });

    if (identifiedUserId.current === currentUser.authId) return;

    try {
      posthog.identify(currentUser.authId, {
        email: currentUser.email,
        userName: currentUser.userName,
        app: "familyplate",
        platform: "ios",
      });
      identifiedUserId.current = currentUser.authId;
    } catch {
      // Monitoring should never block app navigation.
    }
  }, [currentUser, posthog]);

  return null;
}

function ScreenTracker() {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    if (!pathname) return;
    posthog.screen(pathname, {
      app: "familyplate",
      platform: "ios",
    });
  }, [pathname, posthog]);

  return null;
}
