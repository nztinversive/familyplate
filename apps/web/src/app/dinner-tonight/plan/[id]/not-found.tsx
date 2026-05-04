import Link from "next/link";
import { ArrowRight, ChefHat, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PlanNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-center">
        <Link href="/" className="flex items-center gap-2 font-display text-xl">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          FamilyPlate
        </Link>
      </div>

      <Card>
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/60">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="mb-2 font-display text-2xl tracking-tight sm:text-3xl">
              That dinner plan isn&apos;t here
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              The plan link may be old, mistyped, or expired. No problem — generate a fresh one in a few seconds.
            </p>
          </div>
          <Link href="/dinner-tonight">
            <Button size="lg" className="gap-1.5 rounded-xl">
              Generate fresh dinner ideas
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground underline">
          Back to FamilyPlate home →
        </Link>
      </footer>
    </main>
  );
}
