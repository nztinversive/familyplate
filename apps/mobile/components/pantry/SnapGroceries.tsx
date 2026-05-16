import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useAction } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import { usePostHog } from "posthog-react-native";
import { ensureAiConsent } from "@/lib/aiConsent";
import { PANTRY_CATEGORIES, type PantryCategory } from "@/lib/pantry";
import { track } from "@/lib/analytics";
import { Sentry } from "@/lib/sentry";

type RecognizedItem = {
  name: string;
  quantity: number;
  unit: string;
  category: PantryCategory;
  confidence: "high" | "medium" | "low";
};

export type SnapGroceryItem = Pick<
  RecognizedItem,
  "name" | "quantity" | "unit" | "category"
>;

type Phase = "camera" | "analyzing" | "review";

function normalizeCategory(value: string): PantryCategory {
  return PANTRY_CATEGORIES.includes(value as PantryCategory)
    ? (value as PantryCategory)
    : "Other";
}

function getCameraErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/permission|denied|notauthorized/i.test(message)) {
    return "Camera access was denied. Allow camera access and try again.";
  }
  return "Camera is unavailable on this device.";
}

function getRecognitionErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/network|fetch|request|timeout|temporar/i.test(message)) {
    return "Recognition could not connect. Check your connection and try again.";
  }
  if (/photo|image|base64|captur/i.test(message)) {
    return "That photo did not come through clearly. Retake it and keep the groceries in frame.";
  }
  return message || "Couldn't identify groceries. Try again with better lighting.";
}

function getConfidenceTone(confidence: RecognizedItem["confidence"]) {
  switch (confidence) {
    case "high":
      return { bg: "#dcfce7", fg: "#166534", border: "#bbf7d0" };
    case "medium":
      return { bg: "#fffbeb", fg: "#92400e", border: "#fde68a" };
    case "low":
    default:
      return { bg: "#fef2f2", fg: "#991b1b", border: "#fecaca" };
  }
}

export function SnapGroceries({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (items: SnapGroceryItem[]) => Promise<void>;
}) {
  const recognizeAction = useAction(
    api.actions.recognizeGroceries.recognizeFromPhoto,
  );
  const posthog = usePostHog();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [photoUri, setPhotoUri] = useState("");
  const [items, setItems] = useState<RecognizedItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const handleCapture = async () => {
    const camera = cameraRef.current;
    if (!camera || !cameraReady) return;

    const consented = await ensureAiConsent();
    if (!consented) {
      setError("AI grocery recognition needs your permission before it can process grocery photos.");
      return;
    }
    track(posthog, "ai_consent_accepted", {
      feature: "snap_groceries",
    });

    setPhase("analyzing");
    setError("");

    try {
      track(posthog, "camera_scan_started", {
        source: "snap_groceries",
      });
      const photo = await camera.takePictureAsync({
        base64: true,
        quality: 0.75,
        skipProcessing: false,
      });

      if (!photo?.base64) {
        throw new Error("No photo data captured.");
      }

      setPhotoUri(photo.uri);
      const result = await recognizeAction({ imageBase64: photo.base64 });
      const recognizedItems = result.items.map((item) => ({
          ...item,
          category: normalizeCategory(item.category),
        }));
      setItems(recognizedItems);
      track(posthog, "camera_scan_completed", {
        source: "snap_groceries",
        count: recognizedItems.length,
        high_confidence_count: recognizedItems.filter(
          (item) => item.confidence === "high",
        ).length,
      });
      if (recognizedItems.length === 0) {
        setError(
          "No groceries were detected. Retake the photo or add an item manually below.",
        );
      }
      setPhase("review");
    } catch (err) {
      track(posthog, "camera_scan_failed", {
        source: "snap_groceries",
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "snap_groceries", platform: "ios" },
      });
      setError(getRecognitionErrorMessage(err));
      setPhase("camera");
    }
  };

  const handleRetake = () => {
    setPhotoUri("");
    setItems([]);
    setEditingIndex(null);
    setError("");
    setPhase("camera");
  };

  const handleAddAll = async () => {
    const validItems = items.filter(
      (item) => item.name.trim() && item.quantity > 0,
    );
    if (validItems.length === 0) {
      setError("Add at least one grocery item first.");
      return;
    }

    setIsAdding(true);
    setError("");
    try {
      await onAdd(
        validItems.map((item) => ({
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit.trim() || "items",
          category: item.category,
        })),
      );
      track(posthog, "pantry_item_added", {
        source: "snap_groceries_review",
        count: validItems.length,
      });
      onClose();
    } catch (err) {
      track(posthog, "pantry_item_add_failed", {
        source: "snap_groceries_review",
        count: validItems.length,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "snap_groceries", action: "add_review_items", platform: "ios" },
      });
      setError(err instanceof Error ? err.message : "Couldn't add groceries.");
    } finally {
      setIsAdding(false);
    }
  };

  const updateItem = (index: number, updates: Partial<RecognizedItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setEditingIndex(null);
  };

  const addManualItem = () => {
    setItems((current) => [
      ...current,
      {
        name: "",
        quantity: 1,
        unit: "items",
        category: "Other",
        confidence: "low",
      },
    ]);
    setEditingIndex(items.length);
    setError("");
  };

  const hasPermission = permission?.granted;
  const permissionReady = permission !== null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3">
        <TouchableOpacity onPress={onClose} disabled={phase === "analyzing"}>
          <Text className="text-base text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-foreground">
          Snap Groceries
        </Text>
        <View className="w-14" />
      </View>

      {phase === "camera" ? (
        <CameraPhase
          cameraRef={cameraRef}
          cameraReady={cameraReady}
          cameraError={cameraError}
          error={error}
          hasPermission={hasPermission}
          permissionReady={permissionReady}
          onCameraReady={() => setCameraReady(true)}
          onCapture={() => void handleCapture()}
          onMountError={(event) => setCameraError(getCameraErrorMessage(event))}
          onRequestPermission={() => void requestPermission()}
        />
      ) : null}

      {phase === "analyzing" ? (
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator color="#248f58" size="large" />
          <Text className="mt-4 text-lg font-semibold text-foreground">
            Reading your grocery photo...
          </Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            AI is matching visible items so you can review before saving.
          </Text>
        </View>
      ) : null}

      {phase === "review" ? (
        <ReviewPhase
          editingIndex={editingIndex}
          error={error}
          isAdding={isAdding}
          items={items}
          photoUri={photoUri}
          onAddAll={() => void handleAddAll()}
          onEdit={setEditingIndex}
          onManualItem={addManualItem}
          onRemove={removeItem}
          onRetake={handleRetake}
          onUpdate={updateItem}
        />
      ) : null}
    </View>
  );
}

function CameraPhase({
  cameraRef,
  cameraReady,
  cameraError,
  error,
  hasPermission,
  permissionReady,
  onCameraReady,
  onCapture,
  onMountError,
  onRequestPermission,
}: {
  cameraRef: React.MutableRefObject<CameraView | null>;
  cameraReady: boolean;
  cameraError: string;
  error: string;
  hasPermission: boolean | undefined;
  permissionReady: boolean;
  onCameraReady: () => void;
  onCapture: () => void;
  onMountError: (event: unknown) => void;
  onRequestPermission: () => void;
}) {
  return (
    <View className="flex-1 p-4">
      <Text className="text-2xl font-bold text-foreground">
        Photograph your groceries
      </Text>
      <Text className="mt-1 text-sm text-muted-foreground">
        Take a clear photo, then review what FamilyPlate finds.
      </Text>

      <View className="mt-4 overflow-hidden rounded-3xl border border-border bg-card">
        <View className="h-96 bg-muted">
          {!permissionReady ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#248f58" />
            </View>
          ) : hasPermission && !cameraError ? (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing="back"
              mode="picture"
              onCameraReady={onCameraReady}
              onMountError={onMountError}
            />
          ) : (
            <View className="flex-1 items-center justify-center px-8">
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                <Ionicons name="camera-outline" size={26} color="#b45309" />
              </View>
              <Text className="text-center text-base font-semibold text-foreground">
                Camera unavailable
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                {cameraError ||
                  "Camera permission is needed to snap groceries."}
              </Text>
              {!hasPermission ? (
                <TouchableOpacity
                  onPress={onRequestPermission}
                  className="mt-4 rounded-xl bg-primary px-4 py-2.5"
                >
                  <Text className="font-semibold text-white">Allow Camera</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>
      </View>

      {error ? (
        <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        onPress={onCapture}
        disabled={!cameraReady || !hasPermission || !!cameraError}
        className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3.5"
        style={{
          opacity: cameraReady && hasPermission && !cameraError ? 1 : 0.45,
        }}
      >
        <Ionicons name="camera" size={20} color="white" />
        <Text className="text-base font-semibold text-white">Take Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

function ReviewPhase({
  editingIndex,
  error,
  isAdding,
  items,
  photoUri,
  onAddAll,
  onEdit,
  onManualItem,
  onRemove,
  onRetake,
  onUpdate,
}: {
  editingIndex: number | null;
  error: string;
  isAdding: boolean;
  items: RecognizedItem[];
  photoUri: string;
  onAddAll: () => void;
  onEdit: (index: number | null) => void;
  onManualItem: () => void;
  onRemove: (index: number) => void;
  onRetake: () => void;
  onUpdate: (index: number, updates: Partial<RecognizedItem>) => void;
}) {
  return (
    <View className="flex-1">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        <Text className="text-2xl font-bold text-foreground">
          Review groceries
        </Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          {items.length > 0
            ? `Found ${items.length} item${items.length === 1 ? "" : "s"}.`
            : "No items were detected."}
        </Text>

        {photoUri ? (
          <Image
            source={{ uri: photoUri }}
            className="mt-4 h-40 w-full rounded-3xl"
            resizeMode="cover"
          />
        ) : null}

        {error ? (
          <View className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        <View className="mt-4 gap-3">
          {items.length === 0 ? (
            <View className="items-center rounded-2xl border border-border bg-card p-6">
              <Ionicons name="image-outline" size={30} color="#9a9489" />
              <Text className="mt-3 text-center text-base font-semibold text-foreground">
                Nothing recognized yet
              </Text>
              <Text className="mt-1 text-center text-sm text-muted-foreground">
                Try a brighter photo, move closer, or start a manual item from
                this review.
              </Text>
              <TouchableOpacity
                onPress={onManualItem}
                className="mt-4 flex-row items-center gap-2 rounded-xl bg-primary px-4 py-2.5"
                accessibilityRole="button"
                accessibilityLabel="Add item manually"
              >
                <Ionicons name="create-outline" size={17} color="white" />
                <Text className="font-semibold text-white">Add Manually</Text>
              </TouchableOpacity>
            </View>
          ) : (
            items.map((item, index) => (
              <RecognizedItemCard
                key={`${item.name}-${index}`}
                editing={editingIndex === index}
                item={item}
                onDone={() => onEdit(null)}
                onEdit={() => onEdit(index)}
                onRemove={() => onRemove(index)}
                onUpdate={(updates) => onUpdate(index, updates)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 flex-row gap-2 border-t border-border bg-card px-4 pb-6 pt-3">
        <TouchableOpacity
          onPress={onRetake}
          disabled={isAdding}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card py-3"
        >
          <Ionicons name="camera-outline" size={18} color="#248f58" />
          <Text className="font-semibold text-primary">Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={items.length === 0 ? onManualItem : onAddAll}
          disabled={isAdding}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
          style={{ opacity: isAdding ? 0.55 : 1 }}
          accessibilityRole="button"
          accessibilityLabel={
            items.length === 0 ? "Add item manually" : "Add recognized items"
          }
        >
          {isAdding ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons
              name={items.length === 0 ? "create-outline" : "add"}
              size={18}
              color="white"
            />
          )}
          <Text className="font-semibold text-white">
            {isAdding
              ? "Adding..."
              : items.length === 0
                ? "Add Manually"
                : `Add ${items.length}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RecognizedItemCard({
  editing,
  item,
  onDone,
  onEdit,
  onRemove,
  onUpdate,
}: {
  editing: boolean;
  item: RecognizedItem;
  onDone: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<RecognizedItem>) => void;
}) {
  const tone = getConfidenceTone(item.confidence);

  return (
    <View className="rounded-2xl border border-border bg-card p-3">
      {editing ? (
        <View>
          <TextInput
            className="rounded-xl border border-border bg-muted px-3 py-2.5 text-base text-foreground"
            placeholder="Item name"
            placeholderTextColor="#9a9489"
            value={item.name}
            onChangeText={(name) => onUpdate({ name })}
          />
          <View className="mt-2 flex-row gap-2">
            <TextInput
              className="w-24 rounded-xl border border-border bg-muted px-3 py-2.5 text-base text-foreground"
              keyboardType="decimal-pad"
              value={`${item.quantity}`}
              onChangeText={(value) =>
                onUpdate({ quantity: Number.parseFloat(value) || 0 })
              }
            />
            <TextInput
              className="flex-1 rounded-xl border border-border bg-muted px-3 py-2.5 text-base text-foreground"
              placeholder="unit"
              placeholderTextColor="#9a9489"
              value={item.unit}
              onChangeText={(unit) => onUpdate({ unit })}
            />
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {PANTRY_CATEGORIES.map((category) => {
              const selected = item.category === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => onUpdate({ category })}
                  className={`rounded-full border px-3 py-1.5 ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? "text-white" : "text-foreground"
                    }`}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View className="mt-3 flex-row justify-end gap-2">
            <TouchableOpacity
              onPress={onRemove}
              className="h-10 w-10 items-center justify-center rounded-xl bg-red-50"
            >
              <Ionicons name="trash-outline" size={17} color="#dc2626" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onDone}
              className="flex-row items-center gap-2 rounded-xl bg-primary px-4 py-2.5"
            >
              <Ionicons name="checkmark" size={17} color="white" />
              <Text className="font-semibold text-white">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-foreground">
              {item.name}
            </Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {item.quantity} {item.unit} · {item.category}
            </Text>
          </View>
          <View
            className="rounded-full border px-2 py-1"
            style={{ backgroundColor: tone.bg, borderColor: tone.border }}
          >
            <Text
              className="text-[11px] font-semibold"
              style={{ color: tone.fg }}
            >
              {item.confidence}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onEdit}
            className="h-9 w-9 items-center justify-center rounded-xl bg-muted"
          >
            <Ionicons name="pencil" size={16} color="#6f756f" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRemove}
            className="h-9 w-9 items-center justify-center rounded-xl bg-red-50"
          >
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
