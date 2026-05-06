import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";

const FEEDBACK_TAGS = [
  "kid approved",
  "make again",
  "budget friendly",
  "great leftovers",
  "too much prep",
  "too bland",
];

export function RecipeFeedback({
  recipeId,
}: {
  recipeId: Id<"recipeSuggestions">;
}) {
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
    setTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = rating > 0 && liked !== null;

  return (
    <View className="mb-4 rounded-2xl border border-border bg-muted/40 p-4">
      <View className="mb-3 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">
            Cooked this?
          </Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">
            Rate dinner so future plans learn what your family likes.
          </Text>
        </View>
        {existing ? (
          <TouchableOpacity
            onPress={() => void handleDelete()}
            disabled={isSubmitting}
            className="h-9 w-9 items-center justify-center rounded-full bg-card"
          >
            <Ionicons name="trash-outline" size={17} color="#dc2626" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mb-3 flex-row gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            disabled={isSubmitting}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={27}
              color={star <= rating ? "#f5b301" : "#b9b3aa"}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View className="mb-3 flex-row gap-2">
        <TouchableOpacity
          onPress={() => setLiked(true)}
          disabled={isSubmitting}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-2.5 ${
            liked === true
              ? "border-primary bg-primary"
              : "border-border bg-card"
          }`}
        >
          <Ionicons
            name="thumbs-up-outline"
            size={16}
            color={liked === true ? "white" : "#248f58"}
          />
          <Text
            className={`font-semibold ${
              liked === true ? "text-white" : "text-foreground"
            }`}
          >
            Make again
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setLiked(false)}
          disabled={isSubmitting}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-2.5 ${
            liked === false ? "border-red-500 bg-red-500" : "border-border bg-card"
          }`}
        >
          <Ionicons
            name="thumbs-down-outline"
            size={16}
            color={liked === false ? "white" : "#dc2626"}
          />
          <Text
            className={`font-semibold ${
              liked === false ? "text-white" : "text-foreground"
            }`}
          >
            Skip next time
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-3 flex-row flex-wrap gap-2">
        {FEEDBACK_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => toggleTag(tag)}
              disabled={isSubmitting}
              className={`rounded-full border px-3 py-1.5 ${
                active ? "border-primary bg-primary/10" : "border-border bg-card"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        editable={!isSubmitting}
        multiline
        placeholder="Optional notes..."
        placeholderTextColor="#9a9489"
        className="mb-3 min-h-16 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
        textAlignVertical="top"
      />

      <TouchableOpacity
        onPress={() => void handleSubmit()}
        disabled={!canSubmit || isSubmitting}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
        style={{ opacity: !canSubmit || isSubmitting ? 0.55 : 1 }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="checkmark-circle-outline" size={18} color="white" />
        )}
        <Text className="font-semibold text-white">
          {isSubmitting
            ? "Saving..."
            : existing
              ? "Update Cooked Feedback"
              : "Save Cooked Feedback"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
