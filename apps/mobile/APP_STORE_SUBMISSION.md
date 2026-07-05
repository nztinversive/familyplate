# App Store Submission Checklist

## Public Listing

- Version under prep: 1.16.11
- Name: FamilyPlate Meal Planner
- Subtitle: AI dinners from your pantry
- Category: Food & Drink
- Marketing URL: https://familyplate.co
- Privacy Policy URL: https://familyplate.co/privacy
- Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- FamilyPlate Terms URL: https://familyplate.co/terms
- Support URL: https://familyplate.co/support
- Release: manual after approval
- What's New: FamilyPlate now makes adult household invites easier to finish from iPhone, so admins can add an adult eater profile, attach an invite email, and send the shared household link from the same Settings flow.
- App Review status: Current live version is `1.16.10` build `61` in `READY_FOR_SALE` after the manual release request was accepted on 2026-07-04. Version `1.16.11` build `62` was built locally, uploaded, and submitted from `origin/master` commit `61a2f510c34d9261dfeca7e48211d8f611a4ccc4` on 2026-07-04 and is now `WAITING_FOR_REVIEW` with manual release.

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

FamilyPlate is an AI meal planning app for households. Reviewers can test pantry tracking with estimated expiration dates, Pantry cook-this-first shortcuts into Tonight, grocery list management, Cookbook, custom family recipes, Recently Cooked, Cook Again planning, Weekly Plan history browsing, Tonight suggestions, shop-first dinner suggestions, post-dinner check-ins, learned meal memory in Settings, camera grocery scanning, barcode scanning, household invite codes, adult invite emails from Settings, and native in-app household joining.

AI features show a consent prompt before sending app data to third-party AI providers. Meal planning and photo recognition may send pantry items, grocery photos, household preferences, dietary notes, allergies, and recipe requests to OpenAI to provide the requested app functionality.

In Settings > Eater Profiles, adults now support an optional invite email while child profiles still hide that field. Add an adult profile with a test email address and confirm the success message reflects whether the invite email was sent without blocking the profile save.

If the demo household already has multiple saved weeks, open Weekly Plan and use the header chevrons to move to a past week. Confirm that older dinners open in a read-only history view, then return to Current Week and confirm the active plan is still available for edits without losing the current progress view.

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
3. In Eater Profiles, add an adult profile with a test email address and confirm the invite email field is shown only for adults.
4. Save that adult profile and confirm the success message reports the profile save and invite-email outcome without blocking the save.
5. Sign out, create or sign in to a second account, and confirm setup now offers a Join an existing household path with invite-code entry.
6. Enter the invite code from step 2 and confirm the second account joins the shared household without leaving the iPhone app.
7. Open Pantry and add a pantry item manually without entering an expiration date.
8. Confirm the saved pantry item shows an `Est.` expiration label based on its name and storage location.
9. Edit that pantry item, enter a manual expiration date, save it, and confirm the label no longer shows `Est.`.
10. Add or edit another pantry item so it expires soon, then confirm the Pantry alerts call out expired or expiring-soon items near the top.
11. In Pantry, confirm the new `Cook these first` section lists leftovers or soon-expiring items and tap one item to open Tonight suggestions for it.
12. In Tonight, confirm suggestions start from the pantry item selected in Pantry and still show pantry ingredient highlights on each card.
13. Tap Suggest What to Buy, expand one shop-first recipe, and confirm the card clearly separates ingredients you already have from the ones you need to buy.
14. Leave Tonight and return to it, then confirm the fuller generated suggestion list is still available.
15. From that shop-first Tonight recipe, add missing ingredients to Grocery List and confirm the list reflects the suggested items.
16. Open Weekly Plan, view one dinner's details, change the serving count, and confirm ingredient quantities update there as well.
17. If multiple saved weeks are available on the demo household, use the header chevrons to move to a past week, confirm its dinners and progress load in read-only history mode, then return to Current Week.
18. From Weekly Plan dinner details, add only that dinner's missing ingredients to Grocery List and confirm the items are added without replacing the rest of the plan.
19. Open Cookbook, expand a saved recipe, change the serving count, and confirm the scaled ingredient quantities and Grocery action match the chosen serving size.
20. Open Grocery List, add a manual errand item, run Generate from Plan, and confirm the manual item stays on the list beside the planned-dinner ingredients.
21. Check off one grocery item, tap Share, and confirm the shared list includes only the remaining unchecked items.
22. Use Snap Groceries to test camera/photo recognition and barcode scanning.
23. Start Cook Mode from Cookbook or Weekly Plan, finish it, and optionally save leftovers with quantity and storage.
24. Complete the dinner check-in with a rating and tag, then confirm Recently Cooked appears in Cookbook and Learned Meal Memory appears in Settings.
25. Delete that dinner check-in and confirm the form resets instead of restoring the deleted response.
26. Submit a fresh dinner check-in again and verify the updated response saves successfully.
27. Use Cook Again from Recently Cooked to place a prior dinner back onto the weekly plan.
28. Open Settings, view Privacy/Terms/Support, confirm Delete Account is visible, and verify Restore Purchases appears under Plan Usage.
