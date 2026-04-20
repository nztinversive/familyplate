const KEY = "fp_pub_fingerprint";

export function getOrCreateFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.length >= 16) return existing;
    const fresh = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return `nostorage-${Math.random().toString(36).slice(2, 14)}`;
  }
}
