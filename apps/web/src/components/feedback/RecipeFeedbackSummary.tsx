"use client";

import { useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RecipeFeedbackSummaryProps {
  recipeId: Id<"recipeSuggestions">;
}

export function RecipeFeedbackSummary({ recipeId }: RecipeFeedbackSummaryProps) {
  const feedback = useQuery(api.queries.feedback.getRecipeFeedback, { recipeId });

  if (!feedback || feedback.length === 0) return null;

  const avgRating =
    feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
  const roundedRating = Math.round(avgRating * 10) / 10;

  // Get top tags (appearing in >1 review or all if few reviews)
  const tagCounts = new Map<string, number>();
  for (const f of feedback) {
    for (const tag of f.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="font-semibold">{roundedRating}</span>
        <span className="text-muted-foreground">
          ({feedback.length} {feedback.length === 1 ? "review" : "reviews"})
        </span>
      </div>
      {topTags.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
