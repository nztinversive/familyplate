export const MAX_AI_REPORT_DETAILS_LENGTH = 1_000;
export const MAX_AI_CONTENT_SNAPSHOT_LENGTH = 6_000;

type ReportableRecipe = {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    inPantry: boolean;
  }>;
  instructions: string[];
};

export function normalizeAiReportDetails(details?: string) {
  const normalized = details?.trim();
  if (!normalized) return undefined;

  if (normalized.length > MAX_AI_REPORT_DETAILS_LENGTH) {
    throw new Error(
      `Report details must be ${MAX_AI_REPORT_DETAILS_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function buildAiContentSnapshot(recipe: ReportableRecipe) {
  const ingredients = recipe.ingredients
    .map(
      (ingredient) =>
        `${ingredient.quantity} ${ingredient.unit} ${ingredient.name} (${ingredient.inPantry ? "in pantry" : "missing"})`,
    )
    .join("; ");
  const instructions = recipe.instructions
    .map((step, index) => `${index + 1}. ${step}`)
    .join("\n");
  const snapshot = [
    `Title: ${recipe.title}`,
    `Description: ${recipe.description}`,
    `Ingredients: ${ingredients}`,
    `Instructions:\n${instructions}`,
  ].join("\n");

  return snapshot.slice(0, MAX_AI_CONTENT_SNAPSHOT_LENGTH);
}
