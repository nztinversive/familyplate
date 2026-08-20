import { useEffect, useRef, type ReactNode } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { useQuery } from "convex/react";
import { PostHogProvider, usePostHog, type PostHog } from "posthog-react-native";
import { api } from "@familyplate/convex/_generated/api";
import {
  sanitizeSensitiveRoute,
  shouldResetPostHogIdentity,
} from "@/lib/privacy-and-permissions";
import {
  configureRevenueCat,
  resetRevenueCatIdentity,
} from "@/lib/revenuecat";
import { Sentry } from "@/lib/sentry";

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const noOpPostHog = new Proxy(
  {},
  {
    get: () => () => undefined,
  },
) as PostHog;

export function MonitoringProvider({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider
      apiKey={posthogKey}
      client={posthogKey ? undefined : noOpPostHog}
      options={{
        host: posthogHost,
        captureAppLifecycleEvents: true,
      }}
      autocapture={{
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <SentryUserTracker />
      <RevenueCatUserTracker />
      {posthogKey ? (
        <>
          <UserAnalyticsTracker />
          <ScreenTracker />
        </>
      ) : null}
      {children}
    </PostHogProvider>
  );
}

function RevenueCatUserTracker() {
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const synchronizedUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (currentUser === undefined) return;
    const nextUserId = currentUser?.authId ?? null;
    if (synchronizedUserId.current === nextUserId) return;

    let isCurrent = true;
    async function synchronize() {
      try {
        if (currentUser?.authId) {
          await configureRevenueCat({
            appUserId: currentUser.authId,
            email: currentUser.email,
          });
        } else {
          await resetRevenueCatIdentity();
        }
        if (isCurrent) synchronizedUserId.current = nextUserId;
      } catch (error) {
        Sentry.captureException(error, {
          tags: {
            area: "billing",
            action: "synchronize_revenuecat_identity",
            platform: Platform.OS,
          },
        });
      }
    }

    void synchronize();
    return () => {
      isCurrent = false;
    };
  }, [currentUser]);

  return null;
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
  const identifiedUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (currentUser === undefined) return;
    if (!currentUser?.authId) {
      Sentry.setUser(null);
      if (shouldResetPostHogIdentity(identifiedUserId.current, null)) {
        try {
          posthog.reset();
        } catch {
          // Monitoring should never block sign-out or app navigation.
        }
      }
      identifiedUserId.current = null;
      return;
    }

    Sentry.setUser({
      id: currentUser.authId,
      email: currentUser.email,
      username: currentUser.userName,
    });

    if (identifiedUserId.current === currentUser.authId) return;

    if (
      shouldResetPostHogIdentity(
        identifiedUserId.current,
        currentUser.authId,
      )
    ) {
      try {
        posthog.reset();
      } catch {
        // Do not link two signed-in accounts when identity isolation fails.
        return;
      }
    }

    try {
      posthog.identify(currentUser.authId, {
        email: currentUser.email,
        userName: currentUser.userName,
        app: "familyplate",
        platform: Platform.OS,
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
    posthog.screen(sanitizeSensitiveRoute(pathname), {
      app: "familyplate",
      platform: Platform.OS,
    });
  }, [pathname, posthog]);

  return null;
}
