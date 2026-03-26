"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  Camera,
  CalendarClock,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarcodeScanner, type BarcodeScannerResult } from "@/components/pantry/BarcodeScanner";
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

type StorageLocation = "pantry" | "fridge" | "freezer";
type PantryItem = Doc<"pantryItems">;

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

const STORAGE_LOCATIONS: StorageLocation[] = ["pantry", "fridge", "freezer"];

function formatDateInput(timestamp?: number) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getExpirationTone(timestamp?: number) {
  if (!timestamp) return "outline" as const;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(timestamp);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "destructive" as const;
  if (diffDays <= 3) return "secondary" as const;
  return "outline" as const;
}

function formatExpirationLabel(timestamp?: number) {
  if (!timestamp) return "No expiration";
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return `Expired ${Math.abs(diffDays)}d ago`;
  }

  if (diffDays === 0) {
    return "Expires today";
  }

  if (diffDays <= 7) {
    return `Expires in ${diffDays}d`;
  }

  return `Exp ${date.toLocaleDateString()}`;
}

function getLocationLabel(location: StorageLocation) {
  return location.charAt(0).toUpperCase() + location.slice(1);
}

export default function PantryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | StorageLocation>("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [prefillValues, setPrefillValues] = useState<BarcodeScannerResult | undefined>();
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  const currentUser = useQuery(api.queries.profiles.getCurrentUser, {});
  const householdId = currentUser?.householdId ?? null;
  const pantryItems = useQuery(
    api.queries.pantry.getMyPantryItems,
    activeTab === "all" ? {} : { storageLocation: activeTab }
  );

  const deleteItem = useMutation(api.mutations.pantry.deleteItem);
  const updateItem = useMutation(api.mutations.pantry.updateItem);

  const filteredItems = useMemo(() => {
    return (pantryItems ?? [])
      .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.expirationDate && b.expirationDate) {
          return a.expirationDate - b.expirationDate;
        }
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [pantryItems, searchQuery]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setPrefillValues(undefined);
    setShowItemDialog(true);
  };

  const openEditDialog = (item: PantryItem) => {
    setEditingItem(item);
    setPrefillValues(undefined);
    setShowItemDialog(true);
  };

  const closeItemDialog = () => {
    setShowItemDialog(false);
    setEditingItem(null);
    setPrefillValues(undefined);
  };

  const handleScannerResult = (result: BarcodeScannerResult) => {
    setEditingItem(null);
    setPrefillValues(result);
    setShowScanner(false);
    setShowItemDialog(true);
  };

  const handleQuickAdjust = async (item: PantryItem, delta: number) => {
    const nextQuantity = Math.round((item.quantity + delta) * 100) / 100;
    if (nextQuantity <= 0) return;

    await updateItem({
      itemId: item._id,
      quantity: nextQuantity,
    });
  };

  return (
    <AppShell
      header={
        <PageHeader
          title="My Pantry"
          subtitle={
            pantryItems
              ? `${pantryItems.length} item${pantryItems.length === 1 ? "" : "s"}`
              : undefined
          }
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowScanner(true)}
                aria-label="Scan barcode"
              >
                <Camera className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={openCreateDialog}
                disabled={!householdId}
                aria-label="Add pantry item"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          }
        />
      }
    >
      <div className="space-y-4 px-4 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pantry items..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pantry">Pantry</TabsTrigger>
            <TabsTrigger value="fridge">Fridge</TabsTrigger>
            <TabsTrigger value="freezer">Freezer</TabsTrigger>
          </TabsList>
        </Tabs>

        {!pantryItems ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            location={activeTab === "all" ? undefined : activeTab}
            onAdd={openCreateDialog}
          />
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Card key={item._id} className="overflow-hidden">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <Badge variant="outline" className="capitalize">
                          {getLocationLabel(item.storageLocation)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => openEditDialog(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{item.category}</Badge>
                    <Badge variant={getExpirationTone(item.expirationDate)}>
                      <CalendarClock className="mr-1 h-3 w-3" />
                      {formatExpirationLabel(item.expirationDate)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-full border bg-background p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={item.quantity <= 1}
                        onClick={() => void handleQuickAdjust(item, -1)}
                        aria-label={`Decrease ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="min-w-12 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => void handleQuickAdjust(item, 1)}
                        aria-label={`Increase ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => void deleteItem({ itemId: item._id })}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog
          open={showItemDialog}
          onOpenChange={(open) => {
            if (!open) closeItemDialog();
            else setShowItemDialog(true);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
              <DialogDescription>
                Track quantity, category, storage location, and expiration details.
              </DialogDescription>
            </DialogHeader>
            {householdId && (
              <PantryItemDialogForm
                householdId={householdId}
                item={editingItem}
                prefillValues={prefillValues}
                onComplete={closeItemDialog}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
            <DialogHeader className="px-4 pt-4">
              <DialogTitle className="sr-only">Barcode scanner</DialogTitle>
              <DialogDescription className="sr-only">
                Scan a product barcode to pre-fill a pantry item.
              </DialogDescription>
            </DialogHeader>
            <BarcodeScanner
              onClose={() => setShowScanner(false)}
              onScan={handleScannerResult}
            />
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}

function PantryItemDialogForm({
  householdId,
  item,
  prefillValues,
  onComplete,
}: {
  householdId: Id<"households">;
  item: PantryItem | null;
  prefillValues?: BarcodeScannerResult;
  onComplete: () => void;
}) {
  const addItem = useMutation(api.mutations.pantry.addItem);
  const updateItem = useMutation(api.mutations.pantry.updateItem);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("items");
  const [category, setCategory] = useState("Other");
  const [storageLocation, setStorageLocation] = useState<StorageLocation>("pantry");
  const [expirationDate, setExpirationDate] = useState("");
  const [barcode, setBarcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(`${item.quantity}`);
      setUnit(item.unit);
      setCategory(item.category);
      setStorageLocation(item.storageLocation);
      setExpirationDate(formatDateInput(item.expirationDate));
      setBarcode(item.barcode ?? "");
      setError("");
      return;
    }

    setName(prefillValues?.name ?? "");
    setQuantity(prefillValues?.quantity ?? "1");
    setUnit(prefillValues?.unit ?? "items");
    setCategory(
      prefillValues?.category && CATEGORIES.includes(prefillValues.category)
        ? prefillValues.category
        : "Other"
    );
    setStorageLocation("pantry");
    setExpirationDate("");
    setBarcode(prefillValues?.barcode ?? "");
    setError("");
  }, [item, prefillValues]);

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
      const trimmedName = name.trim();
      const trimmedUnit = unit.trim() || "items";
      const trimmedBarcode = barcode.trim();
      const expirationTimestamp = expirationDate
        ? new Date(`${expirationDate}T12:00:00`).getTime()
        : undefined;

      if (item) {
        await updateItem({
          itemId: item._id,
          name: trimmedName,
          quantity: parsedQuantity,
          unit: trimmedUnit,
          category,
          storageLocation,
          ...(expirationTimestamp !== undefined
            ? { expirationDate: expirationTimestamp }
            : item.expirationDate
              ? { clearExpirationDate: true }
              : {}),
          ...(trimmedBarcode ? { barcode: trimmedBarcode } : item.barcode ? { clearBarcode: true } : {}),
        });
      } else {
        await addItem({
          householdId,
          name: trimmedName,
          quantity: parsedQuantity,
          unit: trimmedUnit,
          category,
          storageLocation,
          ...(expirationTimestamp !== undefined
            ? { expirationDate: expirationTimestamp }
            : {}),
          ...(trimmedBarcode ? { barcode: trimmedBarcode } : {}),
        });
      }

      onComplete();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save item."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
      {prefillValues?.message && !item && (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          {prefillValues.message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="pantry-name">Name</Label>
        <Input
          id="pantry-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Chicken breast"
          autoFocus
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="pantry-quantity">Quantity</Label>
          <Input
            id="pantry-quantity"
            type="number"
            min="0.1"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pantry-unit">Unit</Label>
          <Input
            id="pantry-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="items, lb, oz..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pantry-expiration">Expiration Date</Label>
        <Input
          id="pantry-expiration"
          type="date"
          value={expirationDate}
          onChange={(event) => setExpirationDate(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pantry-barcode">Barcode</Label>
        <Input
          id="pantry-barcode"
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          placeholder="Optional barcode"
        />
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

      <div className="space-y-2">
        <Label>Storage Location</Label>
        <div className="grid grid-cols-3 gap-2">
          {STORAGE_LOCATIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                storageLocation === option
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground"
              }`}
              onClick={() => setStorageLocation(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : item ? "Save Changes" : "Add Item"}
      </Button>
    </form>
  );
}

function EmptyState({
  location,
  onAdd,
}: {
  location?: StorageLocation;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <Package className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">
        {location ? `No items in the ${location}` : "Your pantry is empty"}
      </h3>
      <p className="mb-6 max-w-[260px] text-sm text-muted-foreground">
        Add what your household already has so grocery lists and meal plans stay useful.
      </p>
      <Button onClick={onAdd}>
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </Button>
    </div>
  );
}
