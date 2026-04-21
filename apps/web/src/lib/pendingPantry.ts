const KEY = "fp_pending_pantry";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

export type PendingPantry = {
  items: string[];
  allergies: string[];
  craving?: string;
  source: string;
  savedAt: number;
};

export function setPendingPantry(payload: Omit<PendingPantry, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const cleanItems = Array.from(
      new Set(
        payload.items
          .flatMap((s) => s.split(/[,\n]/))
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length <= 80)
      )
    ).slice(0, 60);
    const data: PendingPantry = {
      items: cleanItems,
      allergies: (payload.allergies ?? []).slice(0, 20),
      craving: payload.craving,
      source: payload.source,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getPendingPantry(): PendingPantry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPantry;
    if (!parsed?.items?.length) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPantry() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
