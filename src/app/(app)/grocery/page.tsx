"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Check, ListChecks, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
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
  const addToPantry = useMutation(api.mutations.pantry.addItem);

  const [isGenerating, setIsGenerating] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "remaining" | "checked">("all");

  const items = useMemo(() => groceryList?.items ?? [], [groceryList?.items]);
  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const groupedItems = useMemo(() => {
    const filteredItems = items
      .map((item, index) => ({ ...item, index }))
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
    } catch (err) {
      console.error("Failed to add to pantry:", err);
    } finally {
      setBusyIndex(null);
    }
  };

  const handleRemove = async (groceryListId: Id<"groceryLists">, itemIndex: number) => {
    setBusyIndex(itemIndex);
    try {
      await removeItem({ groceryListId, itemIndex });
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
              ? `${checkedCount}/${totalCount} checked (${progressPct}%)`
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
              >
                <ListChecks className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : "From Plan"}
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4">
        {totalCount > 0 && (
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {checkedCount} of {totalCount} items checked
            </p>
          </div>
        )}

        {groceryList === undefined ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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

            <div className="space-y-4">
              {groupedItems.map((group) => (
                <div key={group.category}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {group.category}
                    </p>
                    <Badge variant="outline">{group.items.length}</Badge>
                  </div>
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
                            onClick={() => groceryList && void handleToggle(groceryList._id, item.index)}
                          >
                            {item.checked && <Check className="h-3 w-3" />}
                          </button>
                          <div className="min-w-0 flex-1">
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
                          {item.checked && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 shrink-0 gap-1 text-xs text-primary"
                              disabled={busyIndex === item.index}
                              onClick={() => void handleAddToPantry(item, item.index)}
                            >
                              <Package className="h-3 w-3" />
                              {busyIndex === item.index ? "Moving..." : "Pantry"}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive"
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
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
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
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                category === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground"
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
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No grocery items yet</h3>
      <p className="mb-6 max-w-[260px] text-sm text-muted-foreground">
        {hasPlan
          ? "Generate a list from your meal plan or add a manual item for a quick errand run."
          : "Add items manually now, or create a meal plan first and generate the list automatically."}
      </p>
      <div className="flex w-full max-w-[260px] flex-col gap-2">
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
        {hasPlan && (
          <Button variant="outline" onClick={onGenerate} disabled={isGenerating}>
            <ListChecks className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate from Plan"}
          </Button>
        )}
      </div>
    </div>
  );
}
