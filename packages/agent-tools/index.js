export const FAMILYPLATE_AGENT_SCOPES = [
  "read:profile",
  "read:pantry",
  "read:grocery",
  "read:plan",
  "read:recipes",
  "write:grocery",
  "write:pantry",
  "write:plan",
  "write:recipes",
];

export const DEFAULT_AGENT_SCOPES = [
  "read:profile",
  "read:pantry",
  "read:grocery",
  "read:plan",
  "read:recipes",
];

export const FAMILYPLATE_AGENT_TOOLS = [
  {
    name: "whoami",
    description:
      "Show the FamilyPlate profile and household this agent connection can access.",
    scope: "read:profile",
    kind: "query",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "listPantry",
    description:
      "List pantry, fridge, and freezer items for the connected user's household.",
    scope: "read:pantry",
    kind: "query",
    inputSchema: {
      type: "object",
      properties: {
        storageLocation: {
          type: "string",
          enum: ["pantry", "fridge", "freezer"],
          description: "Optional storage location filter.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "listGroceryList",
    description:
      "Get the latest grocery list for the connected user's household.",
    scope: "read:grocery",
    kind: "query",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "listMealPlan",
    description:
      "Get the active 7-night dinner plan, including recipes and alternatives.",
    scope: "read:plan",
    kind: "query",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "listSavedRecipes",
    description:
      "List recipes saved in the connected user's cookbook.",
    scope: "read:recipes",
    kind: "query",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "addGroceryItem",
    description:
      "Add one custom item to the household grocery list. Supports dry runs before writing.",
    scope: "write:grocery",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name, e.g. Olive oil." },
        quantity: { type: "number", description: "Quantity amount." },
        unit: { type: "string", description: "Unit, e.g. lb, oz, bottle." },
        category: {
          type: "string",
          description:
            "Category such as Produce, Meat, Dairy, Grains, Condiments, Frozen, or Other.",
        },
      },
      required: ["name", "quantity", "unit", "category"],
      additionalProperties: false,
    },
  },
  {
    name: "updateGroceryItem",
    description:
      "Update one grocery list item by exact item name. Supports quantity, unit, category, and checked edits.",
    scope: "write:grocery",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Exact grocery item name to update, e.g. Tomatoes.",
        },
        quantity: { type: "number", description: "Optional replacement quantity." },
        unit: { type: "string", description: "Optional replacement unit." },
        category: { type: "string", description: "Optional replacement category." },
        checked: { type: "boolean", description: "Optional checked state." },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "checkGroceryItem",
    description:
      "Mark one grocery list item checked by exact item name. Use dry run first when unsure.",
    scope: "write:grocery",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Exact grocery item name to check off, e.g. Tomatoes.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "addPantryItem",
    description:
      "Add one item to the household pantry, fridge, or freezer. Supports dry runs before writing.",
    scope: "write:pantry",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name, e.g. Chicken thighs." },
        quantity: { type: "number", description: "Quantity amount." },
        unit: { type: "string", description: "Unit, e.g. lb, oz, bottle." },
        category: {
          type: "string",
          description: "Category such as Produce, Meat, Dairy, Grains, Condiments, Frozen, or Other.",
        },
        storageLocation: {
          type: "string",
          enum: ["pantry", "fridge", "freezer"],
          description: "Where the item is stored.",
        },
        expirationDate: {
          type: "number",
          description: "Optional Unix timestamp in milliseconds.",
        },
      },
      required: ["name", "quantity", "unit", "category", "storageLocation"],
      additionalProperties: false,
    },
  },
  {
    name: "updatePantryItem",
    description:
      "Update one pantry item by Convex item id. Supports dry runs before writing.",
    scope: "write:pantry",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        itemId: { type: "string", description: "Pantry item id from listPantry." },
        name: { type: "string" },
        quantity: { type: "number" },
        unit: { type: "string" },
        category: { type: "string" },
        storageLocation: {
          type: "string",
          enum: ["pantry", "fridge", "freezer"],
        },
        expirationDate: {
          type: "number",
          description: "Optional Unix timestamp in milliseconds.",
        },
        clearExpirationDate: { type: "boolean" },
      },
      required: ["itemId"],
      additionalProperties: false,
    },
  },
  {
    name: "removePantryItem",
    description:
      "Remove one pantry item by Convex item id. Supports dry runs before writing.",
    scope: "write:pantry",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        itemId: { type: "string", description: "Pantry item id from listPantry." },
      },
      required: ["itemId"],
      additionalProperties: false,
    },
  },
  {
    name: "addMealToPlan",
    description:
      "Add or replace a planned dinner on a YYYY-MM-DD date using a saved recipe id.",
    scope: "write:plan",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        recipeId: { type: "string", description: "Recipe id from listSavedRecipes." },
        date: { type: "string", description: "Dinner date as YYYY-MM-DD." },
      },
      required: ["recipeId", "date"],
      additionalProperties: false,
    },
  },
  {
    name: "removeMealFromPlan",
    description:
      "Remove one planned dinner by planned meal id. Cooked meals cannot be removed.",
    scope: "write:plan",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        mealId: { type: "string", description: "Planned meal id from listMealPlan." },
      },
      required: ["mealId"],
      additionalProperties: false,
    },
  },
  {
    name: "createSavedRecipe",
    description:
      "Create a custom saved recipe in the household cookbook. Supports dry runs before writing.",
    scope: "write:recipes",
    kind: "mutation",
    requiresConfirmation: true,
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
            },
            required: ["name", "quantity", "unit"],
            additionalProperties: false,
          },
        },
        instructions: {
          type: "array",
          items: { type: "string" },
        },
        effortLevel: {
          type: "string",
          enum: ["easy", "medium", "hard"],
        },
        estimatedTime: { type: "number" },
        servings: { type: "number" },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        nutrition: {
          type: "object",
          properties: {
            calories: { type: "number" },
            protein: { type: "number" },
            carbs: { type: "number" },
            fat: { type: "number" },
            fiber: { type: "number" },
          },
          required: ["calories", "protein", "carbs", "fat"],
          additionalProperties: false,
        },
      },
      required: [
        "title",
        "ingredients",
        "instructions",
        "effortLevel",
        "estimatedTime",
        "servings",
      ],
      additionalProperties: false,
    },
  },
];

export function getAgentTool(name) {
  return FAMILYPLATE_AGENT_TOOLS.find((tool) => tool.name === name) ?? null;
}
