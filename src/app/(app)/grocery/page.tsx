"use client";

import { ShoppingCart } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function GroceryPage() {
  return (
    <AppShell header={<PageHeader title="Grocery List" />}>
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No grocery list yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-[240px]">
          Generate a meal plan first and we&apos;ll create your shopping list automatically.
        </p>
      </div>
    </AppShell>
  );
}
