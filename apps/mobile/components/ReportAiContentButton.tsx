import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import type { Id } from "@familyplate/convex/_generated/dataModel";
import { usePostHog } from "posthog-react-native";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

export type AiReportSurface = "tonight" | "weekly_plan" | "cookbook";
type AiReportReason =
  | "unsafe"
  | "allergy_risk"
  | "inappropriate"
  | "inaccurate"
  | "other";

const REPORT_REASONS: {
  value: AiReportReason;
  label: string;
  detail: string;
}[] = [
  {
    value: "allergy_risk",
    label: "Allergy or dietary risk",
    detail: "It conflicts with an allergy, restriction, or food-safety need.",
  },
  {
    value: "unsafe",
    label: "Unsafe instructions",
    detail: "The preparation, handling, or cooking guidance could cause harm.",
  },
  {
    value: "inappropriate",
    label: "Inappropriate content",
    detail: "It includes offensive, disturbing, or otherwise inappropriate text.",
  },
  {
    value: "inaccurate",
    label: "Incorrect or misleading",
    detail: "The recipe does not make sense or contains materially wrong guidance.",
  },
  {
    value: "other",
    label: "Something else",
    detail: "Tell us what should be reviewed.",
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "We could not send this report. Please try again.";
}

export function ReportAiContentButton({
  recipeId,
  sourceSurface,
}: {
  recipeId: Id<"recipeSuggestions">;
  sourceSurface: AiReportSurface;
}) {
  const posthog = usePostHog();
  const submitReport = useMutation(
    api.mutations.aiContentReports.submitAiContentReport,
  );
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<AiReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const close = () => {
    if (submitting) return;
    setVisible(false);
    setError("");
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const result = await submitReport({
        recipeId,
        sourceSurface,
        reason,
        details: details.trim() || undefined,
      });
      track(posthog, "ai_content_report_submitted", {
        source: sourceSurface,
        reason,
        created: result.created,
      });
      setSubmitted(true);
      setVisible(false);
      setReason(null);
      setDetails("");
    } catch (reportError) {
      Sentry.captureException(reportError, {
        tags: {
          area: "ai_content_report",
          action: "submit",
          source: sourceSurface,
        },
      });
      track(posthog, "ai_content_report_failed", {
        source: sourceSurface,
        reason,
      });
      setError(getErrorMessage(reportError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        disabled={submitted}
        className="flex-row items-center justify-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
        style={{ opacity: submitted ? 0.7 : 1 }}
        accessibilityRole="button"
        accessibilityLabel={
          submitted ? "AI suggestion report received" : "Report AI suggestion"
        }
        accessibilityHint="Opens an in-app form to flag unsafe or inappropriate generated content."
      >
        <Ionicons
          name={submitted ? "checkmark-circle-outline" : "flag-outline"}
          size={15}
          color="#c2410c"
        />
        <Text className="text-xs font-semibold text-destructive">
          {submitted ? "Report received" : "Report AI suggestion"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <View
          className="flex-1 justify-end bg-black/40"
          accessibilityViewIsModal
        >
          <View className="max-h-[88%] rounded-t-3xl bg-background">
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              keyboardShouldPersistTaps="handled"
            >
            <View className="mb-4 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-xl font-bold text-foreground">
                  Report this AI suggestion
                </Text>
                <Text className="mt-1 text-sm leading-5 text-muted-foreground">
                  Choose the clearest reason. Reports are sent inside FamilyPlate
                  for review.
                </Text>
              </View>
              <Pressable
                onPress={close}
                disabled={submitting}
                className="h-10 w-10 items-center justify-center rounded-full bg-muted"
                accessibilityRole="button"
                accessibilityLabel="Close report form"
              >
                <Ionicons name="close" size={22} color="#26211b" />
              </Pressable>
            </View>

            <View className="gap-2">
              {REPORT_REASONS.map((option) => {
                const selected = option.value === reason;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setReason(option.value)}
                    disabled={submitting}
                    className={`rounded-xl border p-3 ${
                      selected
                        ? "border-destructive bg-destructive/5"
                        : "border-border bg-card"
                    }`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <View className="flex-row items-start gap-3">
                      <Ionicons
                        name={
                          selected ? "radio-button-on" : "radio-button-off"
                        }
                        size={19}
                        color={selected ? "#c2410c" : "#686158"}
                      />
                      <View className="flex-1">
                        <Text className="font-semibold text-foreground">
                          {option.label}
                        </Text>
                        <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
                          {option.detail}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text className="mb-2 mt-4 text-sm font-semibold text-foreground">
              More detail (optional)
            </Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              editable={!submitting}
              maxLength={1_000}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholder="Do not include passwords or payment information."
              placeholderTextColor="#9a9489"
              className="min-h-24 rounded-xl border border-border bg-card p-3 text-foreground"
            />
            <Text className="mt-1 text-right text-xs text-muted-foreground">
              {details.length}/1000
            </Text>

            {error ? (
              <View className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3">
                <Text className="text-sm text-destructive">{error}</Text>
              </View>
            ) : null}

            <View className="mt-4 flex-row gap-2">
              <TouchableOpacity
                onPress={close}
                disabled={submitting}
                className="flex-1 items-center rounded-xl border border-border bg-card py-3"
              >
                <Text className="font-semibold text-muted-foreground">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleSubmit()}
                disabled={!reason || submitting}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-destructive py-3"
                style={{ opacity: !reason || submitting ? 0.55 : 1 }}
                accessibilityRole="button"
                accessibilityLabel="Submit AI content report"
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Ionicons name="flag" size={17} color="white" />
                )}
                <Text className="font-semibold text-white">
                  {submitting ? "Sending..." : "Submit report"}
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
