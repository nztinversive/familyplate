import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enableAutoSessionTracking: true,
    beforeSend(event) {
      delete event.request?.cookies;
      delete event.request?.headers;
      return event;
    },
  });
}

export { Sentry };
