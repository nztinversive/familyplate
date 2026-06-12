export const FAMILYPLATE_AGENT_SCOPES = [
  "read:profile",
  "read:pantry",
  "read:grocery",
  "read:plan",
  "read:recipes",
  "write:grocery",
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
];

export function getAgentTool(name) {
  return FAMILYPLATE_AGENT_TOOLS.find((tool) => tool.name === name) ?? null;
}
