"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { Check, CheckCircle2, ListChecks, Package, PartyPopper, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAlwaysAvailableIngredient } from "@/lib/ingredientAvailability";

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
  const addMyCustomItem = useMutation(api.mutations.grocery.addMyCustomItem);
  const removeItem = useMutation(api.mutations.grocery.removeItem);
  const clearAllItems = useMutation(api.mutations.grocery.clearAll);
  const addToPantry = useMutation(api.mutations.pantry.addItem);

  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "remaining" | "checked">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Preserve the original DB index when filtering out always-available items
  // (like water), since Convex mutations like toggleItem/removeItem operate
  // on the unfiltered items array by index.
  const items = useMemo(
    () =>
      (groceryList?.items ?? [])
        .map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter((item) => !isAlwaysAvailableIngredient(item.name)),
    [groceryList?.items]
  );
  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const groupedItems = useMemo(() => {
    const filteredItems = items
      .map((item) => ({ ...item, index: item.originalIndex }))
      .filter((item) => {
        if (activeTab === "remaining") return !item.checked;
        if (activeTab === "checked") return item.checked;
        return true;
      });

    const categories = Array.from(new Set(filteredItems.map((item) => item.category))).sort();
    return categories.map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category === category),
    }));
  }, [activeTab, items]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateFromPlan({});
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (!groceryList) return;
    try {
      await clearAllItems({ groceryListId: groceryList._id });
      toast("Grocery list cleared", "info");
    } catch (err) {
      console.error("Failed to clear grocery list:", err);
      toast("Failed to clear list", "error");
    }
    setShowClearConfirm(false);
  };

  const handleToggle = async (groceryListId: Id<"groceryLists">, itemIndex: number) => {
    setBusyIndex(itemIndex);
    try {
      await toggleItem({ groceryListId, itemIndex });
    } finally {
      setBusyIndex(null);
    }
  };

  const handleAddToPantry = async (item: { name: string; quantity: number; unit: string; category: string }, itemIndex: number) => {
    if (!groceryList) return;
    setBusyIndex(itemIndex);
    try {
      await addToPantry({
        householdId: groceryList.householdId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        storageLocation: "pantry",
      });
      await removeItem({ groceryListId: groceryList._id, itemIndex });
      toast("Added to pantry!", "success");
    } catch (err) {
      toast("Failed to add to pantry", "error");
    } finally {
      setBusyIndex(null);
    }
  };

  const handleRemove = async (groceryListId: Id<"groceryLists">, itemIndex: number) => {
    setBusyIndex(itemIndex);
    try {
      await removeItem({ groceryListId, itemIndex });
    } catch (err) {
      console.error("Failed to remove item:", err);
      toast("Failed to remove item", "error");
    } finally {
      setBusyIndex(null);
    }
  };

  const handleAddItem = async (values: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => {
    if (groceryList) {
      await addCustomItem({
        groceryListId: groceryList._id,
        ...values,
      });
      return;
    }

    await addMyCustomItem(values);
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="Grocery List"
          subtitle={
            totalCount > 0
              ? `${checkedCount}/${totalCount} checked`
              : "Shop by category"
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-5 w-5" />
              </Button>
              <Button
                size="sm"
                onClick={() => void handleGenerate()}
                disabled={isGenerating || !mealPlan}
                className="gap-2"
              >
                <ListChecks className="h-4 w-4" />
                {isGenerating ? "Generating..." : "From Plan"}
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4 page-transition">
        {totalCount > 0 && checkedCount === totalCount ? (
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-primary/20 p-5 text-center animate-scale-in">
            <div className="flex justify-center mb-3">
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 animate-check-bounce">
                  <PartyPopper className="h-5 w-5 text-accent" />
                </div>
              </div>
            </div>
            <h3 className="text-base font-semibold tracking-tight mb-1">Shopping done!</h3>
            <p className="text-xs text-muted-foreground mb-3">All {totalCount} items checked off. Nice work!</p>
            <p className="text-[11px] text-muted-foreground/70">Tip: Move checked items to your pantry with the &quot;Pantry&quot; button.</p>
          </div>
        ) : totalCount > 0 ? (
          <div className="space-y-2 animate-fade-in">
            <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {checkedCount} of {totalCount} items checked
              </p>
              <p className="text-xs font-semibold text-primary">{progressPct}%</p>
            </div>
          </div>
        ) : null}

        {groceryList === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-14 rounded-xl" />
            ))}
          </div>
        ) : totalCount === 0 ? (
          <EmptyGroceryState
            hasPlan={!!mealPlan}
            isGenerating={isGenerating}
            onAdd={() => setShowAddDialog(true)}
            onGenerate={() => void handleGenerate()}
          />
        ) : (
          <>
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="remaining">To Buy</TabsTrigger>
                <TabsTrigger value="checked">Checked</TabsTrigger>
              </TabsList>
            </Tabs>

            {!showClearConfirm ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Clear all items
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 animate-fade-in">
                <span className="text-xs text-muted-foreground">Clear all items?</span>
                <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => void handleClearAll()}>
                  Yes, clear
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
              </div>
            )}

            <div className="space-y-5">
              {groupedItems.map((group) => (
                <div key={group.category} className="animate-fade-in">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {group.category}
                    </p>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {group.items.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((item) => (
                      <Card
                        key={`${item.name}-${item.index}`}
                        className={`overflow-hidden card-interactive transition-all duration-300 ${item.checked ? "opacity-50" : ""}`}
                      >
                        <CardContent className="flex items-center gap-3 p-3">
                          <button
                            type="button"
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                              item.checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/25 hover:border-primary/50"
                            }`}
                            disabled={busyIndex === item.index}
                            onClick={() => groceryList && void handleToggle(groceryList._id, item.index)}
                          >
                            {item.checked && <Check className="h-3 w-3 animate-check-bounce" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium transition-all duration-200 ${
                                item.checked ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit}
                            </p>
                          </div>
                          {item.checked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
                              disabled={busyIndex === item.index}
                              onClick={() => void handleAddToPantry(item, item.index)}
                            >
                              <Package className="h-3 w-3" />
                              {busyIndex === item.index ? "..." : "Pantry"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 text-destructive/50 hover:text-destructive"
                            disabled={busyIndex === item.index}
                            onClick={() => groceryList && void handleRemove(groceryList._id, item.index)}
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
          </>
        )}

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Grocery Item</DialogTitle>
              <DialogDescription>
                Add a manual item now or build a full list from the weekly plan.
              </DialogDescription>
            </DialogHeader>
            <AddGroceryItemForm
              onSubmit={handleAddItem}
              onComplete={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function AddGroceryItemForm({
  onSubmit,
  onComplete,
}: {
  onSubmit: (values: {
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }) => Promise<void>;
  onComplete: () => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("count");
  const [category, setCategory] = useState("Other");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedQuantity = Number.parseFloat(quantity);

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({
        name: name.trim(),
        quantity: parsedQuantity,
        unit: unit.trim() || "count",
        category,
      });
      onComplete();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to add grocery item."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-scale-in">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="grocery-name">Name</Label>
        <Input
          id="grocery-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Bananas"
          autoFocus
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="grocery-quantity">Quantity</Label>
          <Input
            id="grocery-quantity"
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="grocery-unit">Unit</Label>
          <Input
            id="grocery-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="count, lb, oz..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
                category === option
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-background text-foreground hover:border-primary/30"
              }`}
              onClick={() => setCategory(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add to List"}
      </Button>
    </form>
  );
}

function EmptyGroceryState({
  hasPlan,
  isGenerating,
  onAdd,
  onGenerate,
}: {
  hasPlan: boolean;
  isGenerating: boolean;
  onAdd: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in-up">
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5">
          <ShoppingCart className="h-11 w-11 text-primary" />
        </div>
        {/* Floating accent items */}
        <div className="absolute -top-2 -right-3 text-lg animate-pulse-soft" style={{ animationDelay: "0.2s" }}>🥬</div>
        <div className="absolute -bottom-1 -left-3 text-lg animate-pulse-soft" style={{ animationDelay: "0.6s" }}>🍎</div>
        <div className="absolute top-1 -left-5 text-sm animate-pulse-soft" style={{ animationDelay: "1s" }}>🥖</div>
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">No grocery items yet</h3>
      <p className="mb-6 max-w-[280px] text-sm text-muted-foreground leading-relaxed">
        {hasPlan
          ? "Generate a smart list from your meal plan \u2014 it subtracts what\u2019s already in your pantry."
          : "Head to the Plan tab and generate a meal plan first, then come back to auto-build your grocery list."}
      </p>
      <p className="mb-8 max-w-[260px] text-xs text-muted-foreground/70 leading-relaxed">
        {hasPlan
          ? "\uD83D\uDCA1 Items you check off can be added straight to your pantry."
          : "\uD83D\uDCA1 Or add items manually for a quick errand run."}
      </p>
      <div className="flex w-full max-w-[260px] flex-col gap-2">
        <Button onClick={onAdd} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
        {hasPlan && (
          <Button variant="outline" onClick={onGenerate} disabled={isGenerating} className="gap-2">
            <ListChecks className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate from Plan"}
          </Button>
        )}
      </div>
    </div>
  );
}
