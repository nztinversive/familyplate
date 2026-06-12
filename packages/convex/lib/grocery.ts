export type GroceryItemSource = "plan" | "custom";

export type GroceryListItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  source?: GroceryItemSource;
};

export function sortGroceryItems<T extends GroceryListItem>(items: T[]) {
  return [...items].sort((a, b) =>
    a.category === b.category
      ? a.name.localeCompare(b.name)
      : a.category.localeCompare(b.category)
  );
}

export function buildGeneratedGroceryItems(
  items: Array<Pick<GroceryListItem, "name" | "quantity" | "unit" | "category">>
): GroceryListItem[] {
  return sortGroceryItems(
    items.map((item) => ({
      ...item,
      checked: false,
      source: "plan" as const,
    }))
  );
}

export function getPreservedCustomItems(
  list:
    | {
        mealPlanId?: unknown;
        items: GroceryListItem[];
      }
    | null
    | undefined
) {
  if (!list) return [];

  const preserveLegacyItems = list.mealPlanId === undefined || list.mealPlanId === null;

  return sortGroceryItems(
    list.items
      .filter(
        (item) => item.source === "custom" || (!item.source && preserveLegacyItems)
      )
      .map((item) => ({
        ...item,
        source: "custom" as const,
      }))
  );
}
