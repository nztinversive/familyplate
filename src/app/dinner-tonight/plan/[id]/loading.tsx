import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className}`} />;
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-6 w-3/4" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-2/3" />
          </div>
          <div className="shrink-0 space-y-1 text-right">
            <SkeletonBar className="ml-auto h-7 w-12" />
            <SkeletonBar className="ml-auto h-3 w-16" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SkeletonBar className="h-5 w-14" />
          <SkeletonBar className="h-5 w-12" />
          <SkeletonBar className="h-5 w-20" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <SkeletonBar className="h-3 w-20" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBar key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            <SkeletonBar className="h-3 w-20" />
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBar key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlanLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-xl">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          FamilyPlate
        </Link>
      </div>
      <div className="mb-6 text-center">
        <SkeletonBar className="mx-auto mb-2 h-3 w-32" />
        <SkeletonBar className="mx-auto h-9 w-72" />
      </div>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </main>
  );
}
