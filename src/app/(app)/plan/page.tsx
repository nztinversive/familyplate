"use client";

import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";

export default function PlanPage() {
  return (
    <AppShell header={<PageHeader title="Weekly Plan" subtitle="Dinner planning" />}>
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <CalendarDays className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No meal plan yet</h3>
        <p className="text-sm text-muted-foreground text-center max-w-[240px]">
          Add items to your pantry first, then generate a weekly dinner plan based on what you have.
        </p>
      </div>
    </AppShell>
  );
}
