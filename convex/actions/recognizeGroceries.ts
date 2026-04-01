"use node";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action } from "../_generated/server";

type RecognizedItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: "high" | "medium" | "low";
};

export const recognizeFromPhoto = action({
  args: {
    imageBase64: v.string(),
  },
  handler: async (ctx, args): Promise<{ items: RecognizedItem[] }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be signed in.");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured.");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a grocery item recognition assistant. Given a photo, identify all visible food/grocery items with their approximate quantities. Be specific about the item name (e.g. "Roma tomatoes" not just "tomatoes"). Estimate quantities based on what you see. Assign a category to each item from: Produce, Meat, Dairy, Grains, Condiments, Frozen, Canned, Snacks, Beverages, Other. Rate your confidence for each item as high, medium, or low. Return valid JSON matching the schema.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify all grocery/food items in this photo. For each item, estimate the quantity, appropriate unit (items, lb, oz, bunch, bag, etc.), and category. Be as specific as possible with names.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${args.imageBase64}`,
                  detail: "high",
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "grocery_recognition",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "number" },
                      unit: { type: "string" },
                      category: {
                        type: "string",
                        enum: [
                          "Produce",
                          "Meat",
                          "Dairy",
                          "Grains",
                          "Condiments",
                          "Frozen",
                          "Canned",
                          "Snacks",
                          "Beverages",
                          "Other",
                        ],
                      },
                      confidence: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                      },
                    },
                    required: ["name", "quantity", "unit", "category", "confidence"],
                  },
                },
              },
              required: ["items"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision API failed:", errorText);
      throw new Error("Unable to analyze the photo right now.");
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("No response from vision model.");

    const parsed = JSON.parse(content) as { items: RecognizedItem[] };
    return { items: parsed.items ?? [] };
  },
});
