# App Store Submission Checklist

## Public Listing

- Version under prep: 1.16.9
- Name: FamilyPlate Meal Planner
- Subtitle: AI dinners from your pantry
- Category: Food & Drink
- Marketing URL: https://familyplate.co
- Privacy Policy URL: https://familyplate.co/privacy
- Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- FamilyPlate Terms URL: https://familyplate.co/terms
- Support URL: https://familyplate.co/support
- Release: manual after approval
- What's New: FamilyPlate now lets you revisit past weekly plans on iPhone, so you can review earlier dinner progress without losing the current week.
- App Review status: Current live version is `1.16.8` build `59` in `READY_FOR_SALE`. The retry worker re-checked App Store Connect on 2026-07-01, found build `60` visible and `VALID`, reran `npx eas-cli@latest metadata:push --profile production --non-interactive` to create/sync the `1.16.9` App Store version, and submitted the same verified build with Fastlane deliver. App Store Connect now reports `1.16.9` build `60` in `WAITING_FOR_REVIEW` with manual release; build `60` is attached, `VALID`, not expired, and uploaded on 2026-07-01.

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

FamilyPlate is an AI meal planning app for households. Reviewers can test pantry tracking with estimated expiration dates, Pantry cook-this-first shortcuts into Tonight, grocery list management, Cookbook, custom family recipes, Recently Cooked, Cook Again planning, Weekly Plan history browsing, Tonight suggestions, shop-first dinner suggestions, post-dinner check-ins, learned meal memory in Settings, camera grocery scanning, barcode scanning, household invite codes, and native in-app household joining.

AI features show a consent prompt before sending app data to third-party AI providers. Meal planning and photo recognition may send pantry items, grocery photos, household preferences, dietary notes, allergies, and recipe requests to OpenAI to provide the requested app functionality.

If the demo household already has multiple saved weeks, open Weekly Plan and use the header chevrons to move to a past week, then return to Current Week and confirm the active plan is still available without losing the current progress view.

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
2. Open Settings and note the household invite code.
3. Sign out, create or sign in to a second account, and confirm setup now offers a Join an existing household path with invite-code entry.
4. Enter the invite code from step 2 and confirm the second account joins the shared household without leaving the iPhone app.
5. Open Pantry and add a pantry item manually without entering an expiration date.
6. Confirm the saved pantry item shows an `Est.` expiration label based on its name and storage location.
7. Edit that pantry item, enter a manual expiration date, save it, and confirm the label no longer shows `Est.`.
8. Add or edit another pantry item so it expires soon, then confirm the Pantry alerts call out expired or expiring-soon items near the top.
9. In Pantry, confirm the new `Cook these first` section lists leftovers or soon-expiring items and tap one item to open Tonight suggestions for it.
10. In Tonight, confirm suggestions start from the pantry item selected in Pantry and still show pantry ingredient highlights on each card.
11. Tap Suggest What to Buy, expand one shop-first recipe, and confirm the card clearly separates ingredients you already have from the ones you need to buy.
12. Leave Tonight and return to it, then confirm the fuller generated suggestion list is still available.
13. From that shop-first Tonight recipe, add missing ingredients to Grocery List and confirm the list reflects the suggested items.
14. Open Weekly Plan, view one dinner's details, change the serving count, and confirm ingredient quantities update there as well.
15. If multiple saved weeks are available on the demo household, use the header chevrons to move to a past week, confirm its dinners and progress load, then return to Current Week.
16. From Weekly Plan dinner details, add only that dinner's missing ingredients to Grocery List and confirm the items are added without replacing the rest of the plan.
17. Open Cookbook, expand a saved recipe, change the serving count, and confirm the scaled ingredient quantities and Grocery action match the chosen serving size.
18. Open Grocery List, add a manual errand item, run Generate from Plan, and confirm the manual item stays on the list beside the planned-dinner ingredients.
19. Check off one grocery item, tap Share, and confirm the shared list includes only the remaining unchecked items.
20. Use Snap Groceries to test camera/photo recognition and barcode scanning.
21. Start Cook Mode from Cookbook or Weekly Plan, finish it, and optionally save leftovers with quantity and storage.
22. Complete the dinner check-in with a rating and tag, then confirm Recently Cooked appears in Cookbook and Learned Meal Memory appears in Settings.
23. Delete that dinner check-in and confirm the form resets instead of restoring the deleted response.
24. Submit a fresh dinner check-in again and verify the updated response saves successfully.
25. Use Cook Again from Recently Cooked to place a prior dinner back onto the weekly plan.
26. Open Settings, view Privacy/Terms/Support, confirm Delete Account is visible, and verify Restore Purchases appears under Plan Usage.
