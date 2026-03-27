/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_generateGroceryList from "../actions/generateGroceryList.js";
import type * as actions_generateMealPlan from "../actions/generateMealPlan.js";
import type * as actions_quickDinner from "../actions/quickDinner.js";
import type * as actions_sendInviteEmail from "../actions/sendInviteEmail.js";
import type * as actions_swapMeal from "../actions/swapMeal.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as internal_planner from "../internal/planner.js";
import type * as lib_allergenCheck from "../lib/allergenCheck.js";
import type * as lib_mealPlanning from "../lib/mealPlanning.js";
import type * as lib_openaiMealPlanner from "../lib/openaiMealPlanner.js";
import type * as migrations_cleanAllergens from "../migrations/cleanAllergens.js";
import type * as mutations_feedback from "../mutations/feedback.js";
import type * as mutations_grocery from "../mutations/grocery.js";
import type * as mutations_households from "../mutations/households.js";
import type * as mutations_pantry from "../mutations/pantry.js";
import type * as mutations_planner from "../mutations/planner.js";
import type * as mutations_profiles from "../mutations/profiles.js";
import type * as queries_feedback from "../queries/feedback.js";
import type * as queries_grocery from "../queries/grocery.js";
import type * as queries_households from "../queries/households.js";
import type * as queries_pantry from "../queries/pantry.js";
import type * as queries_planner from "../queries/planner.js";
import type * as queries_profiles from "../queries/profiles.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/generateGroceryList": typeof actions_generateGroceryList;
  "actions/generateMealPlan": typeof actions_generateMealPlan;
  "actions/quickDinner": typeof actions_quickDinner;
  "actions/sendInviteEmail": typeof actions_sendInviteEmail;
  "actions/swapMeal": typeof actions_swapMeal;
  auth: typeof auth;
  http: typeof http;
  "internal/planner": typeof internal_planner;
  "lib/allergenCheck": typeof lib_allergenCheck;
  "lib/mealPlanning": typeof lib_mealPlanning;
  "lib/openaiMealPlanner": typeof lib_openaiMealPlanner;
  "migrations/cleanAllergens": typeof migrations_cleanAllergens;
  "mutations/feedback": typeof mutations_feedback;
  "mutations/grocery": typeof mutations_grocery;
  "mutations/households": typeof mutations_households;
  "mutations/pantry": typeof mutations_pantry;
  "mutations/planner": typeof mutations_planner;
  "mutations/profiles": typeof mutations_profiles;
  "queries/feedback": typeof queries_feedback;
  "queries/grocery": typeof queries_grocery;
  "queries/households": typeof queries_households;
  "queries/pantry": typeof queries_pantry;
  "queries/planner": typeof queries_planner;
  "queries/profiles": typeof queries_profiles;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
