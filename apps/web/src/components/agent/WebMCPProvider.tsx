"use client";

import { useEffect } from "react";
import { useConvex } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import { FAMILYPLATE_AGENT_TOOLS } from "@familyplate/agent-tools";

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

    const webExecutors: Record<string, ToolDefinition["execute"]> = {
      whoami: async () => {
        return await convex.query(api.queries.profiles.getCurrentUser, {});
      },
      listPantry: async (input) => {
        const storageLocation =
          input.storageLocation === "pantry" ||
          input.storageLocation === "fridge" ||
          input.storageLocation === "freezer"
            ? input.storageLocation
            : undefined;
        return await convex.query(api.queries.pantry.getMyPantryItems, {
          storageLocation,
        });
      },
      listMealPlan: async () => {
        return await convex.query(api.queries.planner.getMyMealPlan, {});
      },
      listSavedRecipes: async () => {
        return await convex.query(api.queries.savedRecipes.getMySavedRecipes, {});
      },
      listGroceryList: async () => {
        return await convex.query(api.queries.grocery.getMyGroceryList, {});
      },
      addGroceryItem: async (input) => {
        return await convex.mutation(api.mutations.grocery.addMyCustomItem, {
          name: String(input.name),
          quantity: Number(input.quantity),
          unit: String(input.unit),
          category: String(input.category),
        });
      },
      checkGroceryItem: async (input) => {
        const name = typeof input.name === "string" ? input.name.trim() : "";
        if (!name) {
          throw new Error("name is required.");
        }

        const groceryList = await convex.query(api.queries.grocery.getMyGroceryList, {});
        if (!groceryList) {
          throw new Error("No grocery list found.");
        }

        const matches = groceryList.items
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.name.trim().toLowerCase() === name.toLowerCase());

        if (matches.length === 0) {
          throw new Error(`No grocery item found named "${name}".`);
        }
        if (matches.length > 1) {
          throw new Error(`Multiple grocery items are named "${name}". Use the app to disambiguate.`);
        }

        if (matches[0].item.checked) {
          return {
            groceryListId: groceryList._id,
            checked: matches[0].item,
            alreadyChecked: true,
          };
        }

        await convex.mutation(api.mutations.grocery.toggleItem, {
          groceryListId: groceryList._id,
          itemIndex: matches[0].index,
        });

        return {
          groceryListId: groceryList._id,
          checked: { ...matches[0].item, checked: !matches[0].item.checked },
          alreadyChecked: false,
        };
      },
    };

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
      ...FAMILYPLATE_AGENT_TOOLS
        .filter((tool) => webExecutors[tool.name])
        .map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: webExecutors[tool.name],
      })),
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
