"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { Star, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FEEDBACK_TAGS = [
  "too spicy",
  "too bland",
  "kid approved",
  "make again",
  "too much prep",
  "great leftovers",
  "budget friendly",
  "not enough food",
];

interface MealFeedbackCardProps {
  recipeId: Id<"recipeSuggestions">;
}

export function MealFeedbackCard({ recipeId }: MealFeedbackCardProps) {
  const existing = useQuery(api.queries.feedback.getMyFeedback, { recipeId });
  const submitFeedback = useMutation(api.mutations.feedback.submitFeedback);
  const deleteFeedback = useMutation(api.mutations.feedback.deleteFeedback);

  const [rating, setRating] = useState(0);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (existing && !hasInitialized) {
      setRating(existing.rating);
      setLiked(existing.liked);
      setTags(existing.tags);
      setNotes(existing.notes ?? "");
      setHasInitialized(true);
    }
    if (existing === null && !hasInitialized) {
      setHasInitialized(true);
    }
  }, [existing, hasInitialized]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0 || liked === null) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({
        recipeId,
        rating,
        liked,
        tags,
        notes: notes.trim() || undefined,
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setIsSubmitting(true);
    try {
      await deleteFeedback({ feedbackId: existing._id });
      setRating(0);
      setLiked(null);
      setTags([]);
      setNotes("");
      setHasInitialized(false);
    } catch (err) {
      console.error("Failed to delete feedback:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = rating > 0 && liked !== null;

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">How was dinner?</h3>
            <p className="text-sm text-muted-foreground">
              {existing ? "Update your feedback" : "Rate this meal to improve future suggestions"}
            </p>
          </div>
          {existing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => void handleDelete()}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Star rating */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-colors",
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/40"
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Like / dislike */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Would you have this again?</p>
          <div className="flex gap-2">
            <Button
              variant={liked === true ? "default" : "outline"}
              size="sm"
              onClick={() => setLiked(true)}
              className="gap-1.5"
            >
              <ThumbsUp className="h-4 w-4" />
              Yes
            </Button>
            <Button
              variant={liked === false ? "destructive" : "outline"}
              size="sm"
              onClick={() => setLiked(false)}
              className="gap-1.5"
            >
              <ThumbsDown className="h-4 w-4" />
              No
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tags</p>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  tags.includes(tag)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Notes (optional)</p>
          <Textarea
            placeholder="Any thoughts on this meal..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <Button
          onClick={() => void handleSubmit()}
          disabled={!canSubmit || isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Saving..." : existing ? "Update Feedback" : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
