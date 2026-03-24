"use client";

import { useState } from "react";
import { Package, Plus, ScanBarcode, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function PantryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  // TODO: Replace with Convex query
  const pantryItems: unknown[] = [];

  return (
    <AppShell
      header={
        <PageHeader
          title="My Pantry"
          action={
            <div className="flex gap-2">
              <Button size="icon" variant="ghost">
                <ScanBarcode className="h-5 w-5" />
              </Button>
              <Button size="icon">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          }
        />
      }
    >
      <div className="px-4 py-4 space-y-4">
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
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
            <TabsTrigger value="pantry" className="flex-1">
              Pantry
            </TabsTrigger>
            <TabsTrigger value="fridge" className="flex-1">
              Fridge
            </TabsTrigger>
            <TabsTrigger value="freezer" className="flex-1">
              Freezer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {pantryItems.length === 0 && <EmptyState />}
          </TabsContent>
          <TabsContent value="pantry">
            <EmptyState location="pantry" />
          </TabsContent>
          <TabsContent value="fridge">
            <EmptyState location="fridge" />
          </TabsContent>
          <TabsContent value="freezer">
            <EmptyState location="freezer" />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function EmptyState({ location }: { location?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Package className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {location
          ? `Your ${location} is empty`
          : "Your pantry is empty"}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-[240px]">
        Start by adding items you already have at home. Scan a barcode or add
        manually.
      </p>
      <div className="flex gap-3">
        <Button variant="outline">
          <ScanBarcode className="h-4 w-4 mr-2" />
          Scan Item
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
    </div>
  );
}
