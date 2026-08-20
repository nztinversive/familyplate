import { fileURLToPath } from "node:url";

const PLATFORM_KEY = {
  android: {
    name: "EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY",
    prefix: "goog_",
  },
  ios: {
    name: "EXPO_PUBLIC_REVENUECAT_IOS_API_KEY",
    prefix: "appl_",
  },
};

const COMMON_PRODUCTION_KEYS = [
  "EXPO_PUBLIC_CONVEX_URL",
  "EXPO_PUBLIC_POSTHOG_HOST",
  "EXPO_PUBLIC_POSTHOG_KEY",
  "EXPO_PUBLIC_SENTRY_DSN",
];

export function validateReleaseEnv({ env, platform, production = true }) {
  if (!production) return [];

  const errors = [];
  if (env.EXPO_PUBLIC_APP_ENV !== "production") {
    errors.push("EXPO_PUBLIC_APP_ENV must be production");
  }

  for (const name of COMMON_PRODUCTION_KEYS) {
    if (!env[name]?.trim()) errors.push(`${name} is required`);
  }

  const platformKey = PLATFORM_KEY[platform];
  if (!platformKey) {
    errors.push(`Unsupported release platform: ${platform || "missing"}`);
    return errors;
  }

  const value = env[platformKey.name]?.trim();
  if (!value) {
    errors.push(`${platformKey.name} is required for ${platform} production builds`);
  } else if (!value.startsWith(platformKey.prefix)) {
    errors.push(`${platformKey.name} must start with ${platformKey.prefix}`);
  }

  return errors;
}

function readArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const platform = readArgument("platform") ?? process.env.EAS_BUILD_PLATFORM;
  const profile = readArgument("profile") ?? process.env.EAS_BUILD_PROFILE;
  const production = profile === "production";

  if (!production) {
    console.log(`Release environment validation skipped for ${profile || "local"} profile.`);
    process.exit(0);
  }

  const errors = validateReleaseEnv({ env: process.env, platform, production });
  if (errors.length > 0) {
    console.error("Release environment validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Release environment is valid for ${platform}.`);
}
