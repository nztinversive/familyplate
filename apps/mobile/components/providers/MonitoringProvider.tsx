import { useEffect, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { PostHogProvider, usePostHog } from "posthog-react-native";

const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function MonitoringProvider({ children }: { children: ReactNode }) {
  if (!posthogKey) return <>{children}</>;

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
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
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
