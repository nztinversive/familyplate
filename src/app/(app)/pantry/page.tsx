"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Package,
  Plus,
  Search,
  Trash2,
  Minus,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StorageLocation = "pantry" | "fridge" | "freezer";

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Grains",
  "Canned",
  "Snacks",
  "Beverages",
  "Condiments",
  "Frozen",
  "Other",
];

export default function PantryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | StorageLocation>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Get current user's profile to find household
  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const householdId = currentUser?.householdId;

  // Fetch pantry items
  const pantryItems = useQuery(
    api.queries.pantry.getMyPantryItems,
    activeTab === "all" ? {} : { storageLocation: activeTab }
  );

  const deleteItem = useMutation(api.mutations.pantry.deleteItem);
  const updateItem = useMutation(api.mutations.pantry.updateItem);

  const filteredItems = (pantryItems ?? []).filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell
      header={
        <PageHeader
          title="My Pantry"
          subtitle={
            pantryItems
              ? `${pantryItems.length} item${pantryItems.length !== 1 ? "s" : ""}`
              : undefined
          }
          action={
            <Button size="icon" onClick={() => setShowAddForm(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          }
        />
      }
    >
      <div className="px-4 py-4 space-y-4">
        {/* Add Item Form */}
        {showAddForm && householdId && (
          <AddItemForm
            householdId={householdId}
            onClose={() => setShowAddForm(false)}
          />
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pantry items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Filter Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
            <TabsTrigger value="pantry" className="flex-1">Pantry</TabsTrigger>
            <TabsTrigger value="fridge" className="flex-1">Fridge</TabsTrigger>
            <TabsTrigger value="freezer" className="flex-1">Freezer</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Items List */}
        {!pantryItems ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            location={activeTab === "all" ? undefined : activeTab}
            onAdd={() => setShowAddForm(true)}
          />
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Card key={item._id} className="overflow-hidden">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {item.category}
                      </Badge>
                      {item.expirationDate && (
                        <span className="text-xs text-muted-foreground">
                          exp{" "}
                          {new Date(item.expirationDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateItem({
                            itemId: item._id,
                            quantity: item.quantity - 1,
                          });
                        }
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        updateItem({
                          itemId: item._id,
                          quantity: item.quantity + 1,
                        })
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteItem({ itemId: item._id })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function AddItemForm({
  householdId,
  onClose,
}: {
  householdId: string;
  onClose: () => void;
}) {
  const addItem = useMutation(api.mutations.pantry.addItem);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("items");
  const [category, setCategory] = useState("Other");
  const [location, setLocation] = useState<StorageLocation>("pantry");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await addItem({
        householdId: householdId as any,
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit,
        category,
        storageLocation: location,
      });
      onClose();
    } catch (err) {
      console.error("Add item failed:", err);
      setError(err instanceof Error ? err.message : "Failed to add item");
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
        {error && (
          <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="itemName">Name</Label>
            <Input
              id="itemName"
              placeholder="e.g., Chicken breast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                type="number"
                min="0.1"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="items, lbs, oz..."
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
          <div>
            <Label>Storage</Label>
            <div className="flex gap-2 mt-1">
              {(["pantry", "fridge", "freezer"] as StorageLocation[]).map(
                (loc) => (
                  <Badge
                    key={loc}
                    variant={location === loc ? "default" : "outline"}
                    className="cursor-pointer capitalize"
                    onClick={() => setLocation(loc)}
                  >
                    {loc}
                  </Badge>
                )
              )}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add to Pantry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  location,
  onAdd,
}: {
  location?: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Package className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {location ? `Your ${location} is empty` : "Your pantry is empty"}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-[240px]">
        Start by adding items you already have at home.
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  );
}
