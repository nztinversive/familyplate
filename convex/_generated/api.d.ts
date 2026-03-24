/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as mutations_grocery from "../mutations/grocery.js";
import type * as mutations_households from "../mutations/households.js";
import type * as mutations_pantry from "../mutations/pantry.js";
import type * as mutations_planner from "../mutations/planner.js";
import type * as mutations_profiles from "../mutations/profiles.js";
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
  auth: typeof auth;
  http: typeof http;
  "mutations/grocery": typeof mutations_grocery;
  "mutations/households": typeof mutations_households;
  "mutations/pantry": typeof mutations_pantry;
  "mutations/planner": typeof mutations_planner;
  "mutations/profiles": typeof mutations_profiles;
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
