"use client";

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-glass border-t pb-safe">
      <div className="mx-auto max-w-[430px] flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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
              {isActive && (
                <span className="absolute -top-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary animate-nav-indicator" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
