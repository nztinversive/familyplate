"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api } from "../../../convex/_generated/api";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check if user has a household (only query when authenticated)
  const currentUser = useQuery(
    api.queries.profiles.getCurrentUser,
    isAuthenticated ? {} : "skip"
  );

  const isSetupRoute = pathname?.startsWith("/setup");

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace("/");
      return;
    }

    // Wait for user query to resolve
    if (currentUser === undefined) return;

    // If user has no household and isn't already on setup, redirect to setup
    if (currentUser && !currentUser.householdId && !isSetupRoute) {
      router.replace("/setup/household");
      return;
    }

    // If user has no profile at all and isn't on setup, redirect to setup
    if (currentUser && !currentUser.profileId && !isSetupRoute) {
      router.replace("/setup/household");
      return;
    }
  }, [isAuthenticated, isLoading, currentUser, isSetupRoute, router]);

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
