"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, ShoppingCart, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/pantry", label: "Pantry", icon: Home },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/tonight", label: "Tonight", icon: Sparkles },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);

  const activeIndex = navItems.findIndex((item) => pathname.startsWith(item.href));

  useEffect(() => {
    const container = containerRef.current;
    const activeLink = linkRefs.current[activeIndex];
    if (!container || !activeLink || activeIndex === -1) {
      setIndicatorStyle(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const left = linkRect.left - containerRect.left + (linkRect.width - 32) / 2;
    setIndicatorStyle({ left, width: 32 });
  }, [activeIndex]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-glass border-t pb-safe">
      <div ref={containerRef} className="relative mx-auto max-w-[430px] flex items-center justify-around h-16 px-1">
        {/* Indicator line */}
        {indicatorStyle && (
          <span
            className="absolute top-0 h-0.5 rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          />
        )}

        {navItems.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => { linkRefs.current[index] = el; }}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-8 w-8 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10 scale-110"
              )}>
                <Icon className={cn(
                  "h-[18px] w-[18px] transition-all duration-200",
                  isActive && "h-5 w-5"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
