import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  households: defineTable({
    name: v.string(),
    createdBy: v.string(),
    inviteCode: v.string(),
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
    createdAt: v.number(),
  })
    .index("by_householdId", ["householdId"])
    .index("by_authId", ["authId"]),

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
    source: v.union(v.literal("ai"), v.literal("curated")),
    createdAt: v.number(),
  }).index("by_householdId", ["householdId"]),

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
    date: v.string(),
    mealType: v.literal("dinner"),
    status: v.union(
      v.literal("planned"),
      v.literal("cooked"),
      v.literal("skipped")
    ),
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
});
