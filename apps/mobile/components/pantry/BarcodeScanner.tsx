import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import {
  PANTRY_CATEGORIES,
  type PantryCategory,
  inferCategory,
} from "@/lib/pantry";

export type BarcodeScannerResult = {
  barcode: string;
  name: string;
  category: PantryCategory;
  quantity: string;
  unit: string;
  found: boolean;
  message: string;
};

const BARCODE_TYPES = ["upc_a", "upc_e", "ean13", "ean8"] as const;

function normalizePantryCategory(value: string, fallbackName = "") {
  const normalized = value.toLowerCase();

  for (const category of PANTRY_CATEGORIES) {
    if (normalized.includes(category.toLowerCase())) {
      return category;
    }
  }

  if (/milk|cheese|yogurt|cream|butter|dairy/.test(normalized)) {
    return "Dairy";
  }
  if (/frozen|ice cream/.test(normalized)) {
    return "Frozen";
  }
  if (/meat|chicken|beef|pork|fish|seafood/.test(normalized)) {
    return "Meat";
  }
  if (/fruit|vegetable|produce|fresh/.test(normalized)) {
    return "Produce";
  }
  if (/cereal|grain|rice|pasta|bread|bakery/.test(normalized)) {
    return "Grains";
  }
  if (/snack|chip|cracker|cookie|sweet/.test(normalized)) {
    return "Snacks";
  }
  if (/drink|beverage|water|soda|juice|coffee|tea/.test(normalized)) {
    return "Beverages";
  }
  if (/sauce|condiment|oil|spice|seasoning/.test(normalized)) {
    return "Condiments";
  }
  if (/canned|can|preserved/.test(normalized)) {
    return "Canned";
  }

  return inferCategory(fallbackName);
}

function parseQuantity(rawQuantity?: string): {
  quantity: string;
  unit: string;
} {
  const normalized = rawQuantity?.trim();
  if (!normalized) {
    return { quantity: "1", unit: "items" };
  }

  const simpleMatch = normalized.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+.*)?$/);
  if (!simpleMatch) {
    return { quantity: "1", unit: normalized };
  }

  return {
    quantity: simpleMatch[1].replace(",", "."),
    unit: simpleMatch[2]?.trim() || "items",
  };
}

async function lookupProduct(barcode: string): Promise<BarcodeScannerResult> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
      barcode,
    )}.json`,
  );

  if (!response.ok) {
    throw new Error("Product lookup failed.");
  }

  const data = await response.json();
  const product = data?.product;

  if (data?.status !== 1 || !product) {
    return {
      barcode,
      name: "",
      category: "Other",
      quantity: "1",
      unit: "items",
      found: false,
      message: `No product match found for ${barcode}. Fill in the details manually.`,
    };
  }

  const name =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    product.generic_name?.trim() ||
    "";
  const rawCategory =
    product.categories?.trim() ||
    product.categories_hierarchy?.[0]?.replace(/^en:/, "") ||
    "";
  const { quantity, unit } = parseQuantity(product.quantity);

  return {
    barcode,
    name,
    category: normalizePantryCategory(rawCategory, name),
    quantity,
    unit,
    found: true,
    message: name
      ? `Found ${name}. Review the details before saving.`
      : `Barcode ${barcode} matched a product. Review the details before saving.`,
  };
}

function getCameraErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/permission|denied|notauthorized/i.test(message)) {
    return "Camera access was denied. Allow camera access and try again.";
  }
  return "Camera is unavailable on this device. You can enter a barcode below.";
}

export function BarcodeScanner({
  onClose,
  onScan,
}: {
  onClose: () => void;
  onScan: (result: BarcodeScannerResult) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [handledBarcode, setHandledBarcode] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [lookupError, setLookupError] = useState("");

  const handleBarcode = async (barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed || isLookingUp || handledBarcode === trimmed) return;

    setHandledBarcode(trimmed);
    setIsLookingUp(true);
    setLookupError("");

    try {
      const result = await lookupProduct(trimmed);
      setIsLookingUp(false);
      onScan(result);
    } catch {
      const result: BarcodeScannerResult = {
        barcode: trimmed,
        name: "",
        category: "Other",
        quantity: "1",
        unit: "items",
        found: false,
        message:
          "We scanned the barcode, but couldn't reach Open Food Facts. You can finish the item manually.",
      };
      setIsLookingUp(false);
      onScan(result);
    }
  };

  const handleManualLookup = async () => {
    const trimmed = manualBarcode.trim();
    if (!trimmed) {
      setLookupError("Enter a barcode first.");
      return;
    }

    await handleBarcode(trimmed);
  };

  const handleScanned = (result: BarcodeScanningResult) => {
    void handleBarcode(result.data);
  };

  const hasPermission = permission?.granted;
  const permissionReady = permission !== null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border bg-card px-4 py-3">
        <TouchableOpacity onPress={onClose} disabled={isLookingUp}>
          <Text className="text-base text-muted-foreground">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-base font-semibold text-foreground">
          Scan Barcode
        </Text>
        <View className="w-14" />
      </View>

      <View className="flex-1 p-4">
        <View className="mb-4">
          <Text className="text-2xl font-bold text-foreground">
            Point at a UPC or EAN barcode
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            We will look up the product and pre-fill your pantry item.
          </Text>
        </View>

        <View className="overflow-hidden rounded-3xl border border-border bg-card">
          <View className="h-80 bg-muted">
            {!permissionReady ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color="#248f58" />
              </View>
            ) : hasPermission && !cameraError ? (
              <>
                <CameraView
                  style={{ flex: 1 }}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
                  onBarcodeScanned={isLookingUp ? undefined : handleScanned}
                  onMountError={(event) =>
                    setCameraError(getCameraErrorMessage(event))
                  }
                />
                <View className="absolute inset-0 items-center justify-center p-6">
                  <View className="h-24 w-full rounded-2xl border-2 border-primary bg-white/10" />
                </View>
              </>
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
                    "Camera permission is needed to scan barcodes."}
                </Text>
                {!hasPermission ? (
                  <TouchableOpacity
                    onPress={() => void requestPermission()}
                    className="mt-4 rounded-xl bg-primary px-4 py-2.5"
                  >
                    <Text className="font-semibold text-white">
                      Allow Camera
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {isLookingUp ? (
              <View className="absolute inset-0 items-center justify-center bg-white/85">
                <ActivityIndicator color="#248f58" />
                <Text className="mt-3 text-sm font-semibold text-foreground">
                  Looking up product...
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-border bg-card p-3">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Enter barcode manually
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-base text-foreground"
              placeholder="UPC or EAN"
              placeholderTextColor="#9a9489"
              keyboardType="number-pad"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              editable={!isLookingUp}
            />
            <TouchableOpacity
              onPress={() => void handleManualLookup()}
              disabled={isLookingUp}
              className="h-12 w-12 items-center justify-center rounded-xl bg-primary"
              style={{ opacity: isLookingUp ? 0.55 : 1 }}
              accessibilityLabel="Look up barcode"
            >
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>
          {lookupError ? (
            <Text className="mt-2 text-sm text-red-700">{lookupError}</Text>
          ) : null}
        </View>

        <View className="mt-4 rounded-2xl border border-border bg-muted/60 p-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="scan-outline" size={16} color="#248f58" />
            <Text className="text-sm font-semibold text-foreground">
              Scanning tips
            </Text>
          </View>
          <Text className="mt-2 text-sm text-muted-foreground">
            Keep the barcode inside the frame and hold steady for a second.
          </Text>
        </View>
      </View>
    </View>
  );
}
