"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode as Html5QrcodeInstance } from "html5-qrcode";
import { AlertCircle, Camera, Loader2, ScanLine, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type BarcodeScannerResult = {
  barcode: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  found: boolean;
  message: string;
};

interface BarcodeScannerProps {
  onClose: () => void;
  onScan: (result: BarcodeScannerResult) => void;
}

const UPC_EAN_FORMATS = [
  "UPC_A",
  "UPC_E",
  "EAN_13",
  "EAN_8",
  "UPC_EAN_EXTENSION",
] as const;

export function BarcodeScanner({ onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const handledScanRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onScanRef = useRef(onScan);
  const scannerId = `barcode-scanner-${useId().replace(/:/g, "")}`;

  const [isStarting, setIsStarting] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
    onScanRef.current = onScan;
  }, [onClose, onScan]);

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      if (typeof window === "undefined") return;

      if (!window.isSecureContext) {
        setError("Camera scanning needs a secure HTTPS connection on this device.");
        setIsStarting(false);
        return;
      }

      // Wait for the DOM element to be available (Dialog animation)
      await new Promise<void>((resolve) => {
        const check = () => {
          if (document.getElementById(scannerId)) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        // Small initial delay for Dialog mount
        setTimeout(check, 150);
      });

      if (!isMounted) return;

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
          "html5-qrcode"
        );

        if (!isMounted) return;

        const formatsToSupport = UPC_EAN_FORMATS.map(
          (format) => Html5QrcodeSupportedFormats[format]
        );

        const scanner = new Html5Qrcode(scannerId, {
          formatsToSupport,
          useBarCodeDetectorIfSupported: true,
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            aspectRatio: 1.777778,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const width = Math.floor(Math.min(viewfinderWidth * 0.88, 320));
              const height = Math.floor(Math.min(viewfinderHeight * 0.28, 120));
              return { width, height };
            },
            disableFlip: false,
          },
          async (decodedText) => {
            if (handledScanRef.current) return;

            handledScanRef.current = true;
            setIsLookingUp(true);
            setError("");

            await stopScanner();

            try {
              const product = await lookupProduct(decodedText);
              if (!isMounted) return;
              onScanRef.current(product);
              onCloseRef.current();
            } catch {
              if (!isMounted) return;
              onScanRef.current({
                barcode: decodedText,
                name: "",
                category: "Other",
                quantity: "1",
                unit: "items",
                found: false,
                message:
                  "We scanned the barcode, but couldn't reach Open Food Facts. You can finish the item manually.",
              });
              onCloseRef.current();
            }
          },
          () => {
            return;
          }
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (scannerError) {
        if (!isMounted) return;

        setError(getCameraErrorMessage(scannerError));
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      void stopScanner();
    };
  }, [scannerId]);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    scannerRef.current = null;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
    } catch {
      return;
    } finally {
      try {
        scanner.clear();
      } catch {
        return;
      }
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Scan barcode</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Point your camera at a UPC or EAN barcode to fill in pantry details.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">UPC / EAN</Badge>
          {(isStarting || isLookingUp) && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {isLookingUp ? "Looking up product" : "Starting camera"}
            </Badge>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl border bg-muted/40">
          <div
            id={scannerId}
            className="min-h-[320px] w-full bg-background [&_canvas]:max-h-[320px] [&_canvas]:w-full [&_canvas]:object-cover [&_video]:max-h-[320px] [&_video]:w-full [&_video]:object-cover"
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="h-24 w-full max-w-xs rounded-2xl border-2 border-primary/80 bg-background/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]" />
          </div>

          {(isStarting || isLookingUp) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {isLookingUp ? "Looking up product details..." : "Starting camera..."}
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-6">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-medium">Camera unavailable</p>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <ScanLine className="h-4 w-4 text-primary" />
            Tips for a quick scan
          </div>
          <p className="mt-2">
            Keep the barcode inside the frame and hold the phone steady for a second.
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>
          Close scanner
        </Button>
      </CardContent>
    </Card>
  );
}

async function lookupProduct(barcode: string): Promise<BarcodeScannerResult> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
  );

  if (!response.ok) {
    throw new Error("Product lookup failed");
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
    category: mapOpenFoodFactsCategory(rawCategory),
    quantity,
    unit,
    found: true,
    message: name
      ? `Found ${name}. Review the details before saving.`
      : `Barcode ${barcode} matched a product. Review the details before saving.`,
  };
}

function parseQuantity(rawQuantity?: string): { quantity: string; unit: string } {
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

function mapOpenFoodFactsCategory(rawCategory: string): string {
  const category = rawCategory.toLowerCase();

  if (containsAny(category, ["fruit", "vegetable", "produce", "salad", "fresh"])) {
    return "Produce";
  }

  if (containsAny(category, ["milk", "yogurt", "cheese", "dairy", "butter", "cream"])) {
    return "Dairy";
  }

  if (containsAny(category, ["meat", "chicken", "beef", "pork", "turkey", "seafood", "fish"])) {
    return "Meat";
  }

  if (containsAny(category, ["pasta", "rice", "bread", "grain", "cereal", "flour", "oat"])) {
    return "Grains";
  }

  if (containsAny(category, ["canned", "jarred", "beans", "soup"])) {
    return "Canned";
  }

  if (containsAny(category, ["snack", "chips", "cookie", "cracker", "candy", "bar"])) {
    return "Snacks";
  }

  if (containsAny(category, ["drink", "beverage", "juice", "soda", "water", "coffee", "tea"])) {
    return "Beverages";
  }

  if (containsAny(category, ["condiment", "sauce", "dressing", "ketchup", "mustard", "spice"])) {
    return "Condiments";
  }

  if (containsAny(category, ["frozen", "ice cream"])) {
    return "Frozen";
  }

  return "Other";
}

function containsAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function getCameraErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (
    normalized.includes("notallowed") ||
    normalized.includes("permission") ||
    normalized.includes("denied")
  ) {
    return "Camera access was denied. Allow camera access in your browser settings and try again.";
  }

  if (normalized.includes("notfound") || normalized.includes("camera")) {
    return "No camera was found on this device, or it is currently unavailable.";
  }

  return `We couldn't start the camera. Try again or add the item manually. (${message})`;
}
