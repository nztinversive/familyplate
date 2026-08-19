# Google Play Launch Checklist

Prepared August 19, 2026 from `origin/master`. This file is a source-grounded submission draft, not evidence that Play Console, RevenueCat, EAS, or production settings are complete. Reconcile those services immediately before release.

Status: **BLOCKED** until every item marked `MANUAL BLOCKER` is completed and the final release AAB passes the verification and testing sections below.

## Release identity

- [x] Android application ID: `co.familyplate.app`
- [x] App name in the Expo source: `FamilyPlate`
- [x] Current source version name: `1.16.14`
- [x] Store category draft: `Food & Drink`
- [x] Privacy policy: `https://familyplate.co/privacy`
- [x] Terms: `https://familyplate.co/terms`
- [x] Support: `https://familyplate.co/support`
- [x] External account-deletion resource: `https://familyplate.co/delete-account`
- [ ] `MANUAL BLOCKER` Confirm that `co.familyplate.app` is the package created in Play Console before the first upload. The package name cannot be changed after publication.
- [ ] `MANUAL BLOCKER` Read the next Android `versionCode` from EAS and Play Console. Do not infer it from this repository, and do not reuse a code already uploaded to any track.
- [ ] `MANUAL BLOCKER` Confirm the public developer name, support email, support phone if required, legal operator, public developer address, countries, and distribution settings.
- [ ] `MANUAL BLOCKER` Enroll in Play App Signing and securely retain the upload-key recovery information. Never commit a keystore, service-account key, or password.

## Store listing metadata

The copy-ready English (United States) listing is in [`store/google-play/en-US/listing.json`](store/google-play/en-US/listing.json). Run this from the repository root before copying it into Play Console:

```sh
npm run validate:google-play-launch
```

Draft fields:

- Title: `FamilyPlate Meal Planner`
- Short description: `Plan dinners from your pantry with AI recipes, grocery lists, and meal planning.`
- Full description: use `fullDescription` from the JSON file. It includes the required health disclaimer, subscription disclosure, and legal links.
- Initial release notes: use `releaseNotes` from the JSON file.
- Default language: English (United States)

The validator enforces the current limits of 30 characters for the title, 80 for the short description, 4,000 for the full description, and 500 for release notes. Re-run it after every copy change.

Do not add ranking claims, awards, testimonials, prices, limited-time language, download calls to action, repeated keywords, emojis, or references that imply endorsement by Google.

## Store assets

- [ ] `MANUAL BLOCKER` Export a 512 x 512, 32-bit PNG Play Store icon with alpha, no more than 1,024 KB. Validate it independently of the launcher/adaptive icons in `app.json`.
- [ ] `MANUAL BLOCKER` Create a 1024 x 500 JPEG or 24-bit PNG feature graphic with no alpha. Keep the primary visual and any copy centered so Play crops do not remove it.
- [ ] `MANUAL BLOCKER` Capture at least two real Android phone screenshots. For recommendation eligibility, provide at least four 1080 x 1920 portrait screenshots at 9:16.
- [ ] Use only the final Android build, remove unrelated notifications from the status bar, and do not reuse iPhone-framed images.
- [ ] Keep screenshot taglines under 20 percent of each image and avoid store badges, price claims, rankings, or calls to action.
- [ ] Add concise alt text in Play Console for every asset.
- [ ] If an asset was generated or materially edited with AI and is in scope for Play's asset declaration, apply the appropriate AI label in Play Console.

Recommended phone screenshot order and alt text:

1. Pantry — `Pantry screen showing household ingredients and items to use first.`
2. Tonight — `Dinner suggestions based on ingredients already in the household pantry.`
3. Weekly Plan — `Weekly dinner plan with meals organized by day.`
4. Cookbook — `Saved family recipes with ingredients, servings, and cooking steps.`
5. Grocery List — `Shared grocery list containing ingredients missing from planned meals.`

## App access for reviewers

Select that all or some functionality is restricted because the core app requires sign-in. Enter credentials only in Play Console.

- Reviewer email: `[SET THE DEDICATED REVIEWER EMAIL IN PLAY CONSOLE]`
- Reviewer password: `[SET OR ROTATE IN PLAY CONSOLE - NEVER COMMIT]`
- Access requirements: no MFA, one-time code, expired invite, geographic restriction, or manual approval
- Account state: already onboarded into a stable review household
- Entitlement: provision the state needed to review paid functionality, or clearly explain the Google Play test-purchase path

Suggested access instructions:

> Sign in with the dedicated reviewer credentials. The account is already onboarded and opens the main app. Use Pantry to add or scan an ingredient, Tonight and Weekly Plan to generate AI-assisted meals, Cookbook to review saved recipes, Grocery List to manage missing ingredients, and Settings to test subscriptions, legal links, AI controls, and in-app account deletion. Use the report control on generated content to submit a test AI safety report. No MFA or external hardware is required.

- [ ] `MANUAL BLOCKER` Rotate the reviewer password that was previously committed and set the replacement only in App Store Connect and Play Console.
- [ ] `MANUAL BLOCKER` Decide whether repository history must be rewritten. Removing the current file value does not remove old commits, forks, logs, or clones.
- [ ] Verify the reviewer account immediately before submission and keep it active throughout review.
- [ ] Never put reviewer passwords, invite codes, recovery codes, payment details, service-account JSON, webhook secrets, or keystores in source, screenshots, release notes, or review instructions.

## App-content declarations

### Privacy policy and account deletion

- Privacy policy URL: `https://familyplate.co/privacy`
- Account-deletion URL: `https://familyplate.co/delete-account`
- In-app path: `Settings > Privacy & Account > Delete Account`
- External path: the deletion page opens a specific email request to `support@familyplate.co` and explains verification, associated-data deletion, shared-household retention, and subscription cancellation.
- [ ] `MANUAL BLOCKER` Deploy the updated web pages and verify all four legal/support URLs return HTTP 200 without authentication, geofencing, redirects to sign-in, or a certificate warning.
- [ ] `MANUAL BLOCKER` Assign an owner to monitor deletion requests, verify account ownership without asking for a password, complete deletion, and record completion.
- [ ] `BLOCKER` Run an account-deletion regression test against the final backend. Confirm that authentication records, the personal profile, account-linked agent connections, and other account-linked records are removed or irreversibly de-identified. Confirm the documented shared-household behavior when other authenticated members remain.

### Ads

- Recommended declaration: **No, the app does not contain ads.**
- [ ] Verify the final AAB dependency/SDK report contains no advertising SDK and that no cross-promotion behaves as an ad.

### Target audience

- Recommended selection: **18 and over only.**
- Rationale: FamilyPlate is designed for adult household organizers. Adults may enter meal preferences for children, but the app is not designed or marketed for children to use independently.
- [ ] `OWNER/LEGAL CONFIRMATION` Confirm this audience selection and keep screenshots, descriptions, onboarding, and marketing consistent with it. Selecting any child age group triggers Families requirements.

### Content rating

Complete the IARC questionnaire from the behavior of the final build, not from this draft alone.

- App category: utility/lifestyle or food-and-drink equivalent presented by the questionnaire
- Violence, sexual content, profanity, gambling, simulated gambling, horror, and social/chat features: none expected
- Ads: none
- Public user-generated content: none expected; household content is private to authenticated household members
- Health/wellness content: yes; nutrition, dietary preferences, allergies, and meal planning
- Unrestricted web access: no expected; legal/support pages and controlled external links do not provide a general-purpose browser
- Alcohol references: `OWNER CONFIRMATION` AI recipes may be able to mention cooking wine or other alcohol. Either technically prevent and test that output before answering `No`, or disclose the applicable infrequent alcohol reference in the questionnaire.
- [ ] `MANUAL BLOCKER` Submit the questionnaire and review the assigned ratings for every country before rollout.

### Health apps declaration

- Select `Nutrition and Weight Management` because the app plans meals and supports dietary needs or goals.
- Do not select medical-device functionality. FamilyPlate does not diagnose, treat, cure, or prevent a medical condition.
- The full store description includes: `FamilyPlate is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.`
- The description also tells users to consult a healthcare professional for medical advice, diagnosis, or treatment.
- [ ] Confirm the final manifest does not include Health Connect or health-data permissions. If a future build adds one, update the declaration and privacy disclosures before release.

### AI-generated content

- Declare that the app generates text-based content with AI: dinner suggestions, recipes, meal plans, instructions, and related grocery content.
- Declare grocery-photo recognition if Play asks about AI analysis or generation from images.
- Provider disclosed to users: OpenAI.
- Safety controls expected at launch: explicit AI consent, allergen/dietary constraints, food-safety warnings, safe error handling, and an in-app report/flag control on generated content.
- [ ] `BLOCKER` Verify that a user can report offensive or unsafe generated content without leaving the app and that the report reaches a monitored review queue with enough context to investigate it.
- [ ] `MANUAL BLOCKER` Document who reviews reports, how restricted content is handled, and how reports inform filtering or moderation.
- [ ] Review every new Play Store image or video and complete the asset-specific AI label when required.

### Other declarations

- Financial features: No. The app sells a normal digital subscription but does not provide banking, lending, investing, cryptocurrency, wallets, transfers, or financial advice.
- Government affiliation: No.
- News app: No.
- Permissions: camera is used only for user-initiated grocery/barcode scanning. Complete an additional permissions declaration only if the final AAB requests a Play-restricted permission.

## Data Safety draft

This is a conservative map of data transmitted off the device by the current product. The final answers must cover every SDK and behavior in the release AAB, including behavior that occurs only for some users, regions, or app versions.

| Google Play data type | Collected | Required or optional | Primary purposes | Current recipients or storage |
| --- | --- | --- | --- | --- |
| Approximate location | Yes, conservatively, if IP-derived location is retained | Required when telemetry is enabled | Analytics, security, diagnostics | PostHog, Sentry, hosting/backend logs |
| Name | Yes | Required for the primary profile; optional for additional household profiles | App functionality, account management, analytics, diagnostics | Convex, PostHog, Sentry, OpenAI when included in an AI request |
| Email address | Yes | Required for an authenticated account; optional for invited adult profiles | Authentication, account management, service emails, support, analytics, diagnostics, subscriptions | Convex, Resend, PostHog, Sentry, RevenueCat |
| User IDs | Yes | Required | Authentication, app functionality, subscriptions, analytics, diagnostics, security | Convex, RevenueCat, PostHog, Sentry |
| Purchase history | Yes for purchasers | Optional | Purchases, entitlement management, account management, fraud prevention | Google Play, RevenueCat, Convex |
| Health info | Yes | Optional | App functionality and personalization | Convex and OpenAI for requested AI features; includes allergies, dietary preferences, weight, activity level, and meal or nutrition goals |
| Photos | Yes when grocery-photo recognition is used | Optional | App functionality | OpenAI and transport/backend components used to fulfill the request |
| Other user-generated content | Yes | Optional | App functionality and personalization | Convex and OpenAI as applicable; pantry items, recipes, meal plans, grocery lists, prompts, feedback, and household details |
| App interactions | Yes | Required when telemetry is enabled | Analytics, product improvement, fraud prevention | PostHog and limited first-party event storage |
| Crash logs | Yes | Required when diagnostics is enabled | Diagnostics and reliability | Sentry |
| Diagnostics / performance data | Yes | Required when diagnostics is enabled | Diagnostics and reliability | Sentry, hosting/backend logs |
| Device or other IDs | Yes | Required when telemetry/subscriptions are enabled | Analytics, diagnostics, account management, fraud prevention | PostHog, Sentry, RevenueCat |

Data types not expected to be collected by the app itself: precise location, contacts, SMS or call logs, audio recordings, files/documents, calendar data, browsing history, installed-app inventory, payment-card or bank-account details, credit score, government identifiers, or advertising data. Recheck this list against Play's SDK Index and the final AAB before submitting.

Recommended form-level answers:

- Does the app collect or share required user-data types? **Yes**
- Is all declared data encrypted in transit? **Yes**, subject to final verification that every production endpoint uses HTTPS/TLS
- Can users request deletion? **Yes**
- Account creation: **Yes**
- Deletion web URL: `https://familyplate.co/delete-account`

`MANUAL LEGAL BLOCKER` Google's definition of `sharing` has service-provider exceptions. Do not select `Not shared` until the owner confirms the contracts, project settings, and actual use of Convex, Render, OpenAI, RevenueCat, PostHog, Sentry, Resend, Open Food Facts, Google, Apple, and the web payment provider. If a recipient uses data for its own purposes outside an applicable exception, declare that data type as shared.

`MANUAL PROVIDER BLOCKER` Inspect PostHog and Sentry project settings for IP capture, geolocation, replay, autocapture, data retention, and user-profile settings. The draft conservatively includes approximate location and device IDs because SDK/network processing may collect them. Narrow the answer only with verified production settings.

For each collected type, choose only supported purposes from the table above. Mark a type optional only when the user can choose not to provide or trigger it; telemetry that has no user opt-out is not optional merely because the app could technically run without its environment key.

## Google Play subscriptions and RevenueCat

Use stable IDs. Google subscription product IDs and activated base-plan IDs cannot be reused after creation.

| RevenueCat package | Google Play subscription product ID | Base plan ID | Billing period |
| --- | --- | --- | --- |
| Monthly (`$rc_monthly`) | `co.familyplate.app.family.monthly` | `monthly` | Monthly, auto-renewing |
| Annual (`$rc_annual`) | `co.familyplate.app.family.annual` | `annual` | Yearly, auto-renewing |

Shared RevenueCat configuration:

- Entitlement ID: `family`
- Offering ID: `default`
- Convex webhook: `https://effervescent-gecko-133.convex.site/api/webhooks/revenuecat`
- Android package: `co.familyplate.app`

Required setup:

- [ ] `MANUAL BLOCKER` Create or verify the Google Play payments profile and merchant/tax information.
- [ ] `MANUAL BLOCKER` Create both subscription products, add and activate their base plans, choose countries, set prices, and configure grace period, account hold, and resubscribe behavior.
- [ ] `MANUAL BLOCKER` Add the Android app to RevenueCat and connect Google Play using a least-privilege service account stored only in the provider.
- [ ] Import both Google products into RevenueCat, attach them to entitlement `family`, and map them to the monthly and annual packages in offering `default`.
- [ ] Set the RevenueCat Android public SDK key in EAS `preview` and `production`. Do not commit private provider or service-account credentials.
- [ ] Verify the authenticated RevenueCat webhook and confirm initial purchase, renewal, cancellation, billing issue, expiration, refund, transfer/restore, and sandbox events update the correct FamilyPlate profile.
- [ ] Ensure the paywall shows localized price, billing period, renewal, trial/offer terms, and how to cancel before purchase.
- [ ] Ensure Settings opens Google Play subscription management on Android rather than an Apple URL.
- [ ] Test purchase, pending purchase, user cancellation, failure, restore, account switch, app reinstall, expiration, billing retry/grace period, and cross-device entitlement refresh with Play license testers on a Play-installed build.

## Build and technical release gate

- [ ] Merge or port all Android launch work onto the current release base without copying unrelated dirty-worktree changes.
- [ ] Install with the repository's Node 22 requirement and a supported Java/Android toolchain.
- [ ] Run `npm ci` from the repository root.
- [ ] Run the Google Play metadata validator, web checks, mobile lint/typecheck, Convex typecheck, Expo Doctor, dependency audit, and focused automated tests.
- [ ] Produce a signed **production AAB**, not only a development APK.
- [ ] Inspect the AAB/merged manifest for package, version name/code, target SDK, min SDK, permissions, exported components, deep links, billing library, ABIs, native libraries, and 16 KB page-size compatibility.
- [ ] Confirm only intended permissions are present. Camera access must be user initiated and explained immediately before use.
- [ ] Verify production environment values for Convex, OpenAI-backed server functions, PostHog, Sentry, RevenueCat Android, and app environment. No private secret belongs in an `EXPO_PUBLIC_` value.
- [ ] Upload the AAB to internal testing and resolve every blocking Play Console warning.
- [ ] Run the Play pre-launch report and address crashes, ANRs, accessibility failures, security findings, unsupported devices, and layout problems.

## Test tracks and production access

1. Create an internal-testing release and add trusted Google accounts as testers.
2. Install only through the Play opt-in link so billing, signing, delivery, and update behavior match Play.
3. Complete the end-to-end Android QA matrix, including sign-up/sign-in/reset, onboarding, pantry entry, barcode/photo permission denial and recovery, AI consent, AI generation and reporting, household sharing, meal planning, grocery lists, offline/errors, subscription purchase/restore/manage/cancel, legal links, and account deletion.
4. Create a closed-testing release and collect structured feedback.
5. If the developer account is a personal account created after November 13, 2023, keep at least 12 testers opted in continuously for 14 days, then apply for production access. Confirm the requirement in the account because organizational and older accounts can differ.
6. Answer the production-access questions with real testing dates, tester engagement, issues found, fixes made, and readiness evidence.
7. Promote the exact tested artifact or build an intentionally versioned replacement and repeat the required gates. Never silently substitute an untested AAB.

## Physical Android QA matrix

- [ ] At least one current Pixel-class device and one Samsung-class device
- [ ] Android versions representing the minimum supported version and a current release
- [ ] Phone layouts at default and large font/display scaling
- [ ] Light and dark mode, gesture and three-button navigation, rotation policy, keyboard, edge-to-edge insets, and Android back behavior
- [ ] Fresh install, update from prior internal build, sign-out/sign-in, reinstall, and offline launch
- [ ] Camera denied, allowed, revoked from system settings, barcode scan, grocery-photo scan, and manual fallback
- [ ] Play purchase states listed in the subscription section
- [ ] AI output reporting reaches the review queue
- [ ] Account deletion removes access and associated data while preserving only documented shared/legal records
- [ ] Legal/support URLs open and return the final August 19 policy copy

## Final Play Console review

- [ ] Store listing text and assets match the final build
- [ ] App access credentials work without assistance
- [ ] Ads, target audience, content rating, Data Safety, health, AI, financial features, and permissions declarations are complete
- [ ] Privacy and account-deletion URLs are deployed and public
- [ ] Subscription products/base plans are active in every launch country and RevenueCat's offering returns both packages
- [ ] Countries, pricing, tax, contact details, app category/tags, and distribution/device settings are approved by the owner
- [ ] Content rating is accepted and compatible with the intended countries/audience
- [ ] AAB has no blocking Play warnings; pre-launch report is reviewed
- [ ] Release notes describe the actual artifact
- [ ] Decide staged rollout percentage and name an owner for crashes, ANRs, billing failures, AI reports, deletion requests, support, and rollback
- [ ] Start production rollout only after required testing/production access is complete

## Manual blockers and owner decisions

The following cannot be safely completed from repository access alone:

1. Google Play developer identity, organization/personal-account status, agreements, public developer profile, payments profile, tax, countries, and production-access status.
2. Creation of the immutable Play package, Play App Signing choice, upload key custody, first AAB upload, and all console declarations.
3. Subscription pricing, regions, grace/account-hold behavior, Google product activation, RevenueCat Google credentials, and sandbox/real-device purchase proof.
4. Reviewer-account password rotation and secure entry in both stores; a repository commit cannot rotate a working credential or erase it from prior clones.
5. Provider contract/settings review needed to make final Data Safety `shared` answers and exact retention statements.
6. Legal operator name/address, jurisdiction/governing-law and dispute terms, age/eligibility choice, retention schedule, and region-specific privacy rights. The public legal copy intentionally does not invent these facts.
7. Staffing and procedure for support, account-deletion verification, AI report moderation, security/fraud retention, and provider-deletion requests.
8. Real Android screenshots, feature graphic approval, physical-device QA, closed-test participation, and Google review.
9. Verification that backend deletion covers every account-linked record. Current shared-household behavior must remain consistent with the public policy.
10. A final SDK/privacy audit of the production AAB, PostHog, Sentry, RevenueCat, OpenAI, and other provider settings.

## Official references

- [Create and set up an app and listing limits](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- [Preview asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Prepare an app for review](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [Data Safety form](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Account-deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en)
- [AI labels for submitted assets](https://support.google.com/googleplay/android-developer/answer/17262077?hl=en)
- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)
- [Content rating and target audience](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en)
- [Create and manage subscriptions](https://support.google.com/googleplay/android-developer/answer/140504?hl=en)
- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348?hl=en)
