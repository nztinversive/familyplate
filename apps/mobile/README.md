# FamilyPlate Mobile

Expo Router mobile app for FamilyPlate. The app uses the shared Convex backend and expects a Convex deployment URL in `EXPO_PUBLIC_CONVEX_URL`.

## Local Development

Install dependencies from the repository root:

```bash
npm install
```

Create the mobile env file:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Start Expo from the mobile app directory:

```bash
cd apps/mobile
npx expo start
```

## Android Development

The Android application ID is `co.familyplate.app`. Native modules such as
RevenueCat and Sentry require a development client or internal APK instead of
Expo Go.

```bash
cd apps/mobile
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client
```

The `development` and `preview` profiles produce installable APKs. The
`production` profile produces the signed AAB used by Google Play.

Android paid-plan testing additionally requires Google Play subscription
products connected to RevenueCat and
`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in the matching EAS environment.

## iOS Delivery

The iOS bundle identifier is `co.familyplate.app`.

EAS files live in `apps/mobile` because Expo expects EAS commands to run from the app directory in a monorepo.

Before the first cloud build:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Create the Convex URL environment variable for both build environments:

```bash
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_CONVEX_URL --value https://effervescent-gecko-133.convex.cloud --visibility plaintext
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_CONVEX_URL --value https://effervescent-gecko-133.convex.cloud --visibility plaintext
```

`EXPO_PUBLIC_CONVEX_URL` is embedded in the client app, so it is treated as public app configuration rather than a secret.

Useful build commands:

```bash
# iOS Simulator build, no App Store install path.
npx eas-cli@latest build --platform ios --profile simulator

# Internal device build for ad hoc testing.
npx eas-cli@latest build --platform ios --profile preview

# Android development-client APK.
npx eas-cli@latest build --platform android --profile development

# Android internal-testing APK.
npx eas-cli@latest build --platform android --profile preview

# Signed Google Play AAB.
npx eas-cli@latest build --platform android --profile production

# App Store/TestFlight build.
npx eas-cli@latest build --platform ios --profile production

# Submit the latest production build to App Store Connect.
npx eas-cli@latest submit --platform ios --profile production
```

Apple Developer and App Store Connect authentication happens in the EAS CLI flow. The first physical-device or TestFlight build may ask you to sign in and let EAS manage credentials.
