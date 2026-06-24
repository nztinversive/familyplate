# App Store Submission Checklist

## Public Listing

- Version under prep: 1.16.5
- Name: FamilyPlate Meal Planner
- Subtitle: AI dinners from your pantry
- Category: Food & Drink
- Marketing URL: https://familyplate.co
- Privacy Policy URL: https://familyplate.co/privacy
- Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- FamilyPlate Terms URL: https://familyplate.co/terms
- Support URL: https://familyplate.co/support
- Release: manual after approval
- What's New: FamilyPlate now shows which pantry items each Tonight suggestion will actually use, so households can scan the fuller six-option Tonight list and pick the best pantry-first dinner faster.
- App Review status: Current live version is 1.16.4 build 55 in `READY_FOR_SALE`. Build 1.16.5 (56) uploaded on 2026-06-24, processed as `VALID`, and was submitted for App Review on 2026-06-24. App Store Connect now reports version `1.16.5` as `WAITING_FOR_REVIEW` with manual release, and there is no active `PENDING_APP_REVIEW_RETRY` case for this build.

## App Preview

- Primary iPhone preview: `store-assets/ios-69/familyplate-app-preview-886x1920.mp4`
- Poster frame: `store-assets/ios-69/familyplate-app-preview-poster.png`
- Rebuild command: `npm run store-preview:render`
- Format target: 886 x 1920 portrait, H.264, 30 fps, 22 seconds.

The production preview is built with Remotion from `apps/store-preview`. Source screenshots sync from `store-assets/ios-69`, then the render writes the final MP4 back to this folder. It opens with the FamilyPlate value proposition, moves through pantry setup, Tonight suggestions, Cookbook, and Grocery List, then ends on a short brand card.

## App Review Notes

Use a reviewer-only account that stays active through review.

- Demo required: Yes
- Demo username: create a dedicated test email account
- Demo password: use the password for that dedicated test account
- Notes:

FamilyPlate is an AI meal planning app for households. Reviewers can test pantry tracking, grocery list management, Cookbook, custom family recipes, Recently Cooked, Cook Again planning, Tonight suggestions, shop-first dinner suggestions, Weekly Plan, post-dinner check-ins, learned meal memory in Settings, camera grocery scanning, and barcode scanning.

AI features show a consent prompt before sending app data to third-party AI providers. Meal planning and photo recognition may send pantry items, grocery photos, household preferences, dietary notes, allergies, and recipe requests to OpenAI to provide the requested app functionality.

There are no external purchase links shown in the iOS app. FamilyPlate subscriptions are sold through Apple in-app purchase and managed by RevenueCat. Account deletion is available in Settings under Privacy & Account.

The App Store description includes the standard Apple Terms of Use (EULA) link:
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Functional legal links are also available in the app from Settings:
Privacy Policy: https://familyplate.co/privacy
FamilyPlate Terms: https://familyplate.co/terms

Recommended in-app purchase setup:

- Entitlement ID: family
- Offering ID: default
- Monthly product ID: co.familyplate.app.family.monthly
- Annual product ID: co.familyplate.app.family.annual
- Convex webhook: https://effervescent-gecko-133.convex.site/api/webhooks/revenuecat

## Privacy Labels

Recommended App Store Connect answers for the current v1:

- Data Used to Track You: No
- Third-party advertising: No
- Data linked to the user: Yes, for account and app functionality
- Contact Info: Email Address, used for app functionality and account management
- Identifiers: User ID, used for app functionality and account management
- User Content: Photos or Videos, Other User Content, used for app functionality
- Health and Fitness: dietary preferences, allergies, and food restrictions, used for app functionality
- Purchases: subscription or entitlement status if shown from the FamilyPlate account, used for app functionality
- Usage Data: Product Interaction if App Store Connect asks about feature activity or app analytics

## Age Rating

Recommended age rating answers:

- Medical or Treatment Information: None
- Health or Wellness Topics: Yes
- User Generated Content: No
- Unrestricted Web Access: No
- Messaging and Chat: No
- Gambling, contests, violence, mature content, profanity, sexual content: None
- Advertising: No

## Reviewer Test Path

1. Sign in with the demo account.
2. Open Pantry and add a pantry item manually.
3. Use Snap Groceries to test camera/photo recognition and barcode scanning.
4. Open Tonight, generate dinner suggestions, confirm up to six options appear, and verify each card highlights pantry ingredients it will use.
5. Expand one Tonight recipe, increase the serving count, and confirm ingredient quantities update for the chosen serving size.
6. Tap Suggest What to Buy, expand one shop-first recipe, and confirm the card clearly separates ingredients you already have from the ones you need to buy.
7. Leave Tonight and return to it, then confirm the fuller generated suggestion list is still available.
8. From that shop-first Tonight recipe, add missing ingredients to Grocery List and confirm the list reflects the suggested items.
9. Open Weekly Plan, view one dinner's details, change the serving count, and confirm ingredient quantities update there as well.
10. From Weekly Plan dinner details, add only that dinner's missing ingredients to Grocery List and confirm the items are added without replacing the rest of the plan.
11. Open Cookbook, expand a saved recipe, change the serving count, and confirm the scaled ingredient quantities and Grocery action match the chosen serving size.
12. Open Grocery List, add a manual errand item, run Generate from Plan, and confirm the manual item stays on the list beside the planned-dinner ingredients.
13. Check off one grocery item, tap Share, and confirm the shared list includes only the remaining unchecked items.
14. Start Cook Mode from Cookbook or Weekly Plan, finish it, and optionally save leftovers with quantity and storage.
15. Complete the dinner check-in with a rating and tag, then confirm Recently Cooked appears in Cookbook and Learned Meal Memory appears in Settings.
16. Delete that dinner check-in and confirm the form resets instead of restoring the deleted response.
17. Submit a fresh dinner check-in again and verify the updated response saves successfully.
18. Use Cook Again from Recently Cooked to place a prior dinner back onto the weekly plan.
19. Open Settings, view Privacy/Terms/Support, confirm Delete Account is visible, and verify Restore Purchases appears under Plan Usage.
