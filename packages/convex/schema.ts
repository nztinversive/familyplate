import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  households: defineTable({
    name: v.string(),
    createdBy: v.string(),
    inviteCode: v.string(),
    planGenerationsThisMonth: v.optional(v.number()),
    planGenerationsResetAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_createdBy", ["createdBy"]),

  userProfiles: defineTable({
    authId: v.string(),
    householdId: v.id("households"),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    isChild: v.boolean(),
    age: v.optional(v.number()),
    weight: v.optional(v.number()),
    activityLevel: v.optional(
      v.union(
        v.literal("sedentary"),
        v.literal("moderate"),
        v.literal("active")
      )
    ),
    dietaryPreferences: v.array(v.string()),
    allergies: v.array(v.string()),
    dislikes: v.array(v.string()),
    goals: v.optional(v.string()),
    subscriptionTier: v.optional(v.union(v.literal("free"), v.literal("family"))),
    lsCustomerId: v.optional(v.string()),
    lsSubscriptionId: v.optional(v.string()),
    lsVariantId: v.optional(v.string()),
    rcAppUserId: v.optional(v.string()),
    rcOriginalAppUserId: v.optional(v.string()),
    rcProductId: v.optional(v.string()),
    rcEntitlementId: v.optional(v.string()),
    rcStore: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    subscriptionEndsAt: v.optional(v.string()),
    planGenerationsThisMonth: v.optional(v.number()),
    planGenerationsResetAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_authId", ["authId"])
    .index("by_lsCustomerId", ["lsCustomerId"])
    .index("by_rcAppUserId", ["rcAppUserId"]),

  pantryItems: defineTable({
    householdId: v.id("households"),
    name: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
    storageLocation: v.union(
      v.literal("pantry"),
      v.literal("fridge"),
      v.literal("freezer")
    ),
    expirationDate: v.optional(v.number()),
    barcode: v.optional(v.string()),
    addedBy: v.id("userProfiles"),
    addedAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_householdId_category", ["householdId", "category"])
    .index("by_householdId_storageLocation", ["householdId", "storageLocation"]),

  recipeSuggestions: defineTable({
    householdId: v.id("households"),
    createdBy: v.optional(v.id("userProfiles")),
    title: v.string(),
    description: v.string(),
    ingredients: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
        inPantry: v.boolean(),
      })
    ),
    instructions: v.array(v.string()),
    effortLevel: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard")
    ),
    estimatedTime: v.number(),
    servings: v.number(),
    tags: v.array(v.string()),
    nutrition: v.optional(
      v.object({
        calories: v.number(),
        protein: v.number(),
        carbs: v.number(),
        fat: v.number(),
        fiber: v.optional(v.number()),
      })
    ),
    usedPantryItems: v.optional(v.array(v.string())),
    source: v.union(v.literal("ai"), v.literal("curated"), v.literal("custom")),
    createdAt: v.number(),
  }).index("by_householdId", ["householdId"]),

  savedRecipes: defineTable({
    householdId: v.id("households"),
    recipeId: v.id("recipeSuggestions"),
    savedBy: v.id("userProfiles"),
    savedAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_recipeId", ["recipeId"])
    .index("by_savedBy", ["savedBy"])
    .index("by_savedBy_recipeId", ["savedBy", "recipeId"]),

  weeklyMealPlans: defineTable({
    householdId: v.id("households"),
    weekStartDate: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed")
    ),
    createdAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_householdId_weekStartDate", ["householdId", "weekStartDate"]),

  plannedMeals: defineTable({
    mealPlanId: v.id("weeklyMealPlans"),
    recipeId: v.id("recipeSuggestions"),
    alternativeRecipeIds: v.optional(v.array(v.id("recipeSuggestions"))),
    date: v.string(),
    mealType: v.literal("dinner"),
    status: v.union(
      v.literal("planned"),
      v.literal("cooked"),
      v.literal("skipped")
    ),
    pantryDeductedAt: v.optional(v.number()),
  })
    .index("by_mealPlanId", ["mealPlanId"])
    .index("by_mealPlanId_date", ["mealPlanId", "date"]),

  groceryLists: defineTable({
    householdId: v.id("households"),
    mealPlanId: v.optional(v.id("weeklyMealPlans")),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
        category: v.string(),
        checked: v.boolean(),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_mealPlanId", ["mealPlanId"]),

  mealFeedback: defineTable({
    recipeId: v.id("recipeSuggestions"),
    oderId: v.id("userProfiles"),
    rating: v.number(),
    liked: v.boolean(),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_recipeId", ["recipeId"])
    .index("by_oderId", ["oderId"]),

  publicPlans: defineTable({
    pantryText: v.string(),
    allergies: v.array(v.string()),
    craving: v.optional(v.string()),
    suggestions: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        effortLevel: v.union(
          v.literal("easy"),
          v.literal("medium"),
          v.literal("hard")
        ),
        estimatedTime: v.number(),
        servings: v.number(),
        ingredients: v.array(
          v.object({
            name: v.string(),
            quantity: v.number(),
            unit: v.string(),
            inPantry: v.boolean(),
          })
        ),
        instructions: v.array(v.string()),
        missingItems: v.array(v.string()),
      })
    ),
    sourcePage: v.optional(v.string()),
    ipHash: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  publicGenerationLog: defineTable({
    dayKey: v.string(),
    ipHash: v.string(),
    createdAt: v.number(),
  })
    .index("by_dayKey", ["dayKey"])
    .index("by_dayKey_ipHash", ["dayKey", "ipHash"]),

  publicEvents: defineTable({
    name: v.string(),
    sourcePage: v.optional(v.string()),
    planId: v.optional(v.id("publicPlans")),
    fingerprint: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_name_createdAt", ["name", "createdAt"])
    .index("by_sourcePage", ["sourcePage"]),
});
