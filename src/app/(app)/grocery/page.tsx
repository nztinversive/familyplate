"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Check,
  X,
  ListChecks,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const CATEGORIES = [
  "Produce",
  "Meat",
  "Dairy",
  "Grains",
  "Condiments",
  "Frozen",
  "Other",
];

export default function GroceryPage() {
  const groceryList = useQuery(api.queries.grocery.getMyGroceryList, {});
  const mealPlan = useQuery(api.queries.planner.getMyMealPlan, {});

  const generateFromPlan = useMutation(api.mutations.grocery.generateFromPlan);
  const toggleItem = useMutation(api.mutations.grocery.toggleItem);
  const addCustomItem = useMutation(api.mutations.grocery.addCustomItem);
  const removeItem = useMutation(api.mutations.grocery.removeItem);

  const [isGenerating, setIsGenerating] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const items = groceryList?.items ?? [];
  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  const filteredItems = items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => {
      if (activeTab === "all") return true;
      if (activeTab === "remaining") return !item.checked;
      if (activeTab === "checked") return item.checked;
      return true;
    });

  const groupedItems = categories
    .map((cat) => ({
      category: cat,
      items: filteredItems.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateFromPlan({});
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggle = async (listId: Id<"groceryLists">, itemIndex: number) => {
    setBusyIndex(itemIndex);
    try {
      await toggleItem({ groceryListId: listId, itemIndex });
    } finally {
      setBusyIndex(null);
    }
  };

  const handleRemove = async (listId: Id<"groceryLists">, itemIndex: number) => {
    setBusyIndex(itemIndex);
    try {
      await removeItem({ groceryListId: listId, itemIndex });
    } finally {
      setBusyIndex(null);
    }
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="Grocery List"
          subtitle={
            totalCount > 0
              ? `${checkedCount}/${totalCount} checked (${progressPct}%)`
              : undefined
          }
          action={
            <Button
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !mealPlan}
            >
              <ListChecks className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "From Plan"}
            </Button>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4">
        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {checkedCount} of {totalCount} items
            </p>
          </div>
        )}

        {groceryList === undefined ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : !groceryList || totalCount === 0 ? (
          <EmptyGroceryState
            hasPlan={!!mealPlan}
            onGenerate={() => void handleGenerate()}
            isGenerating={isGenerating}
          />
        ) : (
          <>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="remaining" className="flex-1">To Buy</TabsTrigger>
                <TabsTrigger value="checked" className="flex-1">Checked</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.category}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {group.category}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <Card
                        key={`${item.name}-${item.index}`}
                        className={item.checked ? "opacity-60" : ""}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <button
                            type="button"
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                              item.checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30"
                            }`}
                            disabled={busyIndex === item.index}
                            onClick={() =>
                              void handleToggle(groceryList._id, item.index)
                            }
                          >
                            {item.checked && <Check className="h-3 w-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                item.checked ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive"
                            disabled={busyIndex === item.index}
                            onClick={() =>
                              void handleRemove(groceryList._id, item.index)
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add custom item */}
            {showAddForm ? (
              <AddItemForm
                groceryListId={groceryList._id}
                onClose={() => setShowAddForm(false)}
              />
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Custom Item
              </Button>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function AddItemForm({
  groceryListId,
  onClose,
}: {
  groceryListId: Id<"groceryLists">;
  onClose: () => void;
}) {
  const addCustomItem = useMutation(api.mutations.grocery.addCustomItem);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("count");
  const [category, setCategory] = useState("Other");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await addCustomItem({
        groceryListId,
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit,
        category,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Add Item</h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <div>
            <Label htmlFor="groceryItemName">Name</Label>
            <Input
              id="groceryItemName"
              placeholder="e.g., Bananas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="groceryQty">Quantity</Label>
              <Input
                id="groceryQty"
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="groceryUnit">Unit</Label>
              <Input
                id="groceryUnit"
                placeholder="count, lb, oz..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Category</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={category === cat ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to List"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmptyGroceryState({
  hasPlan,
  onGenerate,
  isGenerating,
}: {
  hasPlan: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No grocery list yet</h3>
      <p className="mb-6 max-w-[260px] text-sm text-muted-foreground">
        {hasPlan
          ? "Generate a grocery list from your meal plan. We'll subtract what's already in your pantry."
          : "Create a meal plan first, then generate your shopping list automatically."}
      </p>
      {hasPlan && (
        <Button onClick={onGenerate} disabled={isGenerating}>
          <ListChecks className="mr-2 h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate from Plan"}
        </Button>
      )}
    </div>
  );
}
