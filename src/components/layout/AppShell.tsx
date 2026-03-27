"use client";

import { MobileNav } from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
  showNav?: boolean;
  header?: React.ReactNode;
}

export function AppShell({ children, showNav = true, header }: AppShellProps) {
  return (
    <div className="app-container bg-background min-h-screen">
      {header && (
        <header className="sticky top-0 z-40 border-b pt-safe nav-glass">
          <div className="px-4 py-3">{header}</div>
        </header>
      )}
      <main className={showNav ? "pb-20" : ""}>{children}</main>
      {showNav && <MobileNav />}
    </div>
  );
}
