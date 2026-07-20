# App Store Submission Checklist

## Public Listing

- Version under prep: 1.16.15
- Name: FamilyPlate Meal Planner
- Subtitle: AI dinners from your pantry
- Category: Food & Drink
- Marketing URL: https://familyplate.co
- Privacy Policy URL: https://familyplate.co/privacy
- Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
- FamilyPlate Terms URL: https://familyplate.co/terms
- Support URL: https://familyplate.co/support
- Release: manual after approval
- What's New: FamilyPlate now keeps emailed household invite links reserved for the right adult account by validating the pending invite and signed-in email before joining.
- App Review status: Current live version is `1.16.14` build `66` in `READY_FOR_SALE` with manual release type. No newer `WAITING_FOR_REVIEW`, `IN_REVIEW`, `PROCESSING`, or `PENDING_DEVELOPER_RELEASE` iOS version is visible as of 2026-07-24.

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

FamilyPlate is an AI meal planning app for households. Reviewers can test pantry tracking with estimated expiration dates, Pantry cook-this-first shortcuts into Tonight, grocery list management, Cookbook, custom family recipes, Recently Cooked, Cook Again planning, Weekly Plan history browsing, Tonight suggestions, shop-first dinner suggestions, post-dinner check-ins, learned meal memory in Settings, camera grocery scanning, barcode scanning, household invite codes, adult invite emails from Settings, pending adult invite status, resend invite emails from the Household card, invite-link sign-in context, and native in-app household joining.

AI features show a consent prompt before sending app data to third-party AI providers. Meal planning and photo recognition may send pantry items, grocery photos, household preferences, dietary notes, allergies, and recipe requests to OpenAI to provide the requested app functionality.

In Settings > Eater Profiles, adults now support an optional invite email while child profiles still hide that field. Add an adult profile with a test email address and confirm the success message reflects whether the invite email was sent without blocking the profile save. Then open the Household card, confirm that adult shows Pending invite until they join, and use Resend invite email to send the same household link again.

After you sign out, open that same invite email link. Confirm the mobile sign-in screen still shows the invited household name, inviter, invite code, and the invited adult email address before you sign in or create a second account. If you continue while already signed in with a different email, FamilyPlate should block the join and ask you to use the invited email instead. If you create a second account from that screen, keep the prefilled invited adult email address so the pending adult profile can be claimed when you join.

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
4. Save that adult profile and confirm the success message reports the profile save and invite-email outcome without blocking the profile save.
5. Stay in Settings, open the Household card, confirm that adult shows `Pending invite`, and use `Resend invite email` without removing the profile.
6. Sign out and open the invite email link for that adult, or the shared Household card invite if you want the generic flow.
7. Confirm the mobile sign-in screen still shows the invited household name, inviter, invite code, and the invited adult email address before you continue.
8. Create or sign in to a second account, keeping the invited adult email prefilled if you created an adult placeholder in step 3.
9. Confirm the second account joins the shared household without leaving the iPhone app.
10. Open Pantry and add a pantry item manually without entering an expiration date.
11. Confirm the saved pantry item shows an `Est.` expiration label based on its name and storage location.
12. Edit that pantry item, enter a manual expiration date, save it, and confirm the label no longer shows `Est.`.
13. Add or edit another pantry item so it expires soon, then confirm the Pantry alerts call out expired or expiring-soon items near the top.
14. In Pantry, confirm the new `Cook these first` section lists leftovers or soon-expiring items and tap one item to open Tonight suggestions for it.
15. In Tonight, confirm suggestions start from the pantry item selected in Pantry and still show pantry ingredient highlights on each card.
16. Tap Suggest What to Buy, expand one shop-first recipe, and confirm the card clearly separates ingredients you already have from the ones you need to buy.
17. Leave Tonight and return to it, then confirm the fuller generated suggestion list is still available.
18. From that shop-first Tonight recipe, add missing ingredients to Grocery List and confirm the list reflects the suggested items.
19. Open Weekly Plan, view one dinner's details, change the serving count, and confirm ingredient quantities update there as well.
20. If multiple saved weeks are available on the demo household, use the header chevrons to move to a past week, confirm its dinners and progress load in read-only history mode, then return to Current Week.
21. From Weekly Plan dinner details, add only that dinner's missing ingredients to Grocery List and confirm the items are added without replacing the rest of the plan.
22. Open Cookbook, expand a saved recipe, change the serving count, and confirm the scaled ingredient quantities and Grocery action match the chosen serving size.
23. Open Grocery List, add a manual errand item, run Generate from Plan, and confirm the manual item stays on the list beside the planned-dinner ingredients.
24. Check off one grocery item, tap Share, and confirm the shared list includes only the remaining unchecked items.
25. Use Snap Groceries to test camera/photo recognition and barcode scanning.
26. Start Cook Mode from Cookbook or Weekly Plan, finish it, and optionally save leftovers with quantity and storage.
27. Complete the dinner check-in with a rating and tag, then confirm Recently Cooked appears in Cookbook and Learned Meal Memory appears in Settings.
28. Delete that dinner check-in and confirm the form resets instead of restoring the deleted response.
29. Submit a fresh dinner check-in again and verify the updated response saves successfully.
30. While still signed in with the wrong account from step 8, reopen the invite link and confirm FamilyPlate blocks the join until you use the invited email address.
31. Use Cook Again from Recently Cooked to place a prior dinner back onto the weekly plan.
32. Open Settings, view Privacy/Terms/Support, confirm Delete Account is visible, and verify Restore Purchases appears under Plan Usage.
