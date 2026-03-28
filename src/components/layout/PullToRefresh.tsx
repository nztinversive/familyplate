"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const canPull = useCallback(() => {
    // Only pull when scrolled to top
    return window.scrollY <= 0;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (!canPull()) return;
      startY.current = e.touches[0].clientY;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active || refreshing) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && canPull()) {
        const distance = Math.min(diff * 0.5, MAX_PULL);
        setPullDistance(distance);
        setPulling(true);

        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (!active) return;
      active = false;

      if (pullDistance >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);

        // Convex auto-refreshes, just show the animation
        setTimeout(() => {
          setRefreshing(false);
          setPulling(false);
          setPullDistance(0);
        }, 800);
      } else {
        setPulling(false);
        setPullDistance(0);
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [canPull, pullDistance, refreshing]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-opacity"
        style={{
          height: pulling || refreshing ? `${pullDistance}px` : "0px",
          opacity: progress,
          zIndex: 10,
        }}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
          }}
        >
          <RefreshCw className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: pulling || refreshing ? `translateY(${pullDistance}px)` : undefined,
          transition: pulling ? "none" : "transform 0.3s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
