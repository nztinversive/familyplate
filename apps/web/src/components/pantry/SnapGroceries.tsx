"use client";

import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@familyplate/convex/_generated/api";
import {
  Camera,
  Check,
  Edit3,
  Loader2,
  Minus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { track } from "@/lib/analytics";
import * as Sentry from "@sentry/nextjs";

type RecognizedItem = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: "high" | "medium" | "low";
};

interface SnapGroceriesProps {
  onClose: () => void;
  onAdd: (items: Array<{ name: string; quantity: number; unit: string; category: string }>) => Promise<void>;
}

export function SnapGroceries({ onClose, onAdd }: SnapGroceriesProps) {
  const recognizeAction = useAction(api.actions.recognizeGroceries.recognizeFromPhoto);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<"camera" | "analyzing" | "review">("camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [items, setItems] = useState<RecognizedItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      track("camera_scan_failed", {
        source: "snap_groceries",
        reason: err instanceof Error ? err.message : "camera_access_denied",
      });
      Sentry.captureException(err, {
        tags: { area: "snap_groceries", action: "start_camera", platform: "web" },
      });
      setCameraError("Camera access denied. Allow camera access and try again.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    stopCamera();
    setPhase("analyzing");
    setAnalyzeError("");

    try {
      track("camera_scan_started", {
        source: "snap_groceries",
      });
      const base64 = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      const result = await recognizeAction({ imageBase64: base64 });
      track("camera_scan_completed", {
        source: "snap_groceries",
        count: result.items.length,
        high_confidence_count: result.items.filter(
          (item) => item.confidence === "high",
        ).length,
      });
      setItems(result.items);
      setPhase("review");
    } catch (err) {
      track("camera_scan_failed", {
        source: "snap_groceries",
        reason: err instanceof Error ? err.message : "recognition_failed",
      });
      Sentry.captureException(err, {
        tags: { area: "snap_groceries", action: "recognize_photo", platform: "web" },
      });
      console.error("Recognition failed:", err);
      setAnalyzeError("Couldn't identify items. Try again with better lighting.");
      setPhase("camera");
      startCamera();
    }
  };

  const handleRetake = () => {
    setItems([]);
    setEditingIndex(null);
    setPhase("camera");
    startCamera();
  };

  const handleAddAll = async () => {
    setIsAdding(true);
    try {
      await onAdd(items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
      })));
      track("pantry_item_added", {
        source: "snap_groceries_review",
        count: items.length,
      });
      onClose();
    } catch (err) {
      track("pantry_item_add_failed", {
        source: "snap_groceries_review",
        count: items.length,
        reason: err instanceof Error ? err.message : "unknown",
      });
      Sentry.captureException(err, {
        tags: { area: "snap_groceries", action: "add_review_items", platform: "web" },
      });
    } finally {
      setIsAdding(false);
    }
  };

  const updateItem = (index: number, updates: Partial<RecognizedItem>) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const confidenceColor = (c: string) => {
    if (c === "high") return "bg-primary/10 text-primary";
    if (c === "medium") return "bg-accent/10 text-accent";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">Snap Groceries</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {phase === "camera" && "Take a photo of your groceries and AI will identify them."}
              {phase === "analyzing" && "Analyzing your photo..."}
              {phase === "review" && `Found ${items.length} item${items.length !== 1 ? "s" : ""}. Review and edit before adding.`}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { stopCamera(); onClose(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Camera phase */}
        {phase === "camera" && (
          <>
            <div className="relative overflow-hidden rounded-xl border bg-muted/40">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full min-h-[300px] max-h-[400px] object-cover bg-black"
                onLoadedMetadata={() => setCameraReady(true)}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-sm">Starting camera...</p>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/95 p-6 text-center">
                  <div>
                    <p className="font-medium text-destructive">Camera unavailable</p>
                    <p className="text-sm text-muted-foreground mt-1">{cameraError}</p>
                  </div>
                </div>
              )}
            </div>

            {analyzeError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {analyzeError}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2 h-12 rounded-xl"
                disabled={!cameraReady}
                onClick={() => void captureAndAnalyze()}
              >
                <Camera className="h-4 w-4" />
                Take Photo
              </Button>
              <Button variant="outline" className="h-12 rounded-xl" onClick={() => { stopCamera(); onClose(); }}>
                Cancel
              </Button>
            </div>

            {/* Auto-start camera on mount */}
            {!cameraReady && !cameraError && <AutoStart onStart={startCamera} />}
          </>
        )}

        {/* Analyzing phase */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Identifying groceries...</p>
            <p className="text-xs text-muted-foreground">This takes a few seconds</p>
          </div>
        )}

        {/* Review phase */}
        {phase === "review" && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No items detected. Try again with better lighting or a closer shot.</p>
                <Button variant="outline" onClick={handleRetake} className="gap-2">
                  <Camera className="h-4 w-4" />
                  Retake Photo
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="rounded-xl border bg-card p-3"
                    >
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                            className="h-9 text-sm"
                            placeholder="Item name"
                          />
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 1 })}
                              className="h-9 text-sm w-20"
                              min="0.1"
                              step="0.5"
                            />
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(index, { unit: e.target.value })}
                              className="h-9 text-sm flex-1"
                              placeholder="unit"
                            />
                          </div>
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => removeItem(index)} className="text-destructive h-7 px-2">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <Button size="sm" onClick={() => setEditingIndex(null)} className="h-7 px-3 gap-1">
                              <Check className="h-3 w-3" />
                              Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} {item.unit} &middot; {item.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className={`text-[10px] ${confidenceColor(item.confidence)}`}>
                              {item.confidence}
                            </Badge>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingIndex(index)}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2 rounded-xl" onClick={handleRetake}>
                    <Camera className="h-4 w-4" />
                    Retake
                  </Button>
                  <Button
                    className="flex-1 gap-2 rounded-xl"
                    disabled={isAdding || items.length === 0}
                    onClick={() => void handleAddAll()}
                  >
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {isAdding ? "Adding..." : `Add ${items.length} Item${items.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Auto-start camera when component mounts
function AutoStart({ onStart }: { onStart: () => void }) {
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    // Delay to let the dialog animation finish
    setTimeout(onStart, 200);
  }
  return null;
}
