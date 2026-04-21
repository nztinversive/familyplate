"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      setShowBanner(true);
    };
    const goOnline = () => {
      setIsOffline(false);
      // Keep banner briefly to show "back online"
      setTimeout(() => setShowBanner(false), 3000);
    };

    if (!navigator.onLine) {
      setIsOffline(true);
      setShowBanner(true);
    }

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all duration-300 animate-fade-in ${
      isOffline
        ? "bg-amber-500 text-white"
        : "bg-primary text-primary-foreground"
    }`}>
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>You&apos;re offline — cached content only</span>
        </>
      ) : (
        <span>Back online</span>
      )}
    </div>
  );
}
