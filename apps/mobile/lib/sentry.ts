import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";
import { Platform } from "react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const appVersion = Application.nativeApplicationVersion ?? "development";
const appBuild = Application.nativeBuildVersion ?? "development";

function eventText(event: Sentry.Event) {
  const frameText =
    event.exception?.values
      ?.flatMap((value) => value.stacktrace?.frames ?? [])
      .flatMap((frame) => [
        frame.filename,
        frame.abs_path,
        frame.module,
        frame.function,
      ])
      .filter(Boolean)
      .join(" ") ?? "";

  const exceptionText =
    event.exception?.values
      ?.flatMap((value) => [value.type, value.value])
      .filter(Boolean)
      .join(" ") ?? "";

  return [event.message, exceptionText, frameText, event.request?.url]
    .filter(Boolean)
    .join(" ");
}

function isLocalDevelopmentNoise(event: Sentry.Event) {
  return /localhost|127\.0\.0\.1|\/Users\/noahthies\//i.test(eventText(event));
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    release: `familyplate-mobile@${appVersion}`,
    dist: appBuild,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enableAutoSessionTracking: true,
    beforeSend(event) {
      delete event.request?.cookies;
      delete event.request?.headers;
      event.tags = {
        ...event.tags,
        platform: Platform.OS,
      };
      if (isLocalDevelopmentNoise(event)) {
        return null;
      }
      return event;
    },
  });
  Sentry.setTag("platform", Platform.OS);
}

export { Sentry };
