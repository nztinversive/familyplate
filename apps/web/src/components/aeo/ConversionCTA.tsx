"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { ArrowRight } from "lucide-react";
import { api } from "@familyplate/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { setPendingPantry } from "@/lib/pendingPantry";
import { getOrCreateFingerprint } from "@/lib/publicFingerprint";

type Props = {
  pantryItems?: string[];
  allergies?: string[];
  craving?: string;
  sourcePage: string;
  planId?: string;
  label?: string;
  href?: string;
  size?: "default" | "lg";
};

export function ConversionCTA({
  pantryItems,
  allergies,
  craving,
  sourcePage,
  planId,
  label = "Start planning free",
  href = "/",
  size = "lg",
}: Props) {
  const router = useRouter();
  const logEvent = useMutation(api.mutations.publicEvents.logEvent);

  const handleClick = () => {
    if (pantryItems && pantryItems.length > 0) {
      setPendingPantry({
        items: pantryItems,
        allergies: allergies ?? [],
        craving,
        source: sourcePage,
      });
    }

    // Fire-and-forget analytics — PostHog (primary) + Convex (server-side audit)
    track("cta_clicked", {
      source_page: sourcePage,
      plan_id: planId,
      pantry_count: pantryItems?.length ?? 0,
      had_allergies: (allergies?.length ?? 0) > 0,
    });
    void logEvent({
      name: "cta_clicked",
      sourcePage,
      planId: planId as never,
      fingerprint: getOrCreateFingerprint(),
      metadata: pantryItems && pantryItems.length > 0 ? `pantryCount=${pantryItems.length}` : undefined,
    }).catch(() => {});

    router.push(href);
  };

  return (
    <Button onClick={handleClick} size={size} className="gap-1.5 rounded-xl">
      {label}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
