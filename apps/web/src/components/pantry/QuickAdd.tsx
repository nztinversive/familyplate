"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inferPantryCategory, type PantryCategory } from "@/lib/pantryCategories";

type ParsedItem = {
  name: string;
  quantity: number;
  unit: string;
  category: PantryCategory;
};

const UNIT_PATTERNS: Array<{ pattern: RegExp; unit: string }> = [
  { pattern: /\b(lb|lbs|pound|pounds)\b/i, unit: "lb" },
  { pattern: /\b(oz|ounce|ounces)\b/i, unit: "oz" },
  { pattern: /\b(kg|kilogram|kilograms)\b/i, unit: "kg" },
  { pattern: /\b(g|gram|grams)\b/i, unit: "g" },
  { pattern: /\b(cup|cups)\b/i, unit: "cup" },
  { pattern: /\b(tbsp|tablespoon|tablespoons)\b/i, unit: "tbsp" },
  { pattern: /\b(tsp|teaspoon|teaspoons)\b/i, unit: "tsp" },
  { pattern: /\b(dozen)\b/i, unit: "dozen" },
  { pattern: /\b(gallon|gallons|gal)\b/i, unit: "gallon" },
  { pattern: /\b(liter|liters|l)\b/i, unit: "liter" },
  { pattern: /\b(can|cans)\b/i, unit: "can" },
  { pattern: /\b(bag|bags)\b/i, unit: "bag" },
  { pattern: /\b(box|boxes)\b/i, unit: "box" },
  { pattern: /\b(bunch|bunches)\b/i, unit: "bunch" },
  { pattern: /\b(head|heads)\b/i, unit: "head" },
  { pattern: /\b(pack|packs|package|packages)\b/i, unit: "pack" },
  { pattern: /\b(bottle|bottles)\b/i, unit: "bottle" },
  { pattern: /\b(jar|jars)\b/i, unit: "jar" },
];

function parseNaturalLanguage(input: string): ParsedItem[] {
  // Split by comma or newline
  const parts = input.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);

  return parts.map((part) => {
    let quantity = 1;
    let unit = "items";
    let name = part;

    // Try to extract leading number: "2 lbs chicken" or "1/2 cup flour"
    const numMatch = part.match(/^(\d+\.?\d*|\d+\/\d+)\s*/);
    if (numMatch) {
      const raw = numMatch[1];
      if (raw.includes("/")) {
        const [num, den] = raw.split("/");
        quantity = parseInt(num) / parseInt(den);
      } else {
        quantity = parseFloat(raw);
      }
      name = part.slice(numMatch[0].length);
    }

    // Try to extract unit
    for (const { pattern, unit: u } of UNIT_PATTERNS) {
      if (pattern.test(name)) {
        unit = u;
        name = name.replace(pattern, "").trim();
        break;
      }
    }

    // Clean up name
    name = name.replace(/^\s*of\s+/i, "").replace(/\s+/g, " ").trim();

    // Capitalize first letter
    if (name.length > 0) {
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }

    return {
      name,
      quantity: Math.max(0.1, quantity),
      unit,
      category: inferPantryCategory(name, unit),
    };
  }).filter((item) => item.name.length > 0);
}

export function QuickAddBar({
  onAdd,
}: {
  onAdd: (items: ParsedItem[]) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = async () => {
    const items = parseNaturalLanguage(input);
    if (items.length === 0) return;

    setIsAdding(true);
    try {
      await onAdd(items);
      setInput("");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder='Quick add: "2 lbs chicken, milk, 3 onions"'
        className="flex-1 text-sm"
        disabled={isAdding}
      />
      <Button
        size="icon"
        onClick={() => void handleSubmit()}
        disabled={isAdding || !input.trim()}
        className="shrink-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
