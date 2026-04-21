"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { api } from "@familyplate/convex/_generated/api";

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
  const isJoinRoute = pathname?.startsWith("/join");
  const redirectPath =
    currentUser === undefined
      ? undefined
      : currentUser?.postAuthRedirectPath ?? "/setup/household";
  const shouldRedirectToSetup =
    redirectPath === "/setup/household" && !isSetupRoute && !isJoinRoute;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      window.location.replace("/");
      return;
    }

    // Wait for user query to resolve
    if (currentUser === undefined) return;

    // Skip redirects for join routes (invite flow handles its own setup)
    if (isJoinRoute) return;

    if (redirectPath === "/setup/household" && !isSetupRoute) {
      router.replace(redirectPath);
      return;
    }
  }, [
    currentUser,
    isAuthenticated,
    isJoinRoute,
    isLoading,
    isSetupRoute,
    redirectPath,
    router,
  ]);

  if (
    isLoading ||
    (isAuthenticated && currentUser === undefined) ||
    shouldRedirectToSetup
  ) {
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
