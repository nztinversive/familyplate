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
  Snowflake,
  Trash2,
  Thermometer,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpirationAlerts } from "@/components/pantry/ExpirationAlerts";
import { BarcodeScanner, type BarcodeScannerResult } from "@/components/pantry/BarcodeScanner";
import { QuickAddBar } from "@/components/pantry/QuickAdd";
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
  "Fresh",
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

const UNITS = [
  "items",
  "lb",
  "oz",
  "kg",
  "g",
  "cups",
  "tbsp",
  "tsp",
  "ml",
  "L",
  "gal",
  "fl oz",
  "dozen",
  "bunch",
  "bag",
  "box",
  "can",
  "jar",
  "bottle",
  "pack",
  "slices",
];

const STORAGE_LOCATIONS: StorageLocation[] = ["pantry", "fridge", "freezer"];

const STORAGE_ICONS: Record<StorageLocation, typeof Package> = {
  pantry: Package,
  fridge: Thermometer,
  freezer: Snowflake,
};

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

  const addItem = useMutation(api.mutations.pantry.addItem);
  const deleteItem = useMutation(api.mutations.pantry.deleteItem);
  const { toast } = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
      <div className="space-y-4 px-4 py-4 page-transition">
        <ExpirationAlerts />

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search pantry items..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/40 border-0 focus-visible:ring-1"
          />
        </div>

        {householdId && (
          <QuickAddBar
            onAdd={async (items) => {
              for (const item of items) {
                await addItem({
                  householdId: householdId,
                  name: item.name,
                  quantity: item.quantity,
                  unit: item.unit,
                  category: "Other",
                  storageLocation: "pantry",
                });
              }
              toast(`Added ${items.length} item${items.length > 1 ? "s" : ""}!`, "success");
            }}
          />
        )}

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
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            location={activeTab === "all" ? undefined : activeTab}
            onAdd={openCreateDialog}
          />
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item, index) => {
              const LocationIcon = STORAGE_ICONS[item.storageLocation] ?? Package;
              const expirationTone = getExpirationTone(item.expirationDate);
              const isExpired = expirationTone === "destructive";

              return (
                <Card
                  key={item._id}
                  className={`overflow-hidden card-interactive opacity-0 animate-fade-in stagger-${Math.min(index + 1, 7)} ${
                    isExpired ? "border-destructive/30" : ""
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3 p-3.5">
                      {/* Location icon */}
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        item.storageLocation === "freezer"
                          ? "bg-blue-50 text-blue-500"
                          : item.storageLocation === "fridge"
                            ? "bg-cyan-50 text-cyan-600"
                            : "bg-amber-50 text-amber-600"
                      }`}>
                        <LocationIcon className="h-4.5 w-4.5" />
                      </div>

                      {/* Item info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {item.quantity} {item.unit}
                          </span>
                          <span className="text-muted-foreground/30">|</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {item.category}
                          </span>
                        </div>
                      </div>

                      {/* Edit button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => openEditDialog(item)}
                        aria-label={`Edit ${item.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Bottom bar: expiration + quantity controls + delete */}
                    <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-3.5 py-2">
                      <Badge variant={expirationTone} className="text-[11px]">
                        <CalendarClock className="mr-1 h-3 w-3" />
                        {formatExpirationLabel(item.expirationDate)}
                      </Badge>

                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0.5 rounded-full border bg-background p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            disabled={item.quantity <= 1}
                            onClick={() => void handleQuickAdjust(item, -1)}
                            aria-label={`Decrease ${item.name}`}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="min-w-8 text-center text-xs font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full"
                            onClick={() => void handleQuickAdjust(item, 1)}
                            aria-label={`Increase ${item.name}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                          onClick={() => setConfirmDeleteId(item._id)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
        title="Delete pantry item?"
        description="This item will be permanently removed from your pantry."
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDeleteId) {
            void deleteItem({ itemId: confirmDeleteId as Id<"pantryItems"> }).then(() => {
              toast("Item deleted", "info");
              setConfirmDeleteId(null);
            }).catch(() => {
              toast("Failed to delete", "error");
              setConfirmDeleteId(null);
            });
          }
        }}
      />
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
        <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
          {prefillValues.message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
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
          <select
            id="pantry-unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
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

      <div className="space-y-2">
        <Label>Storage Location</Label>
        <div className="grid grid-cols-3 gap-2">
          {STORAGE_LOCATIONS.map((option) => {
            const Icon = STORAGE_ICONS[option];
            return (
              <button
                key={option}
                type="button"
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition-all duration-200 ${
                  storageLocation === option
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-input bg-background text-foreground hover:border-primary/30"
                }`}
                onClick={() => setStorageLocation(option)}
              >
                <Icon className="h-3.5 w-3.5" />
                {option}
              </button>
            );
          })}
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
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center animate-fade-in-up">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-100 to-amber-50">
        <Package className="h-11 w-11 text-amber-600" />
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">
        {location ? `No items in the ${location}` : "Your pantry is empty"}
      </h3>
      <p className="mb-6 max-w-[280px] text-sm text-muted-foreground leading-relaxed">
        {location
          ? `Move items here or add new ones to track what\u2019s in your ${location}.`
          : "Add what you already have at home \u2014 the AI will use these ingredients first when planning meals."}
      </p>
      <p className="mb-8 max-w-[260px] text-xs text-muted-foreground/70 leading-relaxed">
        {location
          ? ""
          : "\uD83D\uDCA1 Try the quick-add bar above: type \u201C2 lbs chicken, milk, eggs\u201D"}
      </p>
      <Button onClick={onAdd} size="lg" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Item
      </Button>
    </div>
  );
}
