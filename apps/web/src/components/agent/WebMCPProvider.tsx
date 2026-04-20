"use client";

import { useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Minimal types for the WebMCP API (per draft spec)
type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContextProvider = {
  provideContext: (context: { tools: ToolDefinition[] }) => void;
};

declare global {
  interface Navigator {
    modelContext?: ModelContextProvider;
  }
}

/**
 * Registers FamilyPlate actions as WebMCP tools so that AI agents can
 * discover and invoke them. Runs once on mount; tools are only registered
 * if the browser supports WebMCP (navigator.modelContext).
 */
export function WebMCPProvider() {
  const convex = useConvex();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.modelContext?.provideContext) return;

    const tools: ToolDefinition[] = [
      {
        name: "suggestDinner",
        description:
          "Suggest 3 dinner recipes to cook tonight from the user's pantry. Respects household allergies and dislikes. Optionally accepts a craving filter (e.g. 'Chicken', 'Pasta', 'something spicy').",
        inputSchema: {
          type: "object",
          properties: {
            craving: {
              type: "string",
              description:
                "Optional craving/mood like 'Chicken', 'Pasta', 'something spicy', 'Thai'.",
            },
          },
          additionalProperties: false,
        },
        execute: async (input) => {
          const craving =
            typeof input.craving === "string" && input.craving.trim().length > 0
              ? (input.craving as string)
              : undefined;
          return await convex.action(
            api.actions.quickDinner.suggestFromPantry,
            { craving }
          );
        },
      },
      {
        name: "listPantry",
        description:
          "List all items currently in the user's pantry, including quantity, unit, category, and storage location.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          return await convex.query(api.queries.pantry.getMyPantryItems, {});
        },
      },
      {
        name: "listMealPlan",
        description:
          "Get the user's current 7-night meal plan including each day's primary dinner and alternatives.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          return await convex.query(api.queries.planner.getMyMealPlan, {});
        },
      },
      {
        name: "listSavedRecipes",
        description:
          "List all recipes the user has saved to their cookbook.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          return await convex.query(api.queries.savedRecipes.getMySavedRecipes, {});
        },
      },
      {
        name: "listGroceryList",
        description:
          "Get the user's current grocery list with items grouped by category.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        execute: async () => {
          return await convex.query(api.queries.grocery.getMyGroceryList, {});
        },
      },
      {
        name: "addGroceryItem",
        description:
          "Add a single custom item to the user's grocery list. Creates a new list if none exists.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Item name, e.g. 'Olive oil'" },
            quantity: { type: "number", description: "Quantity amount" },
            unit: { type: "string", description: "Unit, e.g. 'lb', 'oz', 'count'" },
            category: {
              type: "string",
              description:
                "Category: Produce, Meat, Dairy, Grains, Condiments, Frozen, or Other",
            },
          },
          required: ["name", "quantity", "unit", "category"],
          additionalProperties: false,
        },
        execute: async (input) => {
          return await convex.mutation(api.mutations.grocery.addMyCustomItem, {
            name: String(input.name),
            quantity: Number(input.quantity),
            unit: String(input.unit),
            category: String(input.category),
          });
        },
      },
    ];

    try {
      navigator.modelContext.provideContext({ tools });
    } catch (err) {
      // Ignore failures — WebMCP is progressive enhancement.
      console.warn("WebMCP registration failed:", err);
    }
  }, [convex]);

  return null;
}
