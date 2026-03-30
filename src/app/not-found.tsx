import Link from "next/link";
import { UtensilsCrossed, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="max-w-sm text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">FamilyPlate</span>
        </div>

        {/* 404 illustration */}
        <div className="relative mb-8">
          <div className="text-8xl font-bold tracking-tighter text-muted/60 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl select-none">🍽️</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          This plate is empty
        </h1>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back to something delicious.
        </p>

        <div className="flex flex-col gap-2">
          <Button asChild size="lg" className="w-full gap-2 rounded-xl">
            <Link href="/pantry">
              <Home className="h-4 w-4" />
              Go to Pantry
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full gap-2 rounded-xl">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
